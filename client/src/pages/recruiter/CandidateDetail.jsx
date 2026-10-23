import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../../components/recruiter/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader, Trophy, CalendarDays } from 'lucide-react';

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCandidate = async () => {
      try {
        const { data } = await api.get(`/candidates/${id}`);
        setCandidate(data.candidate);
        setSessions(data.sessions || []);
        setForm({
          name: data.candidate.name || '',
          email: data.candidate.email || '',
          phone: data.candidate.phone || '',
        });
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load candidate');
        navigate('/recruiter/jobs');
      } finally {
        setLoading(false);
      }
    };
    loadCandidate();
  }, [id, navigate]);

  const saveCandidate = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/candidates/${id}`, form);
      setCandidate(data.candidate);
      toast.success('Candidate updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update candidate');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Loading candidate...">
        <div className="flex justify-center py-24"><Loader className="w-7 h-7 text-brand-500 animate-spin" /></div>
      </Layout>
    );
  }

  if (!candidate) return null;

  return (
    <Layout title={candidate.name} subtitle="Candidate details and application history"
      action={(
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-2 text-surface-600 border border-surface-200 rounded-xl text-sm font-body font-semibold hover:bg-surface-50 transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] mb-6">
        <div className="bg-white rounded-2xl border border-surface-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-[0.18em] font-semibold">Candidate</p>
              <h2 className="mt-2 text-2xl font-display font-bold text-surface-900">{candidate.name}</h2>
            </div>
            <div className="text-right text-surface-500 text-sm">ID {candidate.id}</div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-surface-50 p-4 border border-surface-100">
              <p className="text-xs uppercase tracking-[0.16em] text-surface-500 font-semibold mb-2">Email</p>
              <p className="text-sm text-surface-700 break-all">{candidate.email || 'Not provided'}</p>
            </div>
            <div className="rounded-3xl bg-surface-50 p-4 border border-surface-100">
              <p className="text-xs uppercase tracking-[0.16em] text-surface-500 font-semibold mb-2">Phone</p>
              <p className="text-sm text-surface-700">{candidate.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 mb-3">Edit details</h3>
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-surface-700">
                Name
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-surface-200 bg-white px-4 py-3 text-sm text-surface-900 focus:outline-none focus:border-brand-400" />
              </label>
              <label className="block text-sm font-semibold text-surface-700">
                Email
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-surface-200 bg-white px-4 py-3 text-sm text-surface-900 focus:outline-none focus:border-brand-400" />
              </label>
              <label className="block text-sm font-semibold text-surface-700">
                Phone
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-surface-200 bg-white px-4 py-3 text-sm text-surface-900 focus:outline-none focus:border-brand-400" />
              </label>
            </div>
            <div className="mt-5 text-right">
              <button onClick={saveCandidate} disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Save updates'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-surface-900">Latest activity</p>
                <p className="text-xs text-surface-500">Test sessions and evaluation history</p>
              </div>
            </div>
            {sessions.length === 0 ? (
              <p className="text-sm text-surface-500">No test sessions recorded yet for this candidate.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => (
                  <div key={session.id} className="rounded-3xl border border-surface-100 bg-surface-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-surface-900">{session.job_title}</p>
                        <p className="text-xs text-surface-500">{new Date(session.started_at).toLocaleString()}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        session.status === 'evaluated' ? 'bg-blue-100 text-blue-700' :
                        session.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4 border border-surface-100">
                        <p className="text-xs uppercase tracking-[0.14em] text-surface-500 font-semibold">Score</p>
                        <p className="mt-2 text-lg font-semibold text-surface-900">{session.total_score != null ? `${session.percentage?.toFixed(0)}%` : 'Pending'}</p>
                        {session.total_score != null && <p className="text-xs text-surface-500">{session.total_score}/{session.max_possible_score}</p>}
                      </div>
                      <div className="rounded-2xl bg-white p-4 border border-surface-100">
                        <p className="text-xs uppercase tracking-[0.14em] text-surface-500 font-semibold">Recommendation</p>
                        <p className="mt-2 text-lg font-semibold text-surface-900">{session.recommendation || 'N/A'}</p>
                        {session.recommendation && <p className="text-xs text-surface-500">Confidence {session.percentage?.toFixed(0)}%</p>}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-surface-500">
                      <div className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {session.submitted_at ? 'Submitted' : 'Started'}</div>
                      {session.submitted_at && <span>{new Date(session.submitted_at).toLocaleString()}</span>}
                    </div>
                    {session.status === 'evaluated' && (
                      <div className="mt-4 text-right">
                        <Link to={`/recruiter/report/${session.id}`} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                          View assessment report →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
