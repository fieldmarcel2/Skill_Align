import React, { useEffect, useState } from "react";
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
} from "lucide-react";

const CATEGORIES = [
  "Programming",
  "Backend",
  "Frontend",
  "Database",
  "DevOps",
  "Cloud",
  "Testing",
  "Data Science",
  "Other",
];

export const SkillsPage: React.FC = () => {
  const toast = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Create/Edit Dialog state
  const [isOpen, setIsOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillCategory, setSkillCategory] = useState("Programming");
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
    setSkillCategory("Programming");
    setIsOpen(true);
  };

  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillName(skill.name);
    setSkillCategory(skill.category);
    setIsOpen(true);
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

  const filteredSkills = skills.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || s.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "Programming":
        return <Badge variant="purple">{cat}</Badge>;
      case "Backend":
        return <Badge variant="info">{cat}</Badge>;
      case "Frontend":
        return <Badge variant="success">{cat}</Badge>;
      case "Database":
        return <Badge variant="warning">{cat}</Badge>;
      case "Cloud":
      case "DevOps":
        return <Badge variant="default">{cat}</Badge>;
      default:
        return <Badge variant="secondary">{cat}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-outfit text-foreground tracking-tight">
            Master Skills Taxonomy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standardized skills catalog used for job requirements weighting and candidate profiling.
          </p>
        </div>
        <Button variant="gradient" onClick={handleOpenCreate} className="gap-2">
          <PlusCircle className="h-4 w-4" /> Add New Skill
        </Button>
      </div>

      {/* Search & Category Filter */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-xl p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search skills by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-border bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Skills Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSkills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No skills found matching your filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredSkills.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold text-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary shrink-0" />
                    <span>{s.name}</span>
                  </TableCell>
                  <TableCell>{getCategoryBadge(s.category)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                      onClick={() => handleDelete(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSkill ? "Edit Taxonomy Skill" : "Add Skill to Taxonomy"}
            </DialogTitle>
            <DialogDescription>
              Provide the verified skill name and its official domain category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Skill Name</label>
              <Input
                type="text"
                placeholder="e.g. Kubernetes, Python, React"
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
                className="w-full h-10 px-3 rounded-lg border border-border bg-secondary/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              <Button type="submit" variant="gradient" disabled={isSubmitting}>
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
