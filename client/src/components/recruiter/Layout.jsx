import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Zap, LayoutDashboard, Briefcase, LogOut, Plus, ChevronRight } from 'lucide-react';

export default function RecruiterLayout({ children, title, subtitle, action }) {
  const { recruiter, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const nav = [
    { to: '/recruiter', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/recruiter/jobs', icon: Briefcase, label: 'Jobs' },
  ];

  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);

  const handleLogout = () => { logout(); navigate('/recruiter/login'); };

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-surface-200 flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-brand rounded-xl flex items-center justify-center shadow-md shadow-brand-500/20">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-bold text-surface-900 text-sm">HireIQ</div>
              <div className="text-xs text-surface-400 font-body">{recruiter?.company?.name || 'Recruiter'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, icon: Icon, label, exact }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-all ${
                isActive(to, exact)
                  ? 'bg-brand-50 text-brand-600 font-semibold'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
              }`}>
              <Icon className={`w-4 h-4 ${isActive(to, exact) ? 'text-brand-500' : 'text-surface-400'}`} />
              {label}
              {isActive(to, exact) && <ChevronRight className="w-3 h-3 ml-auto text-brand-400" />}
            </Link>
          ))}
        </nav>

        {/* New Job CTA */}
        <div className="p-4 border-t border-surface-100">
          <Link to="/recruiter/jobs/new"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 gradient-brand text-white text-sm font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-500/20">
            <Plus className="w-4 h-4" /> New Job
          </Link>
        </div>

        {/* User */}
        <div className="p-4 border-t border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-brand rounded-full flex items-center justify-center text-white text-xs font-display font-bold">
              {recruiter?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-body font-semibold text-surface-800 truncate">{recruiter?.name}</div>
              <div className="text-xs text-surface-400 font-body truncate">{recruiter?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-surface-400 hover:text-rose-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white border-b border-surface-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-display font-bold text-surface-900">{title}</h1>
            {subtitle && <p className="text-sm text-surface-500 font-body mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
