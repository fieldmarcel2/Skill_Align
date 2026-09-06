import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  Trash2,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Users,
  Check,
} from "lucide-react";
import { recruiterAssignmentApi, usersApi } from "../../services/api";
import { JobRecruiterAssignment, User } from "../../types";
import { cn } from "../../lib/utils";

interface AssignRecruiterModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  onAssignmentUpdated?: () => void;
}

export const AssignRecruiterModal: React.FC<AssignRecruiterModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  onAssignmentUpdated,
}) => {
  const [assigned, setAssigned] = useState<JobRecruiterAssignment[]>([]);
  const [allRecruiters, setAllRecruiters] = useState<User[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<number | "">("");
  const [selectedRole, setSelectedRole] = useState<string>("RECRUITER");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && jobId) {
      loadData();
    }
  }, [isOpen, jobId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let assignments: JobRecruiterAssignment[] = [];
      let recruitersList: User[] = [];

      try {
        assignments = await recruiterAssignmentApi.listJobRecruiters(jobId);
      } catch (err: any) {
        console.warn("Failed to load current assignments for job:", jobId, err);
      }

      try {
        const users = await usersApi.list(3);
        recruitersList = users.filter(
          (u) => u.role?.name === "Recruiter" || (u as any).role_id === 3
        );
      } catch (err: any) {
        console.error("Failed to load recruiters list:", err);
      }

      setAssigned(assignments);
      setAllRecruiters(recruitersList);
    } catch (err: any) {
      console.error("Failed to load recruiter modal data:", err);
      setError("Failed to load recruiter assignments.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecruiterId) return;

    try {
      setActionLoading(true);
      setError(null);
      await recruiterAssignmentApi.assignRecruiter(jobId, Number(selectedRecruiterId), selectedRole);
      setSelectedRecruiterId("");
      setSelectedRole("RECRUITER");
      await loadData();
      onAssignmentUpdated?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to assign recruiter.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (recruiterId: number, newRole: string) => {
    try {
      setActionLoading(true);
      await recruiterAssignmentApi.updateRole(jobId, recruiterId, newRole);
      await loadData();
      onAssignmentUpdated?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update recruiter role.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (recruiterId: number) => {
    if (!window.confirm("Remove this recruiter from this job requisition?")) return;
    try {
      setActionLoading(true);
      await recruiterAssignmentApi.removeRecruiter(jobId, recruiterId);
      await loadData();
      onAssignmentUpdated?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to remove recruiter.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter out recruiters already actively assigned
  const activelyAssignedIds = new Set(assigned.filter((a) => a.status === "active").map((a) => a.recruiter_id));
  const availableToAssign = allRecruiters.filter((u) => !activelyAssignedIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Manage Job Recruiters
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
              Requisition: <span className="font-semibold text-foreground">{jobTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Add New Recruiter Form */}
          <form onSubmit={handleAssign} className="bg-secondary/40 border border-border/70 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Assign Recruiter to Requisition
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <select
                  value={selectedRecruiterId}
                  onChange={(e) => setSelectedRecruiterId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Select Recruiter...</option>
                  {availableToAssign.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="PRIMARY_RECRUITER">Primary Recruiter</option>
                  <option value="RECRUITER">Recruiter</option>
                  <option value="SOURCER">Sourcer</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading || !selectedRecruiterId}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Assign Recruiter
            </button>
          </form>

          {/* Active Assignments List */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Currently Assigned Recruiters ({assigned.filter((a) => a.status === "active").length})
            </span>

            {loading ? (
              <div className="text-center py-6 text-xs text-muted-foreground">Loading assignments...</div>
            ) : assigned.filter((a) => a.status === "active").length === 0 ? (
              <div className="text-center py-6 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                No recruiters actively assigned to this job yet.
              </div>
            ) : (
              <div className="space-y-2">
                {assigned
                  .filter((a) => a.status === "active")
                  .map((asgn) => (
                    <div
                      key={asgn.id}
                      className="p-3.5 rounded-xl border border-border/80 bg-card flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground truncate">
                            {asgn.recruiter?.name || `Recruiter #${asgn.recruiter_id}`}
                          </span>
                          {asgn.assignment_role === "PRIMARY_RECRUITER" ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Primary Lead
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-muted-foreground border border-border">
                              {asgn.assignment_role}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {asgn.recruiter?.email || "No email"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Role Select */}
                        <select
                          value={asgn.assignment_role}
                          onChange={(e) => handleUpdateRole(asgn.recruiter_id, e.target.value)}
                          disabled={actionLoading}
                          className="text-xs rounded-lg border border-border bg-secondary/50 px-2 py-1 text-foreground"
                        >
                          <option value="PRIMARY_RECRUITER">Primary Recruiter</option>
                          <option value="RECRUITER">Recruiter</option>
                          <option value="SOURCER">Sourcer</option>
                        </select>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemove(asgn.recruiter_id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition"
                          title="Remove recruiter from job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
