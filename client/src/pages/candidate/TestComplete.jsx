import { useEffect } from 'react';
import { CheckCircle, Zap } from 'lucide-react';

export default function TestComplete() {
  useEffect(() => {
    // Clear session data
    sessionStorage.removeItem('hireiq_session');
    // Prevent back navigation
    window.history.pushState(null, '', window.location.href);
    const block = () => window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', block);
    return () => window.removeEventListener('popstate', block);
  }, []);

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-brand-600 rounded-full opacity-5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="max-w-md w-full text-center space-y-8 animate-fade-up relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-display font-semibold text-lg">HireIQ</span>
        </div>

        {/* Success icon */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-bold text-white">Test Submitted!</h1>
          <p className="text-slate-400 font-body leading-relaxed">
            Your assessment has been recorded successfully. Our AI is now evaluating your responses.
          </p>
        </div>

        {/* Info card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4 text-left">
          <h3 className="text-white font-display font-bold text-sm">What happens next?</h3>
          <div className="space-y-3">
            {[
              ['AI Evaluation', 'Your answers are being scored by our AI evaluation engine'],
              ['Recruiter Review', 'A recruiter will review the AI report and make a decision'],
              ['Result Communication', 'You will be contacted by the recruiting team directly'],
            ].map(([title, desc], i) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-6 h-6 gradient-brand rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-xs text-white font-display font-bold">{i+1}</div>
                <div>
                  <p className="text-white font-body font-semibold text-sm">{title}</p>
                  <p className="text-slate-500 font-body text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 font-body text-xs">
          You may now close this window. Results will be shared by the recruiting team via email.
        </p>
      </div>
    </div>
  );
}
