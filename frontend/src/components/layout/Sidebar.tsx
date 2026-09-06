import React from "react";
import { NavLink } from "react-router-dom";
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
} from "lucide-react";

interface NavItem {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
}) => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role.name;

  let navItems: NavItem[] = [];

  switch (role) {
    case "Admin":
      navItems = [
        { title: "Admin Overview", to: "/admin", icon: LayoutDashboard },
        { title: "User Directory", to: "/admin/users", icon: Users },
        { title: "Master Skills Taxonomy", to: "/admin/skills", icon: Cpu },
      ];
      break;
    case "HR":
      navItems = [
        { title: "HR Dashboard", to: "/hr", icon: LayoutDashboard },
        { title: "Create Job Requisition", to: "/hr/jobs/create", icon: PlusCircle },
        { title: "Hiring Pipeline", to: "/hr/pipeline", icon: Kanban },
        { title: "Shortlisted Candidates", to: "/hr/shortlists", icon: BookmarkCheck },
      ];
      break;
    case "Recruiter":
      navItems = [
        { title: "Recruiter Dashboard", to: "/recruiter", icon: LayoutDashboard },
        { title: "Candidate Pool", to: "/recruiter/candidates", icon: Users },
        { title: "Shortlisted Talents", to: "/recruiter/shortlists", icon: UserCheck },
      ];
      break;
    case "Candidate":
      navItems = [
        { title: "My Dashboard", to: "/candidate", icon: LayoutDashboard },
        { title: "Profile & Resume", to: "/candidate/profile", icon: FileSpreadsheet },
        { title: "My Skills & Experience", to: "/candidate/skills", icon: Layers },
      ];
      break;
  }

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4 space-y-6">
      <div className="space-y-4">
        {/* Mobile Header with Close Button */}
        <div className="flex md:hidden items-center justify-between pb-2 border-b border-border/70">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Navigation Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">
            {role} Workspace
          </h4>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin" || item.to === "/hr" || item.to === "/recruiter" || item.to === "/candidate"}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-semibold"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Role info card at bottom */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-card/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-foreground">Logged in</span>
        </div>
        <p className="text-xs text-muted-foreground truncate font-medium">{user.name}</p>
        <span className="inline-block mt-1 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md font-semibold">
          {user.role.name}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border/80 bg-card/40 backdrop-blur-md flex-col justify-between min-h-[calc(100vh-4rem)]">
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
