const { v4: uuidv4 } = require('uuid');
const { parseResume } = require('../services/resumeParser');
const { analyzeResume } = require('../services/claudeService');

exports.uploadResume = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PDF file required' });
  const resumeText = await parseResume(req.file.path);
  if (!resumeText) return res.status(422).json({ error: 'Could not read PDF. Please upload a text-based PDF.' });
  res.json({ resume_url: `/uploads/${req.file.filename}`, resume_text: resumeText });
};

exports.analyzeResume = async (req, res) => {
  const { db, saveDb, run, queryOne } = req.app.locals;
  const { resume_text, job_id, candidate_info } = req.body;
  if (!resume_text || !job_id) return res.status(400).json({ error: 'resume_text and job_id required' });

  const job = queryOne(db, 'SELECT * FROM jobs WHERE id = ? AND status = ?', [job_id, 'active']);
  if (!job) return res.status(404).json({ error: 'Job not found or inactive' });

  const analysis = await analyzeResume(resume_text, job, job.min_match_percentage);
  if (!analysis) return res.status(500).json({ error: 'Resume analysis failed. Please try again.' });

  // Save/update candidate
  const candidate_id = uuidv4();
  const { name, email, phone } = candidate_info || {};

  // Check if candidate already applied
  const existing = queryOne(db, 'SELECT id FROM candidates WHERE email = ?', [email || '']);
  let finalCandidateId = existing ? existing.id : candidate_id;

  if (!existing) {
    run(db, `INSERT INTO candidates (id, name, email, phone, resume_text, resume_parsed) VALUES (?,?,?,?,?,?)`,
      [candidate_id, analysis.candidate_name || name || 'Unknown', email || '', phone || '',
       resume_text, JSON.stringify(analysis)]);
  } else {
    run(db, 'UPDATE candidates SET resume_text = ?, resume_parsed = ? WHERE id = ?',
      [resume_text, JSON.stringify(analysis), existing.id]);
  }

  // Create session token if proceeding
  let session_token = null;
  let session_id = null;
  if (analysis.proceed_to_test) {
    const jwt = require('jsonwebtoken');
    session_id = uuidv4();
    session_token = jwt.sign({ session_id, candidate_id: finalCandidateId, job_id }, process.env.JWT_SECRET, { expiresIn: '4h' });
    const expires_at = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    run(db, `INSERT INTO test_sessions (id, job_id, candidate_id, match_score, token, expires_at) VALUES (?,?,?,?,?,?)`,
      [session_id, job_id, finalCandidateId, analysis.match_score, session_token, expires_at]);
  }

  saveDb();
  res.json({ analysis, session_token, session_id, candidate_id: finalCandidateId });
};
