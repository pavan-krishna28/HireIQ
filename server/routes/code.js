const router = require('express').Router();
const { runCode } = require('../services/sandboxService');
router.post('/run', async (req, res) => {
  const { code, language, stdin } = req.body;
  if (!code) return res.status(400).json({ error: 'Code required' });
  const result = await runCode(code, language, stdin);
  res.json(result);
});
module.exports = router;
