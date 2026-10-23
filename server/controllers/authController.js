const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const makeToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

exports.register = async (req, res) => {
  const { db, saveDb, queryOne, run } = req.app.locals;
  const { name, email, password, company_name } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });

  const existing = queryOne(db, 'SELECT id FROM recruiters WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = await bcrypt.hash(password, 10);
  const id = uuidv4();

  let company_id = 'lumos-001';
  if (company_name && company_name.trim()) {
    const slug = company_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const cid = uuidv4();
    run(db, `INSERT INTO companies (id, name, slug) VALUES (?, ?, ?)`, [cid, company_name.trim(), slug]);
    company_id = cid;
  }

  run(db, `INSERT INTO recruiters (id, company_id, name, email, password_hash) VALUES (?, ?, ?, ?, ?)`,
    [id, company_id, name, email, password_hash]);
  saveDb();

  const company = queryOne(db, 'SELECT * FROM companies WHERE id = ?', [company_id]);
  const token = makeToken({ id, email, name, company_id });
  res.json({ token, recruiter: { id, name, email, company_id, company } });
};

exports.login = async (req, res) => {
  const { db, queryOne } = req.app.locals;
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const recruiter = queryOne(db, 'SELECT * FROM recruiters WHERE email = ?', [email]);
  if (!recruiter) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, recruiter.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const company = queryOne(db, 'SELECT * FROM companies WHERE id = ?', [recruiter.company_id]);
  const token = makeToken({ id: recruiter.id, email, name: recruiter.name, company_id: recruiter.company_id });
  res.json({ token, recruiter: { id: recruiter.id, name: recruiter.name, email, company_id: recruiter.company_id, company } });
};

exports.me = (req, res) => {
  const { db, queryOne } = req.app.locals;
  const recruiter = queryOne(db, 'SELECT id, name, email, company_id, created_at FROM recruiters WHERE id = ?', [req.recruiter.id]);
  if (!recruiter) return res.status(404).json({ error: 'Not found' });
  const company = queryOne(db, 'SELECT * FROM companies WHERE id = ?', [recruiter.company_id]);
  res.json({ recruiter: { ...recruiter, company } });
};
