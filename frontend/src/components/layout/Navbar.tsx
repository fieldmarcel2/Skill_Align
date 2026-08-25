import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { LogOut, User as UserIcon, Sparkles, Shield, Briefcase, Users, FileText } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadge = (roleName?: string) => {
    switch (roleName) {
      case "Admin":
        return <Badge variant="purple"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>;
      case "HR":
        return <Badge variant="info"><Users className="w-3 h-3 mr-1" /> HR Manager</Badge>;
      case "Recruiter":
        return <Badge variant="success"><Briefcase className="w-3 h-3 mr-1" /> Recruiter</Badge>;
      case "Candidate":
        return <Badge variant="warning"><FileText className="w-3 h-3 mr-1" /> Candidate</Badge>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-outfit text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Skill<span className="text-indigo-600">Align</span>
            </span>
          </div>
        </Link>

        {/* User profile & actions */}
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</span>
                <span className="text-[10px] text-slate-500 leading-tight">{user.email}</span>
              </div>
              {getRoleBadge(user.role.name)}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="default" size="sm">
                Candidate Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
