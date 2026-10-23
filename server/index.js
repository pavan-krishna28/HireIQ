require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb, queryAll, queryOne, run, saveDb } = require('./db/init');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, message: { error: 'Too many requests, please slow down' } });

(async () => {
  const { db, saveDb: sDb } = await initDb();

  // Attach db helpers to app locals
  app.locals.db = db;
  app.locals.saveDb = sDb;
  app.locals.queryAll = queryAll;
  app.locals.queryOne = queryOne;
  app.locals.run = run;

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/jobs', require('./routes/jobs'));
  app.use('/api/candidates', require('./routes/candidates'));
  app.use('/api/resume', aiLimiter, require('./routes/resume'));
  app.use('/api/test', require('./routes/test'));
  app.use('/api/code', require('./routes/code'));
  app.use('/api/proctor', require('./routes/proctor'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/ai', aiLimiter, require('./routes/ai'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 HireIQ server running on http://localhost:${PORT}`));
})();
