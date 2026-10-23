import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/recruiter/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Copy, Users, Trophy, Loader, ArrowLeft, AlertTriangle, Clock, Shield, Eye, Trash2, Edit3 } from 'lucide-react';

const RecBadge = ({ rec }) => {
  const map = { 'Strong Hire': 'bg-emerald-50 text-emerald-700 border-emerald-200', 'Hire': 'bg-blue-50 text-blue-700 border-blue-200', 'Maybe': 'bg-amber-50 text-amber-700 border-amber-200', 'Reject': 'bg-rose-50 text-rose-700 border-rose-200' };
  return rec ? <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-body font-semibold ${map[rec] || 'bg-surface-100 text-surface-500 border-surface-200'}`}>{rec}</span>
    : <span className="text-xs text-surface-400 font-body italic">Processing...</span>;
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [link, setLink] = useState('');
  const [tab, setTab] = useState('candidates');
  const [showQuestions, setShowQuestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingJob, setDeletingJob] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: jd }, { data: cd }, { data: ld }] = await Promise.all([
          api.get(`/jobs/${id}`), api.get(`/jobs/${id}/candidates`), api.get(`/jobs/${id}/link`)
        ]);
        setJob(jd.job);
        setCandidates(cd.candidates || []);
        setLink(ld.link);
      } catch { toast.error('Failed to load job'); navigate('/recruiter/jobs'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const sorted = [...candidates].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  const handleDeleteJob = async () => {
    if (!job) return;
    if (!window.confirm('Delete this job and all associated test data? This cannot be undone.')) return;
    setDeletingJob(true);
    try {
      await api.delete(`/jobs/${job.id}`);
      toast.success('Job deleted');
      navigate('/recruiter/jobs');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete job');
    } finally {
      setDeletingJob(false);
    }
  };

  const viewCandidate = (candidate) => {
    navigate(`/recruiter/candidates/${candidate.id}`);
  };
  let generatedQuestions = [];
  try { generatedQuestions = job?.generated_questions ? JSON.parse(job.generated_questions) : []; } catch {}

  if (loading) return <Layout title="Loading..."><div className="flex justify-center py-24"><Loader className="w-7 h-7 text-brand-500 animate-spin" /></div></Layout>;
  if (!job) return null;

  return (
    <Layout title={job.title} subtitle={`${job.role_type} · ${job.experience_level} · ${candidates.length} candidates`}
      action={
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/recruiter/jobs')}
            className="flex items-center gap-1.5 px-3 py-2 text-surface-600 border border-surface-200 rounded-xl text-sm font-body font-semibold hover:bg-surface-50 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={handleDeleteJob} disabled={deletingJob}
            className="flex items-center gap-1.5 px-3 py-2 text-rose-600 border border-rose-200 rounded-xl text-sm font-body font-semibold hover:bg-rose-50 transition-all disabled:opacity-40">
            <Trash2 className="w-4 h-4" /> {deletingJob ? 'Deleting...' : 'Delete Job'}
          </button>
          <button onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copied!'); }}
            className="flex items-center gap-1.5 px-3 py-2 text-surface-600 border border-surface-200 rounded-xl text-sm font-body font-semibold hover:bg-surface-50 transition-all">
            <Copy className="w-4 h-4" /> Copy Link
          </button>
        </div>
      }>
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="bg-white rounded-2xl border border-surface-200 p-5">
          <p className="text-slate-500 text-xs uppercase tracking-[0.15em] font-semibold mb-2">Question bank</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-display font-bold text-surface-900">{generatedQuestions.length}</p>
              <p className="text-sm text-surface-500 font-body">AI-generated questions available</p>
            </div>
            <button onClick={() => setShowQuestions(o => !o)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-surface-100 rounded-xl text-surface-600 text-xs font-semibold hover:bg-surface-200 transition-all">
              <Eye className="w-4 h-4" /> {showQuestions ? 'Hide' : 'View'}
            </button>
          </div>
        </div>
      </div>
      {showQuestions && generatedQuestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-200 mb-6 p-5">
          <h3 className="font-display font-semibold text-surface-900 mb-4">Generated Questions</h3>
          <div className="space-y-3">
            {generatedQuestions.map((q, index) => (
              <div key={q.question_id || index} className="p-4 rounded-2xl bg-surface-50 border border-surface-100">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-semibold text-surface-700">Q{index + 1} • {q.type?.toUpperCase()}</span>
                  <span className="text-xs text-surface-500 uppercase tracking-[0.12em]">{q.difficulty}</span>
                </div>
                <p className="text-sm text-surface-600">{q.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-100 p-1 rounded-xl w-fit">
        {[['candidates', 'Candidates', Users], ['leaderboard', 'Leaderboard', Trophy]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-semibold transition-all ${tab === key ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'candidates' && (
        candidates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-surface-200">
            <Users className="w-10 h-10 text-surface-200 mx-auto mb-3" />
            <h3 className="font-display font-bold text-surface-700">No candidates yet</h3>
            <p className="text-sm text-surface-400 font-body mt-1 mb-4">Share the job link to start receiving applications</p>
            <div className="flex items-center gap-2 max-w-sm mx-auto p-3 bg-surface-50 rounded-xl border border-surface-200">
              <span className="flex-1 text-xs font-mono text-surface-600 truncate">{link}</span>
              <button onClick={() => { navigator.clipboard.writeText(link); toast.success('Copied!'); }}
                className="px-2.5 py-1.5 bg-brand-50 text-brand-600 border border-brand-200 rounded-lg text-xs font-body font-semibold">Copy</button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  {['Candidate', 'Match', 'Score', 'Status', 'Flags', 'Result', ''].map(h => (
                    <th key={h} className="text-left text-xs font-body font-semibold text-surface-500 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {candidates.map(c => (
                  <tr key={c.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 gradient-brand rounded-full flex items-center justify-center text-white text-xs font-display font-bold">
                          {(c.name||'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-body font-semibold text-surface-800">{c.name}</p>
                          <p className="text-xs text-surface-400 font-body">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${c.match_score}%` }} />
                        </div>
                        <span className="text-sm font-body text-surface-700">{c.match_score}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-body font-semibold text-surface-700">
                        {c.total_score != null ? `${c.percentage?.toFixed(0)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-body font-semibold capitalize ${
                        c.status === 'evaluated' ? 'bg-blue-50 text-blue-700' :
                        c.status === 'submitted' ? 'bg-amber-50 text-amber-700' :
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-xs font-body text-surface-500">
                        {c.ai_flag_count > 0 && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3.5 h-3.5" />{c.ai_flag_count} AI</span>}
                        {c.tab_switch_count > 0 && <span className="flex items-center gap-1 text-rose-600"><Shield className="w-3.5 h-3.5" />{c.tab_switch_count} switch</span>}
                        {!c.ai_flag_count && !c.tab_switch_count && <span className="text-emerald-600">Clean</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4"><RecBadge rec={c.recommendation} /></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <button onClick={() => viewCandidate(c)}
                          className="text-xs text-surface-500 hover:text-surface-900 font-body font-semibold text-left">
                          <Edit3 className="inline w-3.5 h-3.5 mr-1" /> View
                        </button>
                        {c.status === 'evaluated' && (
                          <Link to={`/recruiter/report/${c.id}`} className="text-xs text-brand-500 hover:text-brand-600 font-body font-semibold">
                            View Report →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'leaderboard' && (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          {sorted.filter(c => c.recommendation).length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-10 h-10 text-surface-200 mx-auto mb-3" />
              <p className="text-surface-400 font-body text-sm">Leaderboard will populate once candidates complete their tests</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-50">
              {sorted.filter(c => c.recommendation).map((c, i) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-display font-bold text-sm ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-surface-100 text-surface-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-surface-50 text-surface-400'}`}>
                    {i + 1}
                  </div>
                  <div className="w-8 h-8 gradient-brand rounded-full flex items-center justify-center text-white text-xs font-display font-bold">
                    {(c.name||'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-semibold text-surface-800">{c.name}</p>
                    <p className="text-xs text-surface-400 font-body">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-display font-bold text-surface-900">{c.percentage?.toFixed(0)}%</p>
                    <p className="text-xs text-surface-400 font-body">{c.total_score}/{c.max_possible_score}</p>
                  </div>
                  <RecBadge rec={c.recommendation} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
