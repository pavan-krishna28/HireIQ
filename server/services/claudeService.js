const Anthropic = require('@anthropic-ai/sdk');

const MODELS = [
  process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  'claude-3-5-haiku-latest',
  'claude-3-opus-latest',
  'claude-3-sonnet-20240229',
  'claude-2.1',
  'claude-instant-1.1'
].filter(Boolean);

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const callClaude = async (prompt, retries = 1, modelIndex = 0, maxTokens = 8192) => {
  const model = MODELS[modelIndex] || MODELS[0];

  try {
    const client = getClient();
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response?.content;
    if (!content) return null;

    return content
      .map(block => typeof block === 'string' ? block : (block.text || ''))
      .join('')
      .trim();
  } catch (err) {
    const message = err?.message || '';
    const isModelNotFound = /not_found_error|model.*not found/i.test(message) || /model: claude-/i.test(message);
    if (isModelNotFound && modelIndex + 1 < MODELS.length) {
      console.warn(`Model ${model} not available, trying fallback model ${MODELS[modelIndex + 1]}`);
      return callClaude(prompt, retries, modelIndex + 1, maxTokens);
    }

    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return callClaude(prompt, retries - 1, modelIndex, maxTokens);
    }
    console.error('Claude API error:', err?.message || err);
    if (err?.response) {
      console.error('Anthropic response status:', err.response.status);
      console.error('Anthropic response data:', err.response.data);
    }
    throw err;
  }
};

const parseJSON = (text) => {
  if (!text) return null;
  try {
    const clean = text.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    return null;
  }
};

const analyzeResume = async (resumeText, job, minMatchPercent) => {
  const prompt = `You are HireIQ, an AI hiring assistant. Analyze this resume against the job requirements. Return ONLY valid JSON, no other text, no markdown.

RESUME TEXT:
${resumeText}

JOB TITLE: ${job.title}
ROLE TYPE: ${job.role_type}
REQUIRED SKILLS: ${JSON.parse(job.required_skills || '[]').join(', ')}
PREFERRED SKILLS: ${JSON.parse(job.preferred_skills || '[]').join(', ')}
EXPERIENCE LEVEL REQUIRED: ${job.experience_level}
MINIMUM MATCH %: ${minMatchPercent}

Return this exact JSON:
{
  "candidate_name": "extracted from resume",
  "match_score": 0,
  "matched_skills": [],
  "missing_skills": [],
  "experience_years": 0,
  "experience_level": "intern|junior|mid|senior",
  "education_match": true,
  "key_skills_found": [],
  "proceed_to_test": true,
  "rejection_reason": "",
  "rejection_message": ""
}

Rules:
- match_score: percentage of required skills matched (0-100)
- If match_score < ${minMatchPercent}, set proceed_to_test to false
- rejection_message: warm, specific, encouraging. Mention exactly which skills are missing. Never generic.
- If proceed_to_test is true, rejection_message and rejection_reason should be empty strings`;

  const result = await callClaude(prompt);
  return result ? parseJSON(result) : null;
};

