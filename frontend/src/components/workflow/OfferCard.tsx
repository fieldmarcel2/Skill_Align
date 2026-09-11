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
  DollarSign,
  Gift,
  Award,
  Sparkles,
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

  const formatCurrency = (amount?: number | null, currency = "INR") => {
    if (amount === undefined || amount === null) return "—";
    if (currency === "INR") {
      return `₹${amount.toLocaleString("en-IN")}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "To be finalized";
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
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case "SENT":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      case "REJECTED":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
      case "HM_APPROVED":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20";
      case "OFFER_READY":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case "PENDING_HM_REVIEW":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      case "HM_CHANGES_REQUESTED":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20";
      case "DRAFT":
        return "bg-muted text-muted-foreground border border-border";
      case "EXPIRED":
        return "bg-muted text-muted-foreground border border-border";
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
      setPdfError("Unable to open PDF. Please make sure pop-ups are allowed or try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const totalCTC = offer.total_compensation || offer.proposed_salary || 0;
  const currency = offer.salary_currency || "INR";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm space-y-0 text-foreground">
      {/* Top Document Header */}
      <div className="p-5 sm:p-6 border-b border-border bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Formal Employment Offer
                </span>
                {offer.id > 0 && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    #OFF-{offer.id}
                  </span>
                )}
                {offer.pdf_version && offer.pdf_version > 1 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    v{offer.pdf_version}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold tracking-tight mt-1">
                {offer.job_title || "Designated Role"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {offer.candidate_name ? (
                  <>Prepared for: <span className="font-semibold text-foreground">{offer.candidate_name}</span></>
                ) : (
                  "Official Corporate Employment Agreement"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${getStatusBadge(
                offer.status
              )}`}
            >
              {offer.status?.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* PDF Error Notice if any */}
        {pdfError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {pdfError}
          </div>
        )}

        {/* Primary Compensation Card */}
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Annual Compensation (CTC)
              </span>
              <div className="text-3xl font-bold tracking-tight text-foreground font-mono mt-1">
                {formatCurrency(totalCTC, currency)}
              </div>
              {(offer.salary_min || offer.salary_max) && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Approved Role Band: {formatCurrency(offer.salary_min, currency)} – {formatCurrency(offer.salary_max, currency)}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:items-end gap-1.5 border-t sm:border-t-0 border-border pt-3 sm:pt-0">
              <div className="text-xs text-muted-foreground">
                Engagement:{" "}
                <span className="font-semibold text-foreground">
                  {offer.employment_type || "Full-Time Permanent"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Currency:{" "}
                <span className="font-semibold text-foreground">
                  {currency}
                </span>
              </div>
              {offer.notice_period && (
                <div className="text-xs text-muted-foreground">
                  Notice Period:{" "}
                  <span className="font-semibold text-foreground">
                    {offer.notice_period}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Component Breakdown Sub-grid */}
          {(offer.fixed_compensation || offer.variable_compensation || offer.joining_bonus || offer.bonus) && (
            <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-card border border-border/70">
                <span className="text-[11px] text-muted-foreground block font-medium">Fixed Annual</span>
                <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
                  {formatCurrency(offer.fixed_compensation, currency)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border/70">
                <span className="text-[11px] text-muted-foreground block font-medium">Variable Incentive</span>
                <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
                  {formatCurrency(offer.variable_compensation, currency)}
                </span>
              </div>
              {offer.joining_bonus ? (
                <div className="p-3 rounded-lg bg-card border border-border/70">
                  <span className="text-[11px] text-muted-foreground block font-medium">Joining Bonus</span>
                  <span className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {formatCurrency(offer.joining_bonus, currency)}
                  </span>
                </div>
              ) : null}
              {offer.bonus ? (
                <div className="p-3 rounded-lg bg-card border border-border/70">
                  <span className="text-[11px] text-muted-foreground block font-medium">Annual Bonus</span>
                  <span className="text-sm font-semibold font-mono text-foreground mt-0.5 block">
                    {formatCurrency(offer.bonus, currency)}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {offer.other_benefits && (
            <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Perks & Benefits: </span>
              {offer.other_benefits}
            </div>
          )}
        </div>

        {/* Engagement Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Target Joining Date
            </span>
            <span className="text-xs font-semibold text-foreground block">
              {formatDate(offer.expected_joining_date || offer.joining_date)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Offer Expiry Date
            </span>
            <span className="text-xs font-semibold text-foreground block">
              {formatDate(offer.offer_expiry_date)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/20 border border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              Work Location & Mode
            </span>
            <span className="text-xs font-semibold text-foreground block">
              {offer.location || "Office Location"} {offer.work_mode ? `(${offer.work_mode})` : ""}
            </span>
          </div>
        </div>

        {/* Role Scope */}
        {offer.role_scope && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
              Position Scope & Responsibilities
            </h4>
            <div className="text-xs text-muted-foreground bg-muted/20 p-4 rounded-lg border border-border leading-relaxed whitespace-pre-line">
              {offer.role_scope}
            </div>
          </div>
        )}

        {/* Additional Terms */}
        {offer.additional_terms && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              Terms & Stipulations
            </h4>
            <div className="text-xs text-muted-foreground bg-muted/20 p-4 rounded-lg border border-border whitespace-pre-line leading-relaxed">
              {offer.additional_terms}
            </div>
          </div>
        )}

        {/* Official PDF Document Action Bar */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                Official Offer Letter Document (PDF)
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Formal corporate letter generated with compensation breakdown & terms.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || !offer.id}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border transition-colors disabled:opacity-50 shrink-0"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                View / Download PDF
              </>
            )}
          </button>
        </div>

        {/* Recruiter Action Banner */}
        {viewMode === "recruiter" && offer.status === "DRAFT" && onSend && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Offer is in draft status. Submit to Hiring Manager for review before sending.
            </p>
            <button
              type="button"
              onClick={onSend}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              {loading ? "Processing..." : "Submit for HM Review"}
            </button>
          </div>
        )}

        {/* Candidate Decision Panel */}
        {viewMode === "candidate" && offer.status === "SENT" && (
          <div className="space-y-4 pt-3 border-t border-border">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200/90 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                Candidate Acceptance Notice
              </div>
              <p className="leading-relaxed">
                Accepting this formal offer confirms your intent to join and initiates your corporate onboarding.
                Declining this formal offer initiates a 6-month placement cooldown period as established by policy.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              {onReject && (
                <button
                  type="button"
                  onClick={onReject}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors disabled:opacity-50"
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
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
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
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Offer formally accepted on {formatDate(offer.responded_at || offer.updated_at)}. Placement finalized.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
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
