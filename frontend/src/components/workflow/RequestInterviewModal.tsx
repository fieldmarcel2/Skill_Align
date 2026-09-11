import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Sparkles,
  Link as LinkIcon,
  Zap,
  Layers,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useToast } from "../ui/toast";
import { SlotPicker, SlotItem } from "./SlotPicker";
import { workflowApi } from "../../services/api";
import { MatchResult } from "../../types";

interface RequestInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchResult | null;
  onSuccess?: () => void;
}

export const RequestInterviewModal: React.FC<RequestInterviewModalProps> = ({
  isOpen,
  onClose,
  match,
  onSuccess,
}) => {
  const toast = useToast();
  const [interviewStructure, setInterviewStructure] = useState<"single_round" | "multi_round">("single_round");
  const [roundName, setRoundName] = useState<string>("Comprehensive Technical & Role Fit Assessment");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [interviewMode, setInterviewMode] = useState<"online" | "in_person">("online");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/new");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to initialize 2 default slots in future
  const getInitialSlots = (): SlotItem[] => {
    const d1 = new Date();
    d1.setDate(d1.getDate() + 1);
    d1.setHours(10, 0, 0, 0);

    const d2 = new Date();
    d2.setDate(d2.getDate() + 2);
    d2.setHours(14, 0, 0, 0);

    const formatISO = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${mins}`;
    };

    return [
      { id: "slot-1", slot_datetime: formatISO(d1), duration_minutes: 45 },
      { id: "slot-2", slot_datetime: formatISO(d2), duration_minutes: 45 },
    ];
  };

  const [proposedSlots, setProposedSlots] = useState<SlotItem[]>(getInitialSlots());

  if (!match) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validSlots = proposedSlots.filter((s) => s.slot_datetime);
    if (validSlots.length < 2) {
      toast.error("Enterprise protocol requires proposing at least 2 alternative interview time slots.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadSlots = validSlots.map((s) => {
        const start = new Date(s.slot_datetime);
        const end = new Date(start.getTime() + s.duration_minutes * 60000);
        return {
          slot_datetime: start.toISOString(),
          slot_end_datetime: end.toISOString(),
        };
      });

      await workflowApi.requestInterview(match.id, {
        slots: payloadSlots,
        interview_type: interviewType,
        meeting_link: interviewMode === "online" ? meetingLink : undefined,
        interview_structure: interviewStructure,
        round_name: roundName.trim(),
      });

      toast.success(
        `Interview request dispatched with ${payloadSlots.length} proposed slots! Assigned recruiter will review and dispatch to ${match.candidate.full_name}.`,
        "Interview Requested"
      );

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit interview scheduling request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold font-outfit text-foreground">
                Request Interview Scheduling
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Propose available interview windows. The recruiter will verify and invite{" "}
                <strong className="text-foreground">{match.candidate.full_name}</strong> to choose their preferred slot.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Candidate & Role Context Header */}
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground">Candidate:</span>{" "}
              <strong className="text-foreground font-outfit">{match.candidate.full_name}</strong>
              <span className="text-muted-foreground ml-3">• Role:</span>{" "}
              <strong className="text-foreground">{match.job?.title || `Job #${match.job_id}`}</strong>
            </div>
            <span className="text-xs font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {Math.round(Number(match.overall_score))}% Fit Match
            </span>
          </div>

          {/* Interview Process Structure Selector (1 Round vs Multi-Round) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              Interview Process Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => {
                  setInterviewStructure("single_round");
                  setRoundName("Comprehensive Technical & Role Fit Assessment");
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                  interviewStructure === "single_round"
                    ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                    : "border-border bg-card/60 hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Single Comprehensive Round
                  </span>
                  {interviewStructure === "single_round" && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Fast-track: 1 focused interview. Once finished, HM directly makes the Final GO decision to proceed to offer.
                </p>
              </div>

              <div
                onClick={() => {
                  setInterviewStructure("multi_round");
                  setRoundName("Round 1: Technical Screening");
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                  interviewStructure === "multi_round"
                    ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                    : "border-border bg-card/60 hover:border-border/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    Multi-Stage Pipeline (2+ Rounds)
                  </span>
                  {interviewStructure === "multi_round" && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sequential assessment (Screening → Coding / Deep Dive → HM Leadership). Cleared round-by-round.
                </p>
              </div>
            </div>
          </div>

          {/* Round Title / Identifier */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Round Name & Assessment Focus
            </label>
            <input
              type="text"
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              placeholder="e.g. Comprehensive Technical Assessment, System Architecture, etc."
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Interview Type & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Interview Format / Round
              </label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Technical Interview">Technical Interview</option>
                <option value="System Design Round">System Design Round</option>
                <option value="Hiring Manager Discussion">Hiring Manager Discussion</option>
                <option value="Cultural & Behavioral Fit">Cultural & Behavioral Fit</option>
                <option value="Final Executive Round">Final Executive Round</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Interview Mode
              </label>
              <div className="grid grid-cols-2 gap-2 h-9">
                <button
                  type="button"
                  onClick={() => setInterviewMode("online")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    interviewMode === "online"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <Video className="h-3.5 w-3.5" /> Online Video
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewMode("in_person")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    interviewMode === "in_person"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" /> In-Person
                </button>
              </div>
            </div>
          </div>

          {/* Meeting Link (if online) */}
          {interviewMode === "online" && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Video Meeting Link (Google Meet / Zoom / Teams)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abc"
                  className="pl-8 text-xs h-9 font-mono"
                  required
                />
              </div>
            </div>
          )}

          {/* Proposed Slots Picker (min 2 slots) */}
          <div className="pt-2 border-t border-border/50">
            <SlotPicker
              slots={proposedSlots}
              onChange={setProposedSlots}
              minSlots={2}
            />
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="sm"
              disabled={isSubmitting || proposedSlots.length < 2}
              className="gap-1.5 text-xs h-9 shadow-md shadow-indigo-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Request Interview (Notify Recruiter)
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