const generateTest = async (resumeAnalysis, job, customQuestions = []) => {
  const breakdown = JSON.parse(job.question_type_breakdown || '{"mcq":50,"subjective":30,"coding":20}');
  const topics = JSON.parse(job.topics || '[]');
  const totalQ = job.question_count || 20;

  const mcqCount = Math.max(1, Math.round((breakdown.mcq / 100) * totalQ));
  const subjCount = Math.max(1, Math.round((breakdown.subjective / 100) * totalQ));
  const codeCount = job.coding_required ? Math.max(1, Math.round(((breakdown.coding || 20) / 100) * totalQ)) : 0;

  const prompt = `You are HireIQ test generator. Generate a personalized hiring test. Return ONLY a valid JSON array, no other text, no markdown.

CANDIDATE:
- Name: ${resumeAnalysis.candidate_name}
- Experience: ${resumeAnalysis.experience_years} years (${resumeAnalysis.experience_level})
- Matched Skills: ${(resumeAnalysis.matched_skills || []).join(', ')}
- Key Skills: ${(resumeAnalysis.key_skills_found || []).join(', ')}

JOB: ${job.title} | ${job.role_type} | Difficulty: ${job.difficulty}
TOPICS: ${topics.length > 0 ? topics.join(', ') : 'Based on candidate skills and role'}

GENERATE EXACTLY:
- ${mcqCount} MCQ questions
- ${subjCount} subjective questions
- ${codeCount} coding questions

RULES:
- Go deeper on skills they claim to know — don't ask beginner questions for expert-listed skills
- MCQ: 4 options (A/B/C/D), only 1 correct, plausible distractors
- Subjective: real scenarios, test reasoning not memorization, ask "why" and "how"
- Coding: pure logic only — no DB, no network, no filesystem. Include sample input/output.
- Never ask questions answerable by Googling a definition
- Mix difficulty: 30% easy, 40% medium, 30% hard

Return JSON array — each item exactly:
{
  "question_id": "q1",
  "type": "mcq|subjective|coding",
  "question": "full question text",
  "options": {"A":"","B":"","C":"","D":""},
  "time_limit_seconds": 0,
  "difficulty": "easy|medium|hard",
  "topic": "topic name",
  "is_custom": false,
  "language": null,
  "sample_input": null,
  "sample_output": null,
  "metadata": {
    "correct_answer": "for MCQ: A/B/C/D, for subjective: rubric text, for coding: solution code",
    "explanation": "why this is correct",
    "key_points": ["key point 1", "key point 2"],
    "expected_complexity": "O(n) for coding only"
  }
}

Notes: options = null for non-MCQ. language = programming language for coding only. sample_input/sample_output for coding only.`;

  const result = await callClaude(prompt);
  let questions = result ? parseJSON(result) : [];
  if (!Array.isArray(questions) && questions?.questions) questions = questions.questions;
  if (!Array.isArray(questions) && questions?.data) questions = questions.data;
  if (!Array.isArray(questions)) questions = [];

  const custom = (customQuestions || []).map((q, i) => ({
    question_id: `custom_${i + 1}`,
    type: q.type,
    question: q.question,
    options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : null,
    time_limit_seconds: q.time_limit_seconds || 0,
    difficulty: 'medium',
    topic: 'Recruiter Question',
    is_custom: true,
    language: null,
    sample_input: null,
    sample_output: null,
    metadata: {
      correct_answer: q.correct_answer || '',
      explanation: '',
      key_points: [],
      expected_complexity: ''
    }
  }));

  return [...questions, ...custom];
};

const evaluateAnswer = async (question, answerText, codeOutput = null) => {
  const maxScore = question.type === 'mcq' ? 1 : 10;
  if (!answerText || answerText.trim() === '') {
    return { score: 0, max_score: maxScore, ai_flagged: false, ai_flag_reason: '', feedback: 'No attempt made', strong_points: [], weak_points: ['No answer provided'] };
  }

  const prompt = `You are HireIQ answer evaluator. Evaluate this answer fairly. Return ONLY valid JSON, no other text.

QUESTION TYPE: ${question.type}
QUESTION: ${question.question}
DIFFICULTY: ${question.difficulty}
${question.type === 'mcq' ? `OPTIONS: ${JSON.stringify(question.options)}` : ''}
${question.metadata?.correct_answer ? `EXPECTED/RUBRIC: ${question.metadata.correct_answer}` : ''}
${question.metadata?.key_points?.length ? `KEY POINTS TO COVER: ${question.metadata.key_points.join(', ')}` : ''}

CANDIDATE ANSWER: ${answerText}
${codeOutput ? `CODE OUTPUT: ${codeOutput}` : ''}

AI-GENERATED DETECTION — flag if answer has:
- Overly perfect bullet structure for a simple question
- Phrases: "Certainly!", "As an AI", "In conclusion", "It's worth noting", "Great question"
- No personal opinion, no natural imperfection, no experience reference
- Suspiciously comprehensive for time given
- Formal language inconsistent with candidate's experience level

Return JSON:
{
  "score": 0,
  "max_score": ${maxScore},
  "ai_flagged": false,
  "ai_flag_reason": "",
  "feedback": "brief constructive feedback",
  "strong_points": [],
  "weak_points": []
}`;

  const result = await callClaude(prompt);
  return result ? parseJSON(result) : { score: 0, max_score: maxScore, ai_flagged: false, ai_flag_reason: '', feedback: 'Evaluation failed', strong_points: [], weak_points: [] };
};

