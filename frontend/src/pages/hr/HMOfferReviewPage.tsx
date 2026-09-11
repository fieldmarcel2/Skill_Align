import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  DollarSign,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Send,
  Calendar,
  MapPin,
  Clock,
  Info,
  Edit3,
  X,
  MessageSquare,
} from "lucide-react";
import { offerApi } from "../../services/api";
import { Offer } from "../../types";

export const HMOfferReviewPage: React.FC = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const id = parseInt(offerId || "0", 10);
  const navigate = useNavigate();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Request Changes Modal
  const [showChangesModal, setShowChangesModal] = useState<boolean>(false);
  const [changeNotes, setChangeNotes] = useState<string>("");

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [proposedSalary, setProposedSalary] = useState<string>("");
  const [fixedCompensation, setFixedCompensation] = useState<string>("");
  const [variableCompensation, setVariableCompensation] = useState<string>("");
  const [bonus, setBonus] = useState<string>("");
  const [joiningBonus, setJoiningBonus] = useState<string>("");
  const [otherBenefits, setOtherBenefits] = useState<string>("");
  const [roleScope, setRoleScope] = useState<string>("");
  const [employmentType, setEmploymentType] = useState<string>("Full-time");
  const [joiningTimeline, setJoiningTimeline] = useState<string>("");
  const [joiningDate, setJoiningDate] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [workMode, setWorkMode] = useState<string>("Hybrid");
  const [additionalTerms, setAdditionalTerms] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");

  const fetchOffer = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await offerApi.getOffer(id);
      setOffer(data);
      populateEditFields(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load offer details for review.");
    } finally {
      setLoading(false);
    }
  };

  const populateEditFields = (data: Offer) => {
    setProposedSalary(data.proposed_salary ? String(data.proposed_salary) : "");
    setFixedCompensation(data.fixed_compensation ? String(data.fixed_compensation) : "");
    setVariableCompensation(data.variable_compensation ? String(data.variable_compensation) : "");
    setBonus(data.bonus ? String(data.bonus) : "");
    setJoiningBonus(data.joining_bonus ? String(data.joining_bonus) : "");
    setOtherBenefits(data.other_benefits || "");
    setRoleScope(data.role_scope || "");
    setEmploymentType(data.employment_type || "Full-time");
    setJoiningTimeline(data.joining_timeline || data.notice_period || "");
    setJoiningDate(data.joining_date ? data.joining_date.split("T")[0] : "");
    setLocation(data.location || "");
    setWorkMode(data.work_mode || "Hybrid");
    setAdditionalTerms(data.additional_terms || "");
    setOverrideReason(data.override_reason || "");
  };

  useEffect(() => {
    fetchOffer();
  }, [id]);

  const handleSaveEdits = async () => {
    if (!offer) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        proposed_salary: proposedSalary ? parseFloat(proposedSalary) : undefined,
        fixed_compensation: fixedCompensation ? parseFloat(fixedCompensation) : undefined,
        variable_compensation: variableCompensation ? parseFloat(variableCompensation) : undefined,
        bonus: bonus ? parseFloat(bonus) : undefined,
        joining_bonus: joiningBonus ? parseFloat(joiningBonus) : undefined,
        other_benefits: otherBenefits,
        role_scope: roleScope,
        employment_type: employmentType,
        joining_timeline: joiningTimeline,
        joining_date: joiningDate ? new Date(joiningDate).toISOString() : undefined,
        location,
        work_mode: workMode,
        additional_terms: additionalTerms,
        override_reason: overrideReason || undefined,
      };

      const updated = await offerApi.hmEditOffer(offer.id, payload);
      setOffer(updated);
      setIsEditing(false);
      setSuccessMsg("Offer details updated successfully.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update offer parameters.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!offer) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await offerApi.hmReviewOffer(offer.id, "APPROVE");
      setOffer(updated);
      setSuccessMsg(`Offer approved successfully for ${updated.candidate_name || "candidate"}. Recruiter has been notified to generate the official letter.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to approve offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!offer) return;
    if (!changeNotes.trim()) {
      setError("Please provide clear notes explaining the requested changes.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updated = await offerApi.hmReviewOffer(offer.id, "REQUEST_CHANGES", changeNotes);
      setOffer(updated);
      setShowChangesModal(false);
      setSuccessMsg("Change request submitted to managing recruiter with your feedback.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to request changes.");
    } finally {
      setSubmitting(false);
    }
  };

  const workflowState = offer?.workflow_state || offer?.status || "DRAFT";
  const currency = offer?.salary_currency || "INR";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">Loading offer for review...</span>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-8 text-center space-y-3 bg-card border border-border rounded-xl">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
        <h3 className="text-base font-bold text-foreground">Offer Not Found</h3>
        <p className="text-xs text-muted-foreground">The specified offer does not exist or you lack authorization to review it.</p>
        <Link to="/hr/decisions" className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Strategic Decisions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Link to="/hr" className="hover:text-foreground transition-colors">Hiring Management</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/hr/decisions" className="hover:text-foreground transition-colors">Decisions & Offers</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-semibold">Offer #OL-{String(offer.id).padStart(5, "0")}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Hiring Manager Offer Review
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded border border-border bg-muted/50 text-muted-foreground">
            {offer.job_title}
          </span>
          <span
            className={`text-xs font-bold px-3 py-1 rounded border ${
              workflowState === "HM_APPROVED" || workflowState === "OFFER_READY"
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                : workflowState === "PENDING_HM_REVIEW"
                ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
                : workflowState === "HM_CHANGES_REQUESTED"
                ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                : "bg-muted text-foreground border-border"
            }`}
          >
            {workflowState.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Mandatory Enterprise Notice */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold block text-sm mb-0.5">Official Recruiter Submission</span>
          This employment offer was prepared and submitted by Managing Recruiter{" "}
          <span className="font-semibold">{offer.recruiter_name || "Talent Partner"}</span> and requires your strategic review
          and authorization before the official contract letter can be dispatched to the candidate.
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-destructive font-bold hover:opacity-75">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-sm flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-800 font-bold hover:opacity-75">✕</button>
        </div>
      )}

      {/* Overview Context Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border space-y-2 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Candidate</span>
          <div className="font-bold text-foreground text-base">{offer.candidate_name || "Candidate"}</div>
          <div className="text-xs text-muted-foreground">ID #{offer.candidate_id} • Target Role</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-2 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Job Requisition</span>
          <div className="font-bold text-foreground text-base">{offer.job_title}</div>
          <div className="text-xs text-muted-foreground">Requisition #{offer.job_id} • Managing Recruiter: {offer.recruiter_name || "Assigned"}</div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-2 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Proposed Total CTC</span>
          <div className="font-bold text-primary text-xl font-mono">
            {currency === "INR" ? "₹" : currency} {Number(offer.total_compensation || offer.proposed_salary || 0).toLocaleString()}
          </div>
          {(offer.salary_min || offer.salary_max) && (
            <div className="text-xs text-muted-foreground font-mono">
              Band: {Number(offer.salary_min).toLocaleString()} – {Number(offer.salary_max).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Compensation & Offer Breakdown Review */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-6 shadow-sm">
        <div className="border-b border-border pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Proposed Compensation Package
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and adjust compensation components as necessary before providing sign-off.
            </p>
          </div>

          {!isEditing && workflowState === "PENDING_HM_REVIEW" && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold border border-border transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Terms
            </button>
          )}
        </div>

        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground block text-[11px]">Proposed Base Salary</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {currency === "INR" ? "₹" : currency} {Number(offer.fixed_compensation || offer.proposed_salary || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground block text-[11px]">Variable Compensation</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {currency === "INR" ? "₹" : currency} {Number(offer.variable_compensation || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground block text-[11px]">Joining / Sign-on Bonus</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {currency === "INR" ? "₹" : currency} {Number(offer.joining_bonus || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground block text-[11px]">Annual Performance Bonus</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {currency === "INR" ? "₹" : currency} {Number(offer.bonus || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {offer.other_benefits && (
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border text-xs space-y-1">
                <span className="font-bold text-foreground block">Perquisites & Other Benefits</span>
                <p className="text-muted-foreground">{offer.other_benefits}</p>
              </div>
            )}

            {offer.override_reason && (
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Salary Band Deviation Justification
                </span>
                <p className="text-muted-foreground">{offer.override_reason}</p>
              </div>
            )}

            {/* Engagement Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Employment Type</span>
                <span className="font-semibold text-foreground">{offer.employment_type || "Full-time"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Work Mode</span>
                <span className="font-semibold text-foreground">{offer.work_mode || "Hybrid"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Location</span>
                <span className="font-semibold text-foreground">{offer.location || "Bangalore"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block text-[11px]">Notice Period / Joining</span>
                <span className="font-semibold text-foreground">{offer.joining_timeline || offer.notice_period || "30 Days"}</span>
              </div>
            </div>

            {/* Role Scope */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Role Scope & Deliverables</span>
              <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3.5 rounded-lg border border-border">
                {offer.role_scope || "Standard platform architecture delivery and operational leadership."}
              </p>
            </div>

            {/* Additional Terms */}
            {offer.additional_terms && (
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Contractual Conditions</span>
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3.5 rounded-lg border border-border">
                  {offer.additional_terms}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Editable Form for HM */
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Proposed Total CTC</label>
                <input
                  type="number"
                  value={proposedSalary}
                  onChange={(e) => setProposedSalary(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-md text-sm font-mono font-bold text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Fixed (Base) Salary</label>
                <input
                  type="number"
                  value={fixedCompensation}
                  onChange={(e) => setFixedCompensation(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-md text-sm font-mono text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Variable Compensation</label>
                <input
                  type="number"
                  value={variableCompensation}
                  onChange={(e) => setVariableCompensation(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-md text-sm font-mono text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-md text-xs text-foreground"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-md text-xs text-foreground"
                >
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                  <option value="Onsite">Onsite</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-foreground">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 bg-background border border-input rounded-md text-xs text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">Role Scope & Responsibilities</label>
              <textarea
                value={roleScope}
                onChange={(e) => setRoleScope(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-background border border-input rounded-md text-xs text-foreground leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">Other Benefits</label>
              <input
                type="text"
                value={otherBenefits}
                onChange={(e) => setOtherBenefits(e.target.value)}
                className="w-full p-2 bg-background border border-input rounded-md text-xs text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdits}
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-sm"
              >
                {submitting ? "Saving..." : "Save Modifications"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Decision Footer for HM */}
      {workflowState === "PENDING_HM_REVIEW" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-card border border-border shadow-sm">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Approving authorizes the recruiter to generate the immutable PDF letter for candidate dispatch.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowChangesModal(true)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold border border-destructive/30 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Request Changes
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submitting ? "Processing..." : "Approve Offer"}
            </button>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Request Changes from Recruiter
              </h3>
              <button onClick={() => setShowChangesModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Please specify the modifications required (e.g. adjust base salary, alter joining timeline, or clarify scope).
              The recruiter will be assigned an update task.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Feedback & Instructions <span className="text-destructive">*</span>
              </label>
              <textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                rows={4}
                placeholder="E.g., Increase fixed compensation to ₹7.2L based on approved band; extend joining timeline to 45 days."
                className="w-full p-2.5 bg-background border border-input rounded-md text-xs text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowChangesModal(false)}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestChanges}
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Send Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HMOfferReviewPage;
