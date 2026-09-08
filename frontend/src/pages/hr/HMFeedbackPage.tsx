import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Star,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  MessageSquare,
  Award,
  Sparkles,
} from "lucide-react";
import { workflowApi, matchingApi } from "../../services/api";
import { MatchResult, InterviewWithSlots } from "../../types";
import InterviewerEvaluationDisplayCard from "../../components/workflow/InterviewerEvaluationDisplayCard";

export const HMFeedbackPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchResult | null>(null);
  const [interview, setInterview] = useState<InterviewWithSlots | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [goNoGo, setGoNoGo] = useState<"PASS" | "GO" | "NO_GO">("GO");
  const [isFinalRound, setIsFinalRound] = useState<boolean>(true);
  const [technicalRating, setTechnicalRating] = useState<number>(4);
  const [communicationRating, setCommunicationRating] = useState<number>(4);
  const [problemSolvingRating, setProblemSolvingRating] = useState<number>(4);
  const [roleFitRating, setRoleFitRating] = useState<number>(4);
  const [overallRating, setOverallRating] = useState<number>(4);
  const [comments, setComments] = useState<string>("");

  const mid = parseInt(matchId || "0", 10);

  useEffect(() => {
    const fetchData = async () => {
      if (!mid) return;
      setLoading(true);
      setError(null);
      try {
        const matchData = await matchingApi.getMatchById(mid);
        setMatch(matchData);

        try {
          const intData = await workflowApi.getInterviewDetails(mid);
          setInterview(intData);
          if (intData.hm_feedback) {
            const f = intData.hm_feedback;
            setGoNoGo((f.go_no_go as "GO" | "NO_GO") || "GO");
            if (f.technical_rating) setTechnicalRating(f.technical_rating);
            if (f.communication_rating) setCommunicationRating(f.communication_rating);
            if (f.problem_solving_rating) setProblemSolvingRating(f.problem_solving_rating);
            if (f.role_fit_rating) setRoleFitRating(f.role_fit_rating);
            if (f.overall_rating) setOverallRating(f.overall_rating);
            if (f.comments) setComments(f.comments);
          }
        } catch {
          // interview details
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load interview details.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (interview?.id) {
        await workflowApi.submitRoundFeedback(
          interview.id,
          goNoGo,
          isFinalRound || goNoGo === "GO",
          {
            technical_rating: technicalRating,
            communication_rating: communicationRating,
            problem_solving_rating: problemSolvingRating,
            role_fit_rating: roleFitRating,
            overall_rating: overallRating,
          },
          comments || undefined
        );
      } else {
        await workflowApi.submitHMFeedback(mid, {
          go_no_go: goNoGo === "PASS" ? "GO" : goNoGo,
          technical_rating: technicalRating,
          communication_rating: communicationRating,
          problem_solving_rating: problemSolvingRating,
          role_fit_rating: roleFitRating,
          overall_rating: overallRating,
          comments: comments || undefined,
        });
      }

      let message = "Feedback recorded successfully!";
      if (goNoGo === "GO") {
        message = "GO decision recorded! Candidate advanced to Compensation & Offer phase.";
      } else if (goNoGo === "PASS") {
        message = "PASS decision recorded! Candidate cleared this round and is ready for the next scheduled round.";
      } else {
        message = "NO-GO decision recorded. Candidate has been marked as rejected.";
      }

      navigate("/hr/dashboard", {
        state: { message },
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit interview feedback.");
      setSubmitting(false);
    }
  };

  const renderStarRating = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    description?: string
  ) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
        <div>
          <span className="text-xs font-semibold text-white block">{label}</span>
          {description && <span className="text-[11px] text-slate-400">{description}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`p-1 transition-colors ${
                star <= value ? "text-amber-400" : "text-slate-700 hover:text-slate-500"
              }`}
            >
              <Star className="w-5 h-5 fill-current" />
            </button>
          ))}
          <span className="text-xs font-mono font-bold text-slate-300 ml-2 w-4 text-center">
            {value}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <p>Interview / Application not found.</p>
        <Link to="/hr/dashboard" className="text-cyan-400 text-xs mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header Back Link */}
      <div>
        <Link
          to="/hr/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to HM Dashboard
        </Link>
      </div>

      {/* Candidate Summary Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {match.candidate.full_name?.charAt(0) || "C"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{match.candidate.full_name}</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              {match.job?.title} • {match.candidate.total_experience_years || 0} yrs exp
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-500 block uppercase font-medium">Evaluation Stage</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
            Section 16 — Hiring Manager Feedback
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* 1. Recruiter / Interviewer Competency Ratings & Scorecard Display */}
      {interview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Recruiter / Interviewer Competency Ratings
            </span>
            <span className="text-[11px] text-slate-500">Submitted by Interviewer</span>
          </div>
          <InterviewerEvaluationDisplayCard
            interview={interview}
            title="Interview Competency Scorecard & Qualitative Notes"
          />
        </div>
      )}

      {/* 2. Hiring Manager Structured Feedback Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl shadow-black/20">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            16. Hiring Manager Feedback Form
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Review the interviewer ratings above, then submit your structured competency ratings and conclusive recommendation. The workflow cannot continue until this feedback is submitted.
          </p>
        </div>

        {/* Overall Recommendation: [ PASS ] / [ GO ] / [ NO GO ] */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Overall Recommendation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setGoNoGo("PASS");
                setIsFinalRound(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center ${
                goNoGo === "PASS"
                  ? "bg-blue-500/15 border-blue-500 text-blue-300 ring-2 ring-blue-500/30 font-bold"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <CheckCircle2 className={`w-7 h-7 mb-1.5 ${goNoGo === "PASS" ? "text-blue-400" : "text-slate-600"}`} />
              <span className="text-sm font-bold">[ PASS ]</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Round Cleared • Proceed to Next Round</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGoNoGo("GO");
                setIsFinalRound(true);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center ${
                goNoGo === "GO"
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 font-bold"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Award className={`w-7 h-7 mb-1.5 ${goNoGo === "GO" ? "text-emerald-400" : "text-slate-600"}`} />
              <span className="text-sm font-bold">[ GO ]</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Final Approval • Proceed to Offer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGoNoGo("NO_GO");
                setIsFinalRound(false);
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center ${
                goNoGo === "NO_GO"
                  ? "bg-rose-500/15 border-rose-500 text-rose-300 ring-2 ring-rose-500/30 font-bold"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <XCircle className={`w-7 h-7 mb-1.5 ${goNoGo === "NO_GO" ? "text-rose-400" : "text-slate-600"}`} />
              <span className="text-sm font-bold">[ NO GO ]</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Disqualified • Workflow Ends</span>
            </button>
          </div>
        </div>

        {/* 5 Structured Rating Categories */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Hiring Manager Competency Ratings (1–5 Stars)
          </label>

          {renderStarRating("Technical Skills Rating", technicalRating, setTechnicalRating, "Core domain proficiency, engineering acumen, and technical depth")}
          {renderStarRating("Communication Rating", communicationRating, setCommunicationRating, "Clarity of thoughts, articulation, listening, and presentation skills")}
          {renderStarRating("Problem Solving Rating", problemSolvingRating, setProblemSolvingRating, "Analytical reasoning, edge-case breakdown, and structured logic")}
          {renderStarRating("Role Fit Rating", roleFitRating, setRoleFitRating, "Organizational alignment, collaboration mindset, and cultural synergy")}
          {renderStarRating("Overall Rating (1–5)", overallRating, setOverallRating, "Holistic competency rating for this candidate")}
        </div>

        {/* Comments Text Area */}
        <div className="space-y-1.5 pt-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            Comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Document detailed evaluation rationale, strengths, developmental areas, or notes for compensation discussion..."
            rows={4}
            className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
          />
        </div>

        {/* Submit Feedback Action */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <p className="text-[11px] text-slate-500">
            * Workflow is locked until feedback submission is completed.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/hr/dashboard")}
              className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50 ${
                goNoGo === "GO"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                  : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default HMFeedbackPage;