const generateReport = async (candidate, job, evaluatedAnswers, proctoringFlags) => {
  const totalScore = evaluatedAnswers.reduce((s, a) => s + (a.score || 0), 0);
  const maxScore = evaluatedAnswers.reduce((s, a) => s + (a.max_score || 0), 0);
  const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(2) : 0;
  const aiFlagCount = evaluatedAnswers.filter(a => a.ai_flagged).length;

  const mcqAnswers = evaluatedAnswers.filter(a => a.type === 'mcq');
  const subjAnswers = evaluatedAnswers.filter(a => a.type === 'subjective');
  const codeAnswers = evaluatedAnswers.filter(a => a.type === 'coding');

  const prompt = `You are HireIQ report generator. Generate a hiring report. Return ONLY valid JSON, no other text.

CANDIDATE: ${candidate.name} | ROLE: ${job.title} (${job.role_type})
SCORE: ${totalScore}/${maxScore} (${percentage}%)
AI FLAGS: ${aiFlagCount} | PROCTORING FLAGS: ${proctoringFlags.length}

ANSWER BREAKDOWN:
${evaluatedAnswers.map(a => `- [${a.type}] Score: ${a.score}/${a.max_score} | ${(a.feedback || '').substring(0, 80)}`).join('\n')}

THRESHOLDS:
- Strong Hire: 85%+, 0 AI flags, 0 proctoring violations
- Hire: 70-84%, max 1 AI flag
- Maybe: 55-69%, or good score but flags present  
- Reject: below 55%, or 3+ flags regardless of score

Return JSON:
{
  "recommendation": "Strong Hire|Hire|Maybe|Reject",
  "recommendation_reason": "2-3 sentences explaining why",
  "section_scores": {
    "mcq": {"score": ${mcqAnswers.reduce((s,a)=>s+(a.score||0),0)}, "max": ${mcqAnswers.reduce((s,a)=>s+(a.max_score||0),0)}},
    "subjective": {"score": ${subjAnswers.reduce((s,a)=>s+(a.score||0),0)}, "max": ${subjAnswers.reduce((s,a)=>s+(a.max_score||0),0)}},
    "coding": {"score": ${codeAnswers.reduce((s,a)=>s+(a.score||0),0)}, "max": ${codeAnswers.reduce((s,a)=>s+(a.max_score||0),0)}}
  },
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1", "gap 2"],
  "recruiter_notes": "2-3 sentence quick summary a busy recruiter reads in 10 seconds"
}`;

  const result = await callClaude(prompt);
  const parsed = result ? parseJSON(result) : {};

  return {
    total_score: totalScore,
    max_possible_score: maxScore,
    percentage: parseFloat(percentage),
    ai_flag_count: aiFlagCount,
    ...(parsed || {})
  };
};

const suggestTopics = async (roleType, requiredSkills, experienceLevel) => {
  const prompt = `You are HireIQ. Suggest assessment topics. Return ONLY a JSON array of strings, no other text.

ROLE: ${roleType}
SKILLS: ${requiredSkills.join(', ')}
LEVEL: ${experienceLevel}

Return 8-12 specific, testable topics as a JSON array. Be specific not generic.
Example: ["React Hooks & Context", "REST API Design", "SQL Query Optimization"]`;

  const result = await callClaude(prompt);
  const parsed = result ? parseJSON(result) : null;
  return Array.isArray(parsed) ? parsed : [];
};

module.exports = { analyzeResume, generateTest, evaluateAnswer, generateReport, suggestTopics };
