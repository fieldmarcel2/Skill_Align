import React, { useEffect, useState } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Video,
  AlertCircle,
  Briefcase,
  User,
  Sparkles,
} from "lucide-react";
import { workflowApi } from "../../services/api";
import { InterviewWithSlots, InterviewSlot } from "../../types";

export const SlotSelectionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ interviewId?: string }>();

  // Token can come from search param or path
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
        setError("Invalid or missing interview selection link. Please check your invitation email.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await workflowApi.getPublicSlots(interviewId, token);
        setInterview(data);

        // If candidate already selected a slot
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
      const datePart = start.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const startTime = start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      let endTime = "";
      if (endStr) {
        const end = new Date(endStr);
        endTime = ` - ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
      }
      return { datePart, timeSpan: `${startTime}${endTime}` };
    } catch {
      return { datePart: dtStr, timeSpan: "" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading available interview options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-gradient-to-tr from-cyan-950/20 via-slate-950 to-blue-950/20 -z-10" />

      <div className="max-w-xl w-full space-y-6">
        {/* Branding Logo */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            SkillAlign Enterprise Interview Portal
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Schedule Your Interview
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Notice</h4>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Success / Already Confirmed State */}
        {isConfirmed && confirmedSlot ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Interview Confirmed!</h2>
              <p className="text-xs text-slate-300">
                You have selected your interview slot for{" "}
                <strong className="text-cyan-300">{interview?.job_title || "the role"}</strong>.
              </p>
            </div>

            {/* Confirmed Slot Details */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2.5">
              {(() => {
                const { datePart, timeSpan } = formatSlotDateTime(
                  confirmedSlot.slot_datetime,
                  confirmedSlot.slot_end_datetime
                );
                return (
                  <>
                    <div className="flex items-center gap-2.5 text-xs text-white">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold">{datePart}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-300 font-mono">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{timeSpan}</span>
                    </div>
                  </>
                );
              })()}

              {interview?.meeting_link && (
                <div className="flex items-center gap-2.5 text-xs text-cyan-300 pt-2 border-t border-slate-800">
                  <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                  <a
                    href={interview.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-white truncate font-mono text-[11px]"
                  >
                    {interview.meeting_link}
                  </a>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
              A calendar invite and confirmation has been dispatched. Our recruiter will follow up with any preparation materials.
            </p>

            <Link
              to="/candidate/dashboard"
              className="inline-block px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
            >
              Go to Candidate Dashboard
            </Link>
          </div>
        ) : interview ? (
          /* Selection Form */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Header info */}
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Briefcase className="w-4 h-4 text-cyan-400" />
                <span>Position: <strong className="text-white">{interview.job_title}</strong></span>
              </div>
              {interview.candidate_name && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Candidate: <strong className="text-white">{interview.candidate_name}</strong></span>
                </div>
              )}
              <p className="text-xs text-slate-300 pt-1">
                The hiring team has proposed the following interview times. Please pick the one that fits your calendar best:
              </p>
            </div>

            {/* Proposed Slots Options */}
            <div className="space-y-3">
              {interview.slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                const { datePart, timeSpan } = formatSlotDateTime(
                  slot.slot_datetime,
                  slot.slot_end_datetime
                );

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/30 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Calendar className={`w-4 h-4 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                        <span>{datePart}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{timeSpan}</span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-cyan-500 border-cyan-400 text-slate-950"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 fill-current" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confirm Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmSlot}
                disabled={!selectedSlotId || submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? "Confirming Slot..." : "Confirm Selected Time Slot"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default SlotSelectionPage;
