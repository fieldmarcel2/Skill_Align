import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  Building2,
  XCircle,
  UserCheck,
  FileText,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { offerApi } from "../../services/api";
import { Offer } from "../../types";
import OfferCard from "../../components/workflow/OfferCard";

export const CandidateOfferPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";
  const offerId = parseInt(id || searchParams.get("offer_id") || "0", 10);

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Decline confirmation modal
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<string>("");

  const fetchOffer = async () => {
    if (!offerId && !token) {
      setError("Invalid or missing offer link reference.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let data: Offer;
      try {
        data = await offerApi.getOffer(offerId, token || undefined);
      } catch (firstErr: any) {
        if (firstErr.response?.status === 404 && offerId) {
          data = await offerApi.getOfferByMatch(offerId);
        } else {
          throw firstErr;
        }
      }
      setOffer(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          "Unable to load offer details. The link may have expired or requires authentication."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffer();
  }, [offerId, token]);

  const handleAcceptOffer = async () => {
    if (!offer?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await offerApi.respondOffer(offer.id, token, true);
      setOffer(updated);
      setSuccessMsg("Congratulations! Your offer acceptance is confirmed and corporate onboarding has been initiated.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to accept offer. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineOffer = async () => {
    if (!offer?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await offerApi.respondOffer(offer.id, token, false, declineReason || undefined);
      setOffer(updated);
      setShowDeclineModal(false);
      setSuccessMsg("Offer declined. A 6-month placement cooldown has been recorded as per policy.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to decline offer.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-semibold">Loading official employment letter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start py-8 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="max-w-4xl w-full space-y-6"
      >
        {/* Navigation & Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/candidate"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Candidate Portal</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-foreground font-bold">Offer Letter</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-xs font-semibold text-muted-foreground shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Official Candidate Portal</span>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-700 dark:text-rose-400 hover:opacity-75 cursor-pointer">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {successMsg}
            </span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-400 hover:opacity-75 cursor-pointer">✕</button>
          </div>
        )}

        {/* Placement Record Banner if ACCEPTED */}
        {offer && offer.status === "ACCEPTED" && (
          <div className="bg-card border-2 border-emerald-500/40 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  OFFER FORMALLY ACCEPTED ✓
                </div>
                <h2 className="text-xl font-bold font-outfit text-foreground mt-2">
                  Placement Finalized • {offer.job_title || "Designated Role"}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  {offer.company_name || "SkillAlign Technologies Pvt. Ltd."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  to="/candidate/hiring"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Go to Onboarding & Joining
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Status Notice if REJECTED */}
        {offer && offer.status === "REJECTED" && (
          <div className="bg-card border border-rose-500/30 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-[11px] font-bold uppercase tracking-wider">
                  Offer Status: Declined
                </div>
                <h3 className="text-base font-bold text-foreground">Recruitment Closed</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your formal response has been recorded. As per platform guidelines, a placement cooldown has been registered.
                </p>
                {offer.rejection_reason && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <strong className="text-foreground">Feedback provided: </strong>
                    "{offer.rejection_reason}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Document Paper Sheet */}
        {offer && (
          <div id="offer-details-document">
            <OfferCard
              offer={offer}
              candidateToken={token}
              onAccept={handleAcceptOffer}
              onReject={() => setShowDeclineModal(true)}
              loading={actionLoading}
              viewMode="candidate"
            />
          </div>
        )}
      </motion.div>

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h3>Confirm Decision to Decline</h3>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
              <p className="font-bold text-rose-800 dark:text-rose-200">
                Placement Policy Notice
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Declining this formal employment offer will place your profile on a{" "}
                <strong className="text-foreground">6-month cooldown period</strong> during which your profile is removed from active matching.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">
                Reason for declining (Optional)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="E.g., Accepted another offer, compensation structure, relocation..."
                rows={3}
                className="w-full p-3 bg-muted/20 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleDeclineOffer}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? "Processing..." : "Confirm & Decline Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateOfferPage;
