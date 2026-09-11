import React, { useEffect, useState, useMemo } from "react";
import { skillsApi } from "../../services/api";
import { Skill } from "../../types";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Cpu,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const CATEGORIES = [
  "Frontend",
  "Backend",
  "Programming",
  "Tools",
  "DevOps",
  "Cloud",
  "Database",
  "AI",
  "Data Science",
  "Testing",
  "Security",
  "Mobile",
  "Analytics",
  "Other",
];

const SKILLS_PER_PAGE = 25;

export const SkillsPage: React.FC = () => {
  const toast = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"matrix" | "table">("matrix");
  const [page, setPage] = useState(1);

  // Quick inline add state
  const [quickName, setQuickName] = useState("");
  const [quickCategory, setQuickCategory] = useState("Cloud");
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Create/Edit Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] = useState("Cloud");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSkills = async () => {
    try {
      const data = await skillsApi.list();
      setSkills(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to load skills.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleOpenCreate = () => {
    setEditingSkill(null);
    setSkillName("");
    setSkillCategory(selectedCategory !== "ALL" ? selectedCategory : "Cloud");
    setIsOpen(true);
  };

  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillName(skill.name);
    setSkillCategory(skill.category);
    setIsOpen(true);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    setIsQuickAdding(true);
    try {
      const created = await skillsApi.create({
        name: quickName.trim(),
        category: quickCategory,
      });
      setSkills((prev) => [created, ...prev]);
      setQuickName("");
      toast.success(`Skill '${created.name}' added to taxonomy.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save skill.");
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSkill) {
        const updated = await skillsApi.update(editingSkill.id, {
          name: skillName,
          category: skillCategory,
        });
        setSkills((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success(`Skill '${updated.name}' updated.`);
      } else {
        const created = await skillsApi.create({
          name: skillName,
          category: skillCategory,
        });
        setSkills((prev) => [created, ...prev]);
        toast.success(`Skill '${created.name}' added to taxonomy.`);
      }
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save skill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (skill: Skill) => {
    if (!window.confirm(`Are you sure you want to delete '${skill.name}'?`)) return;
    try {
      await skillsApi.delete(skill.id);
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      toast.success(`Skill '${skill.name}' deleted.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Could not delete skill.");
    }
  };

  // Group counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    skills.forEach((s) => {
      const cat = s.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [skills]);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "ALL" || s.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [skills, searchTerm, selectedCategory]);

  const groupedFilteredSkills = useMemo(() => {
    const map = new Map<string, Skill[]>();
    filteredSkills.forEach((s) => {
      const cat = s.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    });
    return map;
  }, [filteredSkills]);

  // Detect duplicate or hash test skills
  const isDuplicate = (name: string): boolean => /^.+_[0-9a-f]{6}$/i.test(name);
  const duplicateCount = skills.filter((s) => isDuplicate(s.name)).length;

  const getCategoryTheme = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "cloud":
        return {
          badge: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
          pill: "bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200",
        };
      case "devops":
        return {
          badge: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
          pill: "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200",
        };
      case "backend":
        return {
          badge: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
          pill: "bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200",
        };
      case "frontend":
        return {
          badge: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
          pill: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-200",
        };
      case "database":
        return {
          badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
          pill: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200",
        };
      case "ai":
      case "data science":
        return {
          badge: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
          pill: "bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200",
        };
      case "security":
        return {
          badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
          pill: "bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200",
        };
      default:
        return {
          badge: "bg-secondary text-secondary-foreground border-border",
          pill: "bg-muted text-muted-foreground",
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Cpu className="w-3.5 h-3.5" />
            Global Platform Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight flex items-center gap-3">
            Industry Skill Taxonomy
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border font-mono font-semibold">
              {skills.length} Standardized Skills
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Standardized catalog powering candidate resume extraction, AI vector scoring, and requisition criteria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Dual View Toggle */}
          <div className="flex items-center p-1 rounded-lg border border-border bg-card/80 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Matrix Cloud
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Dense Table
            </button>
          </div>

          <Button variant="default" onClick={handleOpenCreate} className="gap-1.5 text-xs shadow-sm">
            <PlusCircle className="h-3.5 w-3.5" /> Add Skill
          </Button>
        </div>
      </div>

      {/* Quick Add Bar & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/80 rounded-xl shadow-xs">
        {/* Search */}
        <div className="relative lg:col-span-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Quick search skills across all domains..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9 text-xs h-9 bg-background"
          />
        </div>

        {/* Quick Inline Add Form */}
        <form onSubmit={handleQuickAdd} className="lg:col-span-7 flex flex-wrap sm:flex-nowrap items-center gap-2">
          <Input
            type="text"
            placeholder="Add new skill (e.g. Next.js, PyTorch)..."
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            className="text-xs h-9 flex-1 bg-background min-w-[160px]"
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground font-medium focus:outline-none focus:border-primary shrink-0"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            disabled={isQuickAdding || !quickName.trim()}
            variant="secondary"
            className="h-9 px-3 text-xs font-semibold shrink-0 gap-1"
          >
            {isQuickAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
            Quick Add
          </Button>
        </form>
      </div>

      {/* Category Pills Scroller */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("ALL");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedCategory === "ALL"
              ? "bg-primary text-primary-foreground shadow-xs font-bold"
              : "bg-white/80 dark:bg-slate-900/60 text-muted-foreground hover:text-foreground border border-slate-200 dark:border-slate-800"
          }`}
        >
          <span>All Categories</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono font-bold">
            {skills.length}
          </span>
        </button>

        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat] || 0;
          if (count === 0 && selectedCategory !== cat) return null;
          const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();

          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-white/80 dark:bg-slate-900/60 text-muted-foreground hover:text-foreground border border-slate-200 dark:border-slate-800"
              }`}
            >
              <span>{cat}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Duplicate Warning */}
      {duplicateCount > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>{duplicateCount} duplicate / hash skill(s)</strong> detected from resume extractions.
            </span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Clean from row action</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="text-center p-12 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
          <Cpu className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Skills Found</h3>
          <p className="text-xs text-muted-foreground">No skills match the query &ldquo;{searchTerm}&rdquo; in this view.</p>
        </div>
      ) : viewMode === "matrix" ? (
        /* ── DENSE MATRIX CLOUD VIEW (SPACE EFFICIENT) ─────────────────────── */
        <div className="space-y-4">
          {Array.from(groupedFilteredSkills.entries()).map(([cat, catSkills]) => {
            const theme = getCategoryTheme(cat);
            return (
              <div
                key={cat}
                className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-3"
              >
                {/* Domain Category Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <h3 className="text-xs font-bold font-outfit uppercase tracking-wider text-foreground">
                      {cat}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-secondary text-secondary-foreground border border-border font-semibold">
                      {catSkills.length} skill{catSkills.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Compact Interactive Chips Grid */}
                <div className="flex flex-wrap gap-2">
                  {catSkills.map((s) => {
                    const isDup = isDuplicate(s.name);
                    return (
                      <div
                        key={s.id}
                        className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${
                          isDup
                            ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/90 dark:bg-slate-800/70 dark:hover:bg-slate-800 dark:text-slate-100 dark:border-slate-700/80"
                        }`}
                      >
                        <span>{s.name}</span>
                        {isDup && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-mono font-bold">
                            DUP
                          </span>
                        )}

                        {/* Hover Action Triggers */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pl-1 border-l border-border/80">
                          <button
                            type="button"
                            title="Edit Skill"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete Skill"
                            onClick={() => handleDelete(s)}
                            className="p-1 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── DENSE TABLE VIEW ────────────────────────────────────────────── */
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 backdrop-blur-md shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-xs font-bold uppercase tracking-wider">
                <TableHead>Skill Name</TableHead>
                <TableHead>Domain Category</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSkills
                .slice((page - 1) * SKILLS_PER_PAGE, page * SKILLS_PER_PAGE)
                .map((s) => {
                  const theme = getCategoryTheme(s.category);
                  const isDup = isDuplicate(s.name);
                  return (
                    <TableRow key={s.id} className="text-xs hover:bg-muted/40 transition-colors">
                      <TableCell className="font-semibold text-foreground flex items-center gap-2 py-2.5">
                        <Cpu className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{s.name}</span>
                        {isDup && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30">
                            DUPLICATE
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold border ${theme.badge}`}>
                          {s.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-2.5 space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                          onClick={() => handleDelete(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          {/* Table Pagination */}
          {Math.ceil(filteredSkills.length / SKILLS_PER_PAGE) > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border/80 text-xs">
              <span className="text-muted-foreground font-mono">
                Showing page {page} of {Math.ceil(filteredSkills.length / SKILLS_PER_PAGE)} ({filteredSkills.length} skills)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-7 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= Math.ceil(filteredSkills.length / SKILLS_PER_PAGE)}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSkill ? "Edit Taxonomy Skill" : "Add Standard Skill"}</DialogTitle>
            <DialogDescription>
              Verified enterprise skill used across candidate resume extraction and role matching.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Skill Name</label>
              <Input
                type="text"
                placeholder="e.g. Kubernetes, Rust, Terraform"
                required
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Domain Category</label>
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                  </>
                ) : editingSkill ? (
                  "Update Skill"
                ) : (
                  "Add Skill"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkillsPage;
