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
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-outfit text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              Skill<span className="text-primary">Align</span>
            </span>
          </div>
        </Link>

        {/* User profile & actions */}
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl border border-border/50 bg-secondary/40 backdrop-blur-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-tight">{user.name}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{user.email}</span>
              </div>
              {getRoleBadge(user.role.name)}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-muted-foreground hover:text-rose-400 hover:border-rose-500/40"
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
