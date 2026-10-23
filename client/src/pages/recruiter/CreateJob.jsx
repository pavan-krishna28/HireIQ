import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/recruiter/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, X, Sparkles, ChevronRight, ChevronLeft, Check, Loader, Copy, Info } from 'lucide-react';

const STEPS = ['Basic Info', 'Test Config', 'Questions', 'Review & Publish'];
const ROLE_TYPES = ['engineering', 'testing', 'hr', 'finance', 'bd', 'support'];
const LEVELS = ['intern', 'junior', 'mid', 'senior'];

const TYPE_LABEL = { mcq: 'MCQ', subjective: 'Written', coding: 'Coding' };
const TYPE_COLOR = {
  mcq: 'bg-blue-50 text-blue-700 border-blue-100',
  subjective: 'bg-amber-50 text-amber-700 border-amber-100',
  coding: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

function TagInput({ value, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const addTag = useCallback(() => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  }, [input, value, onChange]);
  return (
    <div
      className="min-h-11 px-3 py-2 rounded-xl border border-surface-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all bg-white flex flex-wrap gap-1.5 items-center cursor-text"
      onClick={e => e.currentTarget.querySelector('input')?.focus()}
    >
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-body font-semibold">
          {tag}
          <button type="button" onClick={e => { e.stopPropagation(); onChange(value.filter(t => t !== tag)); }}
            className="text-brand-400 hover:text-brand-600 ml-0.5"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
          if (e.key === 'Backspace' && !input && value.length > 0) onChange(value.slice(0, -1));
        }}
        onBlur={addTag}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-24 outline-none text-sm font-body text-surface-800 placeholder-surface-400 bg-transparent"
      />
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-brand-500' : 'bg-surface-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : ''}`} />
    </button>
  );
}

function Tip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1.5">
      <Info className="w-3.5 h-3.5 text-surface-400 cursor-pointer hover:text-brand-500 transition-colors inline align-middle"
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 px-3 py-2 bg-surface-900 text-white text-xs font-body rounded-xl shadow-xl z-50 leading-relaxed whitespace-normal">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-900" />
        </span>
      )}
    </span>
  );
}

const EMPTY_Q = { type: 'subjective', question: '', options: { A: '', B: '', C: '', D: '' }, correct_answer: '' };

export default function CreateJob() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [jobLink, setJobLink] = useState(null);

  const [suggestingTopics, setSuggestingTopics] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSource, setAiSource] = useState(null);

  // Unified list of all questions the recruiter has added (AI-generated + manual)
  const [addedQuestions, setAddedQuestions] = useState([]);
  const [manualQ, setManualQ] = useState(EMPTY_Q);

  const [form, setForm] = useState({
    title: '', role_type: 'engineering', description: '', experience_level: 'junior',
    required_skills: [], preferred_skills: [],
    min_match_percentage: 70, coding_required: false, difficulty: 'medium',
    question_count: 20, question_type_breakdown: { mcq: 50, subjective: 30, coding: 20 },
    timer_type: 'overall', total_time_minutes: 60, per_question_time_seconds: 120,
    data_retention_days: 90, topics: [],
  });

  const up = useCallback((field, val) => setForm(prev => ({ ...prev, [field]: val })), []);

  const suggestTopics = async () => {
    setSuggestingTopics(true);
    try {
      const { data } = await api.post('/ai/suggest-topics', {
        role_type: form.role_type, required_skills: form.required_skills, experience_level: form.experience_level,
      });
      const merged = [...new Set([...form.topics, ...(data.topics || [])])];
      up('topics', merged);
      toast.success(`${data.topics?.length || 0} topics suggested!`);
    } catch { toast.error('Failed — check your ANTHROPIC_API_KEY in server/.env'); }
    finally { setSuggestingTopics(false); }
  };

  const generateWithAI = async () => {
    setAiGenerating(true);
    setAiSource(null);
    try {
      const { data } = await api.post('/ai/generate-questions', {
        role_type: form.role_type,
        experience_level: form.experience_level,
        required_skills: form.required_skills,
        topics: form.topics,
        difficulty: form.difficulty,
        question_count: 5,
        question_type_breakdown: form.question_type_breakdown,
        coding_required: form.coding_required,
      });
      const qs = data.questions || [];
      if (qs.length === 0) return toast.error('No questions returned — add topics first');
      setAddedQuestions(prev => [...prev, ...qs]);
      setAiSource(data.source);
      if (data.source === 'bank') {
        toast('Added generic fallback questions — add topics for AI-specific ones', { icon: '⚠️' });
      } else {
        toast.success(`${qs.length} AI questions added`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed — check your API key');
    } finally {
      setAiGenerating(false);
    }
  };

  const addManual = () => {
    if (!manualQ.question.trim()) return toast.error('Question text required');
    const q = {
      question_id: `custom_${Date.now()}`,
      type: manualQ.type,
      question: manualQ.question,
      options: manualQ.type === 'mcq' ? { ...manualQ.options } : null,
      time_limit_seconds: 120,
      difficulty: 'medium',
      topic: 'Custom',
      is_custom: true,
      language: manualQ.type === 'coding' ? 'javascript' : null,
      sample_input: null,
      sample_output: null,
      metadata: { correct_answer: manualQ.correct_answer || '', explanation: '', key_points: [], expected_complexity: '' },
    };
    setAddedQuestions(prev => [...prev, q]);
    setManualQ(EMPTY_Q);
    toast.success('Question added');
  };

  const removeQuestion = (id) => setAddedQuestions(prev => prev.filter(q => q.question_id !== id));

  const publish = async () => {
    if (!form.title.trim()) return toast.error('Job title required');
    setLoading(true);
    try {
      const payload = {
        ...form,
        ...(addedQuestions.length > 0
          ? { pregenerated_questions: addedQuestions, generate_ai_questions: false }
          : { generate_ai_questions: true }
        ),
      };
      const { data } = await api.post('/jobs', payload);
      const { data: ld } = await api.get('/jobs/' + data.job.id + '/link');
      setJobLink(ld.link);
      toast.success('Job published!');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create job'); }
    finally { setLoading(false); }
  };

  const canNext = step === 0 ? form.title.trim().length > 0 : true;
  const mcqCount = addedQuestions.filter(q => q.type === 'mcq').length;
  const writtenCount = addedQuestions.filter(q => q.type === 'subjective').length;
  const codingCount = addedQuestions.filter(q => q.type === 'coding').length;

  return (
    <Layout title="Create Job" subtitle="Set up a new position with AI-powered assessment">
      <div className="max-w-2xl mx-auto">

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => i < step && setStep(i)}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all ${i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100' : 'bg-surface-200 text-surface-500'}`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-body font-semibold hidden sm:block ${i === step ? 'text-brand-600' : i < step ? 'text-surface-600' : 'text-surface-400'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-brand-300' : 'bg-surface-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-6">

          {/* ── STEP 0 — Basic Info ─────────────────────────────────── */}
          <div style={{ display: step === 0 ? 'block' : 'none' }}>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Job Title *</label>
                <input value={form.title} onChange={e => up('title', e.target.value)}
                  placeholder="e.g. Frontend Developer, QA Engineer"
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Role Type *</label>
                  <select value={form.role_type} onChange={e => up('role_type', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
                    {ROLE_TYPES.map(r => <option key={r} value={r}>{r === 'bd' ? 'Business Dev' : r === 'hr' ? 'HR' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Experience Level</label>
                  <select value={form.experience_level} onChange={e => up('experience_level', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
                    {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Job Description</label>
                <textarea value={form.description} onChange={e => up('description', e.target.value)} rows={3}
                  placeholder="Describe the role and responsibilities..."
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 resize-none" />
              </div>
              <div>
                <label className="text-sm font-body font-semibold text-surface-700 mb-1 block">
                  Required Skills
                  <span className="text-surface-400 font-normal text-xs ml-1.5">— type a skill, press Enter</span>
                </label>
                <TagInput value={form.required_skills} onChange={v => up('required_skills', v)}
                  placeholder="React, Python, SQL... press Enter after each" />
                <p className="text-xs text-surface-400 font-body mt-1.5">Matched against the candidate's resume to calculate fit score</p>
              </div>
              <div>
                <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">
                  Preferred Skills <span className="text-surface-400 font-normal">(optional)</span>
                </label>
                <TagInput value={form.preferred_skills} onChange={v => up('preferred_skills', v)}
                  placeholder="Good-to-have skills — press Enter after each" />
              </div>
            </div>
          </div>

          {/* ── STEP 1 — Test Config ─────────────────────────────────── */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-body font-semibold text-surface-700 mb-1 block">
                  Min Resume Match to Allow Test: <span className="text-brand-600 font-bold">{form.min_match_percentage}%</span>
                  <Tip text="Candidates whose resume matches less than this % of required skills will be politely rejected before seeing the test." />
                </label>
                <input type="range" min={40} max={95} value={form.min_match_percentage}
                  onChange={e => up('min_match_percentage', +e.target.value)} className="w-full accent-brand-500 mt-2" />
                <div className="flex justify-between text-xs text-surface-400 font-body mt-1"><span>40% lenient</span><span>95% strict</span></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Difficulty</label>
                  <select value={form.difficulty} onChange={e => up('difficulty', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
                    {['easy', 'medium', 'hard'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Questions</label>
                  <select value={form.question_count} onChange={e => up('question_count', +e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
                    {[10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Timer</label>
                  <select value={form.timer_type} onChange={e => up('timer_type', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
                    <option value="overall">Overall</option>
                    <option value="per_question">Per Question</option>
                  </select>
                </div>
              </div>
              {form.timer_type === 'overall'
                ? <div><label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Total Time (minutes)</label>
                    <input type="number" min={15} max={180} value={form.total_time_minutes} onChange={e => up('total_time_minutes', +e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400" /></div>
                : <div><label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Time Per Question (seconds)</label>
                    <input type="number" min={30} max={600} value={form.per_question_time_seconds} onChange={e => up('per_question_time_seconds', +e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400" /></div>
              }
              <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200">
                <div>
                  <p className="text-sm font-body font-semibold text-surface-800">Include Coding Questions</p>
                  <p className="text-xs text-surface-500 font-body mt-0.5">Candidates write & run code in a sandboxed environment</p>
                </div>
                <Toggle value={form.coding_required} onChange={v => up('coding_required', v)} />
              </div>
              <div>
                <label className="text-sm font-body font-semibold text-surface-700 mb-2 block">
                  Question Mix
                  <span className="text-surface-400 font-normal text-xs ml-1.5">— {form.question_count} total</span>
                </label>
                {[['mcq', 'MCQ'], ['subjective', 'Written'], ['coding', 'Coding']].map(([type, label]) => (
                  <div key={type} className="flex items-center gap-4 mb-3">
                    <span className="w-20 text-sm font-body font-semibold text-surface-600">{label}</span>
                    <input type="range" min={0} max={100} value={form.question_type_breakdown[type]}
                      onChange={e => up('question_type_breakdown', { ...form.question_type_breakdown, [type]: +e.target.value })}
                      className="flex-1 accent-brand-500" />
                    <span className="w-10 text-sm font-display font-bold text-brand-600 text-right">{form.question_type_breakdown[type]}%</span>
                    <span className="w-8 text-xs text-surface-400 font-body text-right">~{Math.round((form.question_type_breakdown[type] / 100) * form.question_count)}q</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Data Retention</label>
                <select value={form.data_retention_days} onChange={e => up('data_retention_days', +e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
                  {[30, 60, 90, 180].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── STEP 2 — Questions ───────────────────────────────────── */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            <div className="space-y-5">

              <div>
                <h3 className="font-display font-bold text-surface-900 text-base">
                  Questions
                  <span className="text-surface-400 font-body text-sm font-normal ml-2">(optional)</span>
                </h3>
                <p className="text-xs text-surface-500 font-body mt-0.5">
                  Add questions now, or skip — they'll be auto-generated per candidate at test time.
                </p>
              </div>

              {/* ─ AI Generate card ─ */}
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-indigo-50/40 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-display font-bold text-surface-900">Generate with AI</p>
                      <p className="text-xs text-surface-500 font-body">5 questions per batch · ~10 seconds</p>
                    </div>
                  </div>
                  <button
                    onClick={generateWithAI}
                    disabled={aiGenerating}
                    className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-body font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-brand-500/20 flex-shrink-0"
                  >
                    {aiGenerating
                      ? <><Loader className="w-4 h-4 animate-spin" /> Generating...</>
                      : <><Sparkles className="w-4 h-4" /> Generate</>}
                  </button>
                </div>

                {/* Topics within the AI card */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-body font-semibold text-surface-600">Topics to test on</label>
                    <button onClick={suggestTopics} disabled={suggestingTopics}
                      className="flex items-center gap-1 text-xs text-violet-600 font-body font-semibold hover:text-violet-800 transition-colors disabled:opacity-50">
                      {suggestingTopics ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {suggestingTopics ? 'Thinking...' : 'AI Suggest'}
                    </button>
                  </div>
                  {form.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.topics.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-surface-700 border border-surface-200 rounded-lg text-xs font-body shadow-sm">
                          {t}
                          <button onClick={() => up('topics', form.topics.filter(x => x !== t))} className="text-surface-400 hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <TagInput value={form.topics} onChange={v => up('topics', v)} placeholder="e.g. React Hooks, SQL Joins — press Enter" />
                </div>

                {aiGenerating && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="w-2 h-2 bg-violet-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    <span className="text-xs text-violet-600 font-body">Writing questions tailored to your role and topics...</span>
                  </div>
                )}

                {aiSource === 'bank' && !aiGenerating && (
                  <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-body">
                      AI is unavailable — added generic fallback questions. Check your ANTHROPIC_API_KEY and retry for topic-specific questions.
                    </p>
                  </div>
                )}
              </div>

              {/* ─ Divider ─ */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-surface-100" />
                <span className="text-xs text-surface-400 font-body px-1">or add manually</span>
                <div className="flex-1 h-px bg-surface-100" />
              </div>

              {/* ─ Manual add form ─ */}
              <div className="p-4 border border-surface-200 rounded-2xl space-y-3 bg-surface-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-md bg-surface-200 flex items-center justify-center">
                    <Plus className="w-3 h-3 text-surface-600" />
                  </div>
                  <p className="text-sm font-display font-bold text-surface-800">Write a Question</p>
                </div>
                <div>
                  <label className="text-xs font-body font-semibold text-surface-600 mb-1.5 block">Type</label>
                  <select value={manualQ.type} onChange={e => setManualQ(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
                    <option value="subjective">Written (subjective)</option>
                    <option value="mcq">MCQ (multiple choice)</option>
                    <option value="coding">Coding</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-body font-semibold text-surface-600 mb-1.5 block">Question</label>
                  <textarea value={manualQ.question} onChange={e => setManualQ(p => ({ ...p, question: e.target.value }))}
                    rows={2} placeholder="Type your question..."
                    className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 resize-none" />
                </div>
                {manualQ.type === 'mcq' && (
                  <div className="space-y-2">
                    <label className="text-xs font-body font-semibold text-surface-600 block">Options — click ✓ to mark correct</label>
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <div key={opt} className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-display font-bold flex-shrink-0 ${manualQ.correct_answer === opt ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-600'}`}>{opt}</span>
                        <input value={manualQ.options[opt]} onChange={e => setManualQ(p => ({ ...p, options: { ...p.options, [opt]: e.target.value } }))}
                          placeholder={`Option ${opt}`}
                          className="flex-1 px-3 py-2 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400" />
                        <button type="button" onClick={() => setManualQ(p => ({ ...p, correct_answer: opt }))}
                          className={`text-xs px-2 py-1 rounded-lg font-body font-semibold transition-all ${manualQ.correct_answer === opt ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-500 hover:bg-emerald-50'}`}>✓</button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={addManual}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-800 text-white text-sm font-body font-semibold rounded-xl hover:bg-surface-700 transition-all">
                  <Plus className="w-4 h-4" /> Add Question
                </button>
              </div>

              {/* ─ Question list ─ */}
              {addedQuestions.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-sm font-body font-semibold text-surface-700">
                      {addedQuestions.length} question{addedQuestions.length !== 1 ? 's' : ''} added
                    </p>
                    <div className="flex gap-2">
                      {mcqCount > 0 && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-body">{mcqCount} MCQ</span>}
                      {writtenCount > 0 && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md font-body">{writtenCount} Written</span>}
                      {codingCount > 0 && <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-body">{codingCount} Coding</span>}
                    </div>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {addedQuestions.map((q, i) => (
                      <div key={q.question_id} className="flex items-start gap-3 p-3.5 bg-white border border-surface-200 rounded-xl hover:border-surface-300 transition-colors group">
                        <span className="w-5 h-5 rounded-md gradient-brand flex items-center justify-center text-white text-xs font-display font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-xs font-body font-semibold px-1.5 py-0.5 rounded-md border ${TYPE_COLOR[q.type]}`}>{TYPE_LABEL[q.type]}</span>
                            {!q.is_custom && <span className="text-xs text-violet-500 font-body font-semibold">✨ AI</span>}
                            {q.topic && q.topic !== 'Custom' && <span className="text-xs text-surface-400 font-body truncate">{q.topic}</span>}
                          </div>
                          <p className="text-sm font-body text-surface-800 leading-relaxed">{q.question}</p>
                        </div>
                        <button onClick={() => removeQuestion(q.question_id)}
                          className="text-surface-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-surface-100 rounded-full flex items-center justify-center mb-2">
                    <Sparkles className="w-5 h-5 text-surface-400" />
                  </div>
                  <p className="text-sm text-surface-500 font-body">No questions added yet</p>
                  <p className="text-xs text-surface-400 font-body mt-0.5">
                    Questions will be auto-generated for each candidate when they start the test
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 3 — Review & Publish ────────────────────────────── */}
          <div style={{ display: step === 3 ? 'block' : 'none' }}>
            {jobLink ? (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-display font-bold text-surface-900">Published!</h3>
                  <p className="text-surface-500 font-body mt-1">Share this link with candidates</p>
                </div>
                <div className="flex items-center gap-2 p-3 bg-surface-50 rounded-xl border border-surface-200">
                  <span className="flex-1 text-sm font-mono text-surface-700 truncate">{jobLink}</span>
                  <button onClick={() => { navigator.clipboard.writeText(jobLink); toast.success('Copied!'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 border border-brand-200 rounded-lg text-xs font-body font-semibold hover:bg-brand-100 transition-all flex-shrink-0">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
                <button onClick={() => navigate('/recruiter/jobs')}
                  className="px-6 py-2.5 gradient-brand text-white font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-500/20">
                  View All Jobs →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display font-bold text-surface-900">Review</h3>
                  <p className="text-xs text-surface-500 font-body mt-0.5">Click any step above to go back and edit</p>
                </div>
                <div className="divide-y divide-surface-100">
                  {[
                    ['Title', form.title || '⚠️ Required'],
                    ['Role / Level', `${form.role_type} / ${form.experience_level}`],
                    ['Required Skills', form.required_skills.length ? form.required_skills.join(', ') : 'None'],
                    ['Min Match', `${form.min_match_percentage}%`],
                    ['Timer', form.timer_type === 'overall' ? `${form.total_time_minutes} min` : `${form.per_question_time_seconds}s/q`],
                    ['Difficulty / Coding', `${form.difficulty} / ${form.coding_required ? 'Yes' : 'No'}`],
                    ['Topics', form.topics.length ? form.topics.slice(0, 4).join(', ') + (form.topics.length > 4 ? '...' : '') : 'None'],
                    ['Questions', addedQuestions.length > 0
                      ? `${addedQuestions.length} ready (${mcqCount} MCQ, ${writtenCount} Written, ${codingCount} Coding)`
                      : `${form.question_count} — auto-generated on publish`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-2.5 gap-4">
                      <span className="text-sm text-surface-500 font-body flex-shrink-0">{k}</span>
                      <span className="text-sm font-body font-semibold text-surface-800 text-right">{v}</span>
                    </div>
                  ))}
                </div>

                {addedQuestions.length > 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 font-body font-semibold">
                      {addedQuestions.length} questions ready — publishing is instant
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-surface-50 border border-surface-200 rounded-xl">
                    <Sparkles className="w-4 h-4 text-surface-400 flex-shrink-0" />
                    <p className="text-xs text-surface-500 font-body">
                      Questions will be AI-generated when each candidate starts their test
                    </p>
                  </div>
                )}

                <button onClick={publish} disabled={loading || !form.title.trim()}
                  className="w-full py-3 gradient-brand text-white font-body font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-40 mt-2">
                  {loading ? <><Loader className="w-4 h-4 animate-spin" /> Publishing...</> : <><Check className="w-4 h-4" /> Publish Job</>}
                </button>
              </div>
            )}
          </div>

        </div>{/* end card */}

        {/* Nav buttons */}
        {!jobLink && (
          <div className="flex justify-between">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-surface-600 border border-surface-200 rounded-xl text-sm font-body font-semibold hover:bg-surface-50 transition-all disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < STEPS.length - 1 && (
              <button onClick={() => canNext && setStep(s => s + 1)} disabled={!canNext}
                className="flex items-center gap-2 px-5 py-2.5 gradient-brand text-white rounded-xl text-sm font-body font-semibold hover:opacity-90 transition-all disabled:opacity-40 shadow-md shadow-brand-500/20">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}
