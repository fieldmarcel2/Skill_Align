import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { jobsApi, recruiterApi, workflowApi } from "../../services/api";
import { Job, MatchResult, ActionCenterItem } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScoreBadge } from "../../components/common/ScoreBadge";
import {
  ArrowLeft,
  Briefcase,
  Building,
  Clock,
  Loader2,
  Save,
  Inbox,
  Users,
  CalendarCheck,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Settings,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  MapPin,
} from "lucide-react";

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<MatchResult[]>([]);
  const [actionItems, setActionItems] = useState<ActionCenterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Active view tab: "pipeline" | "details" | "edit"
  const [activeTab, setActiveTab] = useState<"pipeline" | "details" | "edit">("pipeline");

  // Form states for editing
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [clientName, setClientName] = useState("");
  const [minExpYears, setMinExpYears] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "closed">("active");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [jobData, candidateData, actionsData] = await Promise.all([
          jobsApi.getById(jobId),
          recruiterApi.getJobCandidates(jobId, { page_size: 100 }).catch(() => []),
          workflowApi.getActionCenter(jobId).catch(() => []),
        ]);

        setJob(jobData);
        setTitle(jobData.title);
        setDepartment(jobData.department || "");
        setClientName(jobData.client_name || "");
        setMinExpYears(jobData.min_experience_years);
        setDescription(jobData.description || "");
        setStatus(jobData.status);

        setCandidates(candidateData);
        setActionItems(actionsData);
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to load job requisition details.");
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) fetchData();
  }, [jobId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await jobsApi.update(jobId, {
        title,
        department,
        client_name: clientName,
        min_experience_years: Number(minExpYears),
        description,
        status,
      });
      setJob(updated);
      toast.success("Job details updated successfully.");
      setActiveTab("details");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update job.");
    } finally {
      setIsSaving(false);
    }
  };

  // Pipeline metrics
  const totalCandidates = candidates.length;
  const screeningNeeded = candidates.filter(
    (c) => c.status === "matched" || c.pipeline_state === "CANDIDATE_MATCHED"
  ).length;
  const shortlistedCount = candidates.filter(
    (c) =>
      c.status === "screened" ||
      c.status === "approved_by_hr" ||
      c.pipeline_state === "CANDIDATE_SHORTLISTED" ||
      c.pipeline_state === "SENT_TO_HIRING_MANAGER" ||
      c.pipeline_state === "HIRING_MANAGER_REVIEW"
  ).length;
  const interviewsCount = candidates.filter(
    (c) =>
      c.status === "interview_scheduled" ||
      c.status === "technical_interview" ||
      c.status === "hr_interview" ||
      c.pipeline_state?.includes("INTERVIEW") ||
      c.pipeline_state === "CANDIDATE_SLOT_SELECTED"
  ).length;
  const offersCount = candidates.filter(
    (c) =>
      c.status === "offer" ||
      c.pipeline_state === "OFFER_CREATED" ||
      c.pipeline_state === "OFFER_SENT"
  ).length;
  const hiredCount = candidates.filter(
    (c) =>
      c.status === "hired" ||
      c.pipeline_state === "OFFER_ACCEPTED" ||
      c.pipeline_state === "HIRED"
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ── Breadcrumb & Navigation ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/recruiter"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Recruiter Dashboard
        </Link>
        <span className="text-xs text-slate-500 font-mono">REQ-ID: #{job?.id}</span>
      </div>

      {/* ── Requisition Header & Primary CTA ─────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary uppercase tracking-wider">
              {job?.department || "Technology"}
            </span>
            <Badge variant={job?.status === "active" ? "success" : "secondary"}>
              {job?.status}
            </Badge>
            {job?.client_name && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-500" />
                {job.client_name}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {job?.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
            <span>Minimum Experience: <strong className="text-white">{job?.min_experience_years} yrs</strong></span>
            <span>Created on: {job?.created_at ? new Date(job.created_at).toLocaleDateString() : "Recent"}</span>
          </div>
        </div>

        {/* Action Center Direct Gateway Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            to={`/recruiter/action-center?job_id=${jobId}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-colors"
          >
            <Inbox className="w-4 h-4" />
            <span>Open Action Center for this Job</span>
            {actionItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold ml-1">
                {actionItems.length}
              </span>
            )}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            to={`/recruiter/candidates?job_id=${jobId}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Users className="w-4 h-4 text-slate-300" />
            <span>All Candidates</span>
          </Link>
        </div>
      </div>

      {/* ── Operational Requisition Metrics ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            Applicants
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <div className="text-xl font-bold text-white font-mono">{totalCandidates}</div>
          <div className="text-[10px] text-slate-500">In Requisition Pipeline</div>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
          <span className="text-[11px] font-medium text-blue-300 flex items-center justify-between">
            Screening Needed
            <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
          </span>
          <div className="text-xl font-bold text-blue-400 font-mono">{screeningNeeded}</div>
          <div className="text-[10px] text-blue-300/80">Pending recruiter review</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
            Shortlisted / HM
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <div className="text-xl font-bold text-white font-mono">{shortlistedCount}</div>
          <div className="text-[10px] text-slate-500">Under HM Evaluation</div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
          <span className="text-[11px] font-medium text-emerald-300 flex items-center justify-between">
            Interviews
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="text-xl font-bold text-emerald-400 font-mono">{interviewsCount}</div>
          <div className="text-[10px] text-emerald-300/80">Scheduling or in-progress</div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
          <span className="text-[11px] font-medium text-amber-300 flex items-center justify-between">
            Offers Extended
            <FileCheck className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <div className="text-xl font-bold text-amber-400 font-mono">{offersCount}</div>
          <div className="text-[10px] text-amber-300/80">Awaiting candidate decision</div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
          <span className="text-[11px] font-medium text-emerald-300 flex items-center justify-between">
            Hired
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <div className="text-xl font-bold text-emerald-400 font-mono">{hiredCount}</div>
          <div className="text-[10px] text-emerald-300/80">Offers accepted</div>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("pipeline")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "pipeline"
              ? "border-primary text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-primary" />
          Stage-by-Stage Pipeline ({candidates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "details"
              ? "border-primary text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Briefcase className="w-4 h-4 text-slate-400" />
          Job Description & Skills ({job?.job_skills.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "edit"
              ? "border-primary text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          Edit Requisition Settings
        </button>
      </div>

      {/* ── TAB 1: STAGE-BY-STAGE PIPELINE ───────────────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {candidates.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
              <Users className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Candidates Matched Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No applicants or matched candidates found for this requisition. Run match algorithm or check candidate pool.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {candidates.map((cand) => {
                const pState = cand.pipeline_state || "CANDIDATE_MATCHED";
                const score = cand.overall_score !== undefined ? Math.round(cand.overall_score > 1 ? cand.overall_score : cand.overall_score * 100) : 0;

                return (
                  <div
                    key={cand.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4.5 space-y-3 shadow-sm transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {cand.candidate?.full_name || `Candidate #${cand.candidate_id}`}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {cand.candidate?.education_degree || (cand.candidate?.total_experience_years ? `${cand.candidate.total_experience_years} yrs exp` : "Applicant")}
                        </p>
                      </div>
                      <ScoreBadge score={score} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {pState.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-auto">
                        Status: <strong className="text-slate-300 uppercase">{cand.status}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <Link
                        to={`/recruiter/candidates/${cand.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                      >
                        <User className="w-3.5 h-3.5" />
                        Full Dossier
                      </Link>

                      <Link
                        to={`/recruiter/action-center?job_id=${jobId}`}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                      >
                        Action Center
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: JOB SPECIFICATIONS & SKILLS ────────────────────────────── */}
      {activeTab === "details" && (
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Requisition Description & Scope
            </h3>
            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-lg border border-slate-800">
              {job?.description || "No detailed job description provided."}
            </div>
          </Card>

          <Card className="border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Required & Preferred Skills Benchmark ({job?.job_skills.length || 0})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {job?.job_skills.map((js) => (
                <div
                  key={js.id}
                  className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{js.skill.name}</span>
                    <span className="text-[11px] text-slate-400 block">{js.skill.category}</span>
                  </div>
                  <div className="text-right">
                    <Badge variant={js.requirement_type === "required" ? "default" : "secondary"}>
                      {js.requirement_type}
                    </Badge>
                    <span className="text-[10px] text-slate-500 block pt-1 font-mono">
                      Weight: {js.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 3: EDIT REQUISITION SETTINGS ─────────────────────────────── */}
      {activeTab === "edit" && (
        <form onSubmit={handleUpdate} className="space-y-6 max-w-3xl">
          <Card className="border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Edit Job Requisition Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Job Title</label>
                <Input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Department</label>
                <Input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Client / Org Name</label>
                <Input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Minimum Experience (Years)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={minExpYears}
                  onChange={(e) => setMinExpYears(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Requisition Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Job Description</label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <Button type="submit" variant="default" disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Requisition Changes
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};

export default JobDetailPage;
