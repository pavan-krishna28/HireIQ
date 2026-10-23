import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Camera, Clock, Eye, Clipboard, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

export default function TestInstructions() {
  const navigate = useNavigate();
  const [cameraGranted, setCameraGranted] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const session = JSON.parse(sessionStorage.getItem('hireiq_session') || '{}');

  const requestCamera = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraGranted(true);
    } catch {
      setCameraGranted(false);
    }
  };

  const rules = [
    { icon: Eye, text: 'Do not switch tabs or windows — this will be flagged and may auto-submit your test', severe: true },
    { icon: Camera, text: 'Webcam is active for proctoring. Ensure your face is visible and you are alone', severe: true },
    { icon: Clipboard, text: 'Copy-paste is disabled. All answers must be typed from your own knowledge', severe: true },
    { icon: Shield, text: 'Right-click and browser DevTools are disabled during the test', severe: false },
    { icon: Clock, text: `You will have ${session.analysis?.experience_level || 'allocated'} time. The test auto-submits when time expires`, severe: false },
    { icon: AlertTriangle, text: 'Answers that appear AI-generated are automatically flagged for review', severe: false },
  ];

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-900 rounded-full opacity-30 blur-3xl translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="w-full max-w-2xl relative z-10 animate-fade-up">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-display font-semibold text-lg">HireIQ</span>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Before you begin</h1>
            <p className="text-slate-400 font-body text-sm mt-1">
              Welcome, <span className="text-white font-semibold">{session.candidate_name}</span>. Please read these rules carefully.
            </p>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            {rules.map(({ icon: Icon, text, severe }) => (
              <div key={text} className={`flex items-start gap-3 p-4 rounded-xl ${severe ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-white/5 border border-white/8'}`}>
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${severe ? 'text-rose-400' : 'text-slate-500'}`} />
                <p className={`text-sm font-body ${severe ? 'text-rose-200' : 'text-slate-400'}`}>{text}</p>
              </div>
            ))}
          </div>

          {/* Camera */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-body font-semibold text-sm">Camera Access</p>
                <p className="text-slate-500 text-xs font-body mt-0.5">Required for proctoring during the test</p>
              </div>
              {cameraGranted === null ? (
                <button onClick={requestCamera}
                  className="px-4 py-2 bg-brand-500 text-white text-xs font-body font-semibold rounded-xl hover:bg-brand-600 transition-all">
                  Allow Camera
                </button>
              ) : cameraGranted ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-body font-semibold"><CheckCircle className="w-4 h-4" />Granted</span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 text-xs font-body"><AlertTriangle className="w-4 h-4" />Denied — test continues</span>
              )}
            </div>
          </div>

          {/* Agreement */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-white/20 accent-brand-500 cursor-pointer" />
            <span className="text-sm text-slate-400 font-body group-hover:text-slate-300 transition-colors">
              I understand and agree to all the rules above. I will answer all questions using my own knowledge without AI assistance or external help.
            </span>
          </label>

          <button
            onClick={() => navigate('/test/room')}
            disabled={!agreed}
            className="w-full py-3.5 gradient-brand text-white font-body font-bold rounded-xl hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-brand-600/30 disabled:opacity-30 disabled:cursor-not-allowed text-lg">
            Begin Test →
          </button>
        </div>
      </div>
    </div>
  );
}
