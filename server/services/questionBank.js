const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[\W_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.trim());
};

const buildVector = (text) => new Set(tokenize(text));

const jaccardSimilarity = (setA, setB) => {
  if (!setA.size || !setB.size) return 0;
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

const shuffleQuestions = (questions) => {
  const arr = [...questions];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Minimal curated bank — extend as needed.
const bankQuestions = [
  {
    question_id: 'eng_mcq_1',
    role_type: 'engineering',
    type: 'mcq',
    question: 'Which of the following JavaScript keywords prevents reassignment?',
    options: { A: 'let', B: 'var', C: 'const', D: 'function' },
    time_limit_seconds: 30,
    difficulty: 'easy',
    topic: 'JavaScript',
    is_custom: false,
    language: null,
    sample_input: null,
    sample_output: null,
    metadata: {
      correct_answer: 'C',
      explanation: 'const declares a read-only reference.',
      key_points: ['const is block-scoped', 'prevents reassignment'],
      expected_complexity: ''
    }
  },
  {
    question_id: 'eng_mcq_2',
    role_type: 'engineering',
    type: 'mcq',
    question: 'What is the average time complexity for property lookup in a JavaScript object?',
    options: { A: 'O(1)', B: 'O(log n)', C: 'O(n)', D: 'O(n log n)' },
    time_limit_seconds: 30,
    difficulty: 'easy',
    topic: 'Algorithms',
    is_custom: false,
    language: null,
    sample_input: null,
    sample_output: null,
    metadata: { correct_answer: 'A', explanation: 'Average O(1) via hash table lookup', key_points: ['hash table', 'constant time'], expected_complexity: '' }
  },
  {
    question_id: 'eng_subj_1',
    role_type: 'engineering',
    type: 'subjective',
    question: 'Describe a time you optimized a slow frontend component. What was the problem and how did you measure improvement?',
    options: null,
    time_limit_seconds: 300,
    difficulty: 'medium',
    topic: 'Frontend',
    is_custom: false,
    language: null,
    sample_input: null,
    sample_output: null,
    metadata: { correct_answer: 'rubric: measurable improvement, profiling used, tradeoffs discussed', explanation: '', key_points: ['profiling', 'metrics', 'tradeoffs'], expected_complexity: '' }
  },
  {
    question_id: 'eng_code_1',
    role_type: 'engineering',
    type: 'coding',
    question: 'Write a function that returns the nth Fibonacci number (iterative).',
    options: null,
    time_limit_seconds: 600,
    difficulty: 'medium',
    topic: 'Algorithms',
    is_custom: false,
    language: 'javascript',
    sample_input: 'n=7',
    sample_output: '13',
    metadata: { correct_answer: 'function fib(n) { ... }', explanation: 'Use iteration to avoid recursion overhead', key_points: ['iterative solution', 'O(n) time'], expected_complexity: 'O(n)' }
  },
  {
    question_id: 'eng_mcq_3',
    role_type: 'engineering',
    type: 'mcq',
    question: 'Which CSS layout is ideal for a single-axis responsive layout?',
    options: { A: 'grid', B: 'flexbox', C: 'table', D: 'float' },
    time_limit_seconds: 30,
    difficulty: 'medium',
    topic: 'CSS',
    is_custom: false,
    language: null,
    sample_input: null,
    sample_output: null,
    metadata: { correct_answer: 'B', explanation: 'Flexbox is for single-axis layouts', key_points: ['flex-direction', 'wrap'], expected_complexity: '' }
  },
  {
    question_id: 'eng_mcq_4',
    role_type: 'engineering',
    type: 'mcq',
    question: 'Which SQL keyword removes duplicate rows from results?',
    options: { A: 'GROUP BY', B: 'DISTINCT', C: 'UNION', D: 'HAVING' },
    time_limit_seconds: 30,
    difficulty: 'easy',
    topic: 'Databases',
    is_custom: false,
    language: null,
    sample_input: null,
    sample_output: null,
    metadata: { correct_answer: 'B', explanation: 'DISTINCT removes duplicates', key_points: ['SELECT DISTINCT'], expected_complexity: '' }
  },

  // ── Testing ──────────────────────────────────────────────────────────────────
  { question_id:'test_mcq_1', role_type:'testing', type:'mcq', question:'What is the primary goal of regression testing?', options:{A:'Test new features only',B:'Ensure existing functionality is not broken by new changes',C:'Measure code coverage',D:'Validate UI layouts'}, time_limit_seconds:60, difficulty:'easy', topic:'Testing Fundamentals', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Regression testing verifies existing features still work after changes.', key_points:['regression','change impact'], expected_complexity:''} },
  { question_id:'test_mcq_2', role_type:'testing', type:'mcq', question:'In the test pyramid, which type should make up the largest proportion?', options:{A:'E2E tests',B:'Manual tests',C:'Unit tests',D:'Integration tests'}, time_limit_seconds:60, difficulty:'easy', topic:'Test Strategy', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'Unit tests are fast and cheap — they form the base of the pyramid.', key_points:['test pyramid','unit tests'], expected_complexity:''} },
  { question_id:'test_mcq_3', role_type:'testing', type:'mcq', question:'What does the Page Object Model (POM) pattern achieve in Selenium?', options:{A:'Faster test execution',B:'Separates UI locators from test logic',C:'Auto-generates test data',D:'Eliminates flaky tests'}, time_limit_seconds:60, difficulty:'medium', topic:'Selenium', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'POM separates locators from test logic for maintainability.', key_points:['POM','separation of concerns'], expected_complexity:''} },
  { question_id:'test_mcq_4', role_type:'testing', type:'mcq', question:'Which HTTP status code indicates a resource was successfully created via POST?', options:{A:'200',B:'201',C:'204',D:'301'}, time_limit_seconds:60, difficulty:'easy', topic:'API Testing', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'201 Created is the correct status for a new resource.', key_points:['HTTP 201'], expected_complexity:''} },
  { question_id:'test_subj_1', role_type:'testing', type:'subjective', question:'A critical bug is found 1 hour before a production release. Walk through exactly how you handle it.', options:null, time_limit_seconds:300, difficulty:'hard', topic:'QA Process', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: severity assessment, stakeholder communication, options presented (hotfix/flag/delay), documented decision', explanation:'', key_points:['severity','communication','decision-making'], expected_complexity:''} },
  { question_id:'test_subj_2', role_type:'testing', type:'subjective', question:'Explain shift-left testing and give a concrete example of how you have applied it.', options:null, time_limit_seconds:300, difficulty:'medium', topic:'QA Strategy', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: testing earlier in SDLC, requirements review, TDD, measurable outcome', explanation:'', key_points:['shift-left','early testing','cost reduction'], expected_complexity:''} },
  { question_id:'test_code_1', role_type:'testing', type:'coding', question:'Write a Python function is_valid_email(email) that returns True if the email has a valid format, False otherwise.', options:null, time_limit_seconds:600, difficulty:'easy', topic:'Python / Automation', is_custom:false, language:'python', sample_input:'user@example.com', sample_output:'True', metadata:{correct_answer:'import re\ndef is_valid_email(e): return bool(re.match(r"^[\\w.+-]+@[\\w-]+\\.[\\w.]+$", e))', explanation:'Use regex to validate format.', key_points:['regex','re.match'], expected_complexity:'O(n)'} },

  // ── HR ────────────────────────────────────────────────────────────────────────
  { question_id:'hr_mcq_1', role_type:'hr', type:'mcq', question:'Which employment law framework governs workplace discrimination in the United States?', options:{A:'FLSA',B:'Title VII of the Civil Rights Act',C:'ERISA',D:'OSHA'}, time_limit_seconds:60, difficulty:'medium', topic:'Employment Law', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Title VII prohibits employment discrimination based on race, color, religion, sex, or national origin.', key_points:['Title VII','protected classes'], expected_complexity:''} },
  { question_id:'hr_mcq_2', role_type:'hr', type:'mcq', question:'What is the primary purpose of an HRIS (Human Resource Information System)?', options:{A:'Track employee social media',B:'Centralize and automate HR data and processes',C:'Replace HR business partners',D:'Conduct performance appraisals automatically'}, time_limit_seconds:60, difficulty:'easy', topic:'HR Systems', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'HRIS centralizes employee data and automates HR workflows.', key_points:['HRIS','automation','centralization'], expected_complexity:''} },
  { question_id:'hr_mcq_3', role_type:'hr', type:'mcq', question:'What does "at-will employment" mean?', options:{A:'Employees can only be fired for cause',B:'Either party may end the employment relationship at any time for any legal reason',C:'Employees work flexible hours',D:'Employers must provide 2 weeks notice'}, time_limit_seconds:60, difficulty:'medium', topic:'Employment Law', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'At-will means either party can end the relationship at any time for any legal reason.', key_points:['at-will','termination'], expected_complexity:''} },
  { question_id:'hr_mcq_4', role_type:'hr', type:'mcq', question:'Which metric measures how long it takes from job requisition approval to offer accepted?', options:{A:'Time to Fill',B:'Cost per Hire',C:'Employee NPS',D:'Turnover Rate'}, time_limit_seconds:60, difficulty:'easy', topic:'Recruiting Metrics', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'A', explanation:'Time to Fill measures days from req open to offer accepted.', key_points:['time to fill','recruiting metrics'], expected_complexity:''} },
  { question_id:'hr_subj_1', role_type:'hr', type:'subjective', question:'An employee comes to you alleging harassment by their manager. Walk through exactly how you handle the situation from the initial conversation to resolution.', options:null, time_limit_seconds:300, difficulty:'hard', topic:'Employee Relations', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: confidentiality maintained, formal investigation process, documentation, HR/legal involvement, corrective action, follow-up', explanation:'', key_points:['investigation','confidentiality','documentation','legal compliance'], expected_complexity:''} },
  { question_id:'hr_subj_2', role_type:'hr', type:'subjective', question:'How do you design a performance management process that actually motivates employees rather than just creating paperwork?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Performance Management', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: continuous feedback vs annual review, goal-setting frameworks (OKR/SMART), manager training, recognition tied to outcomes, calibration', explanation:'', key_points:['continuous feedback','OKR','calibration','recognition'], expected_complexity:''} },

  // ── Finance ───────────────────────────────────────────────────────────────────
  { question_id:'fin_mcq_1', role_type:'finance', type:'mcq', question:'What does EBITDA stand for?', options:{A:'Earnings Before Interest, Taxes, Depreciation, and Amortization',B:'Earnings Before Income Tax, Dividends, and Accruals',C:'Equity, Balance, Interest, Tax, Depreciation, Assets',D:'Earnings Based on Interest, Tax, Debt Adjustments'}, time_limit_seconds:60, difficulty:'easy', topic:'Financial Statements', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'A', explanation:'EBITDA is a common proxy for operating cash flow.', key_points:['EBITDA','profitability'], expected_complexity:''} },
  { question_id:'fin_mcq_2', role_type:'finance', type:'mcq', question:'In a DCF valuation, if the discount rate increases, what happens to the present value?', options:{A:'It increases',B:'It stays the same',C:'It decreases',D:'It doubles'}, time_limit_seconds:60, difficulty:'medium', topic:'Valuation', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'Higher discount rate → lower present value of future cash flows.', key_points:['DCF','discount rate','present value'], expected_complexity:''} },
  { question_id:'fin_mcq_3', role_type:'finance', type:'mcq', question:'What is the current ratio used to assess?', options:{A:'Long-term solvency',B:'Short-term liquidity',C:'Profitability trends',D:'Inventory efficiency'}, time_limit_seconds:60, difficulty:'easy', topic:'Financial Ratios', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Current ratio = current assets / current liabilities, measuring short-term liquidity.', key_points:['current ratio','liquidity'], expected_complexity:''} },
  { question_id:'fin_mcq_4', role_type:'finance', type:'mcq', question:'Which financial statement shows cash inflows and outflows over a period?', options:{A:'Income Statement',B:'Balance Sheet',C:'Cash Flow Statement',D:'Statement of Retained Earnings'}, time_limit_seconds:60, difficulty:'easy', topic:'Financial Statements', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'The Cash Flow Statement shows operating, investing, and financing cash flows.', key_points:['cash flow statement','operating/investing/financing'], expected_complexity:''} },
  { question_id:'fin_subj_1', role_type:'finance', type:'subjective', question:'Walk through how you would build a 3-statement financial model from scratch. What are the key linkages between the statements?', options:null, time_limit_seconds:300, difficulty:'hard', topic:'Financial Modeling', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: income statement drives net income → retained earnings (balance sheet) and cash flow; working capital changes link income statement to cash flow; ending cash feeds balance sheet', explanation:'', key_points:['3-statement model','linkages','net income','working capital'], expected_complexity:''} },
  { question_id:'fin_subj_2', role_type:'finance', type:'subjective', question:'Explain the difference between a company\'s book value and market value. Why might they diverge significantly?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Valuation', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: book value = assets minus liabilities on balance sheet; market value = share price × shares outstanding; diverge due to intangibles, growth expectations, brand, IP, market sentiment', explanation:'', key_points:['book value','market value','intangibles','growth expectations'], expected_complexity:''} },

  // ── Business Development (bd) ─────────────────────────────────────────────────
  { question_id:'bd_mcq_1', role_type:'bd', type:'mcq', question:'What does BANT stand for in sales qualification?', options:{A:'Budget, Authority, Need, Timeline',B:'Brand, Awareness, Nurture, Target',C:'Buyer, Account, Network, Trust',D:'Business, Alignment, Negotiation, Terms'}, time_limit_seconds:60, difficulty:'easy', topic:'Sales Methodology', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'A', explanation:'BANT: Budget, Authority, Need, Timeline — classic lead qualification framework.', key_points:['BANT','qualification'], expected_complexity:''} },
  { question_id:'bd_mcq_2', role_type:'bd', type:'mcq', question:'What is the primary difference between an inbound and outbound sales motion?', options:{A:'Inbound uses cold calls; outbound uses email',B:'Inbound leads come to you; outbound means you initiate contact',C:'Inbound is B2B; outbound is B2C',D:'They are the same thing'}, time_limit_seconds:60, difficulty:'easy', topic:'Sales Fundamentals', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Inbound = prospects find you; Outbound = you reach out to prospects.', key_points:['inbound','outbound'], expected_complexity:''} },
  { question_id:'bd_mcq_3', role_type:'bd', type:'mcq', question:'What metric measures the percentage of prospects who move from one stage to the next in a sales pipeline?', options:{A:'Win Rate',B:'ACV',C:'Conversion Rate',D:'CAC'}, time_limit_seconds:60, difficulty:'medium', topic:'Sales Metrics', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'Conversion rate tracks movement between pipeline stages.', key_points:['conversion rate','pipeline'], expected_complexity:''} },
  { question_id:'bd_mcq_4', role_type:'bd', type:'mcq', question:'What is the purpose of a mutual action plan (MAP) in enterprise sales?', options:{A:'To track competitor pricing',B:'To align both parties on steps, owners, and dates needed to close a deal',C:'To document product requirements',D:'To schedule onboarding training'}, time_limit_seconds:60, difficulty:'medium', topic:'Enterprise Sales', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'A MAP creates shared accountability and a clear path to close.', key_points:['mutual action plan','enterprise sales','close plan'], expected_complexity:''} },
  { question_id:'bd_subj_1', role_type:'bd', type:'subjective', question:'Tell me about the largest deal you have closed. Walk through how you identified it, the sales process, and what made it successful.', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Sales Experience', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: specific deal value, multi-stakeholder navigation, problem identified, value proposition articulated, objections handled, close strategy', explanation:'', key_points:['deal size','stakeholders','value prop','closing'], expected_complexity:''} },
  { question_id:'bd_subj_2', role_type:'bd', type:'subjective', question:'A prospect has gone dark after three follow-ups. What do you do?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Sales Process', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: pattern interrupt (different channel/approach), add value not just check-ins, breakup email technique, multi-thread to another contact, know when to move on', explanation:'', key_points:['follow-up strategy','pattern interrupt','breakup email'], expected_complexity:''} },

  // ── Support ───────────────────────────────────────────────────────────────────
  { question_id:'sup_mcq_1', role_type:'support', type:'mcq', question:'What is the primary goal of a First Contact Resolution (FCR) metric?', options:{A:'Measure how fast tickets are opened',B:'Track customer satisfaction surveys',C:'Measure issues resolved on the first interaction without escalation or callback',D:'Count the number of support agents active'}, time_limit_seconds:60, difficulty:'easy', topic:'Support Metrics', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'FCR measures issues resolved in a single interaction — a key efficiency metric.', key_points:['FCR','first contact resolution'], expected_complexity:''} },
  { question_id:'sup_mcq_2', role_type:'support', type:'mcq', question:'What does SLA stand for in a support context?', options:{A:'Service Level Agreement',B:'System Log Analysis',C:'Support Lead Assignment',D:'Standard Language Approach'}, time_limit_seconds:60, difficulty:'easy', topic:'Support Operations', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'A', explanation:'SLA = Service Level Agreement, defining response/resolution time commitments.', key_points:['SLA','response time'], expected_complexity:''} },
  { question_id:'sup_mcq_3', role_type:'support', type:'mcq', question:'A customer is angry and using aggressive language on a call. What is the most effective first step?', options:{A:'Transfer them immediately to a manager',B:'Defend the company\'s actions',C:'Acknowledge their frustration empathetically before attempting to solve the problem',D:'Put them on hold to calm down'}, time_limit_seconds:60, difficulty:'medium', topic:'Customer Communication', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'Empathy first — acknowledge the feeling before jumping to solutions.', key_points:['de-escalation','empathy first'], expected_complexity:''} },
  { question_id:'sup_mcq_4', role_type:'support', type:'mcq', question:'Which support model routes tickets to agents based on skills or specialization?', options:{A:'Round-robin routing',B:'Skills-based routing',C:'Priority queue',D:'Random assignment'}, time_limit_seconds:60, difficulty:'medium', topic:'Support Operations', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Skills-based routing matches tickets to agents best qualified to handle them.', key_points:['skills-based routing','specialization'], expected_complexity:''} },
  { question_id:'sup_subj_1', role_type:'support', type:'subjective', question:'Describe a time you turned a very unhappy customer into a satisfied one. What was the situation and how did you handle it?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Customer Experience', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: empathy shown, root cause addressed, resolution offered, follow-up done, positive outcome', explanation:'', key_points:['empathy','root cause','resolution','follow-up'], expected_complexity:''} },
  { question_id:'sup_subj_2', role_type:'support', type:'subjective', question:'You notice the same issue appearing in 20% of your tickets this week. What do you do?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Support Operations', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: identify and document the pattern, escalate to product/engineering, create a known issue macro for agents, proactive customer communication if needed, track resolution', explanation:'', key_points:['pattern recognition','escalation','proactive communication','documentation'], expected_complexity:''} }
];

// Build a pool of questions for a role and skill set. Returns an array sized between minCount and maxCount.
function buildPool(roleType = 'engineering', requiredSkills = [], minCount = 20, maxCount = 40) {
  // Normalize skills
  const skills = Array.isArray(requiredSkills) ? requiredSkills.map(s => String(s).toLowerCase()) : [];

  // Score questions by simple similarity between question text+topic and required skills
  const scored = bankQuestions.map(q => {
    const text = `${q.topic || ''} ${q.question}`;
    const qVec = buildVector(text);
    const skillVec = buildVector(skills.join(' '));
    const score = jaccardSimilarity(qVec, skillVec);
    const roleMatch = (q.role_type || '').toLowerCase() === (roleType || '').toLowerCase() ? 1 : 0;
    return { q, score: score + roleMatch * 0.5 };
  }).sort((a, b) => b.score - a.score);

  let selected = scored.map(s => s.q);

  // If not enough, include all and later create variants
  if (selected.length === 0) selected = [...bankQuestions];

  // Expand pool by creating lightweight variants when needed
  const target = Math.max(minCount, Math.min(maxCount, Math.floor((minCount + maxCount) / 2)));
  const out = [];
  let i = 0;
  while (out.length < target) {
    const base = selected[i % selected.length];
    // clone and assign unique id for variant
    const clone = JSON.parse(JSON.stringify(base));
    clone.question_id = `${clone.question_id}_v${Math.floor(out.length / selected.length) + 1}_${i}`;
    // occasionally tweak difficulty for variety
    if (out.length % 5 === 0 && clone.difficulty === 'easy') clone.difficulty = 'medium';
    out.push(clone);
    i++;
  }

  // final shuffle and return
  return shuffleQuestions(out);
}

module.exports = { buildPool, shuffleQuestions, bankQuestions };