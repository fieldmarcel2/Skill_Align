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
  Kanban,
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
        { title: "Hiring Pipeline", to: "/hr/pipeline", icon: Kanban },
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
    <aside className="w-64 shrink-0 border-r border-slate-200/80 bg-white flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
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
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-800">Logged in as</span>
        </div>
        <p className="text-xs text-slate-500 truncate">{user.name}</p>
        <span className="inline-block mt-1 text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
          {user.role.name}
        </span>
      </div>
    </aside>
  );
};
