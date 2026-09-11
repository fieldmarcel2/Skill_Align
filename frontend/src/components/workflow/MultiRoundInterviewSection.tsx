import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  Award,
  PlusCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
  User,
  Star,
  Layers,
  ArrowRight,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { useToast } from "../ui/toast";
import { InterviewWithSlots } from "../../types";
import { workflowApi } from "../../services/api";

interface MultiRoundInterviewSectionProps {
  matchId: number;
  candidateName: string;
  rounds: InterviewWithSlots[];
  onRoundsUpdated: () => void;
  canManageRounds?: boolean;
  isOfferPhase?: boolean;
}

export const MultiRoundInterviewSection: React.FC<MultiRoundInterviewSectionProps> = ({
  matchId,
  candidateName,
  rounds,
  onRoundsUpdated,
  canManageRounds = true,
  isOfferPhase = false,
}) => {
  const toast = useToast();
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundType, setRoundType] = useState("TECHNICAL");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fast-Track to Final GO state (Single Round or Direct Offer clearance)
  const [isFastTrackOpen, setIsFastTrackOpen] = useState(false);
  const [isFastTracking, setIsFastTracking] = useState(false);

  const handleFastTrackConfirm = async () => {
    if (rounds.length === 0) return;
    const latestRound = rounds[rounds.length - 1];
    setIsFastTracking(true);
    try {
      await workflowApi.submitRoundFeedback(
        latestRound.id,
        "GO",
        true,
        {
          overall_rating: 5,
          technical_rating: 5,
          communication_rating: 5,
          problem_solving_rating: 5,
          role_fit_rating: 5,
        },
        "Fast-tracked with Final GO to Offer."
      );
      toast.success("Candidate fast-tracked to Compensation & Offer phase with Final GO!");
      setIsFastTrackOpen(false);
      onRoundsUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to fast-track candidate to offer.");
    } finally {
      setIsFastTracking(false);
    }
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundName.trim()) {
      toast.warning("Please enter a name for the interview round.");
      return;
    }

    setIsSubmitting(true);
    try {
      await workflowApi.addAdditionalRound(
        matchId,
        roundName.trim(),
        roundType,
        Number(durationMinutes)
      );
      toast.success(`New interview round "${roundName}" created successfully!`);
      setIsAddRoundOpen(false);
      setRoundName("");
      setRoundType("TECHNICAL");
      setDurationMinutes(60);
      onRoundsUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create additional round.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (isOfferPhase && (status === "PENDING_SLOT_SELECTION" || status === "PENDING_SCHEDULING" || status === "SCHEDULED" || !status)) {
      return (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Cleared (Advanced to Offer)
        </span>
      );
    }
    switch (status) {
      case "COMPLETED":
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case "CONFIRMED":
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Confirmed</span>;
      case "SCHEDULED":
      case "PENDING_SLOT_SELECTION":
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Scheduled</span>;
      default:
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const getRecommendationBadge = (rec?: string | null) => {
    if (!rec) return null;
    switch (rec.toUpperCase()) {
      case "GO":
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> HM GO — Proceed to Offer
          </span>
        );
      case "PASS":
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> HM PASS — Next Round Cleared
          </span>
        );
      case "NO_GO":
        return (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-400" /> HM NO-GO — Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const renderStars = (rating?: number | null) => {
    if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600"}`}
          />
        ))}
        <span className="text-xs font-bold text-foreground ml-1">{rating}/5</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <h3 className="text-base font-extrabold font-outfit text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Interview Rounds Lifecycle & Multi-Stage Progression
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track multi-round technical assessments, competency scorecards, and hiring manager round clearances.
          </p>
        </div>

        {canManageRounds && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddRoundOpen(true)}
            className="text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 self-start sm:self-auto"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add On-Demand Round
          </Button>
        )}
      </div>

      {/* ── Interview Pipeline Plan Banner (Single Round vs Multi-Round) ── */}
      <div className="p-3.5 rounded-xl border border-border bg-card/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className={`p-2 rounded-lg border ${
            rounds.length <= 1
              ? "bg-amber-500/10 text-amber-500 border-amber-500/25"
              : "bg-blue-500/10 text-blue-500 border-blue-500/25"
          }`}>
            {rounds.length <= 1 ? <Zap className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                {rounds.length <= 1 ? "Single-Round Assessment Plan" : `Multi-Stage Assessment Pipeline (${rounds.length} Rounds)`}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary text-foreground border border-border">
                {rounds.length <= 1 ? "1 Interview Role" : `${rounds.length} Active Rounds`}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {rounds.length <= 1
                ? "This position requires a single comprehensive evaluation. Once concluded, the HM directly grants Final GO to advance to offer drafting."
                : "This position is evaluated across progressive assessment rounds. Each round is assessed and cleared sequentially."}
            </p>
          </div>
        </div>

        {canManageRounds && !isOfferPhase && (
          <div className="flex items-center gap-2 shrink-0">
            {rounds.length > 0 && rounds[rounds.length - 1].round_status !== "PASSED" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsFastTrackOpen(true)}
                disabled={isFastTracking}
                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                {rounds.length <= 1 ? "Grant Final GO to Offer" : "Fast-Track to Final GO"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddRoundOpen(true)}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-primary" />
              Add Extra Round
            </Button>
          </div>
        )}
      </div>

      {rounds.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed bg-card/40">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold">No interview rounds scheduled yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Once interview slots are proposed or rounds created, they will appear here chronologically.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {rounds.map((round, idx) => {
            const roundNum = round.round_number || idx + 1;
            const roundTitle = round.round_name || `${round.round_type || "Technical"} Round`;
            const isLatest = idx === rounds.length - 1;

            return (
              <Card
                key={round.id}
                className={`p-5 border transition-all ${
                  isLatest ? "border-primary/40 bg-card/70 shadow-sm" : "border-border bg-card/40"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/30 text-primary font-bold text-xs font-mono">
                      R{roundNum}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">{roundTitle}</h4>
                        {getStatusBadge(round.round_status || round.status)}
                        {round.is_additional_round && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wide">
                            Additional
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Type: <strong>{round.round_type}</strong></span>
                        {round.duration_minutes && <span>• Duration: {round.duration_minutes}m</span>}
                        {round.interviewer_name && <span>• Interviewer: {round.interviewer_name}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    {getRecommendationBadge(round.hm_recommendation)}
                  </div>
                </div>

                {/* Round Details & Evaluations */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Scheduling info */}
                  <div className="space-y-2 p-3 rounded-lg bg-background/50 border border-border/40">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      Scheduling & Logistics
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div>
                        Interview Date:{" "}
                        <strong className="text-foreground">
                          {round.interview_date
                            ? new Date(round.interview_date).toLocaleString()
                            : isOfferPhase
                            ? "Concluded / Advanced to Offer"
                            : "Not scheduled yet"}
                        </strong>
                      </div>
                      {round.interview_mode && (
                        <div>Mode: <strong className="text-foreground">{round.interview_mode}</strong></div>
                      )}
                      {round.meeting_link && (
                        <div className="flex items-center gap-1.5 text-primary">
                          <Video className="w-3 h-3" />
                          <a href={round.meeting_link} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[200px]">
                            {round.meeting_link}
                          </a>
                        </div>
                      )}
                      {round.slots && round.slots.length > 0 && (
                        <div className="pt-1">
                          <span className="font-medium text-foreground">Proposed Slots:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {round.slots.map((s) => (
                              <span
                                key={s.id}
                                className={`text-[10px] px-2 py-0.5 rounded border ${
                                  s.status === "SELECTED"
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                {new Date(s.slot_datetime).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                {s.status === "SELECTED" && " (Confirmed)"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Feedback & Evaluation */}
                  <div className="space-y-2 p-3 rounded-lg bg-background/50 border border-border/40">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      Scorecard & Decision
                    </div>

                    {round.hm_overall_rating || round.interviewer_overall_rating ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Overall Rating:</span>
                          {renderStars(round.hm_overall_rating || round.interviewer_overall_rating)}
                        </div>
                        {round.hm_technical_rating && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Technical Fit:</span>
                            {renderStars(round.hm_technical_rating)}
                          </div>
                        )}
                        {round.hm_communication_rating && (
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Communication:</span>
                            {renderStars(round.hm_communication_rating)}
                          </div>
                        )}
                        {round.hm_comments && (
                          <div className="pt-1 text-slate-300 italic bg-card/60 p-2 rounded border border-border/30">
                            "{round.hm_comments}"
                          </div>
                        )}
                        {round.interviewer_comments && !round.hm_comments && (
                          <div className="pt-1 text-slate-300 italic bg-card/60 p-2 rounded border border-border/30">
                            "{round.interviewer_comments}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground py-2 text-center text-xs">
                        {isOfferPhase
                          ? "Round concluded — Candidate advanced to Compensation & Offer stage."
                          : "Evaluation pending completion of interview round."}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Add On-Demand Round */}
      <Dialog open={isAddRoundOpen} onOpenChange={setIsAddRoundOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              Add On-Demand Interview Round
            </DialogTitle>
            <DialogDescription>
              Schedule an additional evaluation round for <strong>{candidateName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddRound} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Round Name / Title *
              </label>
              <Input
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="e.g., System Architecture Deep-Dive, Executive Fit"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Round Type
                </label>
                <select
                  value={roundType}
                  onChange={(e) => setRoundType(e.target.value)}
                  className="w-full text-xs rounded-md bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="TECHNICAL">Technical Assessment</option>
                  <option value="CODING">Live Coding & Algo</option>
                  <option value="MANAGERIAL">Managerial & Behavioral</option>
                  <option value="CULTURE_FIT">Culture & Values Fit</option>
                  <option value="HR">HR Screen / Discussion</option>
                  <option value="ADDITIONAL">Additional On-Demand</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full text-xs rounded-md bg-background border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddRoundOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Create Round
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fast-Track to Final GO */}
      <Dialog open={isFastTrackOpen} onOpenChange={setIsFastTrackOpen}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Zap className="w-5 h-5 text-emerald-500" />
              {rounds.length <= 1 ? "Grant Final GO & Proceed to Offer" : "Fast-Track to Final GO"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {rounds.length <= 1
                ? `Confirm successful completion of the single-round interview for ${candidateName}. This will record a Final GO and advance the candidate directly to Compensation & Offer drafting.`
                : `Candidate ${candidateName} will be cleared with a Final GO recommendation, concluding the interview evaluation stage and advancing directly to Compensation & Offer drafting.`}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Automated Next Steps:
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              1. Pipeline state transitions to <strong>COMPENSATION_DISCUSSION</strong>.<br />
              2. Recruiter is notified with high-priority task to structure and draft the offer package.<br />
              3. Interview rounds for this candidate are marked as successfully concluded.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFastTrackOpen(false)}
              disabled={isFastTracking}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleFastTrackConfirm}
              disabled={isFastTracking}
              className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isFastTracking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Confirm Final GO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
