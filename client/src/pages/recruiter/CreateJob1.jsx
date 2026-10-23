import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/recruiter/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, X, Sparkles, ChevronRight, ChevronLeft, Check, Loader, Copy } from 'lucide-react';

const STEPS = ['Basic Info', 'Test Config', 'Topics', 'Custom Questions', 'Review & Publish'];
const ROLE_TYPES = ['engineering', 'testing', 'hr', 'finance', 'bd', 'support'];
const LEVELS = ['intern', 'junior', 'mid', 'senior'];

const TagInput = ({ value, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  };
  return (
    <div className="min-h-11 px-3 py-2 rounded-xl border border-surface-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all bg-white flex flex-wrap gap-1.5 items-center">
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-body font-semibold">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="text-brand-400 hover:text-brand-600">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === ',' ) { e.preventDefault(); add(); } }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-24 outline-none text-sm font-body text-surface-800 placeholder-surface-400 bg-transparent"
      />
    </div>
  );
};

const CustomQuestionForm = ({ questions, setQuestions }) => {
  const [q, setQ] = useState({ type: 'subjective', question: '', options: { A: '', B: '', C: '', D: '' }, correct_answer: '' });
  const add = () => {
    if (!q.question.trim()) return toast.error('Question text required');
    setQuestions([...questions, { ...q, id: Date.now() }]);
    setQ({ type: 'subjective', question: '', options: { A: '', B: '', C: '', D: '' }, correct_answer: '' });
  };
  return (
    <div className="space-y-4">
      <div className="p-5 border border-surface-200 rounded-2xl space-y-4 bg-surface-50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-body font-semibold text-surface-600 mb-1.5 block">Question Type</label>
            <select value={q.type} onChange={e => setQ(p => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
              <option value="subjective">Subjective</option>
              <option value="mcq">MCQ</option>
              <option value="coding">Coding</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-body font-semibold text-surface-600 mb-1.5 block">Question</label>
          <textarea value={q.question} onChange={e => setQ(p => ({ ...p, question: e.target.value }))}
            rows={3} placeholder="Type your question here..."
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 resize-none" />
        </div>
        {q.type === 'mcq' && (
          <div className="grid grid-cols-2 gap-3">
            {['A','B','C','D'].map(opt => (
              <div key={opt}>
                <label className="text-xs font-body text-surface-500 mb-1 block">Option {opt}</label>
                <input value={q.options[opt]} onChange={e => setQ(p => ({ ...p, options: { ...p.options, [opt]: e.target.value } }))}
                  placeholder={`Option ${opt}`}
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400" />
              </div>
            ))}
            <div>
              <label className="text-xs font-body text-surface-500 mb-1 block">Correct Answer</label>
              <select value={q.correct_answer} onChange={e => setQ(p => ({ ...p, correct_answer: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
                <option value="">Select...</option>
                {['A','B','C','D'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        )}
        <button type="button" onClick={add}
          className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-body font-semibold rounded-xl hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-3 p-4 bg-white border border-surface-200 rounded-xl">
              <span className="w-6 h-6 gradient-brand rounded-lg flex items-center justify-center text-white text-xs font-display font-bold flex-shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-surface-800 truncate">{q.question}</p>
                <span className="text-xs text-surface-400 font-body capitalize">{q.type}</span>
              </div>
              <button onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="text-surface-400 hover:text-rose-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function CreateJob() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestingTopics, setSuggestingTopics] = useState(false);
  const [jobLink, setJobLink] = useState(null);

  const [form, setForm] = useState({
    title: '', role_type: 'engineering', description: '', experience_level: 'junior',
    required_skills: [], preferred_skills: [],
    min_match_percentage: 70, coding_required: false, difficulty: 'medium',
    question_count: 20, question_type_breakdown: { mcq: 50, subjective: 30, coding: 20 },
    timer_type: 'overall', total_time_minutes: 60, per_question_time_seconds: 120,
    data_retention_days: 90, topics: [], custom_questions: []
  });

  const up = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const suggestTopics = async () => {
    setSuggestingTopics(true);
    try {
      const { data } = await api.post('/ai/suggest-topics', {
        role_type: form.role_type, required_skills: form.required_skills, experience_level: form.experience_level
      });
      up('topics', data.topics || []);
      toast.success('Topics generated!');
    } catch { toast.error('Failed to suggest topics'); }
    finally { setSuggestingTopics(false); }
  };

  const publish = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/jobs', form);
      const { data: linkData } = await api.get(`/jobs/${data.job.id}/link`);
      setJobLink(linkData.link);
      toast.success('Job published!');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create job'); }
    finally { setLoading(false); }
  };

  const canNext = () => {
    if (step === 0) return form.title && form.role_type;
    return true;
  };

  const stepContent = [
    /* Step 0: Basic Info */
    <div className="space-y-5">
      <div>
        <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Job Title *</label>
        <input value={form.title} onChange={e => up('title', e.target.value)} placeholder="e.g. Frontend Developer, QA Engineer"
          className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Role Type *</label>
          <select value={form.role_type} onChange={e => up('role_type', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 capitalize bg-white">
            {ROLE_TYPES.map(r => <option key={r} value={r} className="capitalize">{r === 'bd' ? 'Business Development' : r === 'hr' ? 'Human Resources' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Experience Level</label>
          <select value={form.experience_level} onChange={e => up('experience_level', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 capitalize bg-white">
            {LEVELS.map(l => <option key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Job Description</label>
        <textarea value={form.description} onChange={e => up('description', e.target.value)} rows={4} placeholder="Describe the role, responsibilities..."
          className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 resize-none" />
      </div>
      <div>
        <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Required Skills</label>
        <TagInput value={form.required_skills} onChange={v => up('required_skills', v)} placeholder="Type skill and press Enter (e.g. React, Python, SQL)" />
      </div>
      <div>
        <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Preferred Skills <span className="text-surface-400 font-normal">(optional)</span></label>
        <TagInput value={form.preferred_skills} onChange={v => up('preferred_skills', v)} placeholder="Good-to-have skills" />
      </div>
    </div>,

    /* Step 1: Test Config */
    <div className="space-y-6">
      <div>
        <label className="text-sm font-body font-semibold text-surface-700 mb-1 block">Minimum Resume Match to Allow Test: <span className="text-brand-600">{form.min_match_percentage}%</span></label>
        <input type="range" min={40} max={95} value={form.min_match_percentage} onChange={e => up('min_match_percentage', +e.target.value)}
          className="w-full accent-brand-500" />
        <div className="flex justify-between text-xs text-surface-400 font-body mt-1"><span>40% (lenient)</span><span>95% (strict)</span></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Difficulty</label>
          <select value={form.difficulty} onChange={e => up('difficulty', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
            {['easy','medium','hard'].map(d => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Question Count</label>
          <select value={form.question_count} onChange={e => up('question_count', +e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
            {[10,15,20,25,30].map(n => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Timer Type</label>
          <select value={form.timer_type} onChange={e => up('timer_type', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
            <option value="overall">Overall timer</option>
            <option value="per_question">Per question</option>
          </select>
        </div>
      </div>

      {form.timer_type === 'overall' ? (
        <div>
          <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Total Time (minutes)</label>
          <input type="number" min={15} max={180} value={form.total_time_minutes} onChange={e => up('total_time_minutes', +e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400" />
        </div>
      ) : (
        <div>
          <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Time Per Question (seconds)</label>
          <input type="number" min={30} max={600} value={form.per_question_time_seconds} onChange={e => up('per_question_time_seconds', +e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400" />
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-surface-50 rounded-xl border border-surface-200">
        <div>
          <p className="text-sm font-body font-semibold text-surface-800">Coding Questions Required</p>
          <p className="text-xs text-surface-500 font-body">Candidates write and run code in a sandboxed environment</p>
        </div>
        <button onClick={() => up('coding_required', !form.coding_required)}
          className={`relative w-12 h-6 rounded-full transition-colors ${form.coding_required ? 'bg-brand-500' : 'bg-surface-300'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.coding_required ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      <div>
        <label className="text-sm font-body font-semibold text-surface-700 mb-3 block">Question Type Breakdown</label>
        {['mcq', 'subjective', 'coding'].map(type => (
          <div key={type} className="flex items-center gap-4 mb-3">
            <span className="w-20 text-sm font-body text-surface-600 capitalize">{type === 'mcq' ? 'MCQ' : type.charAt(0).toUpperCase()+type.slice(1)}</span>
            <input type="range" min={0} max={100} value={form.question_type_breakdown[type]}
              onChange={e => up('question_type_breakdown', { ...form.question_type_breakdown, [type]: +e.target.value })}
              className="flex-1 accent-brand-500" />
            <span className="w-10 text-sm font-body font-semibold text-brand-600 text-right">{form.question_type_breakdown[type]}%</span>
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-body font-semibold text-surface-700 mb-1.5 block">Data Retention</label>
        <select value={form.data_retention_days} onChange={e => up('data_retention_days', +e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm font-body focus:outline-none focus:border-brand-400 bg-white">
          {[30,60,90,180].map(d => <option key={d} value={d}>{d} days</option>)}
        </select>
      </div>
    </div>,

    /* Step 2: Topics */
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-surface-900">Assessment Topics</h3>
          <p className="text-sm text-surface-500 font-body mt-0.5">AI will generate questions covering these topics</p>
        </div>
        <button onClick={suggestTopics} disabled={suggestingTopics}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 text-violet-700 border border-violet-200 text-sm font-body font-semibold rounded-xl hover:bg-violet-100 transition-all disabled:opacity-50">
          {suggestingTopics ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {suggestingTopics ? 'Generating...' : 'AI Suggest Topics'}
        </button>
      </div>

      {form.topics.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-4 bg-surface-50 rounded-xl border border-surface-200 min-h-16">
          {form.topics.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-surface-700 border border-surface-200 rounded-xl text-sm font-body shadow-sm">
              {t}
              <button onClick={() => up('topics', form.topics.filter(x => x !== t))} className="text-surface-400 hover:text-rose-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-surface-50 rounded-xl border border-dashed border-surface-300 text-center">
          <Sparkles className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-sm text-surface-400 font-body">Click "AI Suggest Topics" or add your own below</p>
        </div>
      )}

      <div className="flex gap-2">
        <TagInput value={form.topics} onChange={v => up('topics', v)} placeholder="Add topic and press Enter" />
      </div>
    </div>,

    /* Step 3: Custom Questions */
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-bold text-surface-900">Custom Questions</h3>
        <p className="text-sm text-surface-500 font-body mt-0.5">These will be added alongside AI-generated questions. Optional.</p>
      </div>
      <CustomQuestionForm questions={form.custom_questions} setQuestions={v => up('custom_questions', v)} />
    </div>,

    /* Step 4: Review */
    <div className="space-y-5">
      {jobLink ? (
        <div className="text-center space-y-6 py-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-2xl font-display font-bold text-surface-900">Job Published!</h3>
            <p className="text-surface-500 font-body mt-1">Share this link with candidates</p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-surface-50 rounded-xl border border-surface-200">
            <span className="flex-1 text-sm font-mono text-surface-700 truncate">{jobLink}</span>
            <button onClick={() => { navigator.clipboard.writeText(jobLink); toast.success('Copied!'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 border border-brand-200 rounded-lg text-xs font-body font-semibold hover:bg-brand-100 transition-all">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
          <button onClick={() => navigate('/recruiter/jobs')}
            className="px-6 py-2.5 gradient-brand text-white font-body font-semibold rounded-xl hover:opacity-90 transition-all">
            View All Jobs
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Job Title', form.title], ['Role Type', form.role_type], ['Experience', form.experience_level],
              ['Difficulty', form.difficulty], ['Questions', form.question_count], ['Match Required', `${form.min_match_percentage}%`],
              ['Timer', form.timer_type === 'overall' ? `${form.total_time_minutes} min total` : `${form.per_question_time_seconds}s/question`],
              ['Coding', form.coding_required ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-3 border-b border-surface-100">
                <span className="text-sm text-surface-500 font-body">{k}</span>
                <span className="text-sm font-body font-semibold text-surface-800 capitalize">{v}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm text-surface-500 font-body mb-2">Required Skills</p>
            <div className="flex flex-wrap gap-1.5">{form.required_skills.map(s => <span key={s} className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-body font-semibold">{s}</span>)}</div>
          </div>
          {form.topics.length > 0 && (
            <div>
              <p className="text-sm text-surface-500 font-body mb-2">Topics ({form.topics.length})</p>
              <div className="flex flex-wrap gap-1.5">{form.topics.map(t => <span key={t} className="px-2.5 py-1 bg-surface-100 text-surface-600 rounded-lg text-xs font-body">{t}</span>)}</div>
            </div>
          )}
          {form.custom_questions.length > 0 && (
            <p className="text-sm text-surface-500 font-body">{form.custom_questions.length} custom question(s) added</p>
          )}
          <button onClick={publish} disabled={loading}
            className="w-full py-3 gradient-brand text-white font-body font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50">
            {loading ? <><Loader className="w-4 h-4 animate-spin" />Publishing...</> : <><Check className="w-4 h-4" />Publish Job</>}
          </button>
        </>
      )}
    </div>
  ];

  return (
    <Layout title="Create Job" subtitle="Set up a new position with AI-powered assessment">
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 cursor-pointer ${i <= step ? 'text-brand-600' : 'text-surface-400'}`}
                onClick={() => i < step && setStep(i)}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold transition-all ${
                  i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100' : 'bg-surface-200 text-surface-500'}`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-body font-semibold hidden sm:block ${i === step ? 'text-brand-600' : i < step ? 'text-surface-600' : 'text-surface-400'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-brand-300' : 'bg-surface-200'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 mb-6 animate-fade-in">
          {stepContent[step]}
        </div>

        {/* Navigation */}
        {!jobLink && (
          <div className="flex justify-between">
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-surface-600 border border-surface-200 rounded-xl text-sm font-body font-semibold hover:bg-surface-50 transition-all disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < STEPS.length - 1 && (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
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
