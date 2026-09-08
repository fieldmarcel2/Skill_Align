import React from "react";
import {
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  Briefcase,
  FileCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Building,
} from "lucide-react";
import { Offer } from "../../types";

interface OfferCardProps {
  offer: Offer;
  onAccept?: () => void;
  onReject?: () => void;
  onSend?: () => void;
  loading?: boolean;
  viewMode?: "candidate" | "recruiter" | "admin";
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onAccept,
  onReject,
  onSend,
  loading = false,
  viewMode = "recruiter",
}) => {
  const formatCurrency = (amount?: number | null, currency = "INR") => {
    if (amount === undefined || amount === null) return "Not specified";
    if (currency === "INR") {
      return `₹${amount.toLocaleString("en-IN")}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "TBD";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "SENT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "REJECTED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "EXPIRED":
        return "bg-slate-800 text-slate-400 border-slate-700";
      default:
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl shadow-black/30 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-amber-400" />
            Official Employment Offer
          </span>
          <h3 className="text-lg font-bold text-white mt-0.5">
            {offer.job_title || "Position Offer"}
          </h3>
          {offer.candidate_name && (
            <p className="text-xs text-slate-300 mt-0.5">
              Offered to: <span className="font-semibold text-white">{offer.candidate_name}</span>
            </p>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
            offer.status
          )}`}
        >
          {offer.status}
        </span>
      </div>

      {/* Main Compensation Highlight */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 font-medium">Proposed Annual Compensation (CTC)</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono mt-0.5">
            {formatCurrency(offer.proposed_salary, offer.salary_currency)}
          </div>
          {(offer.salary_min || offer.salary_max) && (
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Role Range: {formatCurrency(offer.salary_min, offer.salary_currency)} - {formatCurrency(offer.salary_max, offer.salary_currency)}
            </p>
          )}
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
          <span className="text-slate-500">Employment Type:</span>{" "}
          <span className="font-semibold text-white">{offer.employment_type || "Full-time"}</span>
        </div>
      </div>

      {/* Offer Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1 mb-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            Joining Date
          </span>
          <span className="font-semibold text-white">{formatDate(offer.joining_date)}</span>
        </div>
        <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Offer Expiry Date
          </span>
          <span className="font-semibold text-white">{formatDate(offer.offer_expiry_date)}</span>
        </div>
        <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1 mb-1">
            <MapPin className="w-3.5 h-3.5 text-purple-400" />
            Location & Mode
          </span>
          <span className="font-semibold text-white">
            {offer.location || "Office"} {offer.work_mode ? `(${offer.work_mode})` : ""}
          </span>
        </div>
      </div>

      {/* Role Scope */}
      {offer.role_scope && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            Role Scope & Responsibilities
          </h4>
          <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
            {offer.role_scope}
          </div>
        </div>
      )}

      {/* Additional Terms */}
      {offer.additional_terms && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Terms & Conditions / Benefits
          </h4>
          <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 whitespace-pre-line leading-relaxed">
            {offer.additional_terms}
          </div>
        </div>
      )}

      {/* Recruiter Action Banner */}
      {viewMode === "recruiter" && offer.status === "DRAFT" && onSend && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            This offer is currently in <span className="text-amber-400 font-semibold">DRAFT</span> status.
          </p>
          <button
            type="button"
            onClick={onSend}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
          >
            <FileCheck className="w-4 h-4" />
            {loading ? "Sending..." : "Send Formal Offer Letter"}
          </button>
        </div>
      )}

      {/* Candidate Decision Panel */}
      {viewMode === "candidate" && offer.status === "SENT" && (
        <div className="space-y-4 pt-3 border-t border-slate-800">
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
              Important Decision Notice
            </div>
            <p>
              Accepting this offer will complete your hiring process and notify the recruiter.
              Declining the offer will trigger a 6-month placement cooldown period.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            {onReject && (
              <button
                type="button"
                onClick={onReject}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Decline Offer
              </button>
            )}
            {onAccept && (
              <button
                type="button"
                onClick={onAccept}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept Offer & Join Team
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default OfferCard;
