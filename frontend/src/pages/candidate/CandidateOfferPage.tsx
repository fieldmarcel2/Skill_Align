import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { offerApi } from "../../services/api";
import { Offer } from "../../types";
import OfferCard from "../../components/workflow/OfferCard";

export const CandidateOfferPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
    if (!offerId) {
      setError("Invalid offer link.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await offerApi.getOffer(offerId, token || undefined);
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
    if (!offerId) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await offerApi.respondOffer(offerId, token, true);
      setOffer(updated);
      setSuccessMsg("🎉 Congratulations! You have accepted the offer and your hiring is finalized.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to accept offer. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineOffer = async () => {
    if (!offerId) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await offerApi.respondOffer(offerId, token, false, declineReason || undefined);
      setOffer(updated);
      setShowDeclineModal(false);
      setSuccessMsg("Offer declined. A 6-month placement cooldown has been initiated as per policy.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to decline offer.");
    } finally {
      setActionLoading(false);
    }
  };

  const getBlacklistUntilDate = (respondedAt?: string | null) => {
    const base = respondedAt ? new Date(respondedAt) : new Date();
    const until = new Date(base.getTime() + 183 * 24 * 60 * 60 * 1000);
    return until.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading employment offer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 pb-16">
      <div className="fixed inset-0 bg-gradient-to-tr from-amber-950/20 via-slate-950 to-blue-950/20 -z-10" />

      <div className="max-w-2xl w-full space-y-6">
        {/* Navigation & Brand */}
        <div className="flex items-center justify-between">
          <Link
            to="/candidate/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Candidate Dashboard
          </Link>
          <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Official Offer Portal
          </span>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Celebration Banner if ACCEPTED / HIRED */}
        {offer && offer.status === "ACCEPTED" && (
          <div className="bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Welcome to the Team! 🎉</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Your formal offer acceptance has been received. Our HR onboarding team will contact you prior to your joining date ({offer.joining_date ? new Date(offer.joining_date).toLocaleDateString() : "TBD"}).
            </p>
          </div>
        )}

        {/* Blacklist / Rejection Notice if REJECTED */}
        {offer && offer.status === "REJECTED" && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-rose-300">Offer Declined</h3>
            <div className="bg-slate-950/80 border border-rose-500/20 rounded-xl p-4 max-w-md mx-auto text-xs space-y-2.5 text-left">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Blacklisted From</span>
                  <span className="font-semibold text-slate-300">
                    {offer.responded_at
                      ? new Date(offer.responded_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                      : "Today"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Blacklisted Until</span>
                  <span className="font-semibold text-rose-400">
                    {getBlacklistUntilDate(offer.responded_at)}
                  </span>
                </div>
              </div>
              <p className="text-rose-300 font-bold">
                Candidate unavailable for interview consideration until {getBlacklistUntilDate(offer.responded_at)}.
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                During this period, you will not appear in interview recommendations and are not eligible for interview scheduling. You can still manage your profile.
              </p>
            </div>
          </div>
        )}

        {/* Offer Summary Card */}
        {offer && (
          <OfferCard
            offer={offer}
            onAccept={handleAcceptOffer}
            onReject={() => setShowDeclineModal(true)}
            loading={actionLoading}
            viewMode="candidate"
          />
        )}
      </div>

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3>Confirm Decline Decision</h3>
            </div>

            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-rose-300 space-y-1.5">
              <p className="font-semibold text-red-200">
                ⚠️ Policy Warning: 6-Month Cooldown Period
              </p>
              <p className="text-slate-300 leading-relaxed">
                Declining a formal employment offer will place your profile on a{" "}
                <strong className="text-white">6-month cooldown blacklist</strong> during which you cannot be recommended for other positions.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-400">
                Reason for declining (Optional)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="E.g., Accepted another offer, compensation expectation mismatch..."
                rows={3}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleDeclineOffer}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20"
              >
                {actionLoading ? "Processing..." : "Confirm & Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CandidateOfferPage;
