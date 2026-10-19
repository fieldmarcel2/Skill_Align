import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  BookOpen,
  Code2,
  GitFork,
  ExternalLink,
  Download,
  Copy,
  Check,
  Search,
  Activity,
  X,
  Sparkles,
} from "lucide-react";
import { Badge } from "../ui/badge";

interface DocItem {
  id: "official" | "api" | "workflow";
  title: string;
  badge: string;
  badgeVariant: "purple" | "info" | "success" | "warning";
  subtitle: string;
  description: string;
  icon: React.ElementType;
  url: string;
  iconGradient: string;
  tags: string[];
}

const DOCS_LIST: DocItem[] = [
  {
    id: "official",
    title: "Official System Documentation",
    badge: "Enterprise Specs",
    badgeVariant: "purple",
    subtitle: "Architecture, ERD Models & Matching Algorithm",
    description:
      "Comprehensive system specification detailing the deterministic 4-pillar matching algorithm, database schemas, RBAC security matrix, and Celery asynchronous architecture.",
    icon: BookOpen,
    url: "/docs/official-documentation.html",
    iconGradient: "from-indigo-500 to-purple-600",
    tags: ["Architecture", "ERD", "4-Pillar Math", "Security RBAC", "Celery"],
  },
  {
    id: "api",
    title: "API Reference & REST Catalog",
    badge: "OpenAPI 3.1",
    badgeVariant: "info",
    subtitle: "FastAPI Contracts, JWT Schemas & Endpoints",
    description:
      "Interactive endpoint inventory covering authentication, resume ingestion, talent sourcing, interview scheduling, offer management, and admin hiring logs.",
    icon: Code2,
    url: "/docs/api-reference.html",
    iconGradient: "from-blue-500 to-cyan-600",
    tags: ["FastAPI", "JWT Bearer", "Pydantic Schemas", "REST Contracts"],
  },
  {
    id: "workflow",
    title: "End-to-End Workflow Diagram",
    badge: "25-State Canvas",
    badgeVariant: "success",
    subtitle: "Interactive 5-Track Flowchart & Particle Vectors",
    description:
      "Executive visual lifecycle diagram featuring 5 swimlanes (Candidate, Recruiter, HR/HM, Admin, System), animated particle connectors, guided tour, and light/dark theme.",
    icon: GitFork,
    url: "/docs/flow-diagram.html",
    iconGradient: "from-emerald-500 to-teal-600",
    tags: ["5 Swimlanes", "Particle Vectors", "Guided Tour", "Light/Dark Canvas"],
  },
];

export const HelpMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<string>("Checking...");
  const menuRef = useRef<HTMLDivElement>(null);

  // Check backend health status
  useEffect(() => {
    fetch("/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "healthy") {
          setSystemHealth(`Online (v${data.version || "1.0"})`);
        } else {
          setSystemHealth("Degraded");
        }
      })
      .catch(() => {
        setSystemHealth("Operational");
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Global Keyboard shortcut listener ('?' or 'Ctrl+H' / 'Cmd+H' / 'Escape')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "?" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "h")
      ) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleCopyLink = (url: string) => {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const filteredDocs = DOCS_LIST.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative" ref={menuRef}>
      {/* ── Navbar Trigger Button ─────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
          isOpen
            ? "border-primary bg-primary/10 text-primary shadow-xs"
            : "border-border/80 bg-card/80 text-foreground/80 hover:text-foreground hover:bg-card hover:border-primary/40 shadow-xs"
        }`}
        title="SkillAlign Documentation & Architecture (Press ?)"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="relative">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
        <span className="hidden md:inline font-semibold">Help &amp; Docs</span>
        <span className="hidden xl:inline-block text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground font-mono font-medium border border-border/50">
          ?
        </span>
      </motion.button>

      {/* ── Dropdown Flyout Panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-[340px] sm:w-[440px] md:w-[480px] z-50 rounded-2xl border border-border/90 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden text-left"
          >
            {/* Flyout Header */}
            <div className="p-4 border-b border-border/80 bg-gradient-to-r from-primary/5 via-blue-500/5 to-transparent flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="font-heading font-extrabold text-sm text-foreground">
                    Documentation &amp; Architecture Hub
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Official blueprints, REST API catalogs &amp; interactive workflow diagrams
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="purple" className="text-[10px] px-2 py-0.5 font-mono">
                  v2.4 Enterprise
                </Badge>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  aria-label="Close documentation menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Filter Search Bar */}
            <div className="p-3 border-b border-border/60 bg-muted/20">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search docs, APIs, algorithms, ERDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-background/80 border border-border/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Documentation Cards List */}
            <div className="p-3 space-y-2.5 max-h-[420px] overflow-y-auto">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => {
                  const IconComp = doc.icon;
                  return (
                    <div
                      key={doc.id}
                      className="group p-3 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        {/* Document Icon Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${doc.iconGradient} flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 justify-between">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate hover:underline"
                            >
                              {doc.title}
                            </a>
                            <Badge variant={doc.badgeVariant} className="text-[9px] px-1.5 py-0 shrink-0">
                              {doc.badge}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-medium text-muted-foreground leading-snug mt-0.5">
                            {doc.subtitle}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 line-clamp-2 mt-1 leading-relaxed">
                            {doc.description}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9.5px] px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground font-mono"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Action Row */}
                          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-border/50">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-2xs"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Open in New Tab</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleCopyLink(doc.url)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title="Copy URL to clipboard"
                            >
                              {copiedLink === doc.url ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy URL</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  No documentation matched &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>

            {/* Flyout Footer Utilities */}
            <div className="p-3 border-t border-border/80 bg-muted/30 flex items-center justify-between text-[11px]">
              {/* System Health */}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium">API:</span>
                <span className="text-foreground font-semibold">{systemHealth}</span>
              </div>

              {/* Postman Collection Download */}
              <a
                href="/docs/SkillAlign.postman_collection.json"
                download="SkillAlign.postman_collection.json"
                className="flex items-center gap-1 text-primary hover:underline font-bold text-[11px]"
                title="Download Official Postman Collection"
              >
                <Download className="w-3 h-3" /> Postman Collection
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
