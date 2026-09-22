import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SkillAlignLogo } from "../common/SkillAlignLogo";
import {
  LogOut,
  Shield,
  Briefcase,
  Users,
  FileText,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Settings,
  UserCircle,
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
  const { theme, toggleTheme, isDark } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleBadge = (roleName?: string) => {
    switch (roleName) {
      case "Admin":
        return (
          <Badge variant="purple" className="text-[10px] px-2 py-0.5 font-bold shadow-xs hidden sm:inline-flex">
            <Shield className="w-2.5 h-2.5 mr-1" /> Admin
          </Badge>
        );
      case "HR":
        return (
          <Badge variant="info" className="text-[10px] px-2 py-0.5 font-bold shadow-xs hidden sm:inline-flex">
            <Users className="w-2.5 h-2.5 mr-1" /> Hiring Manager
          </Badge>
        );
      case "Recruiter":
        return (
          <Badge variant="success" className="text-[10px] px-2 py-0.5 font-bold shadow-xs hidden sm:inline-flex">
            <Briefcase className="w-2.5 h-2.5 mr-1" /> Recruiter
          </Badge>
        );
      case "Candidate":
        return (
          <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold shadow-xs hidden sm:inline-flex">
            <FileText className="w-2.5 h-2.5 mr-1" /> Candidate
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-xl shadow-sm transition-all">
      {/* Enterprise top accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 via-violet-500/40 to-blue-500/30" />

      <div className="w-full flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── LEFT: Mobile Hamburger + Brand Logo ─────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user && onToggleMobileMenu && (
            <motion.button
              type="button"
              onClick={onToggleMobileMenu}
              whileTap={{ scale: 0.9 }}
              className="md:hidden p-2 rounded-xl text-foreground/70 hover:text-foreground hover:bg-secondary/80 focus:outline-none transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5 text-primary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}

          <Link
            to="/"
            className="flex items-center gap-2 focus:outline-none focus-ring rounded-xl"
          >
            <SkillAlignLogo size="sm" showBadge={false} />
          </Link>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── RIGHT: Theme Toggle + User Profile ───────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto lg:ml-0">

          {/* Dark / Light Mode Toggle */}
          <motion.button
            type="button"
            onClick={toggleTheme}
            whileTap={{ scale: 0.85, rotate: 15 }}
            whileHover={{ scale: 1.05 }}
            className="theme-toggle"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="h-4 w-4 text-amber-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="h-4 w-4 text-indigo-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {user ? (
            <>
              {/* User Profile Card */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-2xl border border-border/80 bg-card/80 shadow-xs hover:border-primary/30 hover:bg-card transition-all cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-primary to-violet-600 text-white text-xs font-black shadow-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
                  </div>

                  {/* Name + Role */}
                  <div className="hidden sm:flex flex-col text-left max-w-[130px]">
                    <span className="text-xs font-bold text-foreground leading-tight truncate">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {user.role?.name || "Member"}
                    </span>
                  </div>

                  {getRoleBadge(user.role?.name)}

                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showUserMenu ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 w-52 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
                      >
                        {/* User info header */}
                        <div className="px-3 py-3 border-b border-border bg-muted/30">
                          <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {user.email || user.phone_number || ""}
                          </p>
                        </div>
                        {/* Actions */}
                        <div className="p-1.5 space-y-0.5">
                          <button
                            onClick={() => { logout?.(); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-xs h-9 px-3.5 rounded-xl font-semibold">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="default" size="sm" className="text-xs h-9 px-4 rounded-xl font-bold shadow-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
