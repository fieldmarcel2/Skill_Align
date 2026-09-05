import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi, usersApi } from "../../services/api";
import { User, PaginatedUsersResponse, AdminStats } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Briefcase,
  UserCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  UserPlus,
  ExternalLink,
  Mail,
  Phone,
  Calendar,
  Copy,
  Check,
  Activity,
  UserCog,
  Sparkles,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const PAGE_SIZE = 10;

export const UsersPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  // Pagination + filter state
  const [data, setData] = useState<PaginatedUsersResponse | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Debounce ref for search
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create User Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRoleId, setCreateRoleId] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete User state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await adminApi.deleteUser(userToDelete.id);
      toast.success(res.message || "User permanently deleted.", "User Removed");
      setUserToDelete(null);
      fetchStats();
      fetchUsers(currentPage, searchTerm, roleFilter, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to remove user.", "Error");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchStats = async () => {
    try {
      const s = await usersApi.getStats();
      setStats(s);
    } catch {
      // Non-critical
    }
  };

  const fetchUsers = useCallback(
    async (page: number, search: string, role: string, status: string) => {
      setIsLoading(true);
      try {
        const params: Record<string, any> = {
          page,
          page_size: PAGE_SIZE,
        };
        if (search.trim()) params.search = search.trim();
        if (role !== "all") params.role = role;
        if (status !== "all") params.status = status;

        const result = await adminApi.listUsers(params);
        setData(result);
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to load users.");
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchStats();
  }, []);

  // Initial + page change
  useEffect(() => {
    fetchUsers(currentPage, searchTerm, roleFilter, statusFilter);
  }, [currentPage, roleFilter, statusFilter, fetchUsers]);

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setCurrentPage(1);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchUsers(1, val, roleFilter, statusFilter);
    }, 300);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    fetchUsers(1, "", roleFilter, statusFilter);
  };

  const handleRoleSelect = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleToggleStatus = async (user: User) => {
    setTogglingId(user.id);
    try {
      const updated = await adminApi.toggleUserStatus(user.id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((u) => (u.id === updated.id ? updated : u)),
        };
      });
      toast.success(
        `${updated.name} has been ${updated.is_active ? "activated" : "deactivated"}.`
      );
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to toggle user status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let formattedPhone = createPhone.trim();
      if (formattedPhone && /^\d{10}$/.test(formattedPhone)) {
        formattedPhone = `+91${formattedPhone}`;
      }

      await usersApi.create({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role_id: Number(createRoleId),
        phone_number: formattedPhone || undefined,
      });
      toast.success(`Account created successfully.`);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePhone("");
      setCreatePassword("");
      fetchStats();
      fetchUsers(currentPage, searchTerm, roleFilter, statusFilter);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let msg = "Failed to create user.";
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail
          .map((d: any) => (d.msg || JSON.stringify(d)).replace(/^Value error,\s*/i, ""))
          .join(", ");
      } else if (err.message) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return <Badge variant="purple" className="gap-1"><Shield className="w-3 h-3" /> Admin</Badge>;
      case "HR":
        return <Badge variant="info" className="gap-1"><Users className="w-3 h-3" /> HR</Badge>;
      case "Recruiter":
        return <Badge variant="success" className="gap-1"><Briefcase className="w-3 h-3" /> Recruiter</Badge>;
      case "Candidate":
        return <Badge variant="warning" className="gap-1"><UserCheck className="w-3 h-3" /> Candidate</Badge>;
      default:
        return <Badge variant="secondary">{roleName}</Badge>;
    }
  };

  const totalPages = data?.total_pages ?? 1;
  const totalItems = data?.total_items ?? 0;
  const users = data?.data ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="h-7 w-7 text-primary" /> User Directory & Access Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete platform directory with verified emails, phones, and role-based access management.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          variant="gradient"
          className="gap-2 shadow-lg shadow-indigo-500/20 shrink-0"
        >
          <UserPlus className="h-4 w-4" /> Provision Account
        </Button>
      </div>

      {/* Overview Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl border border-border/70 bg-card/70 backdrop-blur-xl space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Total Accounts</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-foreground">{stats.total_users}</p>
            <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <Activity className="h-2.5 w-2.5" /> {stats.active_users} active
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card/70 backdrop-blur-xl space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Candidates</span>
              <UserCheck className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-foreground">{stats.candidates}</p>
            <p className="text-[10px] text-muted-foreground">Talent pool</p>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card/70 backdrop-blur-xl space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Recruiters</span>
              <Briefcase className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-foreground">{stats.recruiters}</p>
            <p className="text-[10px] text-muted-foreground">Requisitions</p>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card/70 backdrop-blur-xl space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">HR Managers</span>
              <Sparkles className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-foreground">{stats.hr_users}</p>
            <p className="text-[10px] text-muted-foreground">Evaluators</p>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card/70 backdrop-blur-xl space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Skills Taxonomy</span>
              <Shield className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-extrabold font-outfit text-foreground">{stats.total_skills}</p>
            <p className="text-[10px] text-muted-foreground">Canonical skills</p>
          </div>
        </div>
      )}

      {/* Role Tabs and Search Bar */}
      <Card className="p-4 border-border/80 bg-card/70 backdrop-blur-xl space-y-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/50">
          {[
            { id: "all", label: "All Roles", icon: Users },
            { id: "Candidate", label: "Candidates", icon: UserCheck },
            { id: "Recruiter", label: "Recruiters", icon: Briefcase },
            { id: "HR", label: "HR Managers", icon: Sparkles },
            { id: "Admin", label: "Administrators", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleRoleSelect(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs shadow-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter Controls */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="user-search"
              type="text"
              placeholder="Search users by name, email, or phone number..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-9 pr-8 bg-background/50"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              id="user-status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="h-10 px-3 rounded-lg border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-secondary/30">
                <TableHead className="font-bold text-foreground">User Name</TableHead>
                <TableHead className="font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-indigo-400" /> Email Address
                  </span>
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> Phone Number
                  </span>
                </TableHead>
                <TableHead className="font-bold text-foreground">Role</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Registered
                  </span>
                </TableHead>
                <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 opacity-40 text-muted-foreground" />
                      <p>No user records found matching your query.</p>
                      {searchTerm && (
                        <Button variant="ghost" size="sm" onClick={clearSearch} className="text-xs">
                          Clear search filter
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-secondary/20 transition-colors">
                    {/* User Name with Initial Avatar */}
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-primary text-xs font-extrabold font-outfit shadow-xs shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground leading-tight font-outfit">{u.name}</p>
                          <span className="text-[10px] text-muted-foreground">ID #{u.id}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email Address with Click to Copy */}
                    <TableCell>
                      {u.email ? (
                        <div className="flex items-center gap-1.5 group">
                          <a
                            href={`mailto:${u.email}`}
                            className="text-xs text-foreground/90 hover:text-primary transition-colors font-medium"
                          >
                            {u.email}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(u.email!, "Email")}
                            title="Copy email address"
                            className="text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          >
                            {copiedText === u.email ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No email</span>
                      )}
                    </TableCell>

                    {/* Phone Number with Click to Copy */}
                    <TableCell>
                      {u.phone_number ? (
                        <div className="flex items-center gap-1.5 group">
                          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-secondary/80 text-foreground/90 border border-border/50">
                            {u.phone_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(u.phone_number!, "Phone number")}
                            title="Copy phone number"
                            className="text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          >
                            {copiedText === u.phone_number ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No phone</span>
                      )}
                    </TableCell>

                    {/* Role Badge */}
                    <TableCell>{getRoleBadge(u.role.name)}</TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" /> Deactivated
                        </span>
                      )}
                    </TableCell>

                    {/* Registered Date */}
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>

                    {/* Actions: View Details + Toggle Status */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          id={`view-user-${u.id}`}
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 gap-1"
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                        >
                          <ExternalLink className="h-3 w-3" /> View
                        </Button>
                        {u.role.name !== "Admin" ? (
                          <>
                            <Button
                              id={`toggle-user-${u.id}`}
                              size="sm"
                              variant={u.is_active ? "outline" : "secondary"}
                              className={
                                u.is_active
                                  ? "text-xs h-7 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/30"
                                  : "text-xs h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30"
                              }
                              disabled={togglingId === u.id}
                              onClick={() => handleToggleStatus(u)}
                            >
                              {togglingId === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : u.is_active ? (
                                "Deactivate"
                              ) : (
                                "Activate"
                              )}
                            </Button>

                            <Button
                              id={`delete-user-${u.id}`}
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/30 gap-1 px-2.5"
                              onClick={() => setUserToDelete(u)}
                              title="Permanently remove user"
                            >
                              <Trash2 className="h-3 w-3" /> Remove
                            </Button>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic px-2">Protected</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 bg-secondary/10">
              <p className="text-xs text-muted-foreground font-medium">
                Showing {users.length} of {totalItems} total users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  id="pagination-prev"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground font-medium px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  id="pagination-next"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Provision Account Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl">Provision Team Account</DialogTitle>
            <DialogDescription>
              Create a new HR Manager or Recruiter account with verified email and phone number.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role Privilege *</label>
              <select
                value={createRoleId}
                onChange={(e) => setCreateRoleId(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={2}>HR Manager</option>
                <option value={3}>Recruiter</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name *</label>
              <Input
                type="text"
                placeholder="e.g. Alex Morgan"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email Address *</label>
                <Input
                  type="email"
                  placeholder="alex@company.com"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Temporary Password *</label>
              <Input
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 digit"
                required
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Must be at least 8 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 digit.
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Provisioning...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-400 mb-1">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-outfit text-foreground">
                  Permanently Remove User
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  This action is irreversible and purges all related candidate data.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {userToDelete && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-2.5 my-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{userToDelete.name}</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                  {userToDelete.role.name}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p>Email: {userToDelete.email || <span className="italic">None</span>}</p>
                <p>Phone: {userToDelete.phone_number || <span className="italic">None</span>}</p>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>
                  All candidate profiles, uploaded resumes, skill mappings, match records, and evaluations associated with this user will be deleted permanently.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUserToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" /> Confirm Permanent Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
