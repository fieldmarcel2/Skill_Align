import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  Clock,
  Briefcase,
  FileCheck,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  FileText,
  Download,
  Loader2,
  Printer,
  Sparkles,
  Building2,
  Check,
  ShieldCheck,
  Award,
  ChevronRight,
  Info,
} from "lucide-react";
import { Offer } from "../../types";
import { offerApi, apiClient } from "../../services/api";

interface OfferCardProps {
  offer: Offer;
  candidateToken?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onSend?: () => void;
  loading?: boolean;
  viewMode?: "candidate" | "recruiter" | "admin";
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  candidateToken,
  onAccept,
  onReject,
  onSend,
  loading = false,
  viewMode = "recruiter",
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showMonthly, setShowMonthly] = useState(false);

  const formatCurrency = (amount?: number | null, curr = "INR") => {
    if (amount === undefined || amount === null) return "—";
    if (curr === "INR") {
      return `₹${amount.toLocaleString("en-IN")}`;
    }
    return `${curr} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Mutually agreed upon acceptance";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
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
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
      case "SENT":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30";
      case "REJECTED":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30";
      case "HM_APPROVED":
        return "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30";
      case "OFFER_READY":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
      case "PENDING_HM_REVIEW":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30";
      case "HM_CHANGES_REQUESTED":
        return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30";
      case "DRAFT":
        return "bg-muted text-muted-foreground border border-border";
      case "EXPIRED":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border border-border";
    }
  };

  const handleDownloadPdf = async () => {
    if (!offer.id) return;
    setDownloadingPdf(true);
    setPdfError(null);

    try {
      if (candidateToken) {
        const url = offerApi.downloadOfferPdfForCandidate(candidateToken);
        window.open(url, "_blank");
      } else {
        const response = await apiClient.get(`/api/offers/${offer.id}/pdf`, {
          responseType: "blob",
        });
        const blob = new Blob([response.data], { type: "application/pdf" });
        const blobUrl = window.URL.createObjectURL(blob);
        const newTab = window.open(blobUrl, "_blank");
        if (!newTab) {
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `Offer_Letter_${offer.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch official offer PDF:", err);
      setPdfError("Unable to open PDF. Please verify pop-ups are allowed or try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const totalCTC = offer.total_compensation || offer.proposed_salary || 0;
  const currency = offer.salary_currency || "INR";
  const fixedComp = offer.fixed_compensation || (totalCTC ? totalCTC * 0.85 : 0);
  const varComp = offer.variable_compensation || (totalCTC ? totalCTC * 0.15 : 0);
  const candidateDisplayName = offer.candidate_name || "Valued Candidate";

  return (
    <div className="doc-sheet doc-sheet-watermark overflow-hidden space-y-0 text-foreground border border-border/80 shadow-xl rounded-2xl">
      {/* ── Executive Letterhead Band ─────────────────────────────────── */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-primary to-emerald-400" />
      <div className="p-6 sm:p-8 border-b border-border/80 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                Official Appointment Letter
              </span>
              <span className="text-xs text-slate-400 font-mono">
                REF: SKA-OFF-2026-{String(offer.id).padStart(5, "0")}
              </span>
              {offer.pdf_version && offer.pdf_version > 1 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700">
                  v{offer.pdf_version}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-outfit">
              {offer.job_title || "Designated Role"}
            </h2>

            <p className="text-xs text-slate-300 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-slate-200">SkillAlign Technologies Pvt. Ltd.</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-300 font-medium">Global Corporate Center, Bangalore</span>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2.5">
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs ${getStatusBadge(
                offer.status
              )}`}
            >
              {offer.status?.replace(/_/g, " ")}
            </span>

            <div className="text-[11px] text-slate-300 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Digitally Authenticated Document</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Candidate Addressee & Welcome Salutation ───────────────────── */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Candidate Addressee Box */}
        <div className="p-5 rounded-xl border border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Employment Extended To
            </span>
            <div className="text-xl font-bold text-foreground">
              {candidateDisplayName}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 pt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {offer.location || "Bangalore, Karnataka, India"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                {offer.employment_type || "Full-Time Regular"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || !offer.id}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Compiling PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Official PDF Letter
                </>
              )}
            </button>
          </div>
        </div>

        {/* PDF Error Notice */}
        {pdfError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
            {pdfError}
          </div>
        )}

        {/* Formal Appointment Text */}
        <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2 border-l-2 border-primary/60 pl-4 py-1">
          <p>
            Dear <strong className="text-foreground">{candidateDisplayName}</strong>,
          </p>
          <p>
            We are pleased to extend this formal offer of employment with <strong>SkillAlign Technologies Pvt. Ltd.</strong>{" "}
            for the position of <strong>{offer.job_title || "Designated Role"}</strong>. We were thoroughly impressed by your
            technical aptitude, background, and alignment with our team's mission.
          </p>
        </div>

        {/* ── Compensation Matrix (Annexure A) ───────────────────────── */}
        <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xs">
          <div className="p-5 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Annexure A • Compensation Structure
              </span>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                Annual Compensation Package
              </h3>
            </div>

            <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setShowMonthly(false)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !showMonthly
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual (Per Year)
              </button>
              <button
                type="button"
                onClick={() => setShowMonthly(true)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  showMonthly
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly (Per Month)
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* Main Total Highlight */}
            <div className="p-5 rounded-xl bg-linear-to-br from-indigo-500/10 via-primary/5 to-transparent border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Total Cost to Company (CTC)
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-foreground mt-1">
                  {showMonthly
                    ? formatCurrency(totalCTC / 12, currency)
                    : formatCurrency(totalCTC, currency)}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {showMonthly ? "/ month" : "/ annum"}
                  </span>
                </div>
                {(offer.salary_min || offer.salary_max) && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    Approved Requisition Band: {formatCurrency(offer.salary_min, currency)} – {formatCurrency(offer.salary_max, currency)}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-1 text-xs text-muted-foreground">
                <span>Engagement: <strong className="text-foreground">{offer.employment_type || "Full-Time Regular"}</strong></span>
                <span>Work Model: <strong className="text-foreground">{offer.work_mode || "Hybrid"}</strong></span>
                <span>Currency: <strong className="text-foreground">{currency}</strong></span>
              </div>
            </div>

            {/* Detailed Financial Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                <span className="text-[11px] font-medium text-muted-foreground block">Fixed Base Salary</span>
                <div className="text-base font-bold font-mono text-foreground mt-1">
                  {showMonthly
                    ? formatCurrency(fixedComp / 12, currency)
                    : formatCurrency(fixedComp, currency)}
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Core guaranteed monthly pay</span>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                <span className="text-[11px] font-medium text-muted-foreground block">Variable / Performance</span>
                <div className="text-base font-bold font-mono text-foreground mt-1">
                  {showMonthly
                    ? formatCurrency(varComp / 12, currency)
                    : formatCurrency(varComp, currency)}
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Annual performance review</span>
              </div>

              {offer.joining_bonus ? (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block">Sign-on / Joining Bonus</span>
                  <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatCurrency(offer.joining_bonus, currency)}
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">1st month payout</span>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                  <span className="text-[11px] font-medium text-muted-foreground block">Statutory Benefits</span>
                  <div className="text-base font-bold text-foreground mt-1">Included</div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">PF, Gratuity & Group Cover</span>
                </div>
              )}

              {offer.bonus ? (
                <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                  <span className="text-[11px] font-medium text-muted-foreground block">Annual Retention</span>
                  <div className="text-base font-bold font-mono text-foreground mt-1">
                    {formatCurrency(offer.bonus, currency)}
                  </div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">12-month milestone</span>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
                  <span className="text-[11px] font-medium text-muted-foreground block">Medical Insurance</span>
                  <div className="text-base font-bold text-foreground mt-1">₹5,00,000</div>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Comprehensive Family Cover</span>
                </div>
              )}
            </div>

            {offer.other_benefits && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground">
                <strong className="text-foreground">Additional Perks & Welfare: </strong>
                {offer.other_benefits}
              </div>
            )}
          </div>
        </div>

        {/* ── Key Appointment Details ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Target Joining Date
            </span>
            <span className="text-sm font-bold text-foreground block">
              {formatDate(offer.expected_joining_date || offer.joining_date)}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Offer Expiry Window
            </span>
            <span className="text-sm font-bold text-foreground block">
              {formatDate(offer.offer_expiry_date || offer.expires_at)}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-muted/20">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              Base Location & Model
            </span>
            <span className="text-sm font-bold text-foreground block">
              {offer.location || "Bangalore Office"} ({offer.work_mode || "Hybrid"})
            </span>
          </div>
        </div>

        {/* Role Scope */}
        {offer.role_scope && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              Role Scope & Core Charter
            </h4>
            <div className="text-xs text-muted-foreground bg-muted/20 p-4 rounded-xl border border-border leading-relaxed whitespace-pre-line">
              {offer.role_scope}
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary" />
            Key Terms & Conditions (Annexure B)
          </h4>
          <div className="text-xs text-muted-foreground bg-muted/20 p-4 rounded-xl border border-border space-y-1.5 leading-relaxed">
            <p>1. <strong>Verification:</strong> Offer is contingent upon satisfactory verification of academic and professional credentials.</p>
            <p>2. <strong>Probation:</strong> 90-day probationary period from joining date.</p>
            <p>3. <strong>Confidentiality:</strong> Adherence to corporate non-disclosure and intellectual property assignment agreements.</p>
            {offer.notice_period && (
              <p>4. <strong>Notice Period:</strong> {offer.notice_period} notice required upon confirmation.</p>
            )}
            {offer.additional_terms && (
              <p>5. <strong>Special Stipulations:</strong> {offer.additional_terms}</p>
            )}
          </div>
        </div>

        {/* ── Official Signatory & Acceptance Block ────────────────────── */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border bg-muted/10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Authorized Corporate Signatory
            </span>
            <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
              <div className="text-xs font-bold text-primary flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Digitally Authorized & Issued
              </div>
              <div className="text-sm font-bold text-foreground">
                {offer.hiring_manager_name || "Head of People & Culture"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                SkillAlign Technologies Pvt. Ltd.
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Candidate Acknowledgment
            </span>
            <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
              <div className="text-xs text-muted-foreground">
                {offer.status === "ACCEPTED" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Formally Accepted & Signed
                  </span>
                ) : (
                  <span>Pending Candidate Digital Acceptance</span>
                )}
              </div>
              <div className="text-sm font-bold text-foreground">
                {candidateDisplayName}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {offer.responded_at || offer.accepted_at
                  ? `Accepted on: ${formatDate(offer.responded_at || offer.accepted_at)}`
                  : `Awaiting execution by ${formatDate(offer.offer_expiry_date || offer.expires_at)}`}
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Toolbar ─────────────────────────────────────────── */}
        {/* Recruiter Action */}
        {viewMode === "recruiter" && offer.status === "DRAFT" && onSend && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Offer proposal is prepared. Submit to Hiring Manager for formal review and digital signature.
            </p>
            <button
              type="button"
              onClick={onSend}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              {loading ? "Processing..." : "Submit for HM Approval"}
            </button>
          </div>
        )}

        {/* Candidate Decision Panel */}
        {viewMode === "candidate" && offer.status === "SENT" && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200/90 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                Employment Offer Decision
              </div>
              <p className="leading-relaxed">
                Accepting this formal offer confirms your employment with SkillAlign Technologies and initiates your corporate onboarding.
                Declining this offer records a placement decision according to platform policy.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              {onReject && (
                <button
                  type="button"
                  onClick={onReject}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
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
                  className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Accept Offer & Confirm Placement
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmed Offer Status Notice */}
        {offer.status === "ACCEPTED" && (
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Offer formally accepted on {formatDate(offer.responded_at || offer.updated_at)}. Placement finalized.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                ACCEPTED ✓
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferCard;
