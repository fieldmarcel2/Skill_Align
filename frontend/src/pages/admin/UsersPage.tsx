import React, { useEffect, useState, useCallback, useRef } from "react";
import { usersApi, adminApi } from "../../services/api";
import { User, PaginatedUsersResponse } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
  UserPlus,
  Search,
  Shield,
  Briefcase,
  UserCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Copy,
  Check,
  Calendar,
  Filter,
} from "lucide-react";

const PAGE_SIZE = 15;

export const UsersPage: React.FC = () => {
  const toast = useToast();

  // Pagination + filter state
  const [data, setData] = useState<PaginatedUsersResponse | null>(null);
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
  const [createPassword, setCreatePassword] = useState("");
  const [createRoleId, setCreateRoleId] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    []
  );

  // Initial + page change
  useEffect(() => {
    fetchUsers(currentPage, searchTerm, roleFilter, statusFilter);
  }, [currentPage, roleFilter, statusFilter]);

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

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
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
      await usersApi.create({
        name: createName,
        email: createEmail,
        password: createPassword,
        role_id: Number(createRoleId),
      });
      toast.success(`Account created successfully.`);
      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      // Refresh current page
      fetchUsers(currentPage, searchTerm, roleFilter, statusFilter);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create user.");
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
            Industry-standard administrative console to inspect credentials, enforce role policies, and manage active accounts.
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

      {/* Filter and Search Bar */}
      <Card className="p-4 border-border/80 bg-card/70 backdrop-blur-xl">
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
              className="pl-9 bg-background/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Role filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:inline" />
              <select
                id="user-role-filter"
                value={roleFilter}
                onChange={handleRoleChange}
                className="h-10 px-3 rounded-lg border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="HR">HR</option>
                <option value="Recruiter">Recruiter</option>
                <option value="Candidate">Candidate</option>
              </select>
            </div>

            {/* Status filter */}
            <select
              id="user-status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="h-10 px-3 rounded-lg border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shrink-0"
            >
              <option value="all">All Status</option>
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
        <Card className="border-border/80 bg-card/70 backdrop-blur-xl overflow-hidden">
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
                <TableHead className="text-right font-bold text-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 opacity-40 text-muted-foreground" />
                      <p>No user records found matching your query.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-secondary/20 transition-colors">
                    {/* User Name with Initial Avatar */}
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 text-primary text-xs font-extrabold font-outfit shadow-xs">
                          {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground leading-tight">{u.name}</p>
                          <span className="text-[10px] text-muted-foreground">ID #{u.id}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Column 1: Email Address */}
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

                    {/* Column 2: Phone Number */}
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
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          Deactivated
                        </span>
                      )}
                    </TableCell>

                    {/* Registered Date */}
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>

                    {/* Actions: Toggle Status */}
                    <TableCell className="text-right">
                      {u.role.name !== "Admin" ? (
                        <Button
                          id={`toggle-user-${u.id}`}
                          size="sm"
                          variant={u.is_active ? "outline" : "secondary"}
                          className={
                            u.is_active
                              ? "text-xs h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
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
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic px-2">Protected</span>
                      )}
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

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision Team Account</DialogTitle>
            <DialogDescription>
              Create a new HR Manager or Recruiter account with defined role privileges.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role Privilege</label>
              <select
                value={createRoleId}
                onChange={(e) => setCreateRoleId(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={2}>HR Manager</option>
                <option value={3}>Recruiter</option>
                <option value={1}>Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name</label>
              <Input
                type="text"
                placeholder="e.g. Alex Morgan"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Address</label>
              <Input
                type="email"
                placeholder="alex@company.com"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Temporary Password</label>
              <Input
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 digit"
                required
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
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
    </div>
  );
};
