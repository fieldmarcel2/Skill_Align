import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-semibold",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-semibold",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/80 font-medium",
        outline:
          "border border-border bg-background hover:bg-muted text-foreground font-medium shadow-sm",
        ghost:
          "hover:bg-muted hover:text-foreground text-foreground/80 font-medium",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 font-semibold",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 font-semibold",
        warning:
          "bg-amber-600 text-white shadow-sm hover:bg-amber-700 font-semibold",
        link:
          "text-primary underline-offset-4 hover:underline font-medium p-0 h-auto",
        gradient:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-semibold",
        glass:
          "bg-card/90 hover:bg-card text-foreground border border-border shadow-sm font-medium",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
