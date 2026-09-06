import React, { useState, useEffect } from "react";
import { X, ListTodo, Calendar, AlertCircle } from "lucide-react";
import { tasksApi, recruiterAssignmentApi } from "../../services/api";
import { JobRecruiterAssignment } from "../../types";

interface RecruitmentTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  candidateId?: number;
  candidateName?: string;
  onTaskCreated?: () => void;
}

export const RecruitmentTaskModal: React.FC<RecruitmentTaskModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  candidateId,
  candidateName,
  onTaskCreated,
}) => {
  const [assignedRecruiters, setAssignedRecruiters] = useState<JobRecruiterAssignment[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && jobId) {
      loadRecruiters();
    }
  }, [isOpen, jobId]);

  const loadRecruiters = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await recruiterAssignmentApi.listJobRecruiters(jobId);
      const active = list.filter((r) => r.status === "active");
      setAssignedRecruiters(active);
      if (active.length > 0) {
        setSelectedRecruiterId(active[0].recruiter_id);
      }
    } catch (err: any) {
      console.error("Failed to load recruiters for task:", err);
      setError("Failed to fetch assigned recruiters for this job.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecruiterId || !title.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await tasksApi.createTask(
        jobId,
        {
          assigned_to: Number(selectedRecruiterId),
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_at: dueDate ? new Date(dueDate).toISOString() : undefined,
        },
        candidateId
      );

      setTitle("");
      setDescription("");
      setDueDate("");
      onTaskCreated?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create recruitment task.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              Dispatch Recruitment Task
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Requisition: <span className="font-semibold text-foreground">{jobTitle}</span>
              {candidateName && (
                <>
                  {" "}
                  • Candidate: <span className="font-semibold text-foreground">{candidateName}</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Assigned Recruiter Select */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Assignee (Recruiter on Job)
            </label>
            {loading ? (
              <div className="text-xs text-muted-foreground">Loading assigned recruiters...</div>
            ) : assignedRecruiters.length === 0 ? (
              <div className="text-xs text-amber-500 font-medium">
                No recruiters are currently assigned to this job requisition. Please assign a recruiter first.
              </div>
            ) : (
              <select
                value={selectedRecruiterId}
                onChange={(e) => setSelectedRecruiterId(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {assignedRecruiters.map((r) => (
                  <option key={r.id} value={r.recruiter_id}>
                    {r.recruiter?.name} ({r.assignment_role.replace("_", " ")})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Task Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Task Title
            </label>
            <input
              type="text"
              placeholder="e.g. Screen resume for AWS certifications and conduct technical check"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Task Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Instructions & Notes
            </label>
            <textarea
              placeholder="Provide specific guidelines or questions for the recruiter..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs rounded-xl border border-border bg-background p-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedRecruiterId || !title.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {submitting ? "Dispatching..." : "Dispatch Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
