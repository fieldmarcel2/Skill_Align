import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  Users,
  Cpu,
  Briefcase,
  PlusCircle,
  Sparkles,
  BookmarkCheck,
  UserCheck,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

interface NavItem {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role.name;

  let navItems: NavItem[] = [];

  switch (role) {
    case "Admin":
      navItems = [
        { title: "Admin Overview", to: "/admin", icon: LayoutDashboard },
        { title: "User Management", to: "/admin/users", icon: Users },
        { title: "Master Skills Taxonomy", to: "/admin/skills", icon: Cpu },
      ];
      break;
    case "HR":
      navItems = [
        { title: "HR Dashboard", to: "/hr", icon: LayoutDashboard },
        { title: "Shortlisted Candidates", to: "/hr/shortlists", icon: BookmarkCheck },
      ];
      break;
    case "Recruiter":
      navItems = [
        { title: "Recruiter Dashboard", to: "/recruiter", icon: LayoutDashboard },
        { title: "Post New Job", to: "/recruiter/jobs/create", icon: PlusCircle },
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

  return (
    <aside className="w-64 shrink-0 border-r border-border/60 bg-card/40 backdrop-blur-xl flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
            {role} Portal
          </h4>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin" || item.to === "/hr" || item.to === "/recruiter" || item.to === "/candidate"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-indigo-500/20 font-semibold"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
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
      <div className="p-3.5 rounded-xl border border-border/50 bg-secondary/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-foreground">Logged in as</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.name}</p>
        <span className="inline-block mt-1 text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
          {user.role.name}
        </span>
      </div>
    </aside>
  );
};
