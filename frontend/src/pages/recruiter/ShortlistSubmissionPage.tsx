import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FileCheck,
  Send,
  User,
  Users,
  Briefcase,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { matchingApi, workflowApi, usersApi } from "../../services/api";
import { ShortlistCandidatesResponse, User as UserType } from "../../types";

export const ShortlistSubmissionPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const jid = parseInt(jobId || "0", 10);

  const [data, setData] = useState<ShortlistCandidatesResponse | null>(null);
  const [hiringManagers, setHiringManagers] = useState<UserType[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [selectedHMId, setSelectedHMId] = useState<number | null>(null);
  const [shortlistNote, setShortlistNote] = useState<string>("");

  // Filters
  const [minScore, setMinScore] = useState<number>(75);
  const [topN, setTopN] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCandidates = async () => {
    if (!jid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await matchingApi.getShortlistCandidates(jid, {
        min_score: minScore,
        top_n: topN,
        exclude_blacklisted: false,
      });
      setData(res);

      // Fetch HR/Hiring Managers
      const usersRes = await usersApi.list();
      const hmList = (usersRes || []).filter((u: UserType) => u.role?.name === "HR");
      setHiringManagers(hmList);
      if (hmList.length > 0 && !selectedHMId) {
        setSelectedHMId(hmList[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load candidate matches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [jid, minScore, topN]);

  const handleSubmitToHM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchId || !selectedHMId) {
      setError("Please select a candidate and a Hiring Manager.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await workflowApi.submitToHM(selectedMatchId, selectedHMId, shortlistNote || undefined);
      setSuccessMsg("Candidate submitted to Hiring Manager for review successfully!");
      setSelectedMatchId(null);
      setShortlistNote("");
      await loadCandidates();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit candidate to Hiring Manager.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/recruiter/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Shortlist Submission to Hiring Manager
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Role: <span className="text-indigo-300 font-semibold">{data?.job_title}</span> • Review ranked candidates and forward qualified profiles.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Min Match Score:</span>
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500"
          >
            <option value={50}>50% & Above</option>
            <option value={70}>70% & Above</option>
            <option value={80}>80% (High Precision)</option>
            <option value={90}>90% (Top Tier)</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Display Limit:</span>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500"
          >
            <option value={5}>Top 5 Candidates</option>
            <option value={10}>Top 10 Candidates</option>
            <option value={20}>Top 20 Candidates</option>
          </select>
        </div>
      </div>

      {/* Grid: Candidates List on Left, Submission Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates Selection (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Ranked Candidate Recommendations ({data?.candidates?.length || 0})
          </h3>

          {data?.candidates?.map((c) => {
            const isSelected = selectedMatchId === c.match_result_id;
            const canSubmit = ["CANDIDATE_MATCHED", "CANDIDATE_SHORTLISTED"].includes(c.pipeline_state);

            return (
              <div
                key={c.match_result_id}
                onClick={() => canSubmit && !c.is_blacklisted && setSelectedMatchId(c.match_result_id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  c.is_blacklisted
                    ? "opacity-60 bg-red-950/20 border-red-900/40 cursor-not-allowed"
                    : isSelected
                    ? "bg-indigo-500/15 border-indigo-500 ring-2 ring-indigo-500/30"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{c.candidate_name}</h4>
                      {c.is_blacklisted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          Blacklisted
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {c.pipeline_state}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {c.total_experience_years} yrs exp • {c.current_location || "Location not specified"}
                    </p>

                    {/* Matched Skills Pill Row */}
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {c.matched_skills.slice(0, 5).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-semibold"
                        >
                          ✓ {s}
                        </span>
                      ))}
                      {c.missing_skills.slice(0, 2).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 font-semibold"
                        >
                          ✗ {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right flex sm:flex-col items-end gap-2">
                    <div className="text-base font-bold font-mono text-indigo-300">
                      {Math.round(c.overall_score)}%
                    </div>
                    {canSubmit && !c.is_blacklisted && (
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded font-semibold border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submission Form Column (1 Col) */}
        <div className="space-y-4">
          <form
            onSubmit={handleSubmitToHM}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Send className="w-4 h-4 text-indigo-400" />
              Submit to Hiring Manager
            </h3>

            {/* Selected Candidate Info */}
            <div>
              <span className="text-xs text-slate-400 block mb-1">Target Candidate</span>
              {selectedMatchId ? (
                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 font-semibold">
                  ✓ {data?.candidates.find((c) => c.match_result_id === selectedMatchId)?.candidate_name}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500 italic">
                  Select a candidate from the left list
                </div>
              )}
            </div>

            {/* Hiring Manager Selector */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Assigned Hiring Manager (HM)
              </label>
              <select
                value={selectedHMId || ""}
                onChange={(e) => setSelectedHMId(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500"
                required
              >
                {hiringManagers.map((hm) => (
                  <option key={hm.id} value={hm.id}>
                    {hm.name} ({hm.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Shortlist Note */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Recruiter Screening Notes
              </label>
              <textarea
                value={shortlistNote}
                onChange={(e) => setShortlistNote(e.target.value)}
                placeholder="E.g., Screened candidate; strong Python & FastAPI experience. Highly recommended for technical interview round."
                rows={4}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-indigo-500 leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedMatchId || !selectedHMId || submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? "Submitting..." : "Send Candidate to HM"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default ShortlistSubmissionPage;
