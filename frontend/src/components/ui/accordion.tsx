import React, { createContext, useContext, useState } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionContextType {
  openItem: string | null;
  toggleItem: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

export interface AccordionProps {
  children: React.ReactNode;
  defaultValue?: string;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  defaultValue = null,
  className = "",
}) => {
  const [openItem, setOpenItem] = useState<string | null>(defaultValue);

  const toggleItem = (value: string) => {
    setOpenItem((prev) => (prev === value ? null : value));
  };

  return (
    <AccordionContext.Provider value={{ openItem, toggleItem }}>
      <div className={`space-y-3 ${className}`}>{children}</div>
    </AccordionContext.Provider>
  );
};

export interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  value,
  children,
  className = "",
}) => {
  return (
    <div
      data-item={value}
      className={`rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl overflow-hidden transition-all duration-200 shadow-xs ${className}`}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { value });
        }
        return child;
      })}
    </div>
  );
};

export interface AccordionTriggerProps {
  value?: string;
  children: React.ReactNode;
  className?: string;
}

export const AccordionTrigger: React.FC<AccordionTriggerProps> = ({
  value,
  children,
  className = "",
}) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error("AccordionTrigger must be used within an Accordion");

  const isOpen = context.openItem === value;

  return (
    <button
      type="button"
      onClick={() => value && context.toggleItem(value)}
      className={`w-full flex items-center justify-between p-5 text-left font-outfit text-base font-bold text-foreground hover:text-primary transition-colors focus:outline-none ${className}`}
    >
      <span>{children}</span>
      <ChevronDown
        className={`h-4 w-4 text-muted-foreground transition-transform duration-300 shrink-0 ml-4 ${
          isOpen ? "rotate-180 text-primary" : ""
        }`}
      />
    </button>
  );
};

export interface AccordionContentProps {
  value?: string;
  children: React.ReactNode;
  className?: string;
}

export const AccordionContent: React.FC<AccordionContentProps> = ({
  value,
  children,
  className = "",
}) => {
  const context = useContext(AccordionContext);
  if (!context) throw new Error("AccordionContent must be used within an Accordion");

  const isOpen = context.openItem === value;

  if (!isOpen) return null;

  return (
    <div
      className={`px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200 border-t border-border/40 ${className}`}
    >
      {children}
    </div>
  );
};
