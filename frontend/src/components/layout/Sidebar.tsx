import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  Users,
  Cpu,
  PlusCircle,
  BookmarkCheck,
  UserCheck,
  Layers,
  FileSpreadsheet,
  Kanban,
  X,
  Inbox,
  CheckSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";

interface NavItem {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  section?: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  actionCenterCount?: number;
}

const roleConfig: Record<string, { solid: string; accent: string; bg: string; border: string }> = {
  Admin: {
    solid: "bg-purple-600 text-white",
    accent: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  HR: {
    solid: "bg-blue-600 text-white",
    accent: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  Recruiter: {
    solid: "bg-emerald-600 text-white",
    accent: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  Candidate: {
    solid: "bg-amber-600 text-white",
    accent: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  actionCenterCount = 0,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const role = user.role.name;
  const rc = roleConfig[role] || roleConfig.Admin;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  let navSections: { section: string; items: NavItem[] }[] = [];

  switch (role) {
    case "Admin":
      navSections = [
        {
          section: "Administration",
          items: [
            { title: "Admin Overview", to: "/admin", icon: LayoutDashboard },
            { title: "User Directory", to: "/admin/users", icon: Users },
            { title: "Skills Taxonomy", to: "/admin/skills", icon: Cpu },
          ],
        },
      ];
      break;
    case "HR":
      navSections = [
        {
          section: "Workspace",
          items: [
            { title: "HR Dashboard", to: "/hr", icon: LayoutDashboard },
            { title: "Recruiter Decision Calls", to: "/hr/decisions", icon: CheckSquare },
            { title: "Create Job Requisition", to: "/hr/jobs/create", icon: PlusCircle },
          ],
        },
        {
          section: "Pipeline",
          items: [
            { title: "Hiring Pipeline", to: "/hr/pipeline", icon: Kanban },
            { title: "Shortlisted Candidates", to: "/hr/shortlists", icon: BookmarkCheck },
          ],
        },
      ];
      break;
    case "Recruiter":
      navSections = [
        {
          section: "Workspace",
          items: [
            { title: "Recruiter Dashboard", to: "/recruiter", icon: LayoutDashboard },
            {
              title: "Action Center",
              to: "/recruiter/action-center",
              icon: Inbox,
              badge: actionCenterCount > 0 ? actionCenterCount : undefined,
            },
          ],
        },
        {
          section: "Talent",
          items: [
            { title: "Candidate Pool", to: "/recruiter/candidates", icon: Users },
            { title: "Shortlisted Talents", to: "/recruiter/shortlists", icon: UserCheck },
          ],
        },
      ];
      break;
    case "Candidate":
      navSections = [
        {
          section: "My Space",
          items: [
            { title: "My Dashboard", to: "/candidate", icon: LayoutDashboard },
            { title: "My Hiring / Onboarding", to: "/candidate/hiring", icon: UserCheck },
            { title: "Profile & Resume", to: "/candidate/profile", icon: FileSpreadsheet },
            { title: "My Skills & Experience", to: "/candidate/skills", icon: Layers },
          ],
        },
      ];
      break;
  }

  const handleLogout = () => {
    logout?.();
    navigate("/login");
    onClose?.();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Top Brand Header ──────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-4 py-4 border-b border-border/70 ${collapsed ? "px-2" : ""}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${rc.solid} flex items-center justify-center shadow-sm`}>
              <Briefcase className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-outfit font-black text-sm text-foreground tracking-tight">SkillAlign</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Desktop collapse */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-none">
        {navSections.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">
                {section.section}
              </h4>
            )}
            <nav className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={
                    item.to === "/admin" ||
                    item.to === "/hr" ||
                    item.to === "/recruiter" ||
                    item.to === "/candidate"
                  }
                  onClick={() => onClose?.()}
                  title={collapsed ? item.title : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                      collapsed ? "justify-center px-2" : "",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    )
                  }
                >
                  <item.icon
                    className={cn(
                      "shrink-0 transition-transform group-hover:scale-110",
                      collapsed ? "h-5 w-5" : "h-4 w-4"
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge !== undefined && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[9px] font-extrabold px-1 shadow-sm animate-pulse">
                          {Number(item.badge) > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {/* Collapsed badge dot */}
                  {collapsed && item.badge !== undefined && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 shadow-sm animate-pulse" />
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* ── User Info Card + Logout ────────────────────────────────────────── */}
      <div className={`px-3 pb-4 space-y-2 border-t border-border/70 pt-3`}>
        {!collapsed ? (
          <>
            {/* User card */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${rc.border} ${rc.bg}`}>
              <div className={`w-8 h-8 rounded-full ${rc.solid} flex items-center justify-center text-white font-bold text-xs font-outfit shrink-0 shadow-sm`}>
                {getInitials(user.name || "U")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                </div>
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${rc.bg} ${rc.accent} border ${rc.border}`}>
                  {user.role.name}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
            >
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Sign Out
            </button>
          </>
        ) : (
          <>
            {/* Collapsed avatar */}
            <div
              className={`w-9 h-9 mx-auto rounded-full ${rc.solid} flex items-center justify-center text-white font-bold text-xs font-outfit shadow-sm cursor-default`}
              title={user.name}
            >
              {getInitials(user.name || "U")}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex shrink-0 border-r border-border/80 bg-card/50 backdrop-blur-md flex-col justify-between min-h-[calc(100vh-4rem)] transition-all duration-300",
          collapsed ? "w-[60px]" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={onClose}
          />
          {/* Drawer content */}
          <aside className="relative w-72 max-w-[80vw] bg-card border-r border-border shadow-2xl z-10 flex flex-col h-full animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
