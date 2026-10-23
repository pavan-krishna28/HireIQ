exports.getReport = (req, res) => {
  const { db, queryOne } = req.app.locals;
  const report = queryOne(db, `SELECT r.*, c.name as candidate_name, c.email,
    j.title as job_title, j.role_type FROM reports r
    JOIN candidates c ON r.candidate_id = c.id
    JOIN jobs j ON r.job_id = j.id
    WHERE r.session_id = ? AND j.recruiter_id = ?`,
    [req.params.session_id, req.recruiter.id]);
  if (!report) return res.status(404).json({ error: 'Report not found or still processing' });

  const answers = req.app.locals.queryAll(db, `SELECT * FROM answers WHERE session_id = ?`, [req.params.session_id]);
  const session = req.app.locals.queryOne(db, `SELECT * FROM test_sessions WHERE id = ?`, [req.params.session_id]);

  res.json({
    report: {
      ...report,
      section_scores: JSON.parse(report.section_scores || '{}'),
      strengths: JSON.parse(report.strengths || '[]'),
      gaps: JSON.parse(report.gaps || '[]'),
    },
    answers: answers.map(a => ({
      ...a,
      strong_points: JSON.parse(a.strong_points || '[]'),
      weak_points: JSON.parse(a.weak_points || '[]')
    })),
    session: {
      ...session,
      proctoring_flags: JSON.parse(session?.proctoring_flags || '[]'),
      webcam_flags: JSON.parse(session?.webcam_flags || '[]')
    }
  });
};

exports.getLeaderboard = (req, res) => {
  const { db, queryAll, queryOne } = req.app.locals;
  const job = queryOne(db, 'SELECT id FROM jobs WHERE id = ? AND recruiter_id = ?', [req.params.job_id, req.recruiter.id]);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const leaderboard = queryAll(db, `
    SELECT r.*, c.name, c.email, ts.match_score, ts.ai_flag_count,
      ts.tab_switch_count, ts.time_taken_seconds
    FROM reports r
    JOIN candidates c ON r.candidate_id = c.id
    JOIN test_sessions ts ON r.session_id = ts.id
    WHERE r.job_id = ?
    ORDER BY r.percentage DESC, r.ai_flag_count ASC`,
    [req.params.job_id]);

  res.json({ leaderboard });
};
