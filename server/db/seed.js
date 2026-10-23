/**
 * Demo seed — run once: node db/seed.js
 * Creates 3 jobs, 11 candidates, full evaluated sessions + reports.
 */
require('dotenv').config();
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.resolve(process.env.DB_PATH || './db/hireiq.db');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const j = (v) => JSON.stringify(v);
const ago = (days, hours = 0) => {
  const d = new Date('2026-05-21T10:00:00Z');
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

// ─── Question banks ──────────────────────────────────────────────────────────
const FE_QUESTIONS = [
  { question_id:'fe_q1', type:'mcq', question:'Which React hook runs after every render and is used for side effects?', options:{A:'useState',B:'useCallback',C:'useEffect',D:'useRef'}, time_limit_seconds:60, difficulty:'easy', topic:'React Hooks', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'useEffect runs after render.', key_points:['side effects','dependency array'], expected_complexity:''} },
  { question_id:'fe_q2', type:'mcq', question:'What is the output of: typeof null in JavaScript?', options:{A:'"null"',B:'"undefined"',C:'"object"',D:'"boolean"'}, time_limit_seconds:60, difficulty:'medium', topic:'JavaScript', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'typeof null === "object" is a known JS quirk.', key_points:['typeof','null quirk'], expected_complexity:''} },
  { question_id:'fe_q3', type:'mcq', question:'Which TypeScript utility type makes all properties optional?', options:{A:'Readonly<T>',B:'Partial<T>',C:'Required<T>',D:'Omit<T>'}, time_limit_seconds:60, difficulty:'medium', topic:'TypeScript', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Partial<T> makes all props optional.', key_points:['utility types'], expected_complexity:''} },
  { question_id:'fe_q4', type:'mcq', question:'What does CSS "position: sticky" do?', options:{A:'Fixes element to viewport always',B:'Positions relative to nearest scrolling ancestor until scroll threshold',C:'Acts like position: relative',D:'Removes element from document flow'}, time_limit_seconds:60, difficulty:'medium', topic:'CSS', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Sticky is relative until scroll threshold.', key_points:['sticky positioning'], expected_complexity:''} },
  { question_id:'fe_q5', type:'mcq', question:'In React, what triggers a component re-render?', options:{A:'Only state changes',B:'Only prop changes',C:'State changes, prop changes, or parent re-renders',D:'Only when forceUpdate is called'}, time_limit_seconds:60, difficulty:'easy', topic:'React', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'All three trigger re-renders by default.', key_points:['render triggers'], expected_complexity:''} },
  { question_id:'fe_q6', type:'subjective', question:'Explain the virtual DOM and why React uses it. What performance problem does it solve?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'React Internals', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: virtual DOM as lightweight JS tree, diffing/reconciliation, batched DOM updates, avoids direct DOM manipulation overhead', explanation:'', key_points:['virtual DOM','reconciliation','diffing','batching'], expected_complexity:''} },
  { question_id:'fe_q7', type:'subjective', question:'A React application is slow on mobile. Walk through your full optimization process — how do you diagnose, prioritize, and fix performance issues?', options:null, time_limit_seconds:300, difficulty:'hard', topic:'Performance', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: profiling (React DevTools Profiler, Lighthouse), code splitting, lazy loading, memoization (useMemo/React.memo), image optimization, bundle size', explanation:'', key_points:['profiling','code splitting','lazy loading','memoization'], expected_complexity:''} },
  { question_id:'fe_q8', type:'subjective', question:'Describe a genuinely difficult frontend bug you debugged. What was it, and what was your methodology?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Debugging', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: specific scenario, systematic approach, root cause identified, preventive action taken', explanation:'', key_points:['debugging','root cause','systematic'], expected_complexity:''} },
  { question_id:'fe_q9', type:'coding', question:'Implement a debounce(fn, delay) function in JavaScript. It should only invoke fn after `delay` ms have elapsed since the last call.', options:null, time_limit_seconds:600, difficulty:'medium', topic:'JavaScript Patterns', is_custom:false, language:'javascript', sample_input:'debounce(fn, 300) — called 5 times rapidly', sample_output:'fn called exactly once, 300ms after last call', metadata:{correct_answer:'function debounce(fn, delay) { let t; return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); }; }', explanation:'Closure holds timer ref', key_points:['closure','clearTimeout'], expected_complexity:'O(1)'} },
  { question_id:'fe_q10', type:'coding', question:'Write a function flatten(arr) that flattens a deeply nested array to any depth. flatten([1,[2,[3,[4]]]]) => [1,2,3,4]', options:null, time_limit_seconds:600, difficulty:'medium', topic:'JavaScript', is_custom:false, language:'javascript', sample_input:'[1,[2,[3,[4]]]]', sample_output:'[1,2,3,4]', metadata:{correct_answer:'const flatten = arr => arr.reduce((f,i)=>f.concat(Array.isArray(i)?flatten(i):i),[]);', explanation:'Recursive reduce', key_points:['recursion','reduce'], expected_complexity:'O(n)'} }
];

const BE_QUESTIONS = [
  { question_id:'be_q1', type:'mcq', question:'What is the difference between a Python list and a tuple?', options:{A:'Lists are immutable, tuples are mutable',B:'Tuples are immutable, lists are mutable',C:'Both are immutable',D:'Both are mutable'}, time_limit_seconds:60, difficulty:'easy', topic:'Python Basics', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Tuples are immutable.', key_points:['mutability'], expected_complexity:''} },
  { question_id:'be_q2', type:'mcq', question:'Which SQL JOIN returns all rows from the left table even when there is no match in the right table?', options:{A:'INNER JOIN',B:'RIGHT JOIN',C:'LEFT JOIN',D:'CROSS JOIN'}, time_limit_seconds:60, difficulty:'easy', topic:'SQL', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'LEFT JOIN returns all left rows.', key_points:['LEFT JOIN'], expected_complexity:''} },
  { question_id:'be_q3', type:'mcq', question:'What does the @property decorator do in Python?', options:{A:'Marks a class as abstract',B:'Turns a method into a read-only attribute',C:'Creates a static method',D:'Registers a signal handler'}, time_limit_seconds:60, difficulty:'medium', topic:'Python OOP', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'@property turns a method into a readable attribute.', key_points:['property decorator','getter'], expected_complexity:''} },
  { question_id:'be_q4', type:'mcq', question:'In REST API design, which HTTP status code means "resource created successfully"?', options:{A:'200',B:'204',C:'201',D:'202'}, time_limit_seconds:60, difficulty:'easy', topic:'REST APIs', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'201 Created is the correct status for resource creation.', key_points:['HTTP 201'], expected_complexity:''} },
  { question_id:'be_q5', type:'mcq', question:'What is the purpose of a database index?', options:{A:'To enforce data types',B:'To speed up read queries at the cost of write speed',C:'To encrypt column data',D:'To create relationships between tables'}, time_limit_seconds:60, difficulty:'medium', topic:'Databases', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Indexes speed up reads but slow writes.', key_points:['index','read performance'], expected_complexity:''} },
  { question_id:'be_q6', type:'subjective', question:'Explain Django\'s ORM and when you would choose to write raw SQL instead. What are the trade-offs?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Django', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: ORM abstracts SQL, queryset API, raw SQL for complex queries/performance-critical paths, N+1 problem awareness', explanation:'', key_points:['ORM','queryset','raw SQL','N+1'], expected_complexity:''} },
  { question_id:'be_q7', type:'subjective', question:'How do you design an API endpoint that needs to handle 10,000 requests per second? Walk through your architecture decisions.', options:null, time_limit_seconds:300, difficulty:'hard', topic:'System Design', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: caching (Redis), load balancing, async processing, DB query optimization, horizontal scaling, rate limiting', explanation:'', key_points:['caching','load balancing','async','scaling'], expected_complexity:''} },
  { question_id:'be_q8', type:'subjective', question:'Describe how you would secure a REST API. What are the most common vulnerabilities and how do you prevent them?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'Security', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: JWT/OAuth, input validation, SQL injection, rate limiting, HTTPS, CORS, secret management', explanation:'', key_points:['JWT','SQL injection','rate limiting','HTTPS'], expected_complexity:''} },
  { question_id:'be_q9', type:'coding', question:'Write a Python function find_duplicates(lst) that returns a list of all duplicate values in a list. find_duplicates([1,2,2,3,3,3,4]) => [2,3]', options:null, time_limit_seconds:600, difficulty:'easy', topic:'Python', is_custom:false, language:'python', sample_input:'[1, 2, 2, 3, 3, 3, 4]', sample_output:'[2, 3]', metadata:{correct_answer:'def find_duplicates(lst): seen=set(); dups=set(); [dups.add(x) if x in seen else seen.add(x) for x in lst]; return list(dups)', explanation:'Use two sets', key_points:['set','O(n)'], expected_complexity:'O(n)'} },
  { question_id:'be_q10', type:'coding', question:'Write a Python function that groups a list of dicts by a given key. group_by([{"dept":"eng","name":"Alice"},{"dept":"eng","name":"Bob"},{"dept":"hr","name":"Carol"}], "dept") => {"eng":[...],"hr":[...]}', options:null, time_limit_seconds:600, difficulty:'medium', topic:'Python', is_custom:false, language:'python', sample_input:'list of dicts + key string', sample_output:'dict of lists grouped by key', metadata:{correct_answer:'def group_by(lst,key): r={}; [r.setdefault(d[key],[]).append(d) for d in lst]; return r', explanation:'defaultdict or setdefault', key_points:['grouping','dict'], expected_complexity:'O(n)'} }
];

const QA_QUESTIONS = [
  { question_id:'qa_q1', type:'mcq', question:'What is the difference between black-box and white-box testing?', options:{A:'Black-box tests internal code; white-box tests UI',B:'Black-box tests without code knowledge; white-box tests with code knowledge',C:'They are the same',D:'Black-box is manual; white-box is automated'}, time_limit_seconds:60, difficulty:'easy', topic:'Testing Fundamentals', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Black-box = no code access, white-box = code access.', key_points:['testing types'], expected_complexity:''} },
  { question_id:'qa_q2', type:'mcq', question:'What does a regression test verify?', options:{A:'New features work correctly',B:'Previously working functionality still works after changes',C:'Performance benchmarks',D:'Database integrity'}, time_limit_seconds:60, difficulty:'easy', topic:'Testing Types', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Regression tests ensure existing functionality is not broken.', key_points:['regression'], expected_complexity:''} },
  { question_id:'qa_q3', type:'mcq', question:'In the test pyramid, which test type should you have the MOST of?', options:{A:'E2E tests',B:'Integration tests',C:'Unit tests',D:'Manual tests'}, time_limit_seconds:60, difficulty:'easy', topic:'Test Strategy', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'C', explanation:'Unit tests are fast and cheap — most of the pyramid base.', key_points:['test pyramid'], expected_complexity:''} },
  { question_id:'qa_q4', type:'mcq', question:'What is a test fixture in automated testing?', options:{A:'A bug report template',B:'Fixed state/data set up before tests run',C:'A performance benchmark',D:'A CI pipeline step'}, time_limit_seconds:60, difficulty:'medium', topic:'Test Automation', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'Fixtures set up known state for tests.', key_points:['fixture','setup'], expected_complexity:''} },
  { question_id:'qa_q5', type:'mcq', question:'What is the primary advantage of using Page Object Model (POM) in Selenium?', options:{A:'Faster test execution',B:'Separates UI locators from test logic for easier maintenance',C:'Eliminates the need for a test framework',D:'Generates test data automatically'}, time_limit_seconds:60, difficulty:'medium', topic:'Selenium', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'B', explanation:'POM separates locators from test logic.', key_points:['POM','maintainability'], expected_complexity:''} },
  { question_id:'qa_q6', type:'subjective', question:'You discover a critical bug one hour before a major release. How do you handle this situation? Walk through your decision process.', options:null, time_limit_seconds:300, difficulty:'hard', topic:'QA Process', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: severity assessment, stakeholder communication, risk analysis, patch vs delay decision, documentation', explanation:'', key_points:['severity','communication','risk','decision-making'], expected_complexity:''} },
  { question_id:'qa_q7', type:'subjective', question:'Explain shift-left testing. How have you applied it, and what results did you see?', options:null, time_limit_seconds:300, difficulty:'medium', topic:'QA Strategy', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: testing earlier in SDLC, requirements review, TDD, early bug detection reduces cost, collaboration with devs', explanation:'', key_points:['shift-left','early testing','TDD','cost'], expected_complexity:''} },
  { question_id:'qa_q8', type:'subjective', question:'Describe your experience designing a test automation framework from scratch. What decisions did you make and why?', options:null, time_limit_seconds:300, difficulty:'hard', topic:'Test Automation', is_custom:false, language:null, sample_input:null, sample_output:null, metadata:{correct_answer:'Rubric: framework selection, POM pattern, reporting, CI integration, data management, maintenance strategy', explanation:'', key_points:['framework design','POM','CI/CD','reporting'], expected_complexity:''} },
  { question_id:'qa_q9', type:'coding', question:'Write a Python function that validates an email address format using a regex. is_valid_email("user@example.com") => True, is_valid_email("notanemail") => False', options:null, time_limit_seconds:600, difficulty:'easy', topic:'Python/Testing', is_custom:false, language:'python', sample_input:'user@example.com', sample_output:'True', metadata:{correct_answer:'import re\ndef is_valid_email(e): return bool(re.match(r"^[\\w.+-]+@[\\w-]+\\.[\\w.]+$", e))', explanation:'Basic email regex', key_points:['regex'], expected_complexity:'O(n)'} },
  { question_id:'qa_q10', type:'coding', question:'Write a Python function that parses a log file line and extracts the timestamp, level, and message. Input: "[2026-05-10 14:32:01] ERROR: Database connection failed"', options:null, time_limit_seconds:600, difficulty:'medium', topic:'Python', is_custom:false, language:'python', sample_input:'[2026-05-10 14:32:01] ERROR: Database connection failed', sample_output:'{timestamp: "2026-05-10 14:32:01", level: "ERROR", message: "Database connection failed"}', metadata:{correct_answer:'import re\ndef parse_log(line): m=re.match(r"\\[(.+?)\\] (\\w+): (.+)", line); return {"timestamp":m.group(1),"level":m.group(2),"message":m.group(3)} if m else None', explanation:'Named groups in regex', key_points:['regex','parsing'], expected_complexity:'O(n)'} }
];

// ─── Candidates with resume data ─────────────────────────────────────────────
const CANDIDATES = [
  // Frontend candidates
  { id:'cand-001', name:'Sarah Chen', email:'sarah.chen@gmail.com', phone:'+1-415-555-0192',
    resume_parsed: j({ candidate_name:'Sarah Chen', match_score:94, matched_skills:['React','TypeScript','CSS3','JavaScript','HTML5'], missing_skills:[], experience_years:5, experience_level:'senior', education_match:true, key_skills_found:['React','TypeScript','CSS3','JavaScript','HTML5'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  { id:'cand-002', name:'Marcus Williams', email:'marcus.w@outlook.com', phone:'+1-312-555-0847',
    resume_parsed: j({ candidate_name:'Marcus Williams', match_score:82, matched_skills:['React','JavaScript','HTML5','CSS3'], missing_skills:['TypeScript'], experience_years:3, experience_level:'mid', education_match:true, key_skills_found:['React','JavaScript'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  { id:'cand-003', name:'Alex Thompson', email:'alex.t@gmail.com', phone:'+1-206-555-0334',
    resume_parsed: j({ candidate_name:'Alex Thompson', match_score:74, matched_skills:['React','JavaScript','HTML5'], missing_skills:['TypeScript','CSS3'], experience_years:2, experience_level:'junior', education_match:true, key_skills_found:['React','JavaScript'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  { id:'cand-004', name:'Priya Patel', email:'priya.p@yahoo.com', phone:'+1-408-555-0561',
    resume_parsed: j({ candidate_name:'Priya Patel', match_score:48, matched_skills:['JavaScript','HTML5'], missing_skills:['React','TypeScript','CSS3'], experience_years:1, experience_level:'intern', education_match:false, key_skills_found:['JavaScript'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  // Backend candidates
  { id:'cand-005', name:'James Rodriguez', email:'james.r@gmail.com', phone:'+1-512-555-0723',
    resume_parsed: j({ candidate_name:'James Rodriguez', match_score:96, matched_skills:['Python','Django','PostgreSQL','REST APIs','Docker'], missing_skills:[], experience_years:6, experience_level:'senior', education_match:true, key_skills_found:['Python','Django','PostgreSQL','Docker'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  { id:'cand-006', name:'Emma Johnson', email:'emma.j@outlook.com', phone:'+1-617-555-0288',
    resume_parsed: j({ candidate_name:'Emma Johnson', match_score:80, matched_skills:['Python','PostgreSQL','REST APIs'], missing_skills:['Django','Docker'], experience_years:3, experience_level:'mid', education_match:true, key_skills_found:['Python','PostgreSQL'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  { id:'cand-007', name:'Nina Sharma', email:'nina.s@gmail.com', phone:'+1-702-555-0419',
    resume_parsed: j({ candidate_name:'Nina Sharma', match_score:76, matched_skills:['Python','Django','REST APIs'], missing_skills:['PostgreSQL','Docker'], experience_years:3, experience_level:'mid', education_match:true, key_skills_found:['Python','Django'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  { id:'cand-008', name:'David Kim', email:'david.k@gmail.com', phone:'+1-213-555-0655',
    resume_parsed: j({ candidate_name:'David Kim', match_score:58, matched_skills:['Python','REST APIs'], missing_skills:['Django','PostgreSQL','Docker'], experience_years:1, experience_level:'junior', education_match:true, key_skills_found:['Python'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  // QA candidates
  { id:'cand-009', name:'Lisa Wang', email:'lisa.w@gmail.com', phone:'+1-650-555-0177',
    resume_parsed: j({ candidate_name:'Lisa Wang', match_score:92, matched_skills:['Selenium','Python','JIRA','Test Automation','API Testing'], missing_skills:[], experience_years:5, experience_level:'senior', education_match:true, key_skills_found:['Selenium','Python','JIRA','Test Automation'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  { id:'cand-010', name:'Raj Mehta', email:'raj.m@gmail.com', phone:'+1-972-555-0392',
    resume_parsed: j({ candidate_name:'Raj Mehta', match_score:84, matched_skills:['Selenium','Python','JIRA','Test Automation'], missing_skills:['API Testing'], experience_years:4, experience_level:'mid', education_match:true, key_skills_found:['Selenium','Python','JIRA'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
  { id:'cand-011', name:'Tom Bradley', email:'tom.b@outlook.com', phone:'+1-214-555-0516',
    resume_parsed: j({ candidate_name:'Tom Bradley', match_score:66, matched_skills:['Selenium','JIRA'], missing_skills:['Python','Test Automation','API Testing'], experience_years:2, experience_level:'junior', education_match:true, key_skills_found:['Selenium','JIRA'], proceed_to_test:true, rejection_reason:'', rejection_message:'' }) },
];

// ─── Session answers ──────────────────────────────────────────────────────────
// Returns array of answer objects for a given candidate profile
function feAnswers(profile) {
  const a = (qid, type, text, opt, score, max, flagged, reason, fb, strong, weak) => ({
    id: uuidv4(), question_id: qid, type,
    answer_text: text || null, selected_option: opt || null, code_output: null,
    time_taken_seconds: Math.floor(Math.random() * 120) + 30,
    score, max_score: max, ai_flagged: flagged ? 1 : 0,
    ai_flag_reason: reason || '', feedback: fb,
    strong_points: j(strong), weak_points: j(weak)
  });

  if (profile === 'strong') return [
    a('fe_q1','mcq',null,'C',1,1,false,'','Correct — useEffect is the right answer.',['Correct choice'],['None']),
    a('fe_q2','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q3','mcq',null,'C',1,1,false,'','Correct — typeof null === "object".',['Correct'],['None']),
    a('fe_q4','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q5','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q6','subjective','The virtual DOM is a lightweight in-memory JavaScript representation of the real DOM. When state changes, React creates a new virtual DOM tree, diffs it against the previous one using its reconciliation algorithm (Fiber since React 16), and computes the minimal set of real DOM mutations needed. This batching prevents expensive layout thrashing. In a large dashboard I worked on, profiling showed 70% of renders were unnecessary — after restructuring component trees and adding proper keys, we cut re-render time by 60%.',null,9,10,false,'','Excellent explanation with specific experience.',['Virtual DOM explained clearly','Reconciliation algorithm mentioned','Real production example shared'],['Could mention concurrent mode']),
    a('fe_q7','subjective','I start with React DevTools Profiler to identify components with high render times, then Lighthouse for mobile-specific metrics (FCP, LCP, CLS). My checklist: (1) Code-split heavy routes with React.lazy, (2) Memoize expensive computations with useMemo and pure components with React.memo, (3) Optimize images — WebP, lazy loading, proper sizes, (4) Audit bundle with webpack-bundle-analyzer to remove unused deps, (5) Move heavy work off the main thread with web workers if needed. On a past project this reduced mobile LCP from 8s to 1.9s.',null,9,10,false,'','Comprehensive, structured answer with concrete results.',['Systematic approach','Specific tools mentioned','Quantified results'],['None']),
    a('fe_q8','subjective','On a complex SPA, users reported intermittent scroll positions resetting. I reproduced it in dev tools, noticed it happened only after route transitions. I added console logs around route change events and discovered the ScrollRestoration component was being unmounted and remounted instead of updating. The root cause was a missing stable key — React was treating it as a new mount. Fix: moved ScrollRestoration outside the route tree. I added an E2E test to catch it in the future.',null,8,10,false,'','Specific, well-structured debugging story.',['Clear problem statement','Systematic debugging','Root cause identified','Prevention added'],['Minor: could quantify user impact']),
    a('fe_q9','coding','function debounce(fn, delay) {\n  let timer;\n  return function(...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), delay);\n  };\n}',null,9,10,false,'','Clean, correct implementation.',['Correct logic','Handles context correctly','Clean code'],['Could add leading edge option']),
    a('fe_q10','coding','const flatten = (arr) => arr.reduce((acc, item) => \n  acc.concat(Array.isArray(item) ? flatten(item) : item), []);',null,9,10,false,'','Elegant recursive solution.',['Correct','Uses reduce nicely','Handles any depth'],['None']),
  ];

  if (profile === 'hire') return [
    a('fe_q1','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q2','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q3','mcq',null,'A',0,1,false,'','Incorrect — typeof null === "object".',['Attempted'],['Missed the typeof null quirk']),
    a('fe_q4','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q5','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q6','subjective','The virtual DOM is a copy of the real DOM kept in memory. React updates the virtual DOM first and then syncs it with the real DOM. This is faster because direct DOM operations are expensive. React diffs the old and new virtual DOM to minimize changes. I\'ve used this knowledge to avoid unnecessary re-renders by using React.memo.',null,7,10,false,'','Good understanding, lacking depth.',['Core concept correct','Practical application mentioned'],['No mention of reconciliation/Fiber','Less specific than expected for senior role']),
    a('fe_q7','subjective','I would use Chrome DevTools and React Profiler to find slow components. Then I\'d add code splitting with React.lazy for large pages, add memoization where needed, and optimize images. I\'d also check network requests and reduce API calls where possible. In my last project I reduced initial load time by using lazy imports for the admin section.',null,7,10,false,'','Solid answer but missing some depth.',['Good tooling knowledge','Code splitting mentioned'],['No mention of bundle analysis','Limited mobile-specific knowledge']),
    a('fe_q8','subjective','I had a bug where a modal was closing when it shouldn\'t. I used breakpoints in Chrome DevTools and found an event listener was bubbling to the parent which had an onClick that closed the modal. Fixed it with event.stopPropagation(). I added a test case for this afterward.',null,7,10,false,'','Good debugging story, clear resolution.',['Clear problem','Correct fix','Test added'],['Simple scenario for senior level']),
    a('fe_q9','coding','function debounce(fn, wait) {\n  let timeout;\n  return function() {\n    const args = arguments;\n    clearTimeout(timeout);\n    timeout = setTimeout(function() {\n      fn.apply(this, args);\n    }, wait);\n  };\n}',null,7,10,false,'','Correct but uses old-style arguments.',['Correct logic'],['Uses arguments instead of rest params','Context binding slightly off']),
    a('fe_q10','coding','function flatten(arr) {\n  let result = [];\n  for (let item of arr) {\n    if (Array.isArray(item)) {\n      result = result.concat(flatten(item));\n    } else {\n      result.push(item);\n    }\n  }\n  return result;\n}',null,7,10,false,'','Correct iterative/recursive hybrid.',['Correct'],['Less elegant than reduce approach']),
  ];

  if (profile === 'maybe') return [
    a('fe_q1','mcq',null,'B',0,1,false,'','Incorrect — useEffect handles side effects, not useCallback.',['Attempted'],['Confused useEffect and useCallback']),
    a('fe_q2','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q3','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q4','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Confused Partial with Readonly']),
    a('fe_q5','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q6','subjective','The virtual DOM is an important optimization in React. It maintains a virtual copy of the real DOM and uses an efficient diffing algorithm to determine which parts of the UI need to be updated. This minimizes direct DOM manipulation which is expensive. React batches multiple updates together for efficiency. The reconciliation process compares the current and previous virtual DOM trees node by node to identify changes. This results in better performance especially for complex UIs with many components and frequent state changes.',null,6,10,true,'Overly formal structure, suspiciously complete for junior level — possible AI assistance','Covers the topic but lacks personal experience.',['Core concept correct'],['Reads as AI-generated','No personal examples','Overly structured']),
    a('fe_q7','subjective','To optimize a slow React application on mobile I would first profile the application using React DevTools Profiler to identify performance bottlenecks. Then I would implement code splitting using React.lazy and Suspense. Additionally I would use useMemo and useCallback hooks to prevent unnecessary re-renders. Image optimization through lazy loading and proper sizing would also be implemented. Finally bundle size analysis using tools like webpack-bundle-analyzer would help identify and remove unused dependencies.',null,5,10,true,'Bullet-point enumeration without narrative, phrases like "Additionally" and "Finally" typical of AI output','Generic answer, no personal experience.',['Tools mentioned'],['No specific experience','AI-generated style','No measurable outcomes']),
    a('fe_q8','subjective','I encountered a race condition in an async data fetching scenario where multiple API calls were being made and the responses arrived out of order causing incorrect state updates. I debugged this by adding logging to track the order of API responses. The fix involved using a cleanup function in useEffect to cancel stale requests using AbortController.',null,6,10,false,'','Reasonable answer.',['Good scenario','Correct fix mentioned'],['Lacks implementation detail']),
    a('fe_q9','coding','function debounce(fn, delay) {\n  let timer = null;\n  return function() {\n    if (timer) clearTimeout(timer);\n    timer = setTimeout(() => {\n      fn();\n      timer = null;\n    }, delay);\n  };\n}',null,5,10,false,'','Mostly correct but loses context/args.',['Basic logic right'],['Drops arguments','Loses `this` context']),
    a('fe_q10','coding','function flatten(arr) {\n  return arr.flat(Infinity);\n}',null,5,10,false,'','Works but uses built-in — shows knowledge but misses the exercise point.',['Correct result'],['Uses built-in rather than implementing logic','Doesn\'t demonstrate understanding']),
  ];

  // reject
  return [
    a('fe_q1','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Wrong hook']),
    a('fe_q2','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Misunderstood flexbox']),
    a('fe_q3','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Missed typeof null quirk']),
    a('fe_q4','mcq',null,'C',0,1,false,'','Incorrect.',['Attempted'],['Wrong utility type']),
    a('fe_q5','mcq',null,'A',1,1,false,'','Correct.',['Correct'],['None']),
    a('fe_q6','subjective','Virtual DOM is a technology used by React that helps make websites faster by creating a virtual version of the webpage and updating only the parts that changed.',null,3,10,false,'','Too vague, lacks technical depth.',['Basic idea present'],['No reconciliation mention','No examples','Insufficient for role']),
    a('fe_q7','subjective','I would use developer tools to check what is slow and then fix the slow parts. Maybe use caching or make the images smaller.',null,2,10,false,'','Very shallow answer.',['General idea'],['No specific tools','No methodology','Insufficient for role']),
    a('fe_q8','subjective','I once had a button that wasn\'t working. I looked at the console and found an error. I fixed the JavaScript error and it worked.',null,3,10,false,'','Minimal debugging knowledge.',['Basic console use'],['No methodology','Too simple']),
    a('fe_q9','coding','function debounce(fn, delay) {\n  setTimeout(fn, delay);\n}',null,2,10,false,'','Fundamentally incorrect — missing closure and timer management.',['Understands delay concept'],['No closure','No timer cancellation','Incorrect implementation']),
    a('fe_q10','coding','function flatten(arr) {\n  return arr.toString().split(",").map(Number);\n}',null,2,10,false,'','Hack that fails for non-numeric values.',['Gets some cases right'],['Not a real solution','Fails for strings/objects']),
  ];
}

function beAnswers(profile) {
  const a = (qid, type, text, opt, score, max, flagged, reason, fb, strong, weak) => ({
    id: uuidv4(), question_id: qid, type,
    answer_text: text || null, selected_option: opt || null, code_output: null,
    time_taken_seconds: Math.floor(Math.random() * 120) + 30,
    score, max_score: max, ai_flagged: flagged ? 1 : 0,
    ai_flag_reason: reason || '', feedback: fb,
    strong_points: j(strong), weak_points: j(weak)
  });

  if (profile === 'strong') return [
    a('be_q1','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q2','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q3','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q4','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q5','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q6','subjective','Django ORM is excellent for 80% of queries — the queryset API is expressive and chainable, and `select_related`/`prefetch_related` handle the N+1 problem efficiently. I reach for raw SQL when: (1) the query requires window functions or CTEs that Django can\'t express cleanly, (2) bulk operations need exact COPY performance, (3) query plans show the ORM generating inefficient SQL. In a reporting service I built, a dashboard query went from 4.2s to 180ms by replacing a 6-join ORM query with a raw CTE. I keep raw SQL in a dedicated `queries.py` and add comments explaining why raw SQL was necessary.',null,9,10,false,'','Expert-level answer with production examples.',['Raw SQL criteria clear','N+1 awareness','Specific optimization result'],['None']),
    a('be_q7','subjective','For 10k RPS I\'d layer: (1) CDN/edge caching for static/semi-static responses, (2) Redis for hot-path caching with appropriate TTLs and cache-aside pattern, (3) Load balancer across multiple app instances (horizontal scaling), (4) Async processing via Celery for non-critical paths — move email, notifications, reporting out of the request cycle, (5) Connection pooling (PgBouncer) to avoid DB saturation, (6) Read replicas for read-heavy endpoints, (7) Rate limiting at the gateway layer. I\'d benchmark with k6 to verify targets are met and set up dashboards to monitor p95/p99 latency.',null,9,10,false,'','Excellent systematic answer.',['Layered approach','Specific tools','Measurement mentioned'],['None']),
    a('be_q8','subjective','JWT with short expiry (15min) + refresh tokens stored httpOnly. Input validation at every boundary (Pydantic models). Parameterized queries everywhere — never string-format SQL. Rate limiting (slowapi/Redis) on auth endpoints. HTTPS enforced, HSTS headers. CORS allowlist only. Secrets in environment variables or Vault, never in code. I also do regular dependency audits (pip-audit), and for high-risk endpoints add request signing. Recent win: caught a mass assignment vulnerability in code review before it shipped.',null,9,10,false,'','Comprehensive, shows real security mindset.',['Multiple layers','Specific tools','Real example'],['None']),
    a('be_q9','coding','def find_duplicates(lst):\n    seen = set()\n    duplicates = set()\n    for x in lst:\n        if x in seen:\n            duplicates.add(x)\n        else:\n            seen.add(x)\n    return list(duplicates)',null,9,10,false,'','O(n) solution, clean and correct.',['O(n) time','Uses sets','Clear logic'],['None']),
    a('be_q10','coding','from collections import defaultdict\n\ndef group_by(lst, key):\n    result = defaultdict(list)\n    for item in lst:\n        result[item[key]].append(item)\n    return dict(result)',null,9,10,false,'','Excellent use of defaultdict.',['Clean','defaultdict knowledge','Pythonic'],['None']),
  ];

  if (profile === 'hire') return [
    a('be_q1','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q2','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q3','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q4','mcq',null,'A',0,1,false,'','Incorrect — 201 for creation, not 200.',['Attempted'],['Confused 200 and 201']),
    a('be_q5','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q6','subjective','Django ORM is great for most queries. I use it for standard CRUD operations and simple joins. For complex queries I switch to raw SQL, especially for reports with multiple aggregations. The N+1 problem is solved with select_related for ForeignKey and prefetch_related for ManyToMany fields. I\'ve used annotate() and aggregate() for analytics queries but sometimes the generated SQL isn\'t optimal.',null,7,10,false,'','Good practical knowledge.',['N+1 awareness','select_related knowledge'],['Could give specific examples','Limited raw SQL criteria']),
    a('be_q7','subjective','I would use Redis caching for frequently read data, add a load balancer, optimize database queries with proper indexing, and use async tasks for slow operations. Horizontal scaling by adding more server instances would handle traffic spikes. Connection pooling is important to avoid DB connection exhaustion.',null,7,10,false,'','Covers main points, lacks detail.',['Key techniques mentioned'],['No specific tools mentioned','No measurement approach']),
    a('be_q8','subjective','Use HTTPS, JWT for authentication, validate all inputs, use parameterized queries to prevent SQL injection, implement rate limiting on login endpoints, and store passwords with bcrypt hashing. CORS should only allow trusted origins.',null,7,10,false,'','Good coverage of basics.',['JWT, HTTPS, SQL injection mentioned'],['Missing secret management','No monitoring/audit logging']),
    a('be_q9','coding','def find_duplicates(lst):\n    from collections import Counter\n    counts = Counter(lst)\n    return [x for x, c in counts.items() if c > 1]',null,8,10,false,'','Smart use of Counter.',['Elegant solution','Pythonic'],['Slightly less efficient than two-set approach but fine']),
    a('be_q10','coding','def group_by(lst, key):\n    result = {}\n    for item in lst:\n        k = item[key]\n        if k not in result:\n            result[k] = []\n        result[k].append(item)\n    return result',null,7,10,false,'','Correct, slightly verbose.',['Correct','Clear logic'],['Could use defaultdict']),
  ];

  if (profile === 'hire2') return [
    a('be_q1','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q2','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q3','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Confused @property with @abstractmethod']),
    a('be_q4','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q5','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q6','subjective','Django ORM provides a high-level abstraction over SQL. It\'s great for development speed. I use raw SQL mainly when the ORM generates multiple queries where one would suffice, or for complex aggregations. select_related helps with joins, prefetch_related helps with many-to-many. Trade-offs: ORM is portable across DBs but may not use DB-specific optimizations.',null,7,10,false,'','Solid understanding.',['select_related, prefetch_related mentioned'],['Less specific, no concrete examples']),
    a('be_q7','subjective','Caching is the first priority — Redis for session and frequently accessed data. Then load balancing across multiple app servers. Database read replicas for read-heavy operations. Queue async jobs (Celery + RabbitMQ). Index critical query columns. Monitor with Datadog or similar.',null,7,10,false,'','Good coverage.',['Caching, queuing, replicas mentioned'],['No details on scaling decisions']),
    a('be_q8','subjective','JWT authentication, HTTPS, rate limiting, input sanitization, SQL injection prevention with ORMs or parameterized queries, CORS configuration. Store API keys securely in environment variables.',null,6,10,false,'','Basic security knowledge.',['Core items covered'],['Surface-level, no depth']),
    a('be_q9','coding','def find_duplicates(lst):\n    seen = set()\n    dups = []\n    for x in lst:\n        if x in seen and x not in dups:\n            dups.append(x)\n        seen.add(x)\n    return dups',null,7,10,false,'','Correct but uses list for dups (slower lookup).',['Correct logic'],['Using list instead of set for duplicates']),
    a('be_q10','coding','def group_by(lst, key):\n    r = {}\n    for d in lst:\n        r.setdefault(d[key], []).append(d)\n    return r',null,8,10,false,'','Elegant setdefault usage.',['Pythonic','Concise'],['None']),
  ];

  // reject
  return [
    a('be_q1','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Wrong — reversed mutability']),
    a('be_q2','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Confused LEFT and INNER JOIN']),
    a('be_q3','mcq',null,'D',0,1,false,'','Incorrect.',['Attempted'],['Wrong']),
    a('be_q4','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Wrong status code']),
    a('be_q5','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('be_q6','subjective','Django ORM is a way to interact with the database in Django using Python code instead of SQL. It makes things simpler. Raw SQL is for when you need something more complex.',null,3,10,false,'','Very surface level.',['Basic idea'],['No depth, no examples']),
    a('be_q7','subjective','I would add more servers and use caching. Also make the database queries faster by adding indexes.',null,2,10,false,'','Too vague.',['Basic caching mentioned'],['No architecture','No specifics']),
    a('be_q8','subjective','Use passwords and HTTPS. Don\'t store sensitive data. Use a firewall.',null,2,10,false,'','Insufficient knowledge for this role.',['HTTPS mentioned'],['No specific techniques','Too basic']),
    a('be_q9','coding','def find_duplicates(lst):\n    dups = []\n    for i in range(len(lst)):\n        for j in range(i+1, len(lst)):\n            if lst[i] == lst[j] and lst[i] not in dups:\n                dups.append(lst[i])\n    return dups',null,4,10,false,'','O(n²) solution, functional but inefficient.',['Correct output'],['O(n²) when O(n) is trivial','Not scalable']),
    a('be_q10','coding','def group_by(lst, key):\n    result = {}\n    for item in lst:\n        if item[key] in result:\n            result[item[key]].append(item)\n    return result',null,3,10,false,'','Incomplete — skips groups not already in dict.',['Attempted','Partial logic'],['Bug: misses first occurrence of each key']),
  ];
}

function qaAnswers(profile) {
  const a = (qid, type, text, opt, score, max, flagged, reason, fb, strong, weak) => ({
    id: uuidv4(), question_id: qid, type,
    answer_text: text || null, selected_option: opt || null, code_output: null,
    time_taken_seconds: Math.floor(Math.random() * 120) + 30,
    score, max_score: max, ai_flagged: flagged ? 1 : 0,
    ai_flag_reason: reason || '', feedback: fb,
    strong_points: j(strong), weak_points: j(weak)
  });

  if (profile === 'hire') return [
    a('qa_q1','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q2','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q3','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q4','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q5','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q6','subjective','First I\'d immediately assess severity and impact — is it data loss, security, or just cosmetic? I\'d reproduce it on staging to confirm. Then I\'d pull together the dev lead, product manager, and stakeholder for a quick 15-minute decision call. I\'d present three options: (1) hotfix and delay 2 hours, (2) ship with a feature flag disabling the affected flow, or (3) revert the last release. My recommendation depends on the risk profile. In a past release we found a payment calculation bug at T-30min — we used a feature flag to hide that flow, shipped, then patched overnight.',null,8,10,false,'','Excellent crisis management answer.',['Severity assessment','Stakeholder communication','Multiple options presented','Real example'],['Minor: could detail the revert process']),
    a('qa_q7','subjective','Shift-left means involving QA earlier in the SDLC — requirements review, design walkthrough, writing test cases before code is written. In my team I joined sprint planning and flagged ambiguous acceptance criteria before development started. We introduced TDD for critical modules. Result: bug escape rate to production dropped 45% over two quarters because we were catching issues at the spec level rather than in regression.',null,8,10,false,'','Strong answer with quantified outcomes.',['Shift-left definition correct','Early involvement described','Quantified results'],['None']),
    a('qa_q8','subjective','I built a Selenium + pytest framework for a fintech app. Key decisions: POM pattern to separate locators from test logic (dramatically reduced maintenance), pytest fixtures for browser lifecycle and test data setup, Allure for rich reporting with screenshots on failure, integrated into Jenkins CI with parallel execution across 3 browsers. I also added a lightweight API test layer using requests library to validate backend contracts independently of the UI. The UI suite went from 4 hours to 35 minutes with parallelization.',null,9,10,false,'','Expert-level framework design knowledge.',['POM pattern','CI integration','Reporting','API layer','Quantified result'],['None']),
    a('qa_q9','coding','import re\n\ndef is_valid_email(email):\n    pattern = r"^[\\w.+-]+@[\\w-]+\\.[\\w.]+$"\n    return bool(re.match(pattern, email))',null,9,10,false,'','Clean, correct regex.',['Correct','Clean code'],['None']),
    a('qa_q10','coding','import re\n\ndef parse_log(line):\n    m = re.match(r"\\[(.+?)\\] (\\w+): (.+)", line)\n    if not m:\n        return None\n    return {\n        "timestamp": m.group(1),\n        "level": m.group(2),\n        "message": m.group(3)\n    }',null,9,10,false,'','Excellent, handles edge case.',['Correct','Handles no-match case','Clear'],['None']),
  ];

  if (profile === 'hire2') return [
    a('qa_q1','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q2','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q3','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q4','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Confused fixture with bug report']),
    a('qa_q5','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q6','subjective','I would first evaluate the severity of the bug. If it\'s critical (data corruption, security issue, or core flow broken), I\'d recommend delaying the release. For minor issues I\'d document them and create a follow-up ticket. I\'d communicate clearly with the team and stakeholders about the situation and options. The final decision would be made by the product owner with full risk information.',null,7,10,false,'','Good structure, lacks crisis ownership.',['Good severity framework','Stakeholder communication'],['Deferring decision entirely to PO shows less leadership']),
    a('qa_q7','subjective','Shift-left testing means testing earlier in the development cycle. This includes reviewing requirements with QA perspective, writing test plans before coding starts, and participating in design reviews. It catches defects earlier which are cheaper to fix. We applied it in our last project by having QA involved in all sprint ceremonies.',null,7,10,false,'','Good understanding.',['Definition correct','Practical application'],['No quantified outcomes']),
    a('qa_q8','subjective','I set up a Selenium framework using Python and pytest with the Page Object Model. Used Selenium Grid for cross-browser testing. Created a conftest.py for shared fixtures like browser setup and teardown. Reports were generated with pytest-html. Integrated with our GitLab CI pipeline to run on every merge request.',null,7,10,false,'','Solid practical experience.',['POM, pytest, CI mentioned'],['Less detailed than expected for senior']),
    a('qa_q9','coding','import re\n\ndef is_valid_email(email):\n    return re.match(r"[^@]+@[^@]+\\.[^@]+", email) is not None',null,7,10,false,'','Works but pattern is too permissive.',['Correct result for given example'],['Regex too loose, would pass invalid emails']),
    a('qa_q10','coding','def parse_log(line):\n    # [2026-05-10 14:32:01] ERROR: Database connection failed\n    ts = line[1:20]\n    rest = line[23:]\n    parts = rest.split(": ", 1)\n    return {"timestamp": ts, "level": parts[0], "message": parts[1]}',null,6,10,false,'','Works for exact format but brittle.',['Correct output'],['Hardcoded indices, brittle','No error handling']),
  ];

  // maybe
  return [
    a('qa_q1','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Has it backwards']),
    a('qa_q2','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q3','mcq',null,'C',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q4','mcq',null,'B',1,1,false,'','Correct.',['Correct'],['None']),
    a('qa_q5','mcq',null,'A',0,1,false,'','Incorrect.',['Attempted'],['Missed POM value']),
    a('qa_q6','subjective','I would tell the team there is a bug and ask what to do. If it\'s really bad we should delay. If not bad we can ship and fix later. I would write a ticket for it.',null,3,10,false,'','Too brief, lacks ownership.',['Basic idea'],['No process','No severity framework','Doesn\'t communicate proactively']),
    a('qa_q7','subjective','Shift-left testing means testing early. Instead of testing at the end you test during development. This helps find bugs earlier which is better because they are cheaper to fix.',null,4,10,false,'','Correct concept, very surface level.',['Definition correct'],['No practical application','No examples']),
    a('qa_q8','subjective','I have used Selenium with Python to write automated tests. I organized tests using the Page Object Model. I ran them as part of the CI pipeline.',null,4,10,false,'','Very minimal experience described.',['POM and CI mentioned'],['No real framework design thinking','No specifics']),
    a('qa_q9','coding','def is_valid_email(email):\n    return "@" in email and "." in email',null,3,10,false,'','Overly simplistic, incorrect for real validation.',['Attempted'],['Not a real regex validation']),
    a('qa_q10','coding','def parse_log(line):\n    parts = line.split("] ")\n    ts = parts[0].replace("[", "")\n    rest = parts[1].split(": ")\n    return {"timestamp": ts, "level": rest[0], "message": rest[1]}',null,4,10,false,'','Works for happy path, no error handling.',['Gets correct output','Basic parsing'],['Fragile to format variations','No error handling']),
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  if (!fs.existsSync(DB_PATH)) { console.error('DB not found. Start the server first to initialise it, then run seed.'); process.exit(1); }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const save = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

  const run = (sql, p = []) => db.run(sql, p);
  const one = (sql, p = []) => { const s = db.prepare(sql); s.bind(p); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r[0]||null; };

  // ── Recruiter ──
  let rec = one('SELECT * FROM recruiters WHERE email = ?', ['pavan.lumos@gmail.com']);
  if (!rec) {
    const hash = await bcrypt.hash('Demo@2026', 10);
    run('INSERT INTO recruiters (id,company_id,name,email,password_hash) VALUES (?,?,?,?,?)',
      ['rec-demo-001','lumos-001','Pavan','pavan.lumos@gmail.com', hash]);
    rec = one('SELECT * FROM recruiters WHERE email = ?', ['pavan.lumos@gmail.com']);
  }
  const RID = rec.id, CID = rec.company_id;
  console.log(`✓ Recruiter: ${rec.email} (id=${RID})`);

  // ── Jobs ──
  const JOBS = [
    { id:'job-fe-001', title:'Senior Frontend Developer', role_type:'engineering', description:'Build and maintain high-performance React applications for our learning platform. You will work on everything from pixel-perfect UI components to performance optimization at scale.', required_skills:['React','TypeScript','CSS3','JavaScript','HTML5'], preferred_skills:['Next.js','Tailwind CSS','GraphQL'], experience_level:'senior', difficulty:'hard', coding_required:1, topics:['React Hooks & Component Lifecycle','TypeScript Generics & Utility Types','CSS Flexbox & Grid Layouts','JavaScript Closures & Async Patterns','Frontend Performance Optimization'], questions: FE_QUESTIONS },
    { id:'job-be-001', title:'Backend Python Engineer', role_type:'engineering', description:'Design and build scalable APIs and data pipelines using Python and Django. You will own backend services that serve millions of students globally.', required_skills:['Python','Django','PostgreSQL','REST APIs','Docker'], preferred_skills:['Redis','Celery','AWS'], experience_level:'mid', difficulty:'medium', coding_required:1, topics:['Python OOP & Decorators','Django ORM & Raw SQL','REST API Design & Security','PostgreSQL Indexing & Query Optimization','Async Processing & Background Jobs'], questions: BE_QUESTIONS },
    { id:'job-qa-001', title:'QA Automation Engineer', role_type:'testing', description:'Build and maintain our automated test infrastructure using Selenium and Python. You will work closely with developers to ensure quality across the full product stack.', required_skills:['Selenium','Python','JIRA','Test Automation','API Testing'], preferred_skills:['pytest','Jenkins','Docker'], experience_level:'mid', difficulty:'medium', coding_required:0, topics:['Selenium WebDriver & POM Pattern','pytest Framework & Fixtures','Test Strategy & Shift-Left Testing','API Testing with requests','CI/CD Integration for Tests'], questions: QA_QUESTIONS },
  ];

  for (const job of JOBS) {
    run(`INSERT OR IGNORE INTO jobs (id,company_id,recruiter_id,title,role_type,description,required_skills,preferred_skills,experience_level,min_match_percentage,coding_required,timer_type,total_time_minutes,question_count,question_type_breakdown,topics,difficulty,data_retention_days,generated_questions,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      job.id, CID, RID, job.title, job.role_type, job.description,
      j(job.required_skills), j(job.preferred_skills), job.experience_level, 65,
      job.coding_required ? 1 : 0, 'overall', 75, 10,
      j({mcq:50,subjective:30,coding:20}), j(job.topics), job.difficulty, 90,
      j(job.questions), 'active', ago(18)
    ]);
    console.log(`✓ Job: ${job.title}`);
  }

  // ── Candidates ──
  for (const c of CANDIDATES) {
    run(`INSERT OR IGNORE INTO candidates (id,name,email,phone,resume_parsed) VALUES (?,?,?,?,?)`,
      [c.id, c.name, c.email, c.phone, c.resume_parsed]);
  }
  console.log(`✓ ${CANDIDATES.length} candidates inserted`);

  // ── Sessions + Answers + Reports ──
  const sessions = [
    // Frontend
    { sid:'sess-fe-001', jid:'job-fe-001', cid:'cand-001', match:94, submitted: ago(10), taken:3840, tabs:0, blurs:0, aiFlagCount:0, aiFlags:[], procFlags:[], answers: feAnswers('strong'), recommendation:'Strong Hire', reason:'Sarah Chen demonstrates exceptional React expertise with 5+ years of production experience. Her virtual DOM explanation was detailed and technical, performance optimization answer included concrete results (LCP 8s→1.9s), and both coding challenges were solved cleanly and idiomatically. Strong cultural signals — she proactively added test cases in her debugging story. Clear top-of-pool candidate.', strengths:['Deep React and TypeScript knowledge','Strong performance optimization background','Excellent debugging methodology','Clean, idiomatic JavaScript code'], gaps:[], notes:'Recommend fast-tracking to final round. Best candidate in the pipeline for this role.', section_scores:{mcq:{score:5,max:5},subjective:{score:26,max:30},coding:{score:18,max:20}} },
    { sid:'sess-fe-002', jid:'job-fe-001', cid:'cand-002', match:82, submitted: ago(8), taken:4120, tabs:1, blurs:2, aiFlagCount:0, aiFlags:[], procFlags:[{type:'tab_switch',count:1,timestamp:ago(8,0)}], answers: feAnswers('hire'), recommendation:'Hire', reason:'Marcus Williams has solid React foundations and practical experience with the core stack. His answers were technically sound if less detailed than ideal for a "senior" designation. The typeof null miss and less polished coding suggest mid-level rather than senior proficiency. Recommend hiring at mid-level with a growth plan toward senior.', strengths:['Solid React knowledge','Good practical debugging experience','Clean code style'], gaps:['TypeScript depth limited','Performance optimization not as strong'], notes:'Good hire at mid-level. One tab switch noted but timing suggests a browser notification, not malicious.', section_scores:{mcq:{score:4,max:5},subjective:{score:21,max:30},coding:{score:14,max:20}} },
    { sid:'sess-fe-003', jid:'job-fe-001', cid:'cand-003', match:74, submitted: ago(6), taken:4500, tabs:4, blurs:7, aiFlagCount:2, aiFlags:[{qid:'fe_q6',reason:'Overly structured, no personal experience'},{qid:'fe_q7',reason:'Enumerated list style, AI-generated phrases'}], procFlags:[{type:'tab_switch',count:4,timestamp:ago(6,0)},{type:'window_blur',count:7,timestamp:ago(6,0)}], answers: feAnswers('maybe'), recommendation:'Maybe', reason:'Alex Thompson shows basic competency but several concerns: two answers were flagged as likely AI-generated (no personal examples, overly structured language), 4 tab switches and 7 window blurs during the 75-minute test, and coding challenges show gaps in JavaScript fundamentals (dropped arguments in debounce). Technical knowledge appears surface-level for a mid/senior role.', strengths:['Correct on 3/5 MCQs','Basic React understanding'], gaps:['AI-assisted answers suspected','JavaScript fundamentals gaps','Test integrity concerns'], notes:'Significant proctoring flags. Recommend a brief live coding interview before proceeding to verify skills independently.', section_scores:{mcq:{score:3,max:5},subjective:{score:17,max:30},coding:{score:10,max:20}} },
    { sid:'sess-fe-004', jid:'job-fe-001', cid:'cand-004', match:48, submitted: ago(5), taken:2100, tabs:0, blurs:1, aiFlagCount:0, aiFlags:[], procFlags:[], answers: feAnswers('reject'), recommendation:'Reject', reason:'Priya Patel\'s responses indicate insufficient technical depth for this role. Only 1/5 MCQs correct, subjective answers lack specificity and technical vocabulary, and the coding solutions show fundamental misunderstandings (flatten using toString is a red flag). The 1 year of experience aligns with these gaps — a better fit for a junior frontend role once fundamentals are stronger.', strengths:['Attempted all questions','Correct on one MCQ'], gaps:['React fundamentals missing','JavaScript basics need work','No TypeScript knowledge'], notes:'Politely decline. Could revisit in 1-2 years with more experience.', section_scores:{mcq:{score:1,max:5},subjective:{score:8,max:30},coding:{score:4,max:20}} },
    // Backend
    { sid:'sess-be-001', jid:'job-be-001', cid:'cand-005', match:96, submitted: ago(9), taken:3900, tabs:0, blurs:0, aiFlagCount:0, aiFlags:[], procFlags:[], answers: beAnswers('strong'), recommendation:'Strong Hire', reason:'James Rodriguez is an outstanding candidate — 6 years of senior Python/Django experience backed by specific, quantified examples throughout. His system design answer demonstrated genuine production knowledge (PgBouncer, k6 benchmarking), the security answer showed a real security mindset rather than just listing tools, and both coding solutions were efficient and Pythonic. The raw SQL ORM trade-off answer (with a specific 4.2s → 180ms example) shows he operates at a senior level.', strengths:['Exceptional Python/Django depth','Strong system design knowledge','Real security mindset','Pythonic code quality'], gaps:[], notes:'Top-tier candidate. Expedite the process — he will have offers from multiple companies.', section_scores:{mcq:{score:5,max:5},subjective:{score:27,max:30},coding:{score:18,max:20}} },
    { sid:'sess-be-002', jid:'job-be-001', cid:'cand-006', match:80, submitted: ago(7), taken:4200, tabs:0, blurs:1, aiFlagCount:0, aiFlags:[], procFlags:[], answers: beAnswers('hire'), recommendation:'Hire', reason:'Emma Johnson demonstrates solid mid-level Python/Django skills. Her ORM knowledge is practical (correct N+1 awareness), coding solutions are efficient (smart Counter usage), and security baseline is good. Weaker on HTTP status codes and system design depth, but the core competencies are there. Good fit for a mid-level backend role with mentorship toward senior.', strengths:['Solid Python knowledge','Good ORM/N+1 awareness','Efficient coding solutions'], gaps:['HTTP semantics minor gaps','System design needs growth'], notes:'Recommend hiring at mid level. Growth trajectory is promising.', section_scores:{mcq:{score:4,max:5},subjective:{score:21,max:30},coding:{score:15,max:20}} },
    { sid:'sess-be-003', jid:'job-be-001', cid:'cand-007', match:76, submitted: ago(6), taken:4350, tabs:0, blurs:2, aiFlagCount:0, aiFlags:[], procFlags:[], answers: beAnswers('hire2'), recommendation:'Hire', reason:'Nina Sharma shows consistent mid-level proficiency. Her answers are practical and accurate on the core topics — ORM, security, and system design. Missed the @property question, suggesting some gaps in advanced Python OOP. Coding is good (setdefault usage). A solid team player hire.', strengths:['Good Python practical skills','System design fundamentals present','Clean coding style'], gaps:['Advanced Python OOP gaps','Security answers surface-level'], notes:'Good mid-level hire. Pair with a senior engineer initially.', section_scores:{mcq:{score:4,max:5},subjective:{score:20,max:30},coding:{score:15,max:20}} },
    { sid:'sess-be-004', jid:'job-be-001', cid:'cand-008', match:58, submitted: ago(4), taken:2800, tabs:2, blurs:3, aiFlagCount:0, aiFlags:[], procFlags:[{type:'tab_switch',count:2,timestamp:ago(4,0)}], answers: beAnswers('reject'), recommendation:'Reject', reason:'David Kim\'s responses indicate foundational gaps that make him unsuitable for this mid-level role. 1/5 MCQs correct, answers are very surface-level ("use passwords and HTTPS"), and the coding had a significant bug (missing keys in group_by). The 2 tab switches add a minor concern. The 1 year of experience aligns with these gaps.', strengths:['One correct MCQ','Attempted all questions'], gaps:['Python fundamentals weak','Insufficient system design knowledge','Coding bugs found'], notes:'Decline. Too early for a mid-level backend role.', section_scores:{mcq:{score:1,max:5},subjective:{score:7,max:30},coding:{score:7,max:20}} },
    // QA
    { sid:'sess-qa-001', jid:'job-qa-001', cid:'cand-009', match:92, submitted: ago(8), taken:3600, tabs:0, blurs:0, aiFlagCount:0, aiFlags:[], procFlags:[], answers: qaAnswers('hire'), recommendation:'Hire', reason:'Lisa Wang is an excellent QA candidate with genuine senior-level experience. Her crisis management answer was structured and practical (feature flag example), shift-left answer included quantified outcomes (45% bug escape reduction), and the automation framework answer demonstrated real architectural thinking (POM, parallel execution, Allure, 4hr→35min result). Both coding solutions were clean and correct. Highly recommended.', strengths:['Strong test strategy thinking','Proven automation framework experience','Good crisis communication skills','Clean Python coding'], gaps:[], notes:'Strong hire. Would make an immediate impact on the automation team.', section_scores:{mcq:{score:5,max:5},subjective:{score:25,max:30},coding:{score:18,max:20}} },
    { sid:'sess-qa-002', jid:'job-qa-001', cid:'cand-010', match:84, submitted: ago(7), taken:4100, tabs:0, blurs:1, aiFlagCount:0, aiFlags:[], procFlags:[], answers: qaAnswers('hire2'), recommendation:'Hire', reason:'Raj Mehta demonstrates solid mid-level QA skills with good Selenium and pytest knowledge. His framework answer covered the key elements, and his crisis management approach is sound. The regex solution was slightly loose but functional. A reliable hire who will contribute well to the automation team.', strengths:['Good Selenium/pytest knowledge','CI/CD integration experience','Sound crisis management approach'], gaps:['Regex precision could improve','Less quantified results'], notes:'Good team member. Will do well.', section_scores:{mcq:{score:4,max:5},subjective:{score:22,max:30},coding:{score:13,max:20}} },
    { sid:'sess-qa-003', jid:'job-qa-001', cid:'cand-011', match:66, submitted: ago(3), taken:3000, tabs:1, blurs:3, aiFlagCount:0, aiFlags:[], procFlags:[{type:'tab_switch',count:1,timestamp:ago(3,0)}], answers: qaAnswers('maybe'), recommendation:'Maybe', reason:'Tom Bradley has basic QA awareness but is lacking in both practical automation depth and test strategy thinking. Missed 2/5 MCQs, crisis management answer was too passive, and coding solutions were overly simplistic. The 2 years of experience matches this profile. Possibly suitable for a junior QA role.', strengths:['Basic QA concepts understood','Familiar with Selenium/JIRA'], gaps:['Shallow automation knowledge','No quantified experience','Limited testing strategy depth'], notes:'Consider for junior QA if there\'s a need. Not ready for mid-level.', section_scores:{mcq:{score:3,max:5},subjective:{score:11,max:30},coding:{score:7,max:20}} },
  ];

  for (const s of sessions) {
    const total = s.section_scores.mcq.score + s.section_scores.subjective.score + s.section_scores.coding.score;
    const maxTotal = s.section_scores.mcq.max + s.section_scores.subjective.max + s.section_scores.coding.max;
    const pct = parseFloat(((total / maxTotal) * 100).toFixed(1));

    run(`INSERT OR IGNORE INTO test_sessions (id,job_id,candidate_id,match_score,status,started_at,submitted_at,time_taken_seconds,proctoring_flags,tab_switch_count,window_blur_count,webcam_flags,ai_flag_count,generated_questions,questions_with_meta,token)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      s.sid, s.jid, s.cid, s.match, 'evaluated',
      new Date(new Date(s.submitted).getTime() - s.taken * 1000).toISOString().replace('T',' ').slice(0,19),
      s.submitted, s.taken,
      j(s.procFlags), s.tabs, s.blurs, j([]), s.aiFlagCount,
      j([]), j([]), `tok-${s.sid}`
    ]);

    for (const ans of s.answers) {
      run(`INSERT OR IGNORE INTO answers (id,session_id,question_id,answer_text,selected_option,code_output,time_taken_seconds,score,max_score,ai_flagged,ai_flag_reason,feedback,strong_points,weak_points)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        ans.id, s.sid, ans.question_id, ans.answer_text, ans.selected_option, ans.code_output,
        ans.time_taken_seconds, ans.score, ans.max_score, ans.ai_flagged,
        ans.ai_flag_reason, ans.feedback, ans.strong_points, ans.weak_points
      ]);
    }

    run(`INSERT OR IGNORE INTO reports (id,session_id,candidate_id,job_id,total_score,max_possible_score,percentage,recommendation,recommendation_reason,section_scores,strengths,gaps,recruiter_notes,generated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      `rep-${s.sid}`, s.sid, s.cid, s.jid,
      total, maxTotal, pct,
      s.recommendation, s.reason,
      j(s.section_scores), j(s.strengths), j(s.gaps), s.notes,
      s.submitted
    ]);

    const cand = CANDIDATES.find(c => c.id === s.cid);
    console.log(`✓ ${cand.name.padEnd(18)} → ${s.recommendation.padEnd(12)} (${pct}%)`);
  }

  save();
  console.log('\n✅ Demo data seeded successfully!');
  console.log('─'.repeat(50));
  console.log('  Login:    pavan.lumos@gmail.com');
  console.log('  Password: (your existing password)');
  console.log('  Jobs:     3 active  |  Candidates: 11');
  console.log('─'.repeat(50));
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
