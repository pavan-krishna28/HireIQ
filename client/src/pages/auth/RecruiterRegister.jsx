import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, ArrowRight, Building2 } from 'lucide-react';

export default function RecruiterRegister() {
  const [form, setForm] = useState({ name: '', email: '', password: '', company_name: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.company_name);
      toast.success('Account created! Welcome to HireIQ');
      navigate('/recruiter');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const field = (label, key, type = 'text', placeholder = '', icon = null) => (
    <div className="space-y-1.5">
      <label className="text-sm font-body text-slate-400">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">{icon}</div>}
        <input
          type={type === 'password' ? (show ? 'text' : 'password') : type}
          required={key !== 'company_name'}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className={`w-full px-4 py-3 ${icon ? 'pl-10' : ''} ${type === 'password' ? 'pr-12' : ''} rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 font-body text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all`}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-display font-semibold text-lg">HireIQ</span>
        </div>

        <div>
          <h2 className="text-3xl font-display font-bold text-white">Create account</h2>
          <p className="text-slate-500 font-body mt-2">Start hiring smarter today</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {field('Full name', 'name', 'text', 'Your name')}
          {field('Work email', 'email', 'email', 'you@company.com')}
          {field('Password', 'password', 'password', '6+ characters')}
          <div className="space-y-1.5">
            <label className="text-sm font-body text-slate-400">Company name <span className="text-slate-600">(optional — defaults to Lumos Learning)</span></label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
              <input
                type="text"
                value={form.company_name}
                onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                placeholder="Lumos Learning"
                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 font-body text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3 px-6 gradient-brand text-white font-body font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-600/30 disabled:opacity-50 mt-2">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
            ) : (
              <>Get started <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center text-slate-500 font-body text-sm">
          Already have an account?{' '}
          <Link to="/recruiter/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
