const getCandidate = (req, res) => {
  const { db, queryOne, queryAll } = req.app.locals;
  const { id } = req.params;

  const candidate = queryOne(db,
    `SELECT c.id, c.name, c.email, c.phone
     FROM candidates c
     JOIN test_sessions ts ON ts.candidate_id = c.id
     JOIN jobs j ON ts.job_id = j.id
     WHERE c.id = ? AND j.recruiter_id = ?
     LIMIT 1`,
    [id, req.recruiter.id]);

  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const sessions = queryAll(db,
    `SELECT ts.id, ts.job_id, j.title AS job_title, ts.status, ts.match_score, ts.started_at,
      ts.submitted_at, ts.time_taken_seconds, r.recommendation, r.percentage, r.total_score, r.max_possible_score
     FROM test_sessions ts
     JOIN jobs j ON ts.job_id = j.id
     LEFT JOIN reports r ON r.session_id = ts.id
     WHERE ts.candidate_id = ?
     ORDER BY ts.started_at DESC`,
    [id]);

  res.json({ candidate, sessions });
};

const updateCandidate = (req, res) => {
  const { db, saveDb, run, queryOne } = req.app.locals;
  const { id } = req.params;
  const { name, email, phone } = req.body;

  const allowed = queryOne(db,
    `SELECT c.id FROM candidates c
     JOIN test_sessions ts ON ts.candidate_id = c.id
     JOIN jobs j ON ts.job_id = j.id
     WHERE c.id = ? AND j.recruiter_id = ?
     LIMIT 1`,
    [id, req.recruiter.id]);

  if (!allowed) return res.status(404).json({ error: 'Candidate not found' });

  run(db, 'UPDATE candidates SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?',
    [name, email, phone, id]);
  saveDb();

  const updated = queryOne(db, 'SELECT id, name, email, phone FROM candidates WHERE id = ?', [id]);
  res.json({ candidate: updated });
};

module.exports = { getCandidate, updateCandidate };
