import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { jobsApi } from "../../services/api";
import { Job } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ArrowLeft, Briefcase, Building, Clock, Loader2, Save } from "lucide-react";

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [clientName, setClientName] = useState("");
  const [minExpYears, setMinExpYears] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "closed">("active");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await jobsApi.getById(jobId);
        setJob(data);
        setTitle(data.title);
        setDepartment(data.department || "");
        setClientName(data.client_name || "");
        setMinExpYears(data.min_experience_years);
        setDescription(data.description || "");
        setStatus(data.status);
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to load job.");
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetchJob();
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
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update job.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      <Link
        to="/recruiter"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Recruiter Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight flex items-center gap-3">
            {job?.title}
            <Badge variant={job?.status === "active" ? "success" : "secondary"}>
              {job?.status}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Created on {job?.created_at ? new Date(job.created_at).toLocaleDateString() : ""}
          </p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-4">
          <h3 className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" /> Edit Job Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Job Title</label>
              <Input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Department</label>
              <Input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Client Name</label>
              <Input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
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
              <label className="text-xs font-semibold text-foreground">Requisition Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Job Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/50 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </Card>

        {/* Existing Job Skills view */}
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl p-6 space-y-3">
          <h3 className="text-base font-bold font-outfit text-foreground">
            Configured Required & Preferred Skills ({job?.job_skills.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {job?.job_skills.map((js) => (
              <div
                key={js.id}
                className="p-3 rounded-xl border border-border/70 bg-card/60 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-semibold text-foreground">{js.skill.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {js.skill.category}
                  </span>
                </div>
                <div className="text-right">
                  <Badge variant={js.requirement_type === "required" ? "default" : "secondary"}>
                    {js.requirement_type}
                  </Badge>
                  <span className="block text-[11px] text-muted-foreground pt-1">
                    Weight: {js.weight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" variant="gradient" disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
