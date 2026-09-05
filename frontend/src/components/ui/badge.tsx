import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm",
        secondary:
          "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
        destructive:
          "bg-rose-50 text-rose-700 border-rose-200",
        outline: "text-slate-700 border-slate-300 bg-white/80",
        success:
          "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium",
        warning:
          "bg-amber-50 text-amber-800 border-amber-200 font-medium",
        info: "bg-blue-50 text-blue-700 border-blue-200 font-medium",
        purple:
          "bg-purple-50 text-purple-700 border-purple-200 font-medium",
        indigo:
          "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
