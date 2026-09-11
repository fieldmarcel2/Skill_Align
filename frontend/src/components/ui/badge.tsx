import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary border-primary/25 dark:bg-primary/20 dark:text-indigo-200 font-medium",
        secondary:
          "bg-secondary text-secondary-foreground border-border font-medium",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/25 dark:bg-destructive/20 dark:text-rose-200 font-medium",
        outline:
          "text-foreground border-border bg-background/80 font-medium",
        success:
          "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-200 font-medium",
        warning:
          "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:bg-amber-500/20 dark:text-amber-200 font-medium",
        info:
          "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:bg-blue-500/20 dark:text-blue-200 font-medium",
        purple:
          "bg-purple-500/10 text-purple-700 border-purple-500/25 dark:bg-purple-500/20 dark:text-purple-200 font-medium",
        indigo:
          "bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:bg-indigo-500/20 dark:text-indigo-200 font-medium",
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
