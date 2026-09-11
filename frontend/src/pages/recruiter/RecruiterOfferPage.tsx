import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  DollarSign,
  FileCheck,
  Send,
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  FileText,
  Download,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Copy,
  ExternalLink,
  ChevronRight,
  Info,
  Search,
  Check,
  Sparkles,
  Building,
} from "lucide-react";
import { workflowApi, offerApi, matchingApi, recruiterApi } from "../../services/api";
import { MatchResult, Offer } from "../../types";

export const RecruiterOfferPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>(); // offer_id
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const matchIdParam = searchParams.get("match_id");
  const initialMatchId = matchIdParam ? parseInt(matchIdParam, 10) : 0;
  const offerId = id ? parseInt(id, 10) : 0;

  const [match, setMatch] = useState<MatchResult | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number>(initialMatchId);
  const [candidateMatches, setCandidateMatches] = useState<MatchResult[]>([]);
  const [candidateSearch, setCandidateSearch] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Form Fields - Compensation & Terms
  const [proposedSalary, setProposedSalary] = useState<string>("750000");
  const [salaryMin, setSalaryMin] = useState<string>("600000");
  const [salaryMax, setSalaryMax] = useState<string>("850000");
  const [salaryCurrency, setSalaryCurrency] = useState<string>("INR");
  const [fixedCompensation, setFixedCompensation] = useState<string>("650000");
  const [variableCompensation, setVariableCompensation] = useState<string>("100000");
  const [bonus, setBonus] = useState<string>("0");
  const [joiningBonus, setJoiningBonus] = useState<string>("0");
  const [otherBenefits, setOtherBenefits] = useState<string>(
    "Comprehensive medical insurance (₹5L coverage), annual learning stipend, high-spec equipment allowance."
  );
  const [overrideReason, setOverrideReason] = useState<string>("");

  // Role & Employment Details
  const [roleScope, setRoleScope] = useState<string>(
    "Lead platform engineering delivery, system architecture, REST API integration, and automated testing."
  );
  const [employmentType, setEmploymentType] = useState<string>("Full-time");
  const [joiningTimeline, setJoiningTimeline] = useState<string>("15 - 30 Days");
  const [noticePeriod, setNoticePeriod] = useState<string>("30 Days");
  const [joiningDate, setJoiningDate] = useState<string>("");
  const [expectedJoiningDate, setExpectedJoiningDate] = useState<string>("");
  const [offerExpiryDate, setOfferExpiryDate] = useState<string>("");
  const [location, setLocation] = useState<string>("Bangalore");
  const [workMode, setWorkMode] = useState<string>("Hybrid");
  const [additionalTerms, setAdditionalTerms] = useState<string>(
    "Standard probation period of 3 months applies upon commencement. Employment is subject to verified reference checks and background clearance."
  );

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const join = new Date();
    join.setDate(today.getDate() + 20);
    const exp = new Date();
    exp.setDate(today.getDate() + 7);

    const joinStr = join.toISOString().split("T")[0];
    const expStr = exp.toISOString().split("T")[0];
    setJoiningDate(joinStr);
    setExpectedJoiningDate(joinStr);
    setOfferExpiryDate(expStr);
  }, []);

  // Compute total compensation automatically if fixed + variable are entered
  const totalCalculatedCTC =
    (parseFloat(fixedCompensation) || 0) +
    (parseFloat(variableCompensation) || 0) +
    (parseFloat(bonus) || 0) +
    (parseFloat(joiningBonus) || 0);

  const parsedPropSal = parseFloat(proposedSalary) || 0;
  const parsedMin = parseFloat(salaryMin) || 0;
  const parsedMax = parseFloat(salaryMax) || 0;

  const isOutOfBand =
    parsedMin > 0 && parsedMax > 0 && (parsedPropSal < parsedMin || parsedPropSal > parsedMax);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (offerId) {
          const offerData = await offerApi.getOffer(offerId);
          setOffer(offerData);
          if (offerData.match_result_id) {
            setSelectedMatchId(offerData.match_result_id);
            const matchData = await matchingApi.getMatchById(offerData.match_result_id);
            setMatch(matchData);
          }
          populateForm(offerData);
        } else if (initialMatchId) {
          setSelectedMatchId(initialMatchId);
          await loadMatchContext(initialMatchId);
        } else {
          // Direct access to /recruiter/offers/create without match_id
          try {
            const allCandMatches = await recruiterApi.getAllCandidates();
            setCandidateMatches(allCandMatches || []);
          } catch (err) {
            console.warn("Could not load candidates for selector:", err);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load candidate or offer data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [offerId, initialMatchId]);

  const loadMatchContext = async (mId: number) => {
    try {
      const matchData = await matchingApi.getMatchById(mId);
      setMatch(matchData);

      try {
        const existingOffer = await offerApi.getOfferByMatch(mId);
        if (existingOffer) {
          setOffer(existingOffer);
          populateForm(existingOffer);
          return;
        }
      } catch {
        // No existing offer yet - set requisition defaults
      }

      if (matchData.job) {
        if (matchData.job.salary_min) setSalaryMin(String(matchData.job.salary_min));
        if (matchData.job.salary_max) setSalaryMax(String(matchData.job.salary_max));
        if (matchData.job.location_city) setLocation(matchData.job.location_city);
        if (matchData.job.work_mode) setWorkMode(matchData.job.work_mode);

        if (matchData.job.salary_min && matchData.job.salary_max) {
          const mid = Math.round((matchData.job.salary_min + matchData.job.salary_max) / 2);
          setProposedSalary(String(mid));
          setFixedCompensation(String(Math.round(mid * 0.85)));
          setVariableCompensation(String(Math.round(mid * 0.15)));
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load candidate requisition data.");
    }
  };

  const handleSelectCandidateMatch = async (mId: number) => {
    if (!mId) return;
    setSelectedMatchId(mId);
    setSearchParams({ match_id: String(mId) });
    setSubmitting(true);
    try {
      await loadMatchContext(mId);
    } finally {
      setSubmitting(false);
    }
  };

  const populateForm = (data: Offer) => {
    if (data.proposed_salary) setProposedSalary(String(data.proposed_salary));
    if (data.salary_min) setSalaryMin(String(data.salary_min));
    if (data.salary_max) setSalaryMax(String(data.salary_max));
    if (data.salary_currency) setSalaryCurrency(data.salary_currency);
    if (data.fixed_compensation) setFixedCompensation(String(data.fixed_compensation));
    if (data.variable_compensation) setVariableCompensation(String(data.variable_compensation));
    if (data.bonus) setBonus(String(data.bonus));
    if (data.joining_bonus) setJoiningBonus(String(data.joining_bonus));
    if (data.other_benefits) setOtherBenefits(data.other_benefits);
    if (data.notice_period) setNoticePeriod(data.notice_period);
    if (data.override_reason) setOverrideReason(data.override_reason);
    if (data.role_scope) setRoleScope(data.role_scope);
    if (data.employment_type) setEmploymentType(data.employment_type);
    if (data.joining_timeline) setJoiningTimeline(data.joining_timeline);
    if (data.joining_date) setJoiningDate(data.joining_date.split("T")[0]);
    if (data.expected_joining_date) setExpectedJoiningDate(data.expected_joining_date.split("T")[0]);
    if (data.offer_expiry_date) setOfferExpiryDate(data.offer_expiry_date.split("T")[0]);
    if (data.location) setLocation(data.location);
    if (data.work_mode) setWorkMode(data.work_mode);
    if (data.additional_terms) setAdditionalTerms(data.additional_terms);
  };

  const buildPayload = () => ({
    proposed_salary: proposedSalary ? parseFloat(proposedSalary) : undefined,
    salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
    salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
    salary_currency: salaryCurrency,
    fixed_compensation: fixedCompensation ? parseFloat(fixedCompensation) : undefined,
    variable_compensation: variableCompensation ? parseFloat(variableCompensation) : undefined,
    total_compensation: totalCalculatedCTC > 0 ? totalCalculatedCTC : (proposedSalary ? parseFloat(proposedSalary) : undefined),
    bonus: bonus ? parseFloat(bonus) : undefined,
    joining_bonus: joiningBonus ? parseFloat(joiningBonus) : undefined,
    other_benefits: otherBenefits,
    notice_period: noticePeriod,
    role_scope: roleScope,
    employment_type: employmentType,
    joining_timeline: joiningTimeline,
    joining_date: joiningDate ? new Date(joiningDate).toISOString() : undefined,
    expected_joining_date: expectedJoiningDate ? new Date(expectedJoiningDate).toISOString() : undefined,
    offer_expiry_date: offerExpiryDate ? new Date(offerExpiryDate).toISOString() : undefined,
    location,
    work_mode: workMode,
    additional_terms: additionalTerms,
    override_reason: overrideReason || undefined,
  });

  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const currentMatchId = match?.id || selectedMatchId;
    if (!offer?.id && !currentMatchId) {
      setError("Please select a candidate and job requisition before saving the offer.");
      return;
    }

    if (isOutOfBand && !overrideReason.trim()) {
      setError(
        `Proposed salary is outside the configured requisition band (${Number(salaryMin).toLocaleString()} – ${Number(salaryMax).toLocaleString()} ${salaryCurrency}). An explicit override reason is mandatory.`
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload();
      let savedOffer: Offer;
      if (offer?.id) {
        savedOffer = await offerApi.updateOffer(offer.id, payload);
      } else if (currentMatchId) {
        savedOffer = await workflowApi.createOffer(currentMatchId, payload);
      } else {
        throw new Error("No match or offer context found.");
      }

      setOffer(savedOffer);
      setSuccessMsg("Offer details saved successfully.");
      return savedOffer;
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save offer.");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitToHM = async () => {
    const currentMatchId = match?.id || selectedMatchId;
    if (!offer?.id && !currentMatchId) {
      setError("Please select a candidate and job requisition before submitting to the Hiring Manager.");
      return;
    }

    if (isOutOfBand && !overrideReason.trim()) {
      setError("An explicit override reason is required before submitting an out-of-band salary.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let targetOfferId = offer?.id;
      if (!targetOfferId && currentMatchId) {
        // Auto-save the draft first seamlessly!
        const payload = buildPayload();
        const created = await workflowApi.createOffer(currentMatchId, payload);
        targetOfferId = created.id;
        setOffer(created);
      }

      if (!targetOfferId) {
        throw new Error("Unable to initialize offer draft.");
      }

      const updated = await offerApi.submitOfferForReview(targetOfferId);
      setOffer(updated);
      setSuccessMsg("Offer proposal created and submitted to Hiring Manager for review and formal approval!");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit offer to Hiring Manager.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!offer?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await offerApi.generateOfferPdf(offer.id);
      setOffer(updated);
      setSuccessMsg("Official PDF offer letter generated and stored in AWS S3 successfully. Ready for candidate dispatch.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate offer PDF.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOffer = async () => {
    if (!offer?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const sent = await offerApi.sendOffer(offer.id);
      setOffer(sent);
      setSuccessMsg(`Official employment offer dispatched to ${sent.candidate_name || "candidate"} successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to dispatch offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCandidateLink = () => {
    if (!offer?.id) return;
    const url = `${window.location.origin}/candidate/offers/${offer.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const workflowState = offer?.workflow_state || offer?.status || "DRAFT";

  // Filter candidate matches for dropdown
  const filteredCandidates = candidateMatches.filter((c) => {
    const q = candidateSearch.toLowerCase();
    const name = c.candidate?.full_name?.toLowerCase() || "";
    const jobTitle = c.job?.title?.toLowerCase() || "";
    return name.includes(q) || jobTitle.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground font-medium">Loading offer parameters...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 -m-4 sm:-m-6">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        
        {/* ── Enterprise Hero Header with Rich Palette ─────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/20">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-indigo-200 font-medium">
                <Link to="/recruiter" className="hover:text-white transition-colors">Recruitment</Link>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                <Link to="/recruiter/action-center" className="hover:text-white transition-colors">Action Center</Link>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-semibold">
                  {offer?.id ? `Offer #OL-${String(offer.id).padStart(5, "0")}` : "Create Offer Proposal"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-outfit">
                    {offer?.id ? "Employment Offer & Compensation Package" : "Create Official Employment Offer"}
                  </h1>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Configure base compensation, variable incentives, role scope, and formal terms for requisition fulfillment.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-center flex-wrap">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full border border-indigo-400/30 bg-indigo-500/15 text-indigo-200 uppercase tracking-wider">
                Stage 18: Compensation & Offer
              </span>
              <span
                className={`text-xs font-black px-3.5 py-1.5 rounded-full border shadow-sm ${
                  workflowState === "ACCEPTED"
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : workflowState === "SENT"
                    ? "bg-amber-500 text-white border-amber-400"
                    : workflowState === "HM_APPROVED" || workflowState === "OFFER_READY"
                    ? "bg-sky-500 text-white border-sky-400"
                    : workflowState === "HM_CHANGES_REQUESTED"
                    ? "bg-rose-500 text-white border-rose-400"
                    : "bg-indigo-600 text-white border-indigo-500"
                }`}
              >
                {workflowState.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>

        {/* ── Alerts & Notifications ───────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-sm flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-700 dark:text-rose-400 font-bold hover:opacity-75">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-800 dark:text-emerald-300 font-bold hover:opacity-75">✕</button>
          </div>
        )}

        {/* ── Workflow Progression Stepper ─────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Workflow Progression Lifecycle
              </span>
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                {workflowState === "DRAFT" && "Drafting Offer — Configure compensation and submit for Hiring Manager review."}
                {workflowState === "PENDING_HM_REVIEW" && "Submitted to Hiring Manager — Awaiting formal management approval."}
                {workflowState === "HM_CHANGES_REQUESTED" && "Revisions Requested — Review HM notes below and adjust compensation parameters."}
                {workflowState === "HM_APPROVED" && "Approved by Hiring Manager — Generate official PDF document."}
                {workflowState === "OFFER_READY" && "Official PDF Letter Ready in S3 — Review and dispatch to candidate."}
                {workflowState === "SENT" && "Offer Dispatched to Candidate — Awaiting candidate acceptance or decision."}
                {workflowState === "ACCEPTED" && "Offer Accepted — Candidate successfully hired into requisition."}
                {workflowState === "REJECTED" && "Offer Declined — Candidate placed on cooling period."}
              </div>
              {offer?.hm_comments && workflowState === "HM_CHANGES_REQUESTED" && (
                <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-lg p-3">
                  <span className="font-bold">Hiring Manager Feedback:</span> {offer.hm_comments}
                </div>
              )}
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {(workflowState === "DRAFT" || workflowState === "HM_CHANGES_REQUESTED") && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSaveDraft()}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitToHM}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit to HR Manager
                  </button>
                </>
              )}

              {workflowState === "HM_APPROVED" && (
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {submitting ? "Generating S3 PDF..." : "Generate Official PDF"}
                </button>
              )}

              {(workflowState === "OFFER_READY" || workflowState === "SENT" || workflowState === "ACCEPTED") && offer && (
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={offerApi.downloadOfferPdf(offer.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold border border-emerald-500/30 transition shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    View PDF Letter {offer.pdf_version ? `(v${offer.pdf_version})` : ""}
                  </a>

                  {workflowState === "OFFER_READY" && (
                    <button
                      type="button"
                      onClick={handleSendOffer}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitting ? "Dispatching..." : "Send to Candidate"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyCandidateLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-foreground text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    {copiedLink ? "Copied Decision Link!" : "Copy Candidate Link"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Candidate & Requisition Context Card or Selector ────────── */}
        {!match ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Select Candidate & Job Requisition
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose a candidate match from your active recruitment requisitions to create an official employment proposal.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                {filteredCandidates.length} Active Candidates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Candidate *</label>
                <select
                  value={selectedMatchId || ""}
                  onChange={(e) => handleSelectCandidateMatch(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">-- Choose Candidate Requisition --</option>
                  {candidateMatches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.candidate?.full_name} — {c.job?.title} (Match #{c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Filter Candidate Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    placeholder="Search candidate name or job title..."
                    className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
                  {match.candidate?.full_name?.charAt(0) || "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-foreground">{match.candidate?.full_name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground font-bold">
                      Match #{match.id}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-semibold text-foreground">{match.job?.title}</span>
                    <span>• {match.job?.department || "Core Engineering"}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Candidate Email</span>
                  <span className="font-bold text-foreground truncate block">{match.candidate?.email || "—"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Hiring Manager (HRM)</span>
                  <span className="font-bold text-foreground truncate block">
                    {match.hiring_manager_name || offer?.hiring_manager_name || "Sarah HR"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground block font-medium">Managing Recruiter</span>
                  <span className="font-bold text-foreground truncate block">
                    {match.assigned_recruiter?.name || offer?.recruiter_name || "James Recruiter"}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Salary Band Visualizer */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-emerald-50/20 dark:from-slate-850 dark:via-slate-800 dark:to-slate-850 border border-indigo-100 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Configured Requisition Salary Band
                  </span>
                  <div className="text-sm font-mono font-bold text-foreground">
                    {salaryCurrency === "INR" ? "₹" : salaryCurrency}{" "}
                    {Number(salaryMin || 0).toLocaleString("en-IN")} – {Number(salaryMax || 0).toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="space-y-0.5 text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Proposed Total CTC
                  </span>
                  <div className="text-base font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {salaryCurrency === "INR" ? "₹" : salaryCurrency}{" "}
                    {Number(proposedSalary || 0).toLocaleString("en-IN")}
                  </div>
                </div>

                <div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                      isOutOfBand
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {isOutOfBand ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Outside Band (Override Required)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Within Requisition Band
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {parsedMax > parsedMin && (
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOutOfBand ? "bg-rose-500" : "bg-gradient-to-r from-indigo-500 to-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, ((parsedPropSal - parsedMin) / (parsedMax - parsedMin)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Min: {Number(salaryMin).toLocaleString("en-IN")}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Target: {Number(proposedSalary).toLocaleString("en-IN")}</span>
                    <span>Max: {Number(salaryMax).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Main Multi-Section Form ─────────────────────────────────── */}
        <form onSubmit={handleSaveDraft} className="space-y-6">
          
          {/* ── Section 1: Compensation Package & Structure ───────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-emerald-500/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-foreground font-outfit">
                  1. Compensation Package & Structure
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Section 18 Standard Fields
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Currency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={salaryCurrency}
                    onChange={(e) => setSalaryCurrency(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Requisition Band Min</label>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="600000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-foreground focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Requisition Band Max</label>
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="850000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-foreground focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Proposed Annual CTC <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={proposedSalary}
                    onChange={(e) => setProposedSalary(e.target.value)}
                    placeholder="750000"
                    className="w-full p-2.5 bg-emerald-500/5 border-2 border-emerald-500/40 rounded-xl text-sm font-mono font-extrabold text-foreground focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Fixed Compensation (Base)</label>
                  <input
                    type="number"
                    value={fixedCompensation}
                    onChange={(e) => setFixedCompensation(e.target.value)}
                    placeholder="650000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-foreground focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Variable Compensation</label>
                  <input
                    type="number"
                    value={variableCompensation}
                    onChange={(e) => setVariableCompensation(e.target.value)}
                    placeholder="100000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-foreground focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Joining / Sign-on Bonus</label>
                  <input
                    type="number"
                    value={joiningBonus}
                    onChange={(e) => setJoiningBonus(e.target.value)}
                    placeholder="50000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-foreground focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Out-of-band Override Input */}
              {isOutOfBand && (
                <div className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    Salary Band Override Mandatory
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Proposed salary ({Number(proposedSalary).toLocaleString("en-IN")} {salaryCurrency}) deviates from the configured
                    band. Please supply an explicit business justification for the Hiring Manager review:
                  </p>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="E.g., Exceptional technical assessment score; candidate holds counter-offer; approved by VP."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-rose-500/40 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-rose-500/30 focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-foreground">Other Benefits & Perquisites</label>
                <input
                  type="text"
                  value={otherBenefits}
                  onChange={(e) => setOtherBenefits(e.target.value)}
                  placeholder="E.g., Medical insurance for family, gym membership, ESOPs..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Employment Terms & Location ─────────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-b border-blue-500/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-foreground font-outfit">
                  2. Employment & Timeline Terms
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                Logistics & Arrangement
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    <option value="Full-time">Full-time Permanent</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract (Fixed-term)</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Work Mode</label>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote (WFA)</option>
                    <option value="Onsite">Onsite / Office</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Work Location / City</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Bangalore, India"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Notice Period / Timeline</label>
                  <input
                    type="text"
                    value={noticePeriod}
                    onChange={(e) => {
                      setNoticePeriod(e.target.value);
                      setJoiningTimeline(e.target.value);
                    }}
                    placeholder="30 Days"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Expected Joining Date</label>
                  <input
                    type="date"
                    value={expectedJoiningDate}
                    onChange={(e) => {
                      setExpectedJoiningDate(e.target.value);
                      setJoiningDate(e.target.value);
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">Offer Validity / Expiry Date</label>
                  <input
                    type="date"
                    value={offerExpiryDate}
                    onChange={(e) => setOfferExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Role Scope & Official Contract Terms ────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent border-b border-purple-500/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <FileCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-foreground font-outfit">
                  3. Role Scope & Official Contract Terms
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                Appears on PDF Letter
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  Key Responsibilities & Deliverables <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={roleScope}
                  onChange={(e) => setRoleScope(e.target.value)}
                  rows={3}
                  placeholder="Outline the responsibilities, deliverables, and team context..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground leading-relaxed focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">Standard Terms & Conditions</label>
                <textarea
                  value={additionalTerms}
                  onChange={(e) => setAdditionalTerms(e.target.value)}
                  rows={2}
                  placeholder="Probation clauses, background verification contingencies..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-foreground leading-relaxed focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ── Action Bar Footer ──────────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Submitting to Hiring Manager triggers an immediate review task and notification.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Draft"}
              </button>

              {(workflowState === "DRAFT" || workflowState === "HM_CHANGES_REQUESTED") && (
                <button
                  type="button"
                  onClick={handleSubmitToHM}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Submit to HR Manager
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecruiterOfferPage;
