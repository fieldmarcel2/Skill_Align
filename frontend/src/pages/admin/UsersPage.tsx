import React, { useEffect, useState } from "react";
import { usersApi } from "../../services/api";
import { User } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
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
} from "lucide-react";

export const UsersPage: React.FC = () => {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Create User Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRoleId, setCreateRoleId] = useState<number>(2); // 2: HR, 3: Recruiter
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (user: User) => {
    try {
      const updated = await usersApi.update(user.id, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(
        `User ${updated.name} has been ${updated.is_active ? "activated" : "deactivated"}.`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update user status.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newUser = await usersApi.create({
        name: createName,
        email: createEmail,
        password: createPassword,
        role_id: Number(createRoleId),
      });
      setUsers((prev) => [newUser, ...prev]);
      toast.success(`Account created for ${newUser.name} (${newUser.role.name}).`);
      setIsCreateOpen(false);
      // Reset form
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(term) ||
      (u.email ? u.email.toLowerCase().includes(term) : false) ||
      (u.phone_number ? u.phone_number.includes(term) : false);
    const matchesRole = roleFilter === "all" || u.role.name.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return <Badge variant="purple"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>;
      case "HR":
        return <Badge variant="info"><Users className="w-3 h-3 mr-1" /> HR</Badge>;
      case "Recruiter":
        return <Badge variant="success"><Briefcase className="w-3 h-3 mr-1" /> Recruiter</Badge>;
      case "Candidate":
        return <Badge variant="warning"><UserCheck className="w-3 h-3 mr-1" /> Candidate</Badge>;
      default:
        return <Badge variant="secondary">{roleName}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View registered accounts and provision new HR & Recruiter team members.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setIsCreateOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add HR or Recruiter
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xl p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="HR">HR</option>
              <option value="Recruiter">Recruiter</option>
              <option value="Candidate">Candidate</option>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Contact (Email / Phone)</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold text-foreground flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{u.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col text-xs">
                      {u.email && <span>{u.email}</span>}
                      {u.phone_number && (
                        <span className="text-muted-foreground/80 font-mono">
                          {u.phone_number}
                        </span>
                      )}
                      {!u.email && !u.phone_number && <span>—</span>}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(u.role.name)}</TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                        <XCircle className="h-3.5 w-3.5" /> Deactivated
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.role.name !== "Admin" && (
                      <Button
                        size="sm"
                        variant={u.is_active ? "outline" : "secondary"}
                        className={
                          u.is_active
                            ? "text-xs text-rose-400 hover:bg-rose-500/10 border-rose-500/30"
                            : "text-xs text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                        }
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provision Team Account</DialogTitle>
            <DialogDescription>
              Create a new HR Manager or Recruiter account with access permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Role</label>
              <select
                value={createRoleId}
                onChange={(e) => setCreateRoleId(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={2}>HR Manager (Matching & Shortlisting)</option>
                <option value={3}>Recruiter (Job Creation & Hiring)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Full Name</label>
              <Input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Address</label>
              <Input
                type="email"
                placeholder="sarah@company.com"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Initial Password</label>
              <Input
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                required
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...
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
