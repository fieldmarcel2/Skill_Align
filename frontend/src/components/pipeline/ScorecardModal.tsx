import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Scorecard } from "../../types";
import { matchingApi } from "../../services/api";
import { useToast } from "../ui/toast";
import { Star, MessageSquare, Zap, Plus, Loader2, User2 } from "lucide-react";

interface ScorecardModalProps {
  matchId: number;
  candidateName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ScoreInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      <span className="text-sm font-bold text-primary">{value}/10</span>
    </div>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 h-8 rounded text-xs font-semibold transition-all ${
            n <= value
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);

export const ScorecardModal: React.FC<ScorecardModalProps> = ({
  matchId,
  candidateName,
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Form state
  const [commScore, setCommScore] = useState(5);
  const [techScore, setTechScore] = useState(5);
  const [impression, setImpression] = useState("");

  const loadScorecards = async () => {
    if (loaded) return;
    setIsLoading(true);
    try {
      const data = await matchingApi.getScorecards(matchId);
      setScorecards(data);
      setLoaded(true);
    } catch {
      toast.error("Failed to load scorecards.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = (open: boolean) => {
    if (open) loadScorecards();
    else {
      setLoaded(false);
      setShowForm(false);
      setCommScore(5);
      setTechScore(5);
      setImpression("");
    }
    if (!open) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newCard = await matchingApi.createScorecard(matchId, {
        communication_score: commScore,
        technical_score: techScore,
        overall_impression: impression || undefined,
      });
      setScorecards((prev) => [newCard, ...prev]);
      toast.success("Scorecard submitted successfully.");
      setShowForm(false);
      setCommScore(5);
      setTechScore(5);
      setImpression("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit scorecard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgScore = (s: Scorecard) =>
    ((s.communication_score + s.technical_score) / 2).toFixed(1);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Interview Scorecards
          </DialogTitle>
          <DialogDescription>
            Feedback for <span className="font-semibold text-foreground">{candidateName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Add new scorecard button */}
          {!showForm && (
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" /> Add New Scorecard
            </Button>
          )}

          {/* Scorecard form */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-4 rounded-xl border border-primary/30 bg-primary/5"
            >
              <p className="text-sm font-semibold text-foreground">New Feedback Entry</p>
              <ScoreInput label="Communication Score" value={commScore} onChange={setCommScore} />
              <ScoreInput label="Technical Score" value={techScore} onChange={setTechScore} />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Overall Impression</label>
                <textarea
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  placeholder="Share your overall impression of this candidate..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Submitting...</>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Existing scorecards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : scorecards.length === 0 ? (
            <div className="py-10 text-center">
              <Star className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No scorecards yet. Be the first to add feedback.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scorecards.map((sc) => (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <User2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {sc.reviewer?.name ?? "Reviewer"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      Avg {avgScore(sc)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Communication</p>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${sc.communication_score * 10}%` }}
                        />
                        <span className="text-sm font-bold text-foreground">{sc.communication_score}/10</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Technical</p>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-1.5 rounded-full bg-indigo-400"
                          style={{ width: `${sc.technical_score * 10}%` }}
                        />
                        <span className="text-sm font-bold text-foreground">{sc.technical_score}/10</span>
                      </div>
                    </div>
                  </div>

                  {sc.overall_impression && (
                    <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
                      {sc.overall_impression}
                    </p>
                  )}

                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(sc.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
