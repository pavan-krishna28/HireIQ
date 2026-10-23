exports.flag = (req, res) => {
  const { db, saveDb, run, queryOne } = req.app.locals;
  const { session_id, type, detail } = req.body;

  const session = queryOne(db, 'SELECT * FROM test_sessions WHERE id = ?', [session_id]);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const flags = JSON.parse(session.proctoring_flags || '[]');
  flags.push({ type, detail, time: new Date().toISOString() });

  let tabCount = session.tab_switch_count || 0;
  let blurCount = session.window_blur_count || 0;
  if (type === 'tab_switch') tabCount++;
  if (type === 'window_blur') blurCount++;

  run(db, `UPDATE test_sessions SET proctoring_flags = ?, tab_switch_count = ?, window_blur_count = ? WHERE id = ?`,
    [JSON.stringify(flags), tabCount, blurCount, session_id]);
  saveDb();

  const autoSubmit = tabCount >= 3;
  res.json({ flagged: true, auto_submit: autoSubmit, tab_switch_count: tabCount });
};
