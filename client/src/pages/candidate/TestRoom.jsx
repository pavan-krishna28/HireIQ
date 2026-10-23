import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Volume2, Play, ChevronLeft, ChevronRight, AlertTriangle, Clock, Send, X, Terminal, Zap } from 'lucide-react';

// ─── Timer component ─────────────────────────────────────────
function Timer({ totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const pct = (remaining / totalSeconds) * 100;
  const critical = remaining < 300;
  const warn = remaining < 600;
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border font-mono text-sm font-semibold transition-all ${critical ? 'bg-rose-900/40 border-rose-500/50 text-rose-300 animate-pulse' : warn ? 'bg-amber-900/30 border-amber-500/30 text-amber-300' : 'bg-white/5 border-white/10 text-white'}`}>
      <Clock className="w-4 h-4" />
      {String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </div>
  );
}

// ─── MCQ option ───────────────────────────────────────────────
function MCQOption({ letter, text, selected, onSelect }) {
  return (
    <button onClick={() => onSelect(letter)}
      className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${selected ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'}`}>
      <span className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-display font-bold ${selected ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-400'}`}>{letter}</span>
      <span className="font-body text-sm leading-relaxed pt-0.5">{text}</span>
    </button>
  );
}

// ─── Main TestRoom ────────────────────────────────────────────
export default function TestRoom() {
  const navigate = useNavigate();

  // Session state
  const session = JSON.parse(sessionStorage.getItem('hireiq_session') || '{}');
  const [questions, setQuestions] = useState([]);
  const [jobInfo, setJobInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Test state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});      // { qId: { text, option, codeOutput, timeTaken } }
  const [startTime, setStartTime] = useState(null);
  const [qStartTime, setQStartTime] = useState(null);

  // Proctoring state
  const [tabSwitches, setTabSwitches] = useState(0);
  const [flags, setFlags] = useState([]);
  const [warningMsg, setWarningMsg] = useState(null);

  // Code sandbox
  const [codeValue, setCodeValue] = useState('');
  const [codeOutput, setCodeOutput] = useState(null);
  const [codeRunning, setCodeRunning] = useState(false);

  // UI
  const [submitDialog, setSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Webcam
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ── Load test ──
  useEffect(() => {
    if (!session.session_id) { navigate('/recruiter/login'); return; }

    const loadTest = async () => {
      try {
        const { data } = await api.post('/test/start', { session_id: session.session_id });
        setQuestions(data.questions || []);
        setJobInfo(data.job);
        setStartTime(Date.now());
        setQStartTime(Date.now());
        const initialCodes = {};
        data.questions.forEach(q => { if (q.type === 'coding') initialCodes[q.question_id] = ''; });
        setCodeValue(initialCodes);
      } catch (err) {
        setLoadError(err.response?.data?.error || 'Failed to load test. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    loadTest();
  }, []);

  // ── Enter fullscreen ──
  useEffect(() => {
    if (!loading && questions.length > 0) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [loading, questions]);

  // ── Start webcam ──
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: { width: 160, height: 120 } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      }).catch(() => {});
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ── Webcam snapshot every 30s ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (!canvasRef.current || !videoRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 160, 120);
      api.post('/proctor/flag', { session_id: session.session_id, type: 'webcam_snapshot', detail: 'periodic' }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [session.session_id]);

  // ── Lockdown: tab switch ──
  const handleVisibilityChange = useCallback(async () => {
    if (document.hidden && session.session_id) {
      const newCount = tabSwitches + 1;
      setTabSwitches(newCount);
      const msg = newCount >= 3
        ? '⚠️ 3rd tab switch detected — test auto-submitted!'
        : `⚠️ Tab switch detected (${newCount}/3). 3 switches will auto-submit your test.`;
      setWarningMsg(msg);
      setTimeout(() => setWarningMsg(null), 5000);

      try {
        const { data } = await api.post('/proctor/flag', { session_id: session.session_id, type: 'tab_switch', detail: `Switch ${newCount}` });
        if (data.auto_submit) {
          toast.error('Auto-submitting due to repeated tab switches');
          submitTest();
        }
      } catch {}
    }
  }, [tabSwitches, session.session_id]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisibilityChange]);

  // ── Lockdown: copy/paste/right-click ──
  useEffect(() => {
    const blockPaste = (e) => {
      if (e.target.tagName === 'TEXTAREA' && e.target.dataset.type !== 'code') {
        e.preventDefault();
        setWarningMsg('⚠️ Paste is disabled. Please type your answer.');
        setTimeout(() => setWarningMsg(null), 3000);
        api.post('/proctor/flag', { session_id: session.session_id, type: 'copy_attempt', detail: 'paste' }).catch(() => {});
      }
    };
    const blockContext = (e) => {
      e.preventDefault();
      api.post('/proctor/flag', { session_id: session.session_id, type: 'right_click', detail: 'context menu' }).catch(() => {});
    };
    const blockKeys = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && ['u','s','i','U','S','I'].includes(e.key))) e.preventDefault();
    };
    const handleBlur = () => {
      api.post('/proctor/flag', { session_id: session.session_id, type: 'window_blur', detail: 'window blur' }).catch(() => {});
    };

    document.addEventListener('paste', blockPaste);
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('paste', blockPaste);
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
      window.removeEventListener('blur', handleBlur);
    };
  }, [session.session_id]);

  // ── TTS ──
  const speak = (text) => {
    window.speechSynthesis?.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis?.speak(utterance);
  };

  // ── Save answer ──
  const saveAnswer = async (qId, answerData) => {
    const timeTaken = Math.round((Date.now() - (qStartTime || Date.now())) / 1000);
    const payload = {
      session_id: session.session_id,
      question_id: qId,
      answer_text: answerData.text || null,
      selected_option: answerData.option || null,
      code_output: answerData.codeOutput || null,
      time_taken_seconds: timeTaken,
    };
    try {
      await api.post('/test/submit-answer', payload);
    } catch {}
  };

  // ── Navigate questions ──
  const goTo = async (newIdx) => {
    const q = questions[currentIdx];
    if (q) {
      const ans = answers[q.question_id];
      if (ans) await saveAnswer(q.question_id, ans);
    }
    setCurrentIdx(newIdx);
    setQStartTime(Date.now());
    setCodeOutput(null);
    setPaletteOpen(false);
  };

  // ── Run code ──
  const runCode = async () => {
    const q = questions[currentIdx];
    const code = typeof codeValue === 'object' ? codeValue[q.question_id] : codeValue;
    if (!code?.trim()) return toast.error('Write some code first');
    setCodeRunning(true);
    try {
      const { data } = await api.post('/code/run', { code, language: q.language || 'javascript' });
      const output = data.success ? data.output : `Error: ${data.error}`;
      setCodeOutput({ output, error: !data.success, timed_out: data.timed_out });
      setAnswers(prev => ({ ...prev, [q.question_id]: { ...(prev[q.question_id] || {}), text: code, codeOutput: output } }));
    } catch { toast.error('Code execution failed'); }
    finally { setCodeRunning(false); }
  };

  // ── Submit test ──
  const submitTest = async () => {
    setSubmitting(true);
    setSubmitDialog(false);
    const q = questions[currentIdx];
    if (q && answers[q.question_id]) {
      await saveAnswer(q.question_id, answers[q.question_id]);
    }
    // Save all unsaved answers
    for (const [qId, ans] of Object.entries(answers)) {
      await saveAnswer(qId, ans).catch(() => {});
    }
    try {
      await api.post('/test/submit-final', { session_id: session.session_id });
      document.exitFullscreen?.().catch(() => {});
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach(t => t.stop());
      navigate('/test/complete');
    } catch { toast.error('Submission failed. Try again.'); setSubmitting(false); }
  };

  // ── Render loading ──
  if (loading) return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 gradient-brand rounded-full opacity-20 animate-ping" />
          <div className="relative w-16 h-16 gradient-brand rounded-full flex items-center justify-center">
            <Zap className="w-7 h-7 text-white animate-pulse" />
          </div>
        </div>
        <p className="text-slate-400 font-body">Generating your personalized test...</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <p className="text-white font-display font-bold text-lg">Test Load Failed</p>
        <p className="text-slate-400 font-body text-sm">{loadError}</p>
        <button onClick={() => window.location.reload()} className="px-5 py-2 gradient-brand text-white font-body font-semibold rounded-xl">Retry</button>
      </div>
    </div>
  );

  const q = questions[currentIdx];
  const ans = answers[q?.question_id] || {};
  const answered = (id) => !!(answers[id]?.text || answers[id]?.option);
  const totalTime = jobInfo ? jobInfo.total_time_minutes * 60 : 3600;

  return (
    <div className="min-h-screen bg-surface-950 text-white select-none flex flex-col"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>

      {/* Warning banner */}
      {warningMsg && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-sm font-body font-semibold py-2.5 text-center animate-slide-in flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {warningMsg}
          <button onClick={() => setWarningMsg(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/8 bg-surface-900/80 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 gradient-brand rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-white font-display font-semibold text-sm">HireIQ</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-slate-400 font-body text-sm truncate max-w-48">{jobInfo?.title || 'Assessment'}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Question counter */}
          <div className="flex items-center gap-1.5 text-xs font-body text-slate-400 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            Q <span className="text-white font-semibold">{currentIdx + 1}</span> / {questions.length}
          </div>
          {/* Timer */}
          {jobInfo && <Timer totalSeconds={totalTime} onExpire={submitTest} />}
          {/* Submit */}
          <button onClick={() => setSubmitDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 gradient-brand text-white text-xs font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-600/20">
            <Send className="w-3.5 h-3.5" /> Submit Test
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question palette sidebar */}
        <aside className={`flex-shrink-0 border-r border-white/8 bg-surface-900/50 transition-all duration-300 ${paletteOpen ? 'w-56' : 'w-14'}`}>
          <button onClick={() => setPaletteOpen(o => !o)}
            className="w-full flex items-center justify-center py-4 text-slate-500 hover:text-white transition-colors">
            {paletteOpen ? <ChevronLeft className="w-4 h-4" /> : <div className="w-4 h-4 grid grid-cols-2 gap-0.5">{[0,1,2,3].map(i=><div key={i} className="w-1.5 h-1.5 bg-current rounded-sm"/>)}</div>}
          </button>
          <div className={`px-2 space-y-1 ${paletteOpen ? '' : 'flex flex-col items-center'}`}>
            {questions.map((qItem, i) => (
              <button key={qItem.question_id} onClick={() => goTo(i)}
                className={`rounded-xl font-body font-semibold text-xs transition-all ${paletteOpen ? 'w-full flex items-center gap-2.5 px-3 py-2.5' : 'w-9 h-9 flex items-center justify-center mb-1'} ${i === currentIdx ? 'bg-brand-500 text-white' : answered(qItem.question_id) ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white border border-white/5'}`}>
                <span>{i + 1}</span>
                {paletteOpen && (
                  <span className="truncate text-left opacity-70">{qItem.topic || qItem.type}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8" style={{ userSelect: 'none' }}>
          {q && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
              {/* Question header */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-white/8 text-slate-400 text-xs font-body font-semibold rounded-lg border border-white/10 uppercase tracking-wide">{q.type === 'mcq' ? 'Multiple Choice' : q.type === 'coding' ? 'Coding' : 'Written Answer'}</span>
                  <span className={`px-2.5 py-1 text-xs font-body font-semibold rounded-lg ${q.difficulty === 'hard' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : q.difficulty === 'medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'}`}>
                    {q.difficulty}
                  </span>
                  {q.topic && <span className="px-2.5 py-1 bg-brand-500/15 text-brand-300 border border-brand-500/20 text-xs font-body rounded-lg">{q.topic}</span>}
                  {q.is_custom && <span className="px-2.5 py-1 bg-violet-500/15 text-violet-400 border border-violet-500/20 text-xs font-body rounded-lg">Recruiter Q</span>}
                </div>

                <div className="flex items-start gap-3">
                  <h2 className="text-xl font-display font-semibold text-white leading-relaxed flex-1"
                    style={{ userSelect: 'none' }}>
                    {q.question}
                  </h2>
                  <button onClick={() => speak(q.question)}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-brand-300 hover:bg-brand-500/10 hover:border-brand-500/30 transition-all"
                    title="Read aloud">
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MCQ */}
              {q.type === 'mcq' && q.options && (
                <div className="space-y-2.5">
                  {Object.entries(q.options).map(([letter, text]) => (
                    <MCQOption key={letter} letter={letter} text={text} selected={ans.option === letter}
                      onSelect={(l) => setAnswers(prev => ({ ...prev, [q.question_id]: { ...prev[q.question_id], option: l } }))} />
                  ))}
                </div>
              )}

              {/* Subjective */}
              {q.type === 'subjective' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-400 font-body">Your answer</label>
                    <span className="text-xs text-slate-600 font-body">{(ans.text || '').length} chars</span>
                  </div>
                  <textarea
                    value={ans.text || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.question_id]: { ...prev[q.question_id], text: e.target.value } }))}
                    onPaste={e => e.preventDefault()}
                    placeholder="Type your answer here. Be specific, give examples from your experience, explain your reasoning..."
                    rows={10}
                    data-type="subjective"
                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 text-white placeholder-slate-600 font-body text-sm leading-relaxed rounded-2xl resize-none focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  />
                </div>
              )}

              {/* Coding */}
              {q.type === 'coding' && (
                <div className="space-y-3">
                  {/* Sample I/O */}
                  {(q.sample_input || q.sample_output) && (
                    <div className="grid grid-cols-2 gap-3">
                      {q.sample_input && (
                        <div className="p-3.5 bg-white/4 border border-white/8 rounded-xl">
                          <p className="text-xs text-slate-500 font-body mb-1.5 uppercase tracking-wide">Sample Input</p>
                          <pre className="text-sm text-emerald-300 font-mono">{q.sample_input}</pre>
                        </div>
                      )}
                      {q.sample_output && (
                        <div className="p-3.5 bg-white/4 border border-white/8 rounded-xl">
                          <p className="text-xs text-slate-500 font-body mb-1.5 uppercase tracking-wide">Expected Output</p>
                          <pre className="text-sm text-blue-300 font-mono">{q.sample_output}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Language badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-body">Language:</span>
                    <span className="px-2 py-0.5 bg-white/8 border border-white/10 text-slate-300 text-xs font-mono rounded-lg capitalize">{q.language || 'javascript'}</span>
                  </div>

                  {/* Code editor */}
                  <div className="border border-white/10 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/8">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{q.language || 'js'}</span>
                    </div>
                    <textarea
                      value={typeof codeValue === 'object' ? (codeValue[q.question_id] || '') : ''}
                      onChange={e => {
                        const val = e.target.value;
                        setCodeValue(prev => ({ ...(typeof prev === 'object' ? prev : {}), [q.question_id]: val }));
                        setAnswers(prev => ({ ...prev, [q.question_id]: { ...prev[q.question_id], text: val } }));
                      }}
                      placeholder={`// Write your ${q.language || 'JavaScript'} solution here\n// Read from stdin / print to stdout as needed`}
                      rows={14}
                      data-type="code"
                      spellCheck={false}
                      className="w-full px-5 py-4 bg-surface-900 text-slate-100 font-mono text-sm leading-relaxed resize-none focus:outline-none tab-indent"
                      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                      onKeyDown={e => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          const start = e.target.selectionStart;
                          const end = e.target.selectionEnd;
                          const val = e.target.value;
                          const newVal = val.substring(0, start) + '  ' + val.substring(end);
                          const newCode = { ...(typeof codeValue === 'object' ? codeValue : {}), [q.question_id]: newVal };
                          setCodeValue(newCode);
                          setAnswers(prev => ({ ...prev, [q.question_id]: { ...prev[q.question_id], text: newVal } }));
                          setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 2; }, 0);
                        }
                      }}
                    />
                  </div>

                  {/* Run button */}
                  <button onClick={runCode} disabled={codeRunning}
                    className="flex items-center gap-2 px-4 py-2.5 gradient-brand text-white text-sm font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-600/20 disabled:opacity-50">
                    {codeRunning ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running...</>
                    ) : (
                      <><Play className="w-4 h-4" fill="currentColor" />Run Code</>
                    )}
                  </button>

                  {/* Output */}
                  {codeOutput && (
                    <div className={`rounded-xl border overflow-hidden animate-fade-in`}>
                      <div className={`flex items-center gap-2 px-4 py-2.5 text-xs font-body font-semibold ${codeOutput.error ? 'bg-rose-900/30 border-b border-rose-500/20 text-rose-400' : 'bg-emerald-900/20 border-b border-emerald-500/20 text-emerald-400'}`}>
                        <Terminal className="w-3.5 h-3.5" />
                        {codeOutput.timed_out ? 'Time Limit Exceeded' : codeOutput.error ? 'Error' : 'Output'}
                      </div>
                      <pre className={`px-4 py-3.5 font-mono text-sm leading-relaxed ${codeOutput.error ? 'bg-rose-900/10 text-rose-300' : 'bg-emerald-900/10 text-emerald-200'}`}>
                        {codeOutput.output || '(no output)'}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-white/8">
                <button onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-sm font-body font-semibold rounded-xl hover:bg-white/10 transition-all disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <button onClick={() => setPaletteOpen(o => !o)}
                  className="flex gap-1">
                  {questions.map((qItem, i) => (
                    <div key={qItem.question_id}
                      className={`w-2 h-2 rounded-full transition-all ${i === currentIdx ? 'bg-brand-400 scale-125' : answered(qItem.question_id) ? 'bg-emerald-500' : 'bg-white/20'}`} />
                  ))}
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button onClick={() => goTo(currentIdx + 1)}
                    className="flex items-center gap-2 px-4 py-2.5 gradient-brand text-white text-sm font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-600/20">
                    Save & Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => setSubmitDialog(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white text-sm font-body font-semibold rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-600/20">
                    <Send className="w-4 h-4" /> Submit Test
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Webcam preview */}
      <div className="fixed bottom-4 right-4 z-30">
        <video ref={videoRef} autoPlay muted playsInline
          className="w-28 h-20 object-cover rounded-xl border border-white/15 bg-surface-900 shadow-xl" />
        <canvas ref={canvasRef} width={160} height={120} className="hidden" />
        <div className="absolute top-1.5 left-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" title="Recording" />
      </div>

      {/* Submit dialog */}
      {submitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-fade-up">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center">
                <Send className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white">Submit your test?</h3>
                <p className="text-slate-400 font-body text-sm mt-1">
                  {Object.keys(answers).length} of {questions.length} questions answered.
                  {Object.keys(answers).length < questions.length && (
                    <span className="text-amber-400"> {questions.length - Object.keys(answers).length} unanswered.</span>
                  )}
                </p>
              </div>
              <p className="text-xs text-slate-600 font-body">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setSubmitDialog(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 font-body font-semibold rounded-xl hover:bg-white/10 transition-all text-sm">
                  Keep Going
                </button>
                <button onClick={submitTest} disabled={submitting}
                  className="flex-1 py-2.5 gradient-brand text-white font-body font-semibold rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</> : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
