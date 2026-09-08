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
  Sparkles,
  FileText,
  Download,
  Eye,
  RefreshCw,
} from "lucide-react";
import { workflowApi, offerApi, matchingApi } from "../../services/api";
import { MatchResult, Offer } from "../../types";
import OfferCard from "../../components/workflow/OfferCard";

export const RecruiterOfferPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>(); // offer_id or match_id
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const matchIdParam = searchParams.get("match_id");
  const matchId = matchIdParam ? parseInt(matchIdParam, 10) : 0;
  const offerId = id ? parseInt(id, 10) : 0;

  const [match, setMatch] = useState<MatchResult | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [proposedSalary, setProposedSalary] = useState<string>("720000");
  const [salaryMin, setSalaryMin] = useState<string>("600000");
  const [salaryMax, setSalaryMax] = useState<string>("800000");
  const [salaryCurrency, setSalaryCurrency] = useState<string>("INR");
  const [roleScope, setRoleScope] = useState<string>("Core platform development, system architecture, API integration, and engineering delivery.");
  const [employmentType, setEmploymentType] = useState<string>("Full-time");
  const [joiningTimeline, setJoiningTimeline] = useState<string>("15 - 30 Days");
  const [joiningDate, setJoiningDate] = useState<string>("");
  const [offerExpiryDate, setOfferExpiryDate] = useState<string>("");
  const [location, setLocation] = useState<string>("Bangalore");
  const [workMode, setWorkMode] = useState<string>("Hybrid");
  const [additionalTerms, setAdditionalTerms] = useState<string>(
    "Standard probation period of 3 months applies. Annual performance review and standard corporate medical insurance included."
  );

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const join = new Date();
    join.setDate(today.getDate() + 15);
    const exp = new Date();
    exp.setDate(today.getDate() + 7);

    setJoiningDate(join.toISOString().split("T")[0]);
    setOfferExpiryDate(exp.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (offerId) {
          const offerData = await offerApi.getOffer(offerId);
          setOffer(offerData);
          if (offerData.match_result_id) {
            const matchData = await matchingApi.getMatchById(offerData.match_result_id);
            setMatch(matchData);
          }
          // Populate fields
          if (offerData.proposed_salary) setProposedSalary(String(offerData.proposed_salary));
          if (offerData.salary_min) setSalaryMin(String(offerData.salary_min));
          if (offerData.salary_max) setSalaryMax(String(offerData.salary_max));
          if (offerData.salary_currency) setSalaryCurrency(offerData.salary_currency);
          if (offerData.role_scope) setRoleScope(offerData.role_scope);
          if (offerData.employment_type) setEmploymentType(offerData.employment_type);
          if (offerData.joining_timeline) setJoiningTimeline(offerData.joining_timeline);
          if (offerData.joining_date) setJoiningDate(offerData.joining_date.split("T")[0]);
          if (offerData.offer_expiry_date) setOfferExpiryDate(offerData.offer_expiry_date.split("T")[0]);
          if (offerData.location) setLocation(offerData.location);
          if (offerData.work_mode) setWorkMode(offerData.work_mode);
          if (offerData.additional_terms) setAdditionalTerms(offerData.additional_terms);
        } else if (matchId) {
          const matchData = await matchingApi.getMatchById(matchId);
          setMatch(matchData);

          try {
            const existingOffer = await offerApi.getOfferByMatch(matchId);
            if (existingOffer) {
              setOffer(existingOffer);
              if (existingOffer.proposed_salary) setProposedSalary(String(existingOffer.proposed_salary));
              if (existingOffer.salary_min) setSalaryMin(String(existingOffer.salary_min));
              if (existingOffer.salary_max) setSalaryMax(String(existingOffer.salary_max));
              if (existingOffer.salary_currency) setSalaryCurrency(existingOffer.salary_currency);
              if (existingOffer.role_scope) setRoleScope(existingOffer.role_scope);
              if (existingOffer.employment_type) setEmploymentType(existingOffer.employment_type);
              if (existingOffer.joining_timeline) setJoiningTimeline(existingOffer.joining_timeline);
              if (existingOffer.joining_date) setJoiningDate(existingOffer.joining_date.split("T")[0]);
              if (existingOffer.offer_expiry_date) setOfferExpiryDate(existingOffer.offer_expiry_date.split("T")[0]);
              if (existingOffer.location) setLocation(existingOffer.location);
              if (existingOffer.work_mode) setWorkMode(existingOffer.work_mode);
              if (existingOffer.additional_terms) setAdditionalTerms(existingOffer.additional_terms);
            }
          } catch {
            // no existing offer
          }

          // If job has defaults
          if (matchData.job?.location_city) setLocation(matchData.job.location_city);
          if (matchData.job?.work_mode) setWorkMode(matchData.job.work_mode);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load candidate or offer data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [offerId, matchId]);

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        proposed_salary: proposedSalary ? parseFloat(proposedSalary) : undefined,
        salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
        salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
        salary_currency: salaryCurrency,
        role_scope: roleScope,
        employment_type: employmentType,
        joining_timeline: joiningTimeline,
        joining_date: joiningDate ? new Date(joiningDate).toISOString() : undefined,
        offer_expiry_date: offerExpiryDate ? new Date(offerExpiryDate).toISOString() : undefined,
        location,
        work_mode: workMode,
        additional_terms: additionalTerms,
      };

      let savedOffer: Offer;
      if (offer?.id) {
        savedOffer = await offerApi.updateOffer(offer.id, payload);
      } else if (match?.id) {
        savedOffer = await workflowApi.createOffer(match.id, payload);
      } else {
        throw new Error("No match or offer context found.");
      }

      setOffer(savedOffer);
      setSuccessMsg("Offer saved successfully!");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save draft offer.");
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
      setSuccessMsg(`Offer sent successfully to ${sent.candidate_name || "candidate"}!`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitToHM = async () => {
    if (!offer?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await offerApi.submitOfferForReview(offer.id);
      setOffer(updated);
      setSuccessMsg("Offer submitted to Hiring Manager for approval!");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit offer for review.");
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
      setSuccessMsg("Official offer letter PDF generated successfully! You can now send it to the candidate.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate offer PDF.");
    } finally {
      setSubmitting(false);
    }
  };

  const workflowState = offer?.workflow_state || offer?.status || "DRAFT";


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/recruiter/action-center"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Action Center
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Employment Offer Drafting
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Offer Approval Workflow State Banner */}
      {offer && (
        <div className={`rounded-xl border p-4 ${
          workflowState === "DRAFT" || workflowState === "HM_CHANGES_REQUESTED"
            ? "bg-slate-900/60 border-slate-700"
            : workflowState === "PENDING_HM_REVIEW"
            ? "bg-blue-500/10 border-blue-500/30"
            : workflowState === "HM_APPROVED" || workflowState === "OFFER_READY"
            ? "bg-emerald-500/10 border-emerald-500/30"
            : workflowState === "SENT"
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-slate-900/60 border-slate-700"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Offer Approval Status</span>
              <span className={`text-sm font-bold mt-0.5 block ${
                workflowState === "PENDING_HM_REVIEW" ? "text-blue-300"
                : workflowState === "HM_APPROVED" || workflowState === "OFFER_READY" ? "text-emerald-300"
                : workflowState === "HM_CHANGES_REQUESTED" ? "text-amber-300"
                : workflowState === "SENT" ? "text-yellow-300"
                : "text-white"
              }`}>
                {workflowState === "DRAFT" && "📝 Draft — Complete and submit to Hiring Manager for approval"}
                {workflowState === "PENDING_HM_REVIEW" && "⏳ Pending Hiring Manager Review"}
                {workflowState === "HM_CHANGES_REQUESTED" && "⚠️ Changes Requested by Hiring Manager"}
                {workflowState === "HM_APPROVED" && "✅ Approved by Hiring Manager — Generate PDF"}
                {workflowState === "OFFER_READY" && "📄 PDF Ready — Send to Candidate"}
                {workflowState === "SENT" && "📨 Offer Sent to Candidate"}
              </span>
              {offer.hm_comments && workflowState === "HM_CHANGES_REQUESTED" && (
                <p className="mt-1.5 text-xs text-amber-300/80 bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
                  <span className="font-semibold">HM Note:</span> {offer.hm_comments}
                </p>
              )}
            </div>
            {/* Action Buttons based on workflow state */}
            <div className="flex items-center gap-2 flex-wrap">
              {(workflowState === "DRAFT" || workflowState === "HM_CHANGES_REQUESTED") && (
                <button
                  onClick={handleSubmitToHM}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit to HM for Approval
                </button>
              )}
              {workflowState === "HM_APPROVED" && (
                <button
                  onClick={handleGeneratePDF}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {submitting ? "Generating..." : "Generate Official PDF"}
                </button>
              )}
              {workflowState === "OFFER_READY" && (
                <div className="flex items-center gap-2">
                  <a
                    href={offerApi.downloadOfferPdf(offer.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Preview PDF
                  </a>
                  <button
                    onClick={handleSendOffer}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? "Sending..." : "Send to Candidate"}
                  </button>
                </div>
              )}
              {workflowState === "SENT" && offer.has_pdf && (
                <a
                  href={offerApi.downloadOfferPdf(offer.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Offer PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Candidate Summary Pill */}

      {match && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-600 flex items-center justify-center text-white font-bold text-lg shadow">
                {match.candidate?.full_name?.charAt(0) || "C"}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{match.candidate?.full_name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  {match.job?.title} • {match.candidate?.total_experience_years || 0} yrs exp
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 block uppercase font-medium">Stage 18 / 19</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                Phase 2 — Compensation & Offer Management
              </span>
            </div>
          </div>

          {/* Section 18 Meta Grid: Candidate, Job, HM, Recruiter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Candidate</span>
              <span className="font-semibold text-white truncate block">{match.candidate?.full_name}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Job Requisition</span>
              <span className="font-semibold text-white truncate block">{match.job?.title}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Hiring Manager</span>
              <span className="font-semibold text-white truncate block">
                {match.hiring_manager_name || offer?.hiring_manager_name || "Assigned HM"}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Managing Recruiter</span>
              <span className="font-semibold text-white truncate block">
                {match.assigned_recruiter?.name || offer?.recruiter_name || "Assigned Recruiter"}
              </span>
            </div>
          </div>

          {/* Compensation Band Highlight */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium uppercase">Salary Band</span>
              <span className="text-amber-300 font-bold font-mono text-sm">
                {salaryCurrency === "INR" ? "₹" : salaryCurrency} {Number(salaryMin || 0).toLocaleString("en-IN")} – {salaryCurrency === "INR" ? "₹" : salaryCurrency} {Number(salaryMax || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium uppercase">Proposed Salary</span>
              <span className="text-emerald-400 font-bold font-mono text-base">
                {salaryCurrency === "INR" ? "₹" : salaryCurrency} {Number(proposedSalary || 0).toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium uppercase">Offer Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                offer?.status === "ACCEPTED" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                offer?.status === "SENT" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" :
                offer?.status === "REJECTED" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" :
                "bg-amber-500/20 text-amber-300 border-amber-500/40"
              }`}>
                {offer?.status || "DRAFT"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSaveDraft} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <DollarSign className="w-4 h-4 text-amber-400" />
            19. Offer Management & Compensation Details
          </h3>

          {/* Proposed Salary & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-medium text-slate-400">Proposed Salary</label>
              <input
                type="number"
                value={proposedSalary}
                onChange={(e) => setProposedSalary(e.target.value)}
                placeholder="720000"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-amber-300 font-bold focus:border-amber-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Currency</label>
              <select
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-amber-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Salary Min / Max Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Salary Band Minimum</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Salary Band Maximum</label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
              />
            </div>
          </div>

          {/* Role Scope */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">Role Scope & Key Responsibilities</label>
            <textarea
              value={roleScope}
              onChange={(e) => setRoleScope(e.target.value)}
              rows={2}
              placeholder="E.g. Lead system architecture, engineering delivery, API integrations..."
              className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white leading-relaxed"
            />
          </div>

          {/* Joining Timeline & Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Joining Timeline</label>
              <input
                type="text"
                value={joiningTimeline}
                onChange={(e) => setJoiningTimeline(e.target.value)}
                placeholder="E.g. 15 - 30 Days"
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Expected Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                required
              />
            </div>
          </div>

          {/* Employment Type & Work Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              >
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="WFH">Work From Home (Remote)</option>
                <option value="WFO">On-site (Office)</option>
              </select>
            </div>
          </div>

          {/* Location & Offer Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Job Location / City</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="E.g. Bangalore, India"
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Offer Expiry Date</label>
              <input
                type="date"
                value={offerExpiryDate}
                onChange={(e) => setOfferExpiryDate(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                required
              />
            </div>
          </div>

          {/* Additional Terms */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">Additional Terms & Conditions</label>
            <textarea
              value={additionalTerms}
              onChange={(e) => setAdditionalTerms(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              {submitting ? "Saving..." : offer?.id ? "Edit & Update Offer" : "Create Offer (Draft)"}
            </button>

            {offer?.id && (
              <button
                type="button"
                onClick={handleSendOffer}
                disabled={submitting || offer.status === "SENT"}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {offer.status === "SENT" ? "Offer Sent" : "Send Formal Offer"}
              </button>
            )}
          </div>
        </form>

        {/* Live Preview Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Candidate Preview
            </span>
            <span className="text-[11px] text-slate-500">Section 20 Live Candidate View</span>
          </div>

          <OfferCard
            offer={{
              id: offer?.id || 0,
              match_result_id: match?.id || 0,
              candidate_id: match?.candidate_id || 0,
              job_id: match?.job_id || 0,
              salary_currency: salaryCurrency,
              proposed_salary: proposedSalary ? parseFloat(proposedSalary) : null,
              salary_min: salaryMin ? parseFloat(salaryMin) : null,
              salary_max: salaryMax ? parseFloat(salaryMax) : null,
              role_scope: roleScope,
              employment_type: employmentType,
              joining_timeline: joiningTimeline,
              joining_date: joiningDate,
              offer_expiry_date: offerExpiryDate,
              location: location,
              work_mode: workMode,
              additional_terms: additionalTerms,
              status: offer?.status || "DRAFT",
              created_at: offer?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              candidate_name: match?.candidate?.full_name,
              job_title: match?.job?.title,
              recruiter_name: match?.assigned_recruiter?.name || offer?.recruiter_name,
              hiring_manager_name: match?.hiring_manager_name || offer?.hiring_manager_name,
            }}
            viewMode="recruiter"
            onSend={offer?.id ? handleSendOffer : undefined}
            loading={submitting}
          />
        </div>
      </div>

    </div>
  );
};
export default RecruiterOfferPage;
