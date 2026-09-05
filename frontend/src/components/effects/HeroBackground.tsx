import React from "react";

export const HeroBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Precision Grid Linings - Clear, architectural, and visible */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.18)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_85%_65%_at_50%_0%,#000_80%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.25)_1px,transparent_1px)] bg-[size:7rem_7rem] pointer-events-none opacity-70" />

      {/* Radiant Soft Glow Spots */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-500/18 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-purple-500/14 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[400px] rounded-full bg-blue-500/14 blur-[150px] pointer-events-none" />

      {/* Main Content Layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
