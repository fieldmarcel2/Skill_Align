import React, { useState } from "react";
import { Star, CheckCircle2, AlertCircle, X, Award, MessageSquare, Send, Sparkles } from "lucide-react";
import { workflowApi } from "../../services/api";

interface InterviewerEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: number;
  candidateName: string;
  jobTitle: string;
  initialRatings?: {
    technical_rating?: number | null;
    communication_rating?: number | null;
    problem_solving_rating?: number | null;
    role_fit_rating?: number | null;
    overall_rating?: number | null;
    comments?: string | null;
  };
  isCompleteFlow?: boolean; // if true, transitions INTERVIEW_CONFIRMED -> WAITING_FOR_HM_FEEDBACK
  onSuccess: () => void;
}

export const InterviewerEvaluationModal: React.FC<InterviewerEvaluationModalProps> = ({
  isOpen,
  onClose,
  matchId,
  candidateName,
  jobTitle,
  initialRatings,
  isCompleteFlow = true,
  onSuccess,
}) => {
  const [technicalRating, setTechnicalRating] = useState<number>(initialRatings?.technical_rating || 4);
  const [communicationRating, setCommunicationRating] = useState<number>(initialRatings?.communication_rating || 4);
  const [problemSolvingRating, setProblemSolvingRating] = useState<number>(initialRatings?.problem_solving_rating || 4);
  const [roleFitRating, setRoleFitRating] = useState<number>(initialRatings?.role_fit_rating || 4);
  const [overallRating, setOverallRating] = useState<number>(initialRatings?.overall_rating || 4);
  const [comments, setComments] = useState<string>(initialRatings?.comments || "");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      technical_rating: technicalRating,
      communication_rating: communicationRating,
      problem_solving_rating: problemSolvingRating,
      role_fit_rating: roleFitRating,
      overall_rating: overallRating,
      comments: comments.trim() || undefined,
    };

    try {
      if (isCompleteFlow) {
        await workflowApi.completeInterview(matchId, payload);
      } else {
        await workflowApi.saveInterviewerEvaluation(matchId, payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to submit interview competency evaluation.");
      setSubmitting(false);
    }
  };

  const renderStarInput = (
    label: string,
    value: number,
    onChange: (val: number) => void,
    description: string
  ) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-secondary/30 border border-border/80 hover:border-border transition">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{label}</span>
            <span className="text-[11px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
              {value} / 5
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-1 rounded hover:bg-secondary transition transform active:scale-95"
            >
              <Star
                className={`h-5 w-5 ${
                  star <= value
                    ? "text-amber-400 fill-amber-400"
                    : "text-muted-foreground/40 hover:text-amber-400/60"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Interview Evaluation
              </span>
              <span className="text-xs font-semibold text-muted-foreground">Competency Scorecard</span>
            </div>
            <h2 className="text-lg font-bold font-outfit text-foreground mt-1">
              Structured Competency Ratings: {candidateName}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Requisition: <strong className="text-foreground">{jobTitle}</strong>. Rate core competencies based on the conducted interview.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Evaluation Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2.5">
            {renderStarInput(
              "Technical Skills Rating",
              technicalRating,
              setTechnicalRating,
              "Hands-on coding, architecture principles, and domain proficiency"
            )}
            {renderStarInput(
              "Communication Rating",
              communicationRating,
              setCommunicationRating,
              "Clarity of thought, articulation, structured responses, and active listening"
            )}
            {renderStarInput(
              "Problem Solving Rating",
              problemSolvingRating,
              setProblemSolvingRating,
              "Analytical reasoning, edge-case consideration, and systematic debugging"
            )}
            {renderStarInput(
              "Role & Team Fit Rating",
              roleFitRating,
              setRoleFitRating,
              "Cultural alignment, ownership mindset, and collaboration enthusiasm"
            )}
            {renderStarInput(
              "Overall Interviewer Score",
              overallRating,
              setOverallRating,
              "Composite evaluation and interviewer confidence recommendation"
            )}
          </div>

          {/* Qualitative Notes / Comments */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              Interviewer Evaluation Notes & Comments
            </label>
            <textarea
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Detail specific observations, questions asked, notable strengths, and areas requiring HM attention..."
              className="w-full rounded-xl bg-secondary/30 border border-border px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
            <span className="text-[11px] text-muted-foreground block text-right">
              These ratings and qualitative notes will be visible to the Hiring Manager for final GO / NO-GO decision.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {submitting ? (
                <span>Submitting Evaluation...</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {isCompleteFlow ? "Complete Interview & Submit Ratings" : "Save Competency Ratings"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default InterviewerEvaluationModal;
