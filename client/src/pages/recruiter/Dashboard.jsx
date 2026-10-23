import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/recruiter/Layout';
import api from '../../services/api';
import { Briefcase, Users, Clock, TrendingUp, ArrowRight, Plus, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

const RecommendationBadge = ({ rec }) => {
  const map = {
    'Strong Hire': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Hire': 'bg-blue-50 text-blue-700 border-blue-200',
    'Maybe': 'bg-amber-50 text-amber-700 border-amber-200',
    'Reject': 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return rec ? (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-body font-semibold ${map[rec] || 'bg-surface-100 text-surface-600 border-surface-200'}`}>
      {rec}
    </span>
  ) : <span className="text-xs text-surface-400 font-body">Pending</span>;
};

const StatusBadge = ({ status }) => {
  const map = {
    active: 'bg-emerald-50 text-emerald-700',
    submitted: 'bg-amber-50 text-amber-700',
    evaluated: 'bg-blue-50 text-blue-700',
    pending: 'bg-surface-100 text-surface-500',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-body font-semibold capitalize ${map[status] || 'bg-surface-100 text-surface-500'}`}>
      {status}
    </span>
  );
};

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [recentCandidates, setRecentCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/jobs');
        setJobs(data.jobs || []);
        // Get candidates from first few jobs
        const allCandidates = [];
        for (const job of (data.jobs || []).slice(0, 3)) {
          const { data: cd } = await api.get(`/jobs/${job.id}/candidates`);
          (cd.candidates || []).forEach(c => allCandidates.push({ ...c, job_title: job.title }));
        }
        setRecentCandidates(allCandidates.slice(0, 8));
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const totalCandidates = jobs.reduce((s, j) => s + (j.candidate_count || 0), 0);
  const pendingReviews = recentCandidates.filter(c => c.status === 'evaluated' && !c.recommendation).length;

  const stats = [
    { label: 'Active Jobs', value: activeJobs, icon: Briefcase, color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Total Candidates', value: totalCandidates, icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
    { label: 'Pending Reviews', value: pendingReviews, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Total Jobs', value: jobs.length, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <Layout title="Dashboard" subtitle="Overview of your hiring pipeline"
      action={
        <Link to="/recruiter/jobs/new"
          className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-500/20">
          <Plus className="w-4 h-4" /> New Job
        </Link>
      }>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-surface-500 font-body text-sm">Loading dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
              <div key={label} className={`bg-white rounded-2xl p-5 border border-surface-200 card-hover animate-fade-up stagger-${i+1}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <span className="text-3xl font-display font-bold text-surface-900">{value}</span>
                </div>
                <p className="text-sm text-surface-500 font-body mt-3">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Recent Jobs */}
            <div className="col-span-1 bg-white rounded-2xl border border-surface-200 overflow-hidden animate-fade-up stagger-3">
              <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                <h3 className="font-display font-bold text-surface-900 text-sm">Recent Jobs</h3>
                <Link to="/recruiter/jobs" className="text-xs text-brand-500 hover:text-brand-600 font-body font-semibold flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-surface-50">
                {jobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <Briefcase className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-sm text-surface-400 font-body">No jobs yet</p>
                    <Link to="/recruiter/jobs/new" className="text-xs text-brand-500 font-semibold mt-1 inline-block">Create your first job →</Link>
                  </div>
                ) : jobs.slice(0, 6).map(job => (
                  <Link key={job.id} to={`/recruiter/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-50 transition-colors group">
                    <div className="min-w-0">
                      <p className="text-sm font-body font-semibold text-surface-800 truncate group-hover:text-brand-600 transition-colors">{job.title}</p>
                      <p className="text-xs text-surface-400 font-body capitalize">{job.role_type} · {job.candidate_count || 0} candidates</p>
                    </div>
                    <span className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-lg font-body font-semibold ${job.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>
                      {job.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Candidates */}
            <div className="col-span-2 bg-white rounded-2xl border border-surface-200 overflow-hidden animate-fade-up stagger-4">
              <div className="px-5 py-4 border-b border-surface-100">
                <h3 className="font-display font-bold text-surface-900 text-sm">Recent Candidates</h3>
              </div>
              {recentCandidates.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-10 h-10 text-surface-200 mx-auto mb-3" />
                  <p className="text-surface-400 font-body text-sm">No candidates yet. Share a job link to start.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-50">
                      <th className="text-left text-xs font-body font-semibold text-surface-500 px-5 py-3">Candidate</th>
                      <th className="text-left text-xs font-body font-semibold text-surface-500 px-5 py-3">Job</th>
                      <th className="text-left text-xs font-body font-semibold text-surface-500 px-5 py-3">Match</th>
                      <th className="text-left text-xs font-body font-semibold text-surface-500 px-5 py-3">Status</th>
                      <th className="text-left text-xs font-body font-semibold text-surface-500 px-5 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50">
                    {recentCandidates.map(c => (
                      <tr key={c.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 gradient-brand rounded-full flex items-center justify-center text-white text-xs font-display font-bold flex-shrink-0">
                              {(c.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-body font-semibold text-surface-800 truncate">{c.name || 'Unknown'}</p>
                              <p className="text-xs text-surface-400 font-body truncate">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-body text-surface-600">{c.job_title}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-body font-semibold text-surface-700">{c.match_score}%</span>
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                        <td className="px-5 py-3.5"><RecommendationBadge rec={c.recommendation} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
