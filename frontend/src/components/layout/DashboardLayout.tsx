import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { workflowApi } from "../../services/api";

export const DashboardLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [actionCenterCount, setActionCenterCount] = useState(0);
  const { user } = useAuth();

  // Poll and listen for action center count for Recruiter role
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

    // Listen for custom real-time events triggered on action completions
    const handleUpdated = () => {
      fetchCount();
    };
    window.addEventListener("action-center-updated", handleUpdated);

    // Refresh every 25 seconds
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
        />
        <main className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
