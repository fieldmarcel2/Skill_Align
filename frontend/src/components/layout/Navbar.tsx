import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SkillAlignLogo } from "../common/SkillAlignLogo";
import {
  LogOut,
  Sparkles,
  Shield,
  Briefcase,
  Users,
  FileText,
  Menu,
  X,
} from "lucide-react";

interface NavbarProps {
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (roleName?: string) => {
    switch (roleName) {
      case "Admin":
        return <Badge variant="purple" className="text-[10px] px-1.5 py-0.5"><Shield className="w-2.5 h-2.5 mr-1" /> Admin</Badge>;
      case "HR":
        return <Badge variant="info" className="text-[10px] px-1.5 py-0.5"><Users className="w-2.5 h-2.5 mr-1" /> HR</Badge>;
      case "Recruiter":
        return <Badge variant="success" className="text-[10px] px-1.5 py-0.5"><Briefcase className="w-2.5 h-2.5 mr-1" /> Recruiter</Badge>;
      case "Candidate":
        return <Badge variant="warning" className="text-[10px] px-1.5 py-0.5"><FileText className="w-2.5 h-2.5 mr-1" /> Candidate</Badge>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-xl shadow-xs">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6">
        {/* Left Side: Mobile Hamburger + Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-foreground/80 hover:text-foreground hover:bg-secondary/80 focus:outline-none transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-primary" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          )}

          <SkillAlignLogo size="sm" showBadge={false} />
        </div>

        {/* User profile & actions */}
        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 pl-2 pr-1.5 sm:pl-3 sm:pr-2 py-1 rounded-xl border border-border/70 bg-card/60">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-primary text-xs font-bold">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">{user.name}</span>
                <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
                  {user.email || user.phone_number || ""}
                </span>
              </div>
              <div className="hidden xs:block">
                {getRoleBadge(user.role.name)}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-xs h-8 px-2 sm:px-3 text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="default" size="sm" className="text-xs h-8 px-3">
                Register
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
