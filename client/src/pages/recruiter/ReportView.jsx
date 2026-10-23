import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/recruiter/Layout';
import api from '../../services/api';
import { ArrowLeft, AlertTriangle, Shield, ThumbsUp, ThumbsDown, Loader, CheckCircle, XCircle } from 'lucide-react';

const RecBadge = ({ rec }) => {
  const config = {
    'Strong Hire': { cls: 'bg-emerald-500', text: 'text-white' },
    'Hire': { cls: 'bg-blue-500', text: 'text-white' },
    'Maybe': { cls: 'bg-amber-500', text: 'text-white' },
    'Reject': { cls: 'bg-rose-500', text: 'text-white' },
  };
  const c = config[rec] || { cls: 'bg-surface-400', text: 'text-white' };
  return <span className={`px-4 py-1.5 rounded-xl ${c.cls} ${c.text} font-body font-bold text-sm`}>{rec}</span>;
};

export default function ReportView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/reports/${sessionId}`)
      .then(({ data }) => setData(data))
      .catch(err => setError(err.response?.data?.error || 'Report not found'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <Layout title="Report"><div className="flex justify-center py-24"><Loader className="w-7 h-7 text-brand-500 animate-spin" /></div></Layout>;
  if (error) return <Layout title="Report"><div className="text-center py-20 text-surface-500 font-body">{error} — it may still be processing.</div></Layout>;

  const { report, answers, session } = data;
  const sectionScores = report.section_scores || {};

  return (
    <Layout title="Candidate Report" subtitle={`${report.candidate_name} · ${report.job_title}`}
      action={<button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 text-surface-600 border border-surface-200 rounded-xl text-sm font-body hover:bg-surface-50 transition-all"><ArrowLeft className="w-4 h-4" />Back</button>}>
      <div className="max-w-4xl space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 gradient-brand rounded-2xl flex items-center justify-center text-white text-2xl font-display font-bold">
                {(report.candidate_name||'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-surface-900">{report.candidate_name}</h2>
                <p className="text-surface-500 font-body text-sm">{report.email} · {report.job_title}</p>
              </div>
            </div>
            <div className="text-right">
              <RecBadge rec={report.recommendation} />
              <p className="text-xs text-surface-400 font-body mt-2">{new Date(report.generated_at).toLocaleDateString()}</p>
            </div>
          </div>

          {report.recruiter_notes && (
            <div className="mt-5 p-4 bg-surface-50 rounded-xl border-l-4 border-brand-500">
              <p className="text-sm font-body text-surface-700 italic">"{report.recruiter_notes}"</p>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Overall Score', value: `${report.percentage?.toFixed(1)}%`, sub: `${report.total_score}/${report.max_possible_score} points`, color: 'text-brand-600' },
            { label: 'MCQ', value: sectionScores.mcq ? `${sectionScores.mcq.max > 0 ? ((sectionScores.mcq.score/sectionScores.mcq.max)*100).toFixed(0) : 0}%` : 'N/A', sub: `${sectionScores.mcq?.score||0}/${sectionScores.mcq?.max||0}`, color: 'text-blue-600' },
            { label: 'Subjective', value: sectionScores.subjective ? `${sectionScores.subjective.max > 0 ? ((sectionScores.subjective.score/sectionScores.subjective.max)*100).toFixed(0) : 0}%` : 'N/A', sub: `${sectionScores.subjective?.score||0}/${sectionScores.subjective?.max||0}`, color: 'text-violet-600' },
            { label: 'Coding', value: sectionScores.coding?.max > 0 ? `${((sectionScores.coding.score/sectionScores.coding.max)*100).toFixed(0)}%` : 'N/A', sub: `${sectionScores.coding?.score||0}/${sectionScores.coding?.max||0}`, color: 'text-emerald-600' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-surface-200 p-5 text-center">
              <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
              <p className="text-xs text-surface-400 font-body mt-1">{sub}</p>
              <p className="text-sm text-surface-600 font-body font-semibold mt-2">{label}</p>
            </div>
          ))}
        </div>

        {/* Flags */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-surface-200 p-5">
            <h3 className="font-display font-bold text-surface-900 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />AI Integrity Flags</h3>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-display font-bold ${report.ai_flag_count > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{report.ai_flag_count || 0}</span>
              <p className="text-sm text-surface-500 font-body">{report.ai_flag_count > 0 ? 'answers flagged as potentially AI-generated' : 'No AI-generated answers detected'}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-surface-200 p-5">
            <h3 className="font-display font-bold text-surface-900 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-rose-500" />Proctoring</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm font-body"><span className="text-surface-500">Tab switches</span><span className={`font-semibold ${session.tab_switch_count > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{session.tab_switch_count || 0}</span></div>
              <div className="flex justify-between text-sm font-body"><span className="text-surface-500">Window blur</span><span className="font-semibold text-surface-700">{session.window_blur_count || 0}</span></div>
              <div className="flex justify-between text-sm font-body"><span className="text-surface-500">Proctoring flags</span><span className="font-semibold text-surface-700">{(session.proctoring_flags||[]).length}</span></div>
            </div>
          </div>
        </div>

        {/* Strengths & Gaps */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-surface-200 p-5">
            <h3 className="font-display font-bold text-surface-900 mb-3 flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-emerald-500" />Strengths</h3>
            <ul className="space-y-2">{(report.strengths||[]).map((s,i) => <li key={i} className="flex items-start gap-2 text-sm font-body text-surface-700"><CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />{s}</li>)}</ul>
          </div>
          <div className="bg-white rounded-2xl border border-surface-200 p-5">
            <h3 className="font-display font-bold text-surface-900 mb-3 flex items-center gap-2"><ThumbsDown className="w-4 h-4 text-rose-500" />Gaps</h3>
            <ul className="space-y-2">{(report.gaps||[]).map((g,i) => <li key={i} className="flex items-start gap-2 text-sm font-body text-surface-700"><XCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />{g}</li>)}</ul>
          </div>
        </div>

        {/* Answer breakdown */}
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100">
            <h3 className="font-display font-bold text-surface-900">Answer Breakdown</h3>
          </div>
          <div className="divide-y divide-surface-50">
            {answers.map((a, i) => (
              <div key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-body font-semibold text-surface-400">Q{i+1}</span>
                      {a.ai_flagged ? <span className="flex items-center gap-1 text-xs text-amber-600 font-body font-semibold bg-amber-50 px-2 py-0.5 rounded-lg"><AlertTriangle className="w-3 h-3" />AI Flagged</span> : null}
                    </div>
                    <p className="text-sm font-body text-surface-700">{a.answer_text || a.selected_option || <span className="italic text-surface-400">No answer</span>}</p>
                    {a.feedback && <p className="text-xs text-surface-500 font-body mt-1.5 italic">{a.feedback}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-lg font-display font-bold ${a.score >= (a.max_score * 0.7) ? 'text-emerald-600' : a.score > 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                      {a.score ?? '—'}<span className="text-sm text-surface-400">/{a.max_score}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
