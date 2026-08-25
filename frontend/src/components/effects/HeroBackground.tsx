import React from "react";

export const HeroBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e130_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e130_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Radiant Soft Glow Spots */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-purple-500/08 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[400px] rounded-full bg-blue-500/08 blur-[150px] pointer-events-none" />

      {/* Main Content Layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
