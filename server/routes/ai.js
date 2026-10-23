const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const { suggestTopics, generateTest } = require('../services/claudeService');
const { buildPool } = require('../services/questionBank');
router.use(authMiddleware);

router.post('/suggest-topics', async (req, res) => {
  const { role_type, required_skills, experience_level } = req.body;
  const topics = await suggestTopics(role_type, required_skills || [], experience_level || 'junior');
  res.json({ topics });
});

router.post('/generate-questions', async (req, res) => {
  const {
    role_type, experience_level, required_skills, topics,
    difficulty, question_count, question_type_breakdown, coding_required
  } = req.body;

  const resumeAnalysis = {
    candidate_name: 'Candidate',
    match_score: 100,
    matched_skills: required_skills || [],
    missing_skills: [],
    experience_years: 0,
    experience_level: experience_level || 'junior',
    education_match: true,
    key_skills_found: required_skills || [],
    proceed_to_test: true,
    rejection_reason: '',
    rejection_message: ''
  };

  const jobData = {
    title: role_type || 'Position',
    role_type: role_type || 'engineering',
    difficulty: difficulty || 'medium',
    question_count: question_count || 20,
    question_type_breakdown: JSON.stringify(question_type_breakdown || { mcq: 50, subjective: 30, coding: 20 }),
    topics: JSON.stringify(topics || []),
    coding_required: coding_required ? 1 : 0,
  };

  let questions = [];

  // 1. Try AI generation
  try {
    questions = await generateTest(resumeAnalysis, jobData, []);
    if (Array.isArray(questions) && questions.length > 0) {
      return res.json({ questions, source: 'ai' });
    }
    console.warn('generate-questions: AI returned empty array — falling back to question bank');
  } catch (err) {
    console.error('generate-questions AI error:', err?.message || err);
  }

  // 2. Fall back to question bank
  try {
    questions = buildPool(jobData.role_type, required_skills || [], question_count || 20, (question_count || 20) + 10);
    if (Array.isArray(questions) && questions.length > 0) {
      return res.json({ questions, source: 'bank' });
    }
  } catch (bankErr) {
    console.error('generate-questions bank fallback error:', bankErr?.message || bankErr);
  }

  res.status(500).json({
    error: 'Could not generate questions — the AI API may be unavailable or over quota. Check your ANTHROPIC_API_KEY in server/.env and verify it has credits.'
  });
});

module.exports = router;
