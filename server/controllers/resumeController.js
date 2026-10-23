const { v4: uuidv4 } = require('uuid');
const { parseResume } = require('../services/resumeParser');
const { analyzeResume } = require('../services/claudeService');

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });
    const resumeText = await parseResume(req.file.path);
    if (!resumeText) return res.status(422).json({ error: 'Could not read PDF text. Please upload a text-based PDF (not a scanned image).' });
    res.json({ resume_url: `/uploads/${req.file.filename}`, resume_text: resumeText });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
};

exports.analyzeResume = async (req, res) => {
  try {
    const { db, saveDb, run, queryOne } = req.app.locals;
    const { resume_text, job_id, candidate_info } = req.body;

    if (!resume_text || !job_id) return res.status(400).json({ error: 'resume_text and job_id required' });
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in server/.env — please add your API key and restart the server.' });
    }

    const job = queryOne(db, 'SELECT * FROM jobs WHERE id = ?', [job_id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'active') return res.status(400).json({ error: 'This job is no longer accepting applications.' });

    console.log(`Analyzing resume for job: ${job.title}`);
    const analysis = await analyzeResume(resume_text, job, job.min_match_percentage);

    if (!analysis) {
      return res.status(500).json({ error: 'AI analysis failed. Check that your ANTHROPIC_API_KEY is valid and has credits.' });
    }

    const candidate_id = uuidv4();
    const { name, email, phone } = candidate_info || {};

    const existing = queryOne(db, 'SELECT id FROM candidates WHERE email = ?', [email || '']);
    let finalCandidateId = existing ? existing.id : candidate_id;

    if (!existing) {
      run(db, `INSERT INTO candidates (id, name, email, phone, resume_text, resume_parsed) VALUES (?,?,?,?,?,?)`,
        [candidate_id, analysis.candidate_name || name || 'Unknown', email || '', phone || '',
         resume_text, JSON.stringify(analysis)]);
    } else {
      run(db, 'UPDATE candidates SET name = ?, resume_text = ?, resume_parsed = ? WHERE id = ?',
        [analysis.candidate_name || name || 'Unknown', resume_text, JSON.stringify(analysis), existing.id]);
    }

    let session_token = null;
    let session_id = null;
    if (analysis.proceed_to_test) {
      const jwt = require('jsonwebtoken');
      session_id = uuidv4();
      session_token = jwt.sign(
        { session_id, candidate_id: finalCandidateId, job_id },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
      );
      const expires_at = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      run(db, `INSERT INTO test_sessions (id, job_id, candidate_id, match_score, token, expires_at) VALUES (?,?,?,?,?,?)`,
        [session_id, job_id, finalCandidateId, analysis.match_score, session_token, expires_at]);
    }

    saveDb();
    console.log(`Analysis done: ${analysis.match_score}% match, proceed=${analysis.proceed_to_test}`);
    res.json({ analysis, session_token, session_id, candidate_id: finalCandidateId });
  } catch (err) {
    console.error('analyzeResume error:', err);
    const message = err?.response?.data?.error || err?.message || 'Server error';
    res.status(500).json({ error: 'AI analysis failed: ' + message });
  }
};
