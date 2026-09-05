import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export const DashboardLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        />
        <main className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
