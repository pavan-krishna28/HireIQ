const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const TIMEOUT_MS = 5000;
const BLOCKED = [
  "require('fs')", 'require("fs")',
  "require('child_process')", 'require("child_process")',
  "require('net')", 'require("net")',
  "require('http')", 'require("http")',
  '__import__', 'import os', 'import sys',
  'import subprocess', 'open(', 'subprocess',
  'socket', 'fetch(', 'XMLHttpRequest',
  'process.exit', 'process.env', 'eval(', 'exec('
];

const runCode = async (code, language = 'javascript', stdin = '') => {
  const lang = language.toLowerCase();
  const configs = {
    javascript: { ext: 'js', runner: 'node' },
    js: { ext: 'js', runner: 'node' },
    python: { ext: 'py', runner: 'python3' },
    python3: { ext: 'py', runner: 'python3' }
  };

  const config = configs[lang];
  if (!config) {
    return { success: false, output: '', error: `Language "${language}" not supported. Use JavaScript or Python.`, timed_out: false };
  }

  const blocked = BLOCKED.find(d => code.includes(d));
  if (blocked) {
    return { success: false, output: '', error: `Blocked: "${blocked}" is not allowed. Write pure logic only.`, timed_out: false };
  }

  const tmpFile = path.join(os.tmpdir(), `hireiq_${uuidv4().replace(/-/g,'')}.${config.ext}`);
  try {
    fs.writeFileSync(tmpFile, code, 'utf8');
    const output = execSync(`${config.runner} "${tmpFile}"`, {
      timeout: TIMEOUT_MS, input: stdin, encoding: 'utf8',
      maxBuffer: 1024 * 1024, env: { PATH: process.env.PATH }
    });
    return { success: true, output: output.trim(), error: '', timed_out: false };
  } catch (err) {
    if (err.killed || err.signal === 'SIGTERM') {
      return { success: false, output: '', error: 'Time limit exceeded (5 seconds)', timed_out: true };
    }
    return { success: false, output: '', error: err.stderr?.trim() || err.message, timed_out: false };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
};

module.exports = { runCode };
