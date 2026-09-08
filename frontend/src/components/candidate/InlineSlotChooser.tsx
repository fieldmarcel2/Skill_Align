import React, { useState } from "react";
import { Interview, InterviewSlot } from "../../types";
import { workflowApi } from "../../services/api";
import { useToast } from "../ui/toast";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Laptop,
  Check,
  AlertCircle,
  Loader2,
  CalendarCheck,
} from "lucide-react";

interface InlineSlotChooserProps {
  interview: Interview;
  onSlotConfirmed: () => void;
}

export const InlineSlotChooser: React.FC<InlineSlotChooserProps> = ({
  interview,
  onSlotConfirmed,
}) => {
  const toast = useToast();
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [confirmedSlot, setConfirmedSlot] = useState<InterviewSlot | null>(null);

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

  const handleConfirmSlot = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  if (isConfirmed && confirmedSlot) {
    const { datePart, timeSpan } = formatSlotDateTime(
      confirmedSlot.slot_datetime,
      confirmedSlot.slot_end_datetime
    );
    return (
      <div
        className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Slot Choice Submitted Successfully</span>
        </div>
        <p className="text-xs text-muted-foreground">
          You selected <strong className="text-foreground">{datePart} at {timeSpan}</strong>. The hiring team has been notified to finalize calendar invites and attach the video call link.
        </p>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-xl border border-border bg-card/90 space-y-3.5 shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[11px] font-semibold gap-1 py-0.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Select Your Preferred Time Slot
          </Badge>
          <span className="text-xs font-semibold text-foreground">
            {interview.interview_type || "Technical"} Round
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {availableSlots.length} proposed timing{availableSlots.length === 1 ? "" : "s"}
        </span>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Slots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                isSelected
                  ? "bg-primary/10 border-primary ring-1 ring-primary/30 text-foreground shadow-sm"
                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:border-border/90 hover:bg-secondary/70"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/50 bg-background"
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>

              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{datePart}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    {timeSpan}
                  </span>
                  {durationStr && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                      {durationStr}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Laptop className="h-3.5 w-3.5 text-primary" />
          <span>
            Mode:{" "}
            <strong className="text-foreground font-medium">
              {interview.interview_mode || "Online (Video Call)"}
            </strong>
          </span>
        </div>

        <Button
          size="sm"
          disabled={!selectedSlotId || isSubmitting}
          onClick={handleConfirmSlot}
          className="gap-1.5 text-xs font-semibold px-4 h-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm Slot Choice
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
