const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(process.env.DB_PATH || './db/hireiq.db');

let db = null;

const saveDb = () => {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
};

const hasColumn = (table, column) => {
  const stmt = db.prepare(`PRAGMA table_info(${table});`);
  const cols = [];
  while (stmt.step()) cols.push(stmt.getAsObject().name);
  stmt.free();
  return cols.includes(column);
};

const initDb = async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#4f46e5',
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recruiters (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      recruiter_id TEXT REFERENCES recruiters(id),
      title TEXT NOT NULL,
      role_type TEXT NOT NULL,
      description TEXT,
      required_skills TEXT DEFAULT '[]',
      preferred_skills TEXT DEFAULT '[]',
      experience_level TEXT DEFAULT 'junior',
      min_match_percentage INTEGER DEFAULT 70,
      coding_required INTEGER DEFAULT 0,
      timer_type TEXT DEFAULT 'overall',
      total_time_minutes INTEGER DEFAULT 60,
      per_question_time_seconds INTEGER DEFAULT 120,
      question_count INTEGER DEFAULT 20,
      question_type_breakdown TEXT DEFAULT '{"mcq":50,"subjective":30,"coding":20}',
      topics TEXT DEFAULT '[]',
      difficulty TEXT DEFAULT 'medium',
      data_retention_days INTEGER DEFAULT 90,
      generated_questions TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );
  `);

  if (!hasColumn('jobs', 'generated_questions')) {
    db.run(`ALTER TABLE jobs ADD COLUMN generated_questions TEXT DEFAULT '[]';`);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS custom_questions (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES jobs(id),
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT,
      time_limit_seconds INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      resume_url TEXT,
      resume_text TEXT,
      resume_parsed TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS test_sessions (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES jobs(id),
      candidate_id TEXT REFERENCES candidates(id),
      match_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      started_at TEXT,
      submitted_at TEXT,
      time_taken_seconds INTEGER,
      proctoring_flags TEXT DEFAULT '[]',
      tab_switch_count INTEGER DEFAULT 0,
      window_blur_count INTEGER DEFAULT 0,
      webcam_flags TEXT DEFAULT '[]',
      ai_flag_count INTEGER DEFAULT 0,
      generated_questions TEXT DEFAULT '[]',
      questions_with_meta TEXT DEFAULT '[]',
      token TEXT UNIQUE,
      expires_at TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES test_sessions(id),
      question_id TEXT NOT NULL,
      answer_text TEXT,
      selected_option TEXT,
      code_output TEXT,
      time_taken_seconds INTEGER,
      submitted_at TEXT DEFAULT (datetime('now')),
      score INTEGER,
      max_score INTEGER,
      ai_flagged INTEGER DEFAULT 0,
      ai_flag_reason TEXT,
      feedback TEXT,
      strong_points TEXT DEFAULT '[]',
      weak_points TEXT DEFAULT '[]',
      UNIQUE(session_id, question_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES test_sessions(id),
      candidate_id TEXT REFERENCES candidates(id),
      job_id TEXT REFERENCES jobs(id),
      total_score INTEGER DEFAULT 0,
      max_possible_score INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      recommendation TEXT,
      recommendation_reason TEXT,
      section_scores TEXT DEFAULT '{}',
      strengths TEXT DEFAULT '[]',
      gaps TEXT DEFAULT '[]',
      recruiter_notes TEXT,
      generated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed Lumos Learning company
  db.run(`
    INSERT OR IGNORE INTO companies (id, name, slug, primary_color)
    VALUES ('lumos-001', 'Lumos Learning', 'lumos', '#4f46e5');
  `);

  saveDb();
  console.log('✅ Database initialized');
  return { db, saveDb };
};

// Helper: run a query and return all rows as objects
const queryAll = (db, sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

// Helper: run a query and return first row
const queryOne = (db, sql, params = []) => {
  const rows = queryAll(db, sql, params);
  return rows[0] || null;
};

// Helper: run insert/update/delete
const run = (db, sql, params = []) => {
  db.run(sql, params);
};

module.exports = { initDb, queryAll, queryOne, run, saveDb: () => saveDb() };
