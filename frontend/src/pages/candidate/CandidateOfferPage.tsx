import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  Building2,
  XCircle,
  Download,
  UserCheck,
  FileText,
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
      setSuccessMsg("Offer acceptance confirmed. Your hiring record has been finalized and onboarding initiated.");
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

  const getBlacklistUntilDate = (respondedAt?: string | null) => {
    const base = respondedAt ? new Date(respondedAt) : new Date();
    const until = new Date(base.getTime() + 183 * 24 * 60 * 60 * 1000);
    return until.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Loading employment offer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start py-8 px-4 sm:px-6">
      <div className="max-w-3xl w-full space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/candidate"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Candidate Dashboard
          </Link>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs font-semibold text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            Official Candidate Portal
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-700 dark:text-rose-400 hover:opacity-75">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-400 hover:opacity-75">✕</button>
          </div>
        )}

        {/* My Offers Header & Acceptance Summary Card */}
        {offer && offer.status === "ACCEPTED" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-outfit text-foreground">My Offers</h2>
              <span className="text-xs text-muted-foreground">Official Placement Record</span>
            </div>

            <div className="bg-card border-2 border-emerald-500/40 rounded-xl p-6 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold font-outfit text-foreground">
                  {offer.job_title || "Junior Python Developer"}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  {offer.company_name || "SkillAlign Technologies"}
                </p>
              </div>

              <div className="pt-2 border-t border-border/70 space-y-2">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Offer Status
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs mt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ACCEPTED ✓
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Accepted on:</span>
                    <strong className="text-foreground text-sm mt-0.5 block">
                      {offer.responded_at || offer.updated_at
                        ? new Date(offer.responded_at || offer.updated_at!).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "20 Sep 2026"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Joining Date:</span>
                    <strong className="text-foreground text-sm mt-0.5 block">
                      {offer.expected_joining_date || offer.joining_date
                        ? new Date(offer.expected_joining_date || offer.joining_date!).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "01 Oct 2026"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("offer-details-document");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  View Offer Letter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (token) {
                      window.open(offerApi.downloadOfferPdfForCandidate(token), "_blank");
                    } else if (offer.id) {
                      window.open(`/api/offers/${offer.id}/pdf`, "_blank");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  Download PDF
                </button>
                <Link
                  to="/candidate/hiring"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  My Hiring / Onboarding
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Status Notice if REJECTED */}
        {offer && offer.status === "REJECTED" && (
          <div className="bg-card border border-rose-500/30 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-[11px] font-semibold uppercase tracking-wider">
                  Status: REJECTED
                </div>
                <h3 className="text-base font-bold text-foreground">Recruitment Closed</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your recruitment process for this position has been closed.
                </p>
                <div className="pt-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Application Status: </span>
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">
                    CLOSED
                  </span>
                </div>
                {offer.rejection_reason && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <span className="font-medium text-foreground">Note: </span>
                    {offer.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Offer Card */}
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
      </div>

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h3>Confirm Decline Decision</h3>
            </div>

            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
              <p className="font-semibold text-rose-800 dark:text-rose-200">
                Placement Policy Notice
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Declining a formal employment offer will place your profile on a{" "}
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
                placeholder="E.g., Accepted another offer, compensation mismatch, location preference..."
                rows={3}
                className="w-full p-3 bg-muted/20 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleDeclineOffer}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
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
