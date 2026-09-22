import React, { useEffect, useState } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Video,
  AlertCircle,
  Briefcase,
  User,
  Sparkles,
  Shield,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { workflowApi } from "../../services/api";
import { InterviewWithSlots, InterviewSlot } from "../../types";
import { GoogleCalendarButton } from "../../components/calendar/GoogleCalendarButton";
import { buildInterviewCalendarEvent } from "../../lib/googleCalendar";

export const SlotSelectionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ interviewId?: string }>();

  const token = searchParams.get("token") || "";
  const interviewIdStr = params.interviewId || searchParams.get("interview_id") || "0";
  const interviewId = parseInt(interviewIdStr, 10);

  const [interview, setInterview] = useState<InterviewWithSlots | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [confirmedSlot, setConfirmedSlot] = useState<InterviewSlot | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!interviewId || !token) {
        setError("Invalid or missing interview selection link. Please check your invitation communication.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await workflowApi.getPublicSlots(interviewId, token);
        setInterview(data);

        const selected = data.slots.find((s) => s.status === "selected");
        if (selected) {
          setIsConfirmed(true);
          setConfirmedSlot(selected);
        }
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
            "Unable to load interview slots. The link may have expired or is invalid."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [interviewId, token]);

  const handleConfirmSlot = async () => {
    if (!selectedSlotId || !interviewId || !token) return;

    setSubmitting(true);
    setError(null);
    try {
      await workflowApi.candidateSelectSlot(interviewId, token, selectedSlotId);
      const chosen = interview?.slots.find((s) => s.id === selectedSlotId) || null;
      setConfirmedSlot(chosen);
      setIsConfirmed(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to confirm time slot. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSlotDateTime = (dtStr: string, endStr?: string | null) => {
    try {
      const start = new Date(dtStr);
      const datePart = start.toLocaleDateString("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const startTime = start.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      let endTime = "";
      if (endStr) {
        const end = new Date(endStr);
        endTime = ` — ${end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
      }
      return { datePart, timeSpan: `${startTime}${endTime}` };
    } catch {
      return { datePart: dtStr, timeSpan: "" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">Loading Interview Options</p>
            <p className="text-xs text-muted-foreground mt-1">Retrieving your available time slots...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Gradient background */}
      <div className="fixed inset-0 gradient-mesh -z-10" />
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/40 -z-10 dark:block hidden" />

      <div className="max-w-lg w-full space-y-5">
        {/* Header Branding */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            SkillAlign — Enterprise Talent Intelligence
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight font-outfit">
            Select Your Interview Slot
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            The hiring team has proposed the following time windows. Please confirm your preferred slot to proceed.
          </p>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <h4 className="font-bold text-rose-800 dark:text-rose-300 mb-0.5">Access Notice</h4>
                <p>{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success / Confirmed State */}
        <AnimatePresence mode="wait">
          {isConfirmed && confirmedSlot ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 text-center"
            >
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  INTERVIEW SLOT CONFIRMED
                </div>
                <h2 className="text-xl font-black text-foreground font-outfit">
                  You're All Set!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your interview slot for{" "}
                  <strong className="text-foreground">{interview?.job_title || "the position"}</strong>{" "}
                  has been locked in.
                </p>
              </div>

              {/* Confirmed Slot Details */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border text-left space-y-3">
                {(() => {
                  const { datePart, timeSpan } = formatSlotDateTime(
                    confirmedSlot.slot_datetime,
                    confirmedSlot.slot_end_datetime
                  );
                  return (
                    <>
                      <div className="flex items-center gap-3 text-sm text-foreground">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold">{datePart}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{timeSpan}</p>
                        </div>
                      </div>

                      {interview?.meeting_link && (
                        <div className="flex items-center gap-3 text-xs text-cyan-600 dark:text-cyan-400 pt-2 border-t border-border">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4 text-cyan-500" />
                          </div>
                          <a
                            href={interview.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:text-cyan-700 dark:hover:text-cyan-300 font-mono text-[11px] truncate flex items-center gap-1"
                          >
                            {interview.meeting_link}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Google Calendar CTA */}
              {interview && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Add this interview to your calendar:</p>
                  <GoogleCalendarButton
                    size="md"
                    variant="outline"
                    className="mx-auto"
                    label="Add to Google Calendar"
                    {...buildInterviewCalendarEvent({
                      candidateName: interview.candidate_name || "Candidate",
                      jobTitle: interview.job_title || "Position",
                      scheduledDate: confirmedSlot.slot_datetime,
                      scheduledEnd: confirmedSlot.slot_end_datetime || undefined,
                      meetingLink: interview.meeting_link || undefined,
                      interviewType: interview.interview_type || "Interview",
                    })}
                  />
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed">
                A confirmation and any preparation materials will be sent to your registered communication channel. Our recruitment team will reach out if there are any updates.
              </p>

              <Link
                to="/candidate"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-sm"
              >
                Go to My Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : interview ? (
            /* Slot Selection Form */
            <motion.div
              key="selector"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="glass-card rounded-2xl p-5 sm:p-7 space-y-5"
            >
              {/* Context Header */}
              <div className="space-y-3 pb-4 border-b border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase className="w-4 h-4 text-primary" />
                  <span>
                    Position:{" "}
                    <strong className="text-foreground">{interview.job_title}</strong>
                  </span>
                </div>
                {interview.candidate_name && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Candidate:{" "}
                      <strong className="text-foreground">{interview.candidate_name}</strong>
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select the interview time that aligns with your availability. Once confirmed, this slot will be locked and a calendar notification will be dispatched.
                </p>
              </div>

              {/* Available Slots */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Available Time Windows ({interview.slots.length})
                </h3>
                {interview.slots.map((slot, idx) => {
                  const isSelected = selectedSlotId === slot.id;
                  const { datePart, timeSpan } = formatSlotDateTime(
                    slot.slot_datetime,
                    slot.slot_end_datetime
                  );

                  return (
                    <motion.button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlotId(slot.id)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                        isSelected
                          ? "bg-primary/10 border-primary/50 ring-2 ring-primary/20 shadow-sm"
                          : "bg-muted/20 border-border text-foreground hover:border-primary/30 hover:bg-muted/40"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                          <Calendar className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span>{datePart}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{timeSpan}</span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-border bg-background"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground fill-current" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Confirm Button */}
              <div className="pt-2">
                <motion.button
                  type="button"
                  onClick={handleConfirmSlot}
                  disabled={!selectedSlotId || submitting}
                  whileHover={{ scale: selectedSlotId ? 1.01 : 1 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Confirming Your Slot...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Interview Slot
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                <div className="flex items-center gap-1.5 justify-center mt-3 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Your selection is encrypted and securely transmitted</span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by{" "}
          <span className="font-bold text-foreground">SkillAlign</span>
        </p>
      </div>
    </div>
  );
};

export default SlotSelectionPage;
