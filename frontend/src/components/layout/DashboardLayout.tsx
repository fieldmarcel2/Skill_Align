import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { workflowApi } from "../../services/api";
import { cn } from "../../lib/utils";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut",
  duration: 0.25,
};

export const DashboardLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [actionCenterCount, setActionCenterCount] = useState(0);
  const { user } = useAuth();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Poll for action center count (Recruiter role only)
  useEffect(() => {
    if (!user || user.role.name !== "Recruiter") return;

    const fetchCount = async () => {
      try {
        const data = await workflowApi.getActionCenterCount();
        setActionCenterCount(data.count);
      } catch {
        // Silently fail — count stays at 0
      }
    };

    fetchCount();

    const handleUpdated = () => { fetchCount(); };
    window.addEventListener("action-center-updated", handleUpdated);

    const interval = setInterval(fetchCount, 25_000);
    return () => {
      window.removeEventListener("action-center-updated", handleUpdated);
      clearInterval(interval);
    };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex relative">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          actionCenterCount={actionCenterCount}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />

        <main
          className={cn(
            "flex-1 min-w-0 transition-[padding-left] duration-300 ease-in-out will-change-[padding]",
            "p-3 sm:p-5 md:p-7",
            sidebarCollapsed ? "md:pl-[calc(4rem+1.75rem)]" : "md:pl-[calc(16rem+1.75rem)]"
          )}
        >
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="in"
                exit="out"
                transition={pageTransition}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};
