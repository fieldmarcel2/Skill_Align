import React, { useState } from "react";
import { Interview, InterviewSlot } from "../../types";
import { workflowApi } from "../../services/api";
import { useToast } from "../ui/toast";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Building,
  Laptop,
  Check,
  AlertCircle,
  Loader2,
  CalendarCheck,
} from "lucide-react";

interface CandidateSlotPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  interview: Interview;
  onSlotConfirmed: () => void;
}

export const CandidateSlotPickerModal: React.FC<CandidateSlotPickerModalProps> = ({
  isOpen,
  onClose,
  interview,
  onSlotConfirmed,
}) => {
  const toast = useToast();
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [confirmedSlot, setConfirmedSlot] = useState<InterviewSlot | null>(null);

  // Filter proposed slots
  const availableSlots = (interview.slots || []).filter(
    (s) => s.status === "proposed" || s.status === "selected"
  );

  const formatSlotDateTime = (dtStr: string, endStr?: string | null) => {
    try {
      const start = new Date(dtStr);
      const datePart = start.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const startTime = start.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
      let timeSpan = startTime;
      let durationStr = "";
      if (endStr) {
        const end = new Date(endStr);
        const endTime = end.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
        timeSpan = `${startTime} – ${endTime}`;
        const diffMins = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        if (diffMins > 0) {
          durationStr = `${diffMins} mins`;
        }
      }
      return { datePart, timeSpan, durationStr };
    } catch {
      return { datePart: dtStr, timeSpan: "", durationStr: "" };
    }
  };

  const handleConfirmSlot = async () => {
    if (!selectedSlotId) {
      setError("Please select one of the proposed time slots.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await workflowApi.candidateSelectSlot(
        interview.id,
        selectedSlotId,
        interview.slot_token || undefined
      );

      const chosen = availableSlots.find((s) => s.id === selectedSlotId) || null;
      setConfirmedSlot(chosen);
      setIsConfirmed(true);
      toast.success("Interview slot confirmed successfully!");
      onSlotConfirmed();
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Failed to confirm slot. The slot may no longer be available."
      );
      toast.error("Failed to confirm time slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setIsConfirmed(false);
    setSelectedSlotId(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2 mb-2.5">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
              Action Required
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
              {interview.interview_type || "Technical"} Round
            </Badge>
          </div>

          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-outfit text-foreground tracking-tight flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Select Interview Time Slot
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Proposed interview slots for{" "}
              <strong className="text-foreground font-semibold">
                {interview.job_title || "the position"}
              </strong>
              {interview.company_name ? ` at ${interview.company_name}` : ""}.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {isConfirmed && confirmedSlot ? (
            /* Confirmation Success State */
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Interview Time Slot Selected!</h3>
                <p className="text-xs text-muted-foreground">
                  Your choice for <strong className="text-foreground">{interview.job_title}</strong> has been submitted.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-card border border-border text-left space-y-2 text-xs">
                {(() => {
                  const { datePart, timeSpan } = formatSlotDateTime(
                    confirmedSlot.slot_datetime,
                    confirmedSlot.slot_end_datetime
                  );
                  return (
                    <>
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{datePart}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground font-mono">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{timeSpan}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <p className="text-xs text-muted-foreground">
                The recruiter will review and confirm your calendar invite and video link.
              </p>

              <Button
                onClick={handleModalClose}
                className="w-full text-xs font-semibold py-2.5 rounded-xl"
              >
                Close & Return to Dashboard
              </Button>
            </div>
          ) : (
            /* Slot Selection List */
            <>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Available Options ({availableSlots.length})</span>
                  <span className="text-[11px]">Select your preferred slot</span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-border rounded-xl space-y-2">
                    <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground font-medium">
                      No active slots available. The recruiter will provide updated timings.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {availableSlots.map((slot) => {
                      const { datePart, timeSpan, durationStr } = formatSlotDateTime(
                        slot.slot_datetime,
                        slot.slot_end_datetime
                      );
                      const isSelected = selectedSlotId === slot.id;

                      return (
                        <div
                          key={slot.id}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-primary/10 border-primary ring-1 ring-primary/30 text-foreground shadow-sm"
                              : "bg-secondary/40 border-border hover:border-border/90 hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/50 bg-background"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground flex-wrap">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-primary" />
                                  {datePart}
                                </span>
                                {durationStr && (
                                  <span className="px-1.5 py-0.2 rounded bg-secondary text-[10px] font-medium text-muted-foreground">
                                    {durationStr}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span>{timeSpan}</span>
                              </div>
                            </div>
                          </div>

                          <Badge
                            variant={isSelected ? "default" : "outline"}
                            className="text-[10px] shrink-0"
                          >
                            {isSelected ? "Selected" : "Option"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mode & Format Info */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border/80 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Laptop className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">
                    Mode: <strong className="text-foreground">{interview.interview_mode || "Online (Video Call)"}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">
                    Format: <strong className="text-foreground">{interview.interview_type || "Technical"}</strong>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isConfirmed && (
          <DialogFooter className="p-4 bg-secondary/30 border-t border-border flex items-center justify-between sm:justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleModalClose}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              disabled={!selectedSlotId || isSubmitting}
              onClick={handleConfirmSlot}
              className="gap-2 text-xs font-semibold px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Time Slot
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
