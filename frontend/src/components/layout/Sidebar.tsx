import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  ShieldCheck,
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
  collapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed((c) => !c));

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
          section: "Talent Management",
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
          section: "Candidate Workspace",
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
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* ── Top Brand / Collapse Header ───────────────────────────────────── */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3.5 border-b border-border/70 shrink-0 bg-card/40",
        collapsed ? "px-2 justify-center" : ""
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-xl ${rc.solid} flex items-center justify-center shadow-xs`}>
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
            className="md:hidden p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Desktop collapse */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Scrollable Navigation Section ────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/20">
        {navSections.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 px-2.5 mb-2">
                {section.section}
              </h4>
            )}
            <nav className="space-y-1">
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 group relative",
                      collapsed ? "justify-center px-2" : "",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    )
                  }
                >
                  <item.icon
                    className={cn(
                      "shrink-0 transition-transform group-hover:scale-105",
                      collapsed ? "h-5 w-5" : "h-4 w-4"
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge !== undefined && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[9px] font-black px-1 shadow-xs animate-pulse">
                          {Number(item.badge) > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {/* Collapsed badge dot */}
                  {collapsed && item.badge !== undefined && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 shadow-xs animate-pulse" />
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* ── Bottom Fixed User Area + Logout ──────────────────────────────── */}
      <div className={cn(
        "px-3 py-3 space-y-2.5 border-t border-border/70 mt-auto shrink-0 bg-card/85 backdrop-blur-xs",
        collapsed ? "px-2" : ""
      )}>
        {!collapsed ? (
          <>
            {/* User card */}
            <div className={`flex items-center gap-2.5 p-2.5 rounded-2xl border ${rc.border} ${rc.bg}`}>
              <div className={`w-8 h-8 rounded-xl ${rc.solid} flex items-center justify-center text-white font-black text-xs font-outfit shrink-0 shadow-xs`}>
                {getInitials(user.name || "U")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${rc.bg} ${rc.accent} border ${rc.border}`}>
                  {user.role.name}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all group cursor-pointer"
            >
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Sign Out
            </button>
          </>
        ) : (
          <>
            {/* Collapsed avatar */}
            <div
              className={`w-9 h-9 mx-auto rounded-xl ${rc.solid} flex items-center justify-center text-white font-black text-xs font-outfit shadow-xs cursor-default`}
              title={`${user.name} (${user.role.name})`}
            >
              {getInitials(user.name || "U")}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
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
      {/* ── Fixed Desktop Sidebar Shell ────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex fixed top-14 left-0 bottom-0 z-30 flex-col justify-between border-r border-border/80 bg-card/80 backdrop-blur-xl sidebar-transition h-[calc(100vh-3.5rem)]",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile Slide-Over Drawer with Framer Motion ──────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={onClose}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-72 max-w-[82vw] bg-card border-r border-border shadow-2xl z-10 flex flex-col h-full"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
