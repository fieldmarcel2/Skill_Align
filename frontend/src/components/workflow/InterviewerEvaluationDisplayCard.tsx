import React from "react";
import { Star, Award, MessageSquare, User, Calendar, CheckCircle2, Edit3 } from "lucide-react";
import { InterviewWithSlots } from "../../types";

interface InterviewerEvaluationDisplayCardProps {
  interview?: InterviewWithSlots | null;
  title?: string;
  onEdit?: () => void;
  canEdit?: boolean;
}

export const InterviewerEvaluationDisplayCard: React.FC<InterviewerEvaluationDisplayCardProps> = ({
  interview,
  title,
  onEdit,
  canEdit = false,
}) => {
  if (!interview) {
    return null;
  }

  const hasRatings =
    interview.interviewer_technical_rating ||
    interview.interviewer_communication_rating ||
    interview.interviewer_problem_solving_rating ||
    interview.interviewer_role_fit_rating ||
    interview.interviewer_overall_rating;

  if (!hasRatings && !interview.interviewer_comments) {
    return null;
  }

  const renderStars = (rating?: number | null) => {
    const val = rating || 0;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= val
                ? "text-amber-400 fill-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
        <span className="text-xs font-bold text-foreground ml-1.5">{val} / 5</span>
      </div>
    );
  };

  const formattedDate = interview.interviewer_submitted_at
    ? new Date(interview.interviewer_submitted_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                {title || "Interviewer Competency Evaluation"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Submitted
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              {interview.interviewer_name && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <User className="h-3 w-3 text-muted-foreground" />
                  Evaluator: {interview.interviewer_name}
                </span>
              )}
              {formattedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
              )}
            </p>
          </div>
        </div>

        {canEdit && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 border border-primary/30 transition self-start sm:self-center"
          >
            <Edit3 className="h-3 w-3" /> Update Scores
          </button>
        )}
      </div>

      {/* Competency Ratings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-card/80 border border-border/80 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Technical Skills
          </span>
          {renderStars(interview.interviewer_technical_rating)}
        </div>

        <div className="p-3 rounded-xl bg-card/80 border border-border/80 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Communication & Clarity
          </span>
          {renderStars(interview.interviewer_communication_rating)}
        </div>

        <div className="p-3 rounded-xl bg-card/80 border border-border/80 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Problem Solving & Logic
          </span>
          {renderStars(interview.interviewer_problem_solving_rating)}
        </div>

        <div className="p-3 rounded-xl bg-card/80 border border-border/80 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Role & Team Fit
          </span>
          {renderStars(interview.interviewer_role_fit_rating)}
        </div>

        <div className="p-3 rounded-xl bg-card/80 border border-border/80 space-y-1 sm:col-span-2 lg:col-span-2">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Overall Interviewer Score
          </span>
          {renderStars(interview.interviewer_overall_rating)}
        </div>
      </div>

      {/* Qualitative Notes / Comments */}
      {interview.interviewer_comments && (
        <div className="p-3.5 rounded-xl bg-card/90 border border-border/80 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            <span>Interviewer Evaluation Notes</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap pl-5 border-l-2 border-primary/40">
            {interview.interviewer_comments}
          </p>
        </div>
      )}
    </div>
  );
};
export default InterviewerEvaluationDisplayCard;
