import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Laptop,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  ArrowLeft,
  ChevronRight,
  Award,
  AlertCircle,
  Phone,
  Mail,
  DollarSign,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { candidatesApi, offerApi } from "../../services/api";
import { HiringDetails } from "../../types";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export const CandidateHiringPage: React.FC = () => {
  const [hiringDetails, setHiringDetails] = useState<HiringDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<{ id: number; title: string; description: string; status: string; category: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "offer" | "joining" | "onboarding" | "timeline">("details");

  useEffect(() => {
    const loadHiringData = async () => {
      setLoading(true);
      try {
        const res = await candidatesApi.getMyHiringStatus();
        if (res.is_hired && res.hiring_details) {
          setHiringDetails(res.hiring_details);
          setChecklist(res.hiring_details.pre_onboarding_checklist || []);
        }
      } catch (err) {
        console.error("Failed to load candidate hiring details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHiringData();
  }, []);

  const toggleChecklistItem = (id: number) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "COMPLETED" ? "PENDING" : "COMPLETED" }
          : item
      )
    );
  };

  const getDaysUntilJoining = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const today = new Date();
      const target = new Date(dateStr);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">Loading your hiring and onboarding profile...</span>
        </div>
      </div>
    );
  }

  if (!hiringDetails) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto text-muted-foreground">
          <Briefcase className="w-7 h-7 opacity-60" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-outfit text-foreground">No Finalized Hiring Record Found</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            You do not currently have an accepted employment offer. When you accept an offer, your formal onboarding and hiring packet will appear here.
          </p>
        </div>
        <Link to="/candidate">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 mt-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const daysRemaining = getDaysUntilJoining(hiringDetails.raw_joining_date || hiringDetails.joining_date);

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Navigation & Title ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/candidate" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Candidate Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-foreground">My Hiring & Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-outfit flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-emerald-500" />
            My Hiring & Onboarding Portal
          </h1>
          <p className="text-xs text-muted-foreground">
            Official employment parameters, verified offer letter, and pre-boarding preparation for your new role.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            HIRED ✓
          </span>
          {daysRemaining !== null && daysRemaining > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Joining in {daysRemaining} days
            </span>
          )}
        </div>
      </div>

      {/* ── Enterprise Congratulatory Banner ───────────────────────────────── */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              OFFER ACCEPTED & PLACEMENT CONFIRMED
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-outfit text-foreground tracking-tight">
              Congratulations, {hiringDetails.candidate_name}!
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
              You have accepted the official employment offer for{" "}
              <strong className="text-foreground font-bold">{hiringDetails.position}</strong> at{" "}
              <strong className="text-foreground font-bold">{hiringDetails.company_name}</strong>. Welcome aboard!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto shrink-0">
            <a
              href={offerApi.downloadOfferPdf(hiringDetails.offer_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-foreground hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition shadow-xs"
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              View Offer Letter
            </a>
            <a
              href={offerApi.downloadOfferPdf(hiringDetails.offer_id)}
              download={`Offer_Letter_${hiringDetails.offer_id}.pdf`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </a>
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-500/20 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Joining Date</span>
            <span className="font-bold text-foreground text-sm font-mono mt-0.5 block">{hiringDetails.joining_date}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Work Mode</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">{hiringDetails.work_mode}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Employment Type</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">{hiringDetails.employment_type}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Location</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">{hiringDetails.location}</span>
          </div>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-border/80 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab("details")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "details"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Hiring Details</span>
        </button>

        <button
          onClick={() => setActiveTab("offer")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "offer"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Offer Letter</span>
        </button>

        <button
          onClick={() => setActiveTab("joining")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "joining"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Joining Information</span>
        </button>

        <button
          onClick={() => setActiveTab("onboarding")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "onboarding"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Onboarding Checklist</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-secondary text-foreground">
            {checklist.filter((c) => c.status === "COMPLETED").length}/{checklist.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "timeline"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Hiring Journey Timeline</span>
        </button>
      </div>

      {/* ── TAB 1: HIRING DETAILS ─────────────────────────────────────────── */}
      {activeTab === "details" && (
        <div className="space-y-5">
          <Card className="p-6 border-border bg-card/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                Employment & Role Parameters
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Overview of your finalized corporate position and key points of contact.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Company / Organization</span>
                <span className="text-sm font-bold text-foreground block">{hiringDetails.company_name}</span>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Position / Title</span>
                <span className="text-sm font-bold text-foreground block">{hiringDetails.position}</span>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Employment Type</span>
                <span className="text-sm font-bold text-foreground block">{hiringDetails.employment_type}</span>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Work Mode</span>
                <span className="text-sm font-bold text-foreground block">{hiringDetails.work_mode}</span>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Work Location</span>
                <span className="text-sm font-bold text-foreground block">{hiringDetails.location}</span>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Joining Date</span>
                <span className="text-sm font-bold text-foreground font-mono block">{hiringDetails.joining_date}</span>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Reporting Manager (HM)</span>
                <span className="text-sm font-bold text-foreground block">{hiringDetails.reporting_manager}</span>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Managing Recruiter</span>
                <span className="text-sm font-bold text-foreground block">{hiringDetails.recruiter}</span>
              </div>
            </div>

            {/* Compensation Overview */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Annual Total Compensation (CTC)</span>
                <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {hiringDetails.currency === "INR" ? "₹" : hiringDetails.currency}{" "}
                  {Number(hiringDetails.ctc || 0).toLocaleString("en-IN")}
                </div>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">Subject to applicable statutory withholdings and tax deductions.</span>
              </div>

              <div className="flex items-center gap-2">
                <Link to={`/candidate/offers/${hiringDetails.offer_id}`}>
                  <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                    <FileCheck className="w-3.5 h-3.5" /> Full Compensation Details
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: OFFICIAL OFFER LETTER ─────────────────────────────────── */}
      {activeTab === "offer" && (
        <Card className="p-6 border-border bg-card/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Official Employment Agreement & Letter
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official document executed between you and {hiringDetails.company_name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={offerApi.downloadOfferPdf(hiringDetails.offer_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-primary" />
                Open PDF in New Tab
              </a>
              <a
                href={offerApi.downloadOfferPdf(hiringDetails.offer_id)}
                download={`Offer_Letter_${hiringDetails.offer_id}.pdf`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Offer Reference</span>
                <span className="font-mono font-bold text-foreground block">#OL-{String(hiringDetails.offer_id).padStart(5, "0")}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Document Version</span>
                <span className="font-bold text-foreground block">v{hiringDetails.pdf_version || 1} (Official Final)</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Accepted At</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                  {hiringDetails.accepted_at ? new Date(hiringDetails.accepted_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Confirmed"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Document Verification</span>
                <span className="font-bold text-foreground block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Digitally Verified & Signed
                </span>
              </div>
            </div>

            {hiringDetails.role_scope && (
              <div className="pt-2 border-t border-border/40">
                <span className="text-[11px] font-bold text-foreground block mb-1">Role Scope & Core Responsibilities:</span>
                <p className="text-muted-foreground leading-relaxed italic bg-card/60 p-3 rounded-lg border border-border/40">
                  "{hiringDetails.role_scope}"
                </p>
              </div>
            )}

            {hiringDetails.additional_terms && (
              <div className="pt-2 border-t border-border/40">
                <span className="text-[11px] font-bold text-foreground block mb-1">Standard Terms & Contingencies:</span>
                <p className="text-muted-foreground leading-relaxed text-[11px] bg-card/60 p-3 rounded-lg border border-border/40">
                  {hiringDetails.additional_terms}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── TAB 3: JOINING INFORMATION ───────────────────────────────────── */}
      {activeTab === "joining" && (
        <Card className="p-6 border-border bg-card/80 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Day 1 Logistics & Joining Guidelines
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Everything you need to be prepared for your official commencement date.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
              <span className="text-[11px] font-bold text-foreground uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Schedule & Reporting
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Your commencement date is scheduled for <strong className="text-foreground">{hiringDetails.joining_date}</strong> at 09:30 AM IST.
                An email invite for your virtual Day 1 orientation will be sent 3 business days prior.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
              <span className="text-[11px] font-bold text-foreground uppercase flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-primary" />
                Workstation & IT Setup
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Work Mode: <strong className="text-foreground">{hiringDetails.work_mode}</strong>. IT assets and company credentials will be dispatched to your registered address prior to your start date.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
              <span className="text-[11px] font-bold text-foreground uppercase flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Orientation & Buddy
              </span>
              <p className="text-muted-foreground leading-relaxed">
                Your hiring manager <strong className="text-foreground">{hiringDetails.reporting_manager}</strong> and talent coordinator <strong className="text-foreground">{hiringDetails.recruiter}</strong> will guide your team introductions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── TAB 4: PRE-ONBOARDING CHECKLIST ───────────────────────────────── */}
      {activeTab === "onboarding" && (
        <Card className="p-6 border-border bg-card/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                Pre-Onboarding Checklist & Document Readiness
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prepare these required items before your joining date to expedite HRMS registration.
              </p>
            </div>

            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-secondary border border-border text-foreground">
              {checklist.filter((c) => c.status === "COMPLETED").length} of {checklist.length} Completed
            </div>
          </div>

          <div className="space-y-3">
            {checklist.map((item) => {
              const isDone = item.status === "COMPLETED";
              return (
                <div
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    isDone
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : "bg-muted/20 border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isDone
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {isDone ? "Ready ✓" : "Pending"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── TAB 5: HIRING JOURNEY TIMELINE ───────────────────────────────── */}
      {activeTab === "timeline" && (
        <Card className="p-6 border-border bg-card/80 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Complete Recruitment & Hiring Journey
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              The complete chronology of your application lifecycle from initial submission to finalized hire.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-500/40">
            {hiringDetails.journey_timeline.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-4">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                  ✓
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-foreground">{step.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {step.date}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CandidateHiringPage;
