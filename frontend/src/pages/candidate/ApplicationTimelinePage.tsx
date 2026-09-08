import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Clock,
  ArrowLeft,
  AlertCircle,
  Briefcase,
  Building,
  User,
} from "lucide-react";
import { workflowApi, matchingApi } from "../../services/api";
import { MatchResult, AuditLogEntry, PipelineState } from "../../types";
import PipelineStateBar from "../../components/workflow/PipelineStateBar";
import CandidateTimeline from "../../components/workflow/CandidateTimeline";

export const ApplicationTimelinePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const matchId = parseInt(id || "0", 10);

  const [match, setMatch] = useState<MatchResult | null>(null);
  const [timeline, setTimeline] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!matchId) return;
      setLoading(true);
      setError(null);
      try {
        const [matchData, timelineData] = await Promise.all([
          matchingApi.getMatchById(matchId),
          workflowApi.getTimeline(matchId),
        ]);
        setMatch(matchData);
        setTimeline(timelineData);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load application timeline.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <p>Application not found.</p>
        <Link to="/" className="text-cyan-400 text-xs mt-2 inline-block">
          Return Home
        </Link>
      </div>
    );
  }

  const pipelineState = (match.pipeline_state || "CANDIDATE_MATCHED") as PipelineState;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-xs text-slate-500 font-mono">
          Application #{match.id}
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Overview Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Application Overview
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">{match.job?.title}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1.5 text-slate-300">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              {match.candidate?.full_name}
            </span>
            {match.job?.department && (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                {match.job.department}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 block">Overall Match Fit</span>
          <span className="text-lg font-bold text-cyan-400 font-mono">
            {Math.round(Number(match.overall_score))}%
          </span>
        </div>
      </div>

      {/* Visual State Progression Bar */}
      <PipelineStateBar currentState={pipelineState} />

      {/* Detailed Chronological Timeline */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl shadow-black/20 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Detailed Chronological Audit Log
        </h3>
        <p className="text-xs text-slate-400">
          Every state transition, slot proposal, interview event, and offer decision is permanently recorded in the audit trail.
        </p>
        <div className="pt-2">
          <CandidateTimeline timeline={timeline} />
        </div>
      </div>
    </div>
  );
};
export default ApplicationTimelinePage;
