# HireIQ — AI-Powered Hiring Assessment Platform

Built for Lumos Learning. Designed for white-label via Shevann.

---

## What it does

- Parses candidate resumes and scores them against your job requirements
- Auto-generates personalized tests (MCQ + subjective + coding) tuned to each resume
- Runs the test in a full lockdown browser environment with webcam proctoring
- AI evaluates every answer, detects AI-generated responses, and produces a hire/reject recommendation
- Recruiter gets a full report with scores, flags, strengths, gaps, and a leaderboard

---

## Prerequisites

- Node.js 18+ (already installed)
- Python 3 (optional, for Python sandbox support)
- An Anthropic API key → https://console.anthropic.com

---

## Setup

### 1. Clone / download the project

### 2. Install dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Add your API key

Edit `server/.env`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 4. Run

```bash
# From hireiq/ root — starts both server + client
npm run dev

# Or separately:
# Terminal 1
cd server && node index.js

# Terminal 2
cd client && npx vite
```

---

## Usage

### Recruiter

1. Go to `http://localhost:5173/recruiter/register`
2. Create your account (leave Company blank to use Lumos Learning)
3. Create a job → configure test → get shareable link

### Candidate

Shareable link format:
```
http://localhost:5173/apply/lumos/{jobId}
```

---

## Folder structure

```
hireiq/
├── server/
│   ├── db/init.js          SQLite schema + seed
│   ├── services/
│   │   ├── claudeService.js   4 AI modes: analyze, generate, evaluate, report
│   │   ├── sandboxService.js  Code execution (JS + Python)
│   │   └── resumeParser.js    PDF text extraction
│   ├── controllers/         Route handlers
│   ├── routes/              Express routes
│   ├── middleware/          Auth + upload
│   └── index.js             Server entry
└── client/
    └── src/
        ├── pages/
        │   ├── auth/        Login + Register
        │   ├── recruiter/   Dashboard, Jobs, Reports
        │   └── candidate/   Apply, Instructions, TestRoom, Complete
        ├── context/         Auth state
        └── services/        Axios API client
```

---

## Security

- Test questions metadata (answers, rubrics) never sent to frontend — stored server-side only
- Copy-paste disabled in test, fullscreen enforced, right-click blocked
- Tab switches tracked and auto-submit on 3rd switch
- AI-generated answers flagged during evaluation
- JWT auth for recruiter portal, session tokens for candidates

---

Built with ❤️ by Pavan · Shevann
