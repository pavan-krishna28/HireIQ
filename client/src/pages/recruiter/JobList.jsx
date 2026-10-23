import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/recruiter/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Copy, ExternalLink, Users, Clock, CheckCircle, Briefcase, Loader, MoreHorizontal } from 'lucide-react';

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/jobs').then(({ data }) => setJobs(data.jobs || [])).finally(() => setLoading(false));
  }, []);

  const copyLink = async (id) => {
    const { data } = await api.get(`/jobs/${id}/link`);
    navigator.clipboard.writeText(data.link);
    toast.success('Link copied!');
  };

  const roleColors = { engineering: 'bg-blue-50 text-blue-700', testing: 'bg-violet-50 text-violet-700', hr: 'bg-pink-50 text-pink-700', finance: 'bg-emerald-50 text-emerald-700', bd: 'bg-amber-50 text-amber-700', support: 'bg-orange-50 text-orange-700' };

  return (
    <Layout title="Jobs" subtitle="Manage your job openings"
      action={<Link to="/recruiter/jobs/new" className="flex items-center gap-2 px-4 py-2 gradient-brand text-white text-sm font-body font-semibold rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-500/20"><Plus className="w-4 h-4" /> New Job</Link>}>
      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader className="w-7 h-7 text-brand-500 animate-spin" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-24">
          <Briefcase className="w-12 h-12 text-surface-200 mx-auto mb-4" />
          <h3 className="font-display font-bold text-surface-700 text-lg">No jobs yet</h3>
          <p className="text-surface-400 font-body text-sm mt-1 mb-6">Create your first job opening to start hiring with AI</p>
          <Link to="/recruiter/jobs/new" className="inline-flex items-center gap-2 px-5 py-2.5 gradient-brand text-white font-body font-semibold rounded-xl hover:opacity-90 transition-all"><Plus className="w-4 h-4" /> Create Job</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job, i) => (
            <div key={job.id} className={`bg-white rounded-2xl border border-surface-200 p-5 card-hover animate-fade-up stagger-${Math.min(i+1,5)}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-body font-semibold capitalize ${roleColors[job.role_type] || 'bg-surface-100 text-surface-600'}`}>{job.role_type}</span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-body font-semibold ${job.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>{job.status}</span>
                  </div>
                  <h3 className="font-display font-bold text-surface-900 text-lg">{job.title}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-surface-500 font-body"><Users className="w-3.5 h-3.5" />{job.candidate_count || 0} candidates</span>
                    <span className="flex items-center gap-1.5 text-xs text-surface-500 font-body"><Clock className="w-3.5 h-3.5" />{job.total_time_minutes}min</span>
                    <span className="flex items-center gap-1.5 text-xs text-surface-500 font-body"><CheckCircle className="w-3.5 h-3.5" />{job.question_count} questions</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => copyLink(job.id)} className="flex items-center gap-1.5 px-3 py-2 text-surface-600 border border-surface-200 rounded-xl text-xs font-body font-semibold hover:bg-surface-50 transition-all"><Copy className="w-3.5 h-3.5" />Copy Link</button>
                  <button onClick={() => navigate(`/recruiter/jobs/${job.id}`)} className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-xl text-xs font-body font-semibold hover:bg-brand-100 transition-all"><ExternalLink className="w-3.5 h-3.5" />View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
