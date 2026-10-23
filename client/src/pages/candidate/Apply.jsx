import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, XCircle, Loader, Zap, AlertCircle } from 'lucide-react';

const STAGES = ['details', 'upload', 'analyzing', 'result'];

export default function Apply() {
  const { companySlug, jobId } = useParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState('details');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const submitDetails = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Name and email required');
    setStage('upload');
  };

  const onFileDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files[0] || e.target.files[0];
    if (f && f.type === 'application/pdf') setFile(f);
    else toast.error('Please upload a PDF file');
  };

  const analyze = async () => {
    if (!file) return toast.error('Please upload your resume first');
    setLoading(true);
    setStage('analyzing');

    try {
      const fd = new FormData();
      fd.append('resume', file);
      const { data: uploadData } = await api.post('/resume/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      const { data: analyzeData } = await api.post('/resume/analyze', {
        resume_text: uploadData.resume_text,
        job_id: jobId,
        candidate_info: form
      });

      setAnalysis(analyzeData.analysis);
      setSessionToken(analyzeData.session_token);
      setSessionId(analyzeData.session_id);
      setStage('result');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed. Please try again.');
      setStage('upload');
    } finally {
      setLoading(false);
    }
  };

  const proceedToTest = () => {
    sessionStorage.setItem('hireiq_session', JSON.stringify({
      token: sessionToken, session_id: sessionId, job_id: jobId, candidate_name: form.name,
      analysis
    }));
    navigate('/test/instructions');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-brand-900 to-surface-950 flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-600 rounded-full opacity-5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600 rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-display font-semibold text-lg">HireIQ</span>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 animate-fade-up">

          {/* STAGE: Details */}
          {stage === 'details' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Let's get started</h1>
                <p className="text-slate-400 font-body text-sm mt-1">Fill in your details to begin the assessment</p>
              </div>
              <form onSubmit={submitDetails} className="space-y-4">
                {[['Full Name', 'name', 'text', 'Your full name'], ['Email Address', 'email', 'email', 'your@email.com'], ['Phone', 'phone', 'tel', '+91 xxxx xxxx xx (optional)']].map(([label, key, type, ph]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-sm font-body text-slate-400">{label}</label>
                    <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      required={key !== 'phone'} placeholder={ph}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 font-body text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
                  </div>
                ))}
                <button type="submit" className="w-full py-3 gradient-brand text-white font-body font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-600/30 mt-2">
                  Continue →
                </button>
              </form>
            </div>
          )}

          {/* STAGE: Upload */}
          {stage === 'upload' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">Upload your resume</h1>
                <p className="text-slate-400 font-body text-sm mt-1">PDF only, max 5MB. AI will match it against the job requirements.</p>
              </div>

              <div onClick={() => fileRef.current?.click()} onDrop={onFileDrop} onDragOver={e => e.preventDefault()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all ${file ? 'border-brand-500 bg-brand-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onFileDrop} />
                {file ? (
                  <div className="space-y-2">
                    <FileText className="w-10 h-10 text-brand-400 mx-auto" />
                    <p className="text-white font-body font-semibold">{file.name}</p>
                    <p className="text-slate-500 text-xs font-body">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="text-xs text-slate-500 hover:text-rose-400 font-body transition-colors">Remove</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-10 h-10 text-slate-500 mx-auto" />
                    <div>
                      <p className="text-white font-body font-semibold">Drop your PDF here</p>
                      <p className="text-slate-500 text-sm font-body mt-1">or click to browse</p>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={analyze} disabled={!file || loading}
                className="w-full py-3 gradient-brand text-white font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-600/30 disabled:opacity-40">
                Analyze Resume & Check Fit
              </button>
            </div>
          )}

          {/* STAGE: Analyzing */}
          {stage === 'analyzing' && (
            <div className="text-center py-8 space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 gradient-brand rounded-full opacity-20 animate-ping" />
                <div className="relative w-20 h-20 gradient-brand rounded-full flex items-center justify-center shadow-xl shadow-brand-500/30">
                  <Loader className="w-8 h-8 text-white animate-spin" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">Analyzing your resume...</h2>
                <p className="text-slate-400 font-body text-sm mt-2">AI is matching your skills against the job requirements</p>
              </div>
              <div className="space-y-2 text-left">
                {['Parsing resume content', 'Extracting skills & experience', 'Matching against job requirements', 'Calculating fit score'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                    <span className="text-sm text-slate-400 font-body">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAGE: Result */}
          {stage === 'result' && analysis && (
            <div className="space-y-6">
              {analysis.proceed_to_test ? (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-white">Great match!</h2>
                    <p className="text-slate-400 font-body text-sm mt-1">You matched {analysis.match_score}% of the requirements</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 font-body mb-1.5">Skills matched</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(analysis.matched_skills || []).map(s => <span key={s} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-body border border-emerald-500/20">{s}</span>)}
                      </div>
                    </div>
                    {(analysis.missing_skills || []).length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 font-body mb-1.5">Not matched</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.missing_skills.map(s => <span key={s} className="px-2.5 py-1 bg-white/5 text-slate-500 rounded-lg text-xs font-body border border-white/10">{s}</span>)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-300 font-body">Please ensure you are in a quiet environment with stable internet before starting. The test is timed and monitored.</p>
                  </div>

                  <button onClick={proceedToTest} className="w-full py-3 gradient-brand text-white font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-600/30">
                    Proceed to Test Instructions →
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
                      <XCircle className="w-8 h-8 text-rose-400" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-white">Not a match right now</h2>
                  </div>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-sm text-slate-300 font-body leading-relaxed">{analysis.rejection_message}</p>
                  </div>
                  <p className="text-center text-xs text-slate-600 font-body">Match score: {analysis.match_score}% · Required: minimum threshold</p>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
