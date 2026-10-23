const { generateTest } = require('../services/claudeService');

// In-memory store for questions with metadata (not persisted to DB for security)
const sessionMetaStore = {};

exports.startTest = async (req, res) => {
  const { db, saveDb, run, queryOne, queryAll } = req.app.locals;
  const { session_id } = req.body;
  const session = queryOne(db, 'SELECT * FROM test_sessions WHERE id = ?', [session_id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status === 'submitted' || session.status === 'evaluated') {
    return res.status(400).json({ error: 'Test already submitted' });
  }

  const job = queryOne(db, 'SELECT * FROM jobs WHERE id = ?', [session.job_id]);
  const candidate = queryOne(db, 'SELECT * FROM candidates WHERE id = ?', [session.candidate_id]);
  const customQuestions = queryAll(db, 'SELECT * FROM custom_questions WHERE job_id = ?', [job.id]);
  const resumeParsed = JSON.parse(candidate.resume_parsed || '{}');

  const jobSavedQuestions = JSON.parse(job.generated_questions || '[]');
  let allQuestions = Array.isArray(jobSavedQuestions) && jobSavedQuestions.length > 0
    ? jobSavedQuestions
    : null;

  if (!allQuestions) {
    try {
      allQuestions = await generateTest(resumeParsed, job, customQuestions);
    } catch (err) {
      console.error('generateTest error:', err);
      const message = err?.response?.data?.error || err?.message || 'Please try again.';
      return res.status(500).json({ error: `Question generation failed. ${message}` });
    }
  }

  if (!allQuestions || allQuestions.length === 0) {
    return res.status(500).json({ error: 'Question generation failed. Please try again.' });
  }

  // Store full questions (with metadata) in memory
  sessionMetaStore[session_id] = allQuestions;

  // Strip metadata before sending to candidate
  const safeQuestions = allQuestions.map(({ metadata, ...q }) => q);

  run(db, `UPDATE test_sessions SET status = 'active', started_at = datetime('now'),
    generated_questions = ?, questions_with_meta = ? WHERE id = ?`,
    [JSON.stringify(safeQuestions), JSON.stringify(allQuestions), session_id]);
  saveDb();

  res.json({
    questions: safeQuestions,
    job: { title: job.title, role_type: job.role_type, timer_type: job.timer_type,
           total_time_minutes: job.total_time_minutes, per_question_time_seconds: job.per_question_time_seconds },
    candidate_name: candidate.name
  });
};

exports.submitAnswer = (req, res) => {
  const { db, saveDb, run, queryOne } = req.app.locals;
  const { session_id, question_id, answer_text, selected_option, code_output, time_taken_seconds } = req.body;

  const session = queryOne(db, 'SELECT id, status FROM test_sessions WHERE id = ?', [session_id]);
  if (!session || session.status === 'submitted') return res.status(400).json({ error: 'Invalid session' });

  const { v4: uuidv4 } = require('uuid');
  run(db, `INSERT INTO answers (id, session_id, question_id, answer_text, selected_option, code_output, time_taken_seconds)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(session_id, question_id) DO UPDATE SET
    answer_text = excluded.answer_text, selected_option = excluded.selected_option,
    code_output = excluded.code_output, time_taken_seconds = excluded.time_taken_seconds,
    submitted_at = datetime('now')`,
    [uuidv4(), session_id, question_id, answer_text || null, selected_option || null, code_output || null, time_taken_seconds || 0]);
  saveDb();
  res.json({ saved: true });
};

exports.submitFinal = async (req, res) => {
  const { db, saveDb, run, queryOne, queryAll } = req.app.locals;
  const { session_id } = req.body;

  const session = queryOne(db, 'SELECT * FROM test_sessions WHERE id = ?', [session_id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const started = new Date(session.started_at);
  const timeTaken = Math.round((Date.now() - started.getTime()) / 1000);

  run(db, `UPDATE test_sessions SET status = 'submitted', submitted_at = datetime('now'), time_taken_seconds = ? WHERE id = ?`,
    [timeTaken, session_id]);
  saveDb();

  // Async evaluation — don't wait
  evaluateAllAnswers(session_id, req.app.locals, sessionMetaStore[session_id]).catch(console.error);

  res.json({ submitted: true });
};

exports.getSession = (req, res) => {
  const { db, queryOne } = req.app.locals;
  const session = queryOne(db, 'SELECT * FROM test_sessions WHERE token = ?', [req.params.token]);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const job = queryOne(db, 'SELECT title, role_type, company_id FROM jobs WHERE id = ?', [session.job_id]);
  const company = queryOne(db, 'SELECT name, primary_color, logo_url FROM companies WHERE id = ?', [job?.company_id]);
  res.json({ session: { ...session, job, company } });
};

// Internal: evaluate all answers after submission
async function evaluateAllAnswers(session_id, locals, questionsWithMeta) {
  const { db, saveDb, run, queryAll, queryOne } = locals;
  const { evaluateAnswer, generateReport } = require('../services/claudeService');
  const { v4: uuidv4 } = require('uuid');

  const answers = queryAll(db, 'SELECT * FROM answers WHERE session_id = ?', [session_id]);
  const session = queryOne(db, 'SELECT * FROM test_sessions WHERE id = ?', [session_id]);
  const job = queryOne(db, 'SELECT * FROM jobs WHERE id = ?', [session.job_id]);
  const candidate = queryOne(db, 'SELECT * FROM candidates WHERE id = ?', [session.candidate_id]);

  const questionsMap = {};
  if (questionsWithMeta) {
    questionsWithMeta.forEach(q => { questionsMap[q.question_id] = q; });
  } else {
    const safeQs = JSON.parse(session.generated_questions || '[]');
    safeQs.forEach(q => { questionsMap[q.question_id] = q; });
  }

  const evaluated = [];
  let aiFlagCount = 0;

  for (const answer of answers) {
    const question = questionsMap[answer.question_id];
    if (!question) continue;

    const answerText = answer.selected_option || answer.answer_text;
    const evaluation = await evaluateAnswer(question, answerText, answer.code_output);
    if (!evaluation) continue;

    if (evaluation.ai_flagged) aiFlagCount++;

    run(db, `UPDATE answers SET score = ?, max_score = ?, ai_flagged = ?, ai_flag_reason = ?,
      feedback = ?, strong_points = ?, weak_points = ? WHERE session_id = ? AND question_id = ?`,
      [evaluation.score, evaluation.max_score, evaluation.ai_flagged ? 1 : 0,
       evaluation.ai_flag_reason || '', evaluation.feedback || '',
       JSON.stringify(evaluation.strong_points || []), JSON.stringify(evaluation.weak_points || []),
       session_id, answer.question_id]);

    evaluated.push({ ...evaluation, type: question.type });
  }

  run(db, 'UPDATE test_sessions SET ai_flag_count = ?, status = ? WHERE id = ?',
    [aiFlagCount, 'evaluated', session_id]);

  const proctoringFlags = JSON.parse(session.proctoring_flags || '[]');
  const report = await generateReport(candidate, job, evaluated, proctoringFlags);

  if (report) {
    run(db, `INSERT INTO reports (id, session_id, candidate_id, job_id, total_score, max_possible_score,
      percentage, recommendation, recommendation_reason, section_scores, strengths, gaps, recruiter_notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uuidv4(), session_id, session.candidate_id, session.job_id,
       report.total_score, report.max_possible_score, report.percentage,
       report.recommendation, report.recommendation_reason,
       JSON.stringify(report.section_scores || {}),
       JSON.stringify(report.strengths || []),
       JSON.stringify(report.gaps || []),
       report.recruiter_notes || '']);
  }

  saveDb();
  delete sessionMetaStore[session_id];
  console.log(`✅ Evaluation complete for session ${session_id}`);
}
