const { v4: uuidv4 } = require('uuid');
const { generateTest } = require('../services/claudeService');
const { buildPool, bankQuestions } = require('../services/questionBank');

exports.createJob = async (req, res) => {
  const { db, saveDb, run, queryOne } = req.app.locals;
  const { id: recruiter_id, company_id } = req.recruiter;
  const {
    title, role_type, description, required_skills, preferred_skills,
    experience_level, min_match_percentage, coding_required, timer_type,
    total_time_minutes, per_question_time_seconds, question_count,
    question_type_breakdown, topics, difficulty, data_retention_days,
    custom_questions, expires_at, generate_ai_questions = true,
    pregenerated_questions
  } = req.body;

  if (!title || !role_type) return res.status(400).json({ error: 'Title and role type required' });

  const id = uuidv4();
  const jobData = {
    id,
    company_id,
    recruiter_id,
    title,
    role_type,
    description: description || '',
    required_skills: JSON.stringify(required_skills || []),
    preferred_skills: JSON.stringify(preferred_skills || []),
    experience_level: experience_level || 'junior',
    min_match_percentage: min_match_percentage || 70,
    coding_required: coding_required ? 1 : 0,
    timer_type: timer_type || 'overall',
    total_time_minutes: total_time_minutes || 60,
    per_question_time_seconds: per_question_time_seconds || 120,
    question_count: question_count || 20,
    question_type_breakdown: JSON.stringify(question_type_breakdown || { mcq: 50, subjective: 30, coding: 20 }),
    topics: JSON.stringify(topics || []),
    difficulty: difficulty || 'medium',
    data_retention_days: data_retention_days || 90,
    expires_at: expires_at || null
  };

  const resumeAnalysis = {
    candidate_name: 'Candidate',
    match_score: 100,
    matched_skills: required_skills || [],
    missing_skills: [],
    experience_years: 0,
    experience_level: jobData.experience_level,
    education_match: true,
    key_skills_found: required_skills || [],
    proceed_to_test: true,
    rejection_reason: '',
    rejection_message: ''
  };

  let generatedQuestions = [];
  const buildManualQuestions = (questions = []) => (questions || []).map((q, index) => ({
    question_id: q.id || `custom_${index + 1}`,
    type: q.type,
    question: q.question,
    options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
    time_limit_seconds: q.time_limit_seconds || 0,
    difficulty: 'medium',
    topic: 'Recruiter Question',
    is_custom: true,
    language: q.type === 'coding' ? 'javascript' : null,
    sample_input: null,
    sample_output: null,
    metadata: {
      correct_answer: q.correct_answer || '',
      explanation: '',
      key_points: [],
      expected_complexity: ''
    }
  }));

  if (Array.isArray(pregenerated_questions) && pregenerated_questions.length > 0) {
    // Recruiter pre-selected questions from the Generate & Select step
    generatedQuestions = [...pregenerated_questions, ...buildManualQuestions(custom_questions || [])];
  } else if (generate_ai_questions) {
    // 1. Try question bank (no network call needed)
    try {
      const pool = buildPool(role_type || 'engineering', required_skills || [], 20, 40);
      if (Array.isArray(pool) && pool.length > 0) generatedQuestions = pool;
    } catch (bankErr) {
      console.warn('Question bank pool build failed:', bankErr?.message || bankErr);
    }

    // 2. If bank gave nothing, try AI generation
    if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
      try {
        const aiQuestions = await generateTest(resumeAnalysis, jobData, custom_questions || []);
        if (Array.isArray(aiQuestions) && aiQuestions.length > 0) generatedQuestions = aiQuestions;
        else console.warn('AI returned no questions');
      } catch (aiErr) {
        console.warn('AI question generation failed:', aiErr?.message || aiErr);
      }
    }

    // 3. Last resort: use raw bank questions directly
    if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
      console.warn('Using raw bank questions as final fallback');
      generatedQuestions = [...bankQuestions, ...buildManualQuestions(custom_questions || [])];
    }
  } else {
    generatedQuestions = buildManualQuestions(custom_questions || []);
  }

  run(db, `INSERT INTO jobs (id, company_id, recruiter_id, title, role_type, description,
    required_skills, preferred_skills, experience_level, min_match_percentage,
    coding_required, timer_type, total_time_minutes, per_question_time_seconds,
    question_count, question_type_breakdown, topics, difficulty, data_retention_days, generated_questions, expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, company_id, recruiter_id, title, role_type, description || '',
     JSON.stringify(required_skills || []), JSON.stringify(preferred_skills || []),
     experience_level || 'junior', min_match_percentage || 70,
     coding_required ? 1 : 0, timer_type || 'overall',
     total_time_minutes || 60, per_question_time_seconds || 120,
     question_count || 20, JSON.stringify(question_type_breakdown || { mcq: 50, subjective: 30, coding: 20 }),
     JSON.stringify(topics || []), difficulty || 'medium',
     data_retention_days || 90, JSON.stringify(generatedQuestions), expires_at || null]);

  if (custom_questions && custom_questions.length > 0) {
    for (const q of custom_questions) {
      run(db, `INSERT INTO custom_questions (id, job_id, type, question, options, correct_answer, time_limit_seconds)
        VALUES (?,?,?,?,?,?,?)`,
        [uuidv4(), id, q.type, q.question,
         q.options ? JSON.stringify(q.options) : null,
         q.correct_answer || null, q.time_limit_seconds || null]);
    }
  }

  saveDb();
  const job = queryOne(db, 'SELECT * FROM jobs WHERE id = ?', [id]);
  res.json({ job });
};

exports.listJobs = (req, res) => {
  const { db, queryAll, queryOne } = req.app.locals;
  const jobs = queryAll(db, `SELECT j.*, 
    (SELECT COUNT(*) FROM test_sessions ts WHERE ts.job_id = j.id) as candidate_count
    FROM jobs j WHERE j.recruiter_id = ? ORDER BY j.created_at DESC`, [req.recruiter.id]);
  res.json({ jobs });
};

exports.getJob = (req, res) => {
  const { db, queryOne, queryAll } = req.app.locals;
  const job = queryOne(db, 'SELECT * FROM jobs WHERE id = ? AND recruiter_id = ?', [req.params.id, req.recruiter.id]);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const custom_questions = queryAll(db, 'SELECT * FROM custom_questions WHERE job_id = ?', [req.params.id]);
  res.json({ job, custom_questions });
};

exports.updateJob = (req, res) => {
  const { db, saveDb, run, queryOne } = req.app.locals;
  const { status, title, description } = req.body;
  run(db, 'UPDATE jobs SET status = COALESCE(?, status), title = COALESCE(?, title), description = COALESCE(?, description) WHERE id = ? AND recruiter_id = ?',
    [status, title, description, req.params.id, req.recruiter.id]);
  saveDb();
  const job = queryOne(db, 'SELECT * FROM jobs WHERE id = ?', [req.params.id]);
  res.json({ job });
};

exports.deleteJob = (req, res) => {
  const { db, saveDb, run, queryOne } = req.app.locals;
  const job = queryOne(db, 'SELECT id FROM jobs WHERE id = ? AND recruiter_id = ?', [req.params.id, req.recruiter.id]);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  run(db, 'DELETE FROM answers WHERE session_id IN (SELECT id FROM test_sessions WHERE job_id = ?)', [req.params.id]);
  run(db, 'DELETE FROM reports WHERE job_id = ?', [req.params.id]);
  run(db, 'DELETE FROM test_sessions WHERE job_id = ?', [req.params.id]);
  run(db, 'DELETE FROM custom_questions WHERE job_id = ?', [req.params.id]);
  run(db, 'DELETE FROM jobs WHERE id = ?', [req.params.id]);
  saveDb();

  res.json({ deleted: true });
};

exports.getJobLink = (req, res) => {
  const { db, queryOne } = req.app.locals;
  const job = queryOne(db, 'SELECT j.*, c.slug FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.id = ? AND j.recruiter_id = ?',
    [req.params.id, req.recruiter.id]);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const link = `${process.env.CLIENT_URL}/apply/${job.slug}/${job.id}`;
  res.json({ link });
};

exports.getJobCandidates = (req, res) => {
  const { db, queryAll } = req.app.locals;
  const job = req.app.locals.queryOne(db, 'SELECT id FROM jobs WHERE id = ? AND recruiter_id = ?', [req.params.id, req.recruiter.id]);
  if (!job) return res.status(404).json({ error: 'Not found' });
  const candidates = queryAll(db, `
    SELECT ts.*, c.name, c.email, c.phone, c.resume_parsed,
      r.recommendation, r.percentage, r.total_score, r.max_possible_score
    FROM test_sessions ts
    JOIN candidates c ON ts.candidate_id = c.id
    LEFT JOIN reports r ON r.session_id = ts.id
    WHERE ts.job_id = ?
    ORDER BY ts.started_at DESC`, [req.params.id]);
  res.json({ candidates });
};
