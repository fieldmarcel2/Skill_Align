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
import { Scorecard, MatchResult } from "../../types";
import { matchingApi, resumeApi } from "../../services/api";
import { useToast } from "../ui/toast";
import {
  Star,
  MessageSquare,
  Plus,
  Loader2,
  User2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  FileText,
  FileCode,
  ExternalLink,
  Layers,
  Award,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"deterministic" | "ai" | "feedback">("deterministic");
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [matchDetail, setMatchDetail] = useState<MatchResult | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Gemini AI Analysis State
  const [aiData, setAiData] = useState<{
    semantic_fit_score: number;
    ai_summary: string;
    key_strengths: string[];
    skill_gaps: string[];
    suggested_interview_questions: string[];
  } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState<number | null>(null);

  // Form state
  const [commScore, setCommScore] = useState(5);
  const [techScore, setTechScore] = useState(5);
  const [impression, setImpression] = useState("");

  const loadData = async () => {
    if (loaded) return;
    setIsLoading(true);
    setIsLoadingAi(true);
    try {
      const [cards, matchRes, ai] = await Promise.allSettled([
        matchingApi.getScorecards(matchId),
        matchingApi.getMatchById(matchId),
        matchingApi.getAiAnalysis(matchId),
      ]);

      if (cards.status === "fulfilled") {
        setScorecards(cards.value);
      }
      if (matchRes.status === "fulfilled") {
        setMatchDetail(matchRes.value);
        // Try fetching extracted text for candidate
        if (matchRes.value.candidate_id) {
          try {
            const txtRes = await resumeApi.getText(matchRes.value.candidate_id);
            setExtractedText(txtRes.raw_text);
          } catch {}
        }
      }
      if (ai.status === "fulfilled") {
        setAiData(ai.value);
      }
      setLoaded(true);
    } catch {
      toast.error("Failed to load candidate evaluation data.");
    } finally {
      setIsLoading(false);
      setIsLoadingAi(false);
    }
  };

  const handleOpen = (open: boolean) => {
    if (open) loadData();
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

  const copyQuestion = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionIndex(index);
    toast.success("Interview question copied!");
    setTimeout(() => setCopiedQuestionIndex(null), 2000);
  };

  const handleViewOriginal = async () => {
    if (!matchDetail?.candidate_id) return;
    try {
      const res = await resumeApi.getUrl(matchDetail.candidate_id);
      if (res.resume_url) {
        window.open(res.resume_url, "_blank");
      }
    } catch (e) {
      toast.error("Could not fetch resume download link.");
    }
  };

  const handleCopyExtracted = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Extracted text copied to clipboard.");
  };

  const avgScore = (s: Scorecard) =>
    ((s.communication_score + s.technical_score) / 2).toFixed(1);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            Candidate Alignment & Evaluation
          </DialogTitle>
          <DialogDescription>
            Evaluation details for <span className="font-bold text-foreground">{candidateName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("deterministic")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "deterministic"
                ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Deterministic Fit & Resume
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ai"
                ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Assist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("feedback")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "feedback"
                ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Scorecards ({scorecards.length})
          </button>
        </div>

        {/* TAB 1: DETERMINISTIC FIT & RESUME */}
        {activeTab === "deterministic" && (
          <div className="space-y-4 py-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground animate-pulse">
                  Computing deterministic match calculations & resume data...
                </p>
              </div>
            ) : matchDetail ? (
              <div className="space-y-4">
                {/* Overall Score Header */}
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Deterministic Skill Alignment Score
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {matchDetail.explanation || "Calculated using weighted skill math."}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-indigo-300 font-outfit">
                      {Number(matchDetail.overall_score).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Matched vs Missing Skills Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Matched Skills ({matchDetail.matched_skills?.length || 0})
                    </span>
                    {matchDetail.matched_skills && matchDetail.matched_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {matchDetail.matched_skills.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-medium"
                          >
                            ✓ {sk}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No matching skills detected.</p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Missing Skills ({matchDetail.missing_skills?.length || 0})
                    </span>
                    {matchDetail.missing_skills && matchDetail.missing_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {matchDetail.missing_skills.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-medium"
                          >
                            - {sk}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">100% of required skills present.</p>
                    )}
                  </div>
                </div>

                {/* Resume View & Extracted Plain Text */}
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                      <FileText className="h-4 w-4 text-indigo-400" />
                      Candidate Resume Documents
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewOriginal}
                        className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Download / View Original
                      </Button>
                      {extractedText && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyExtracted}
                          className="gap-1 text-xs"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          {isCopied ? "Copied" : "Copy TXT"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {extractedText ? (
                    <div className="p-3 rounded-lg bg-background/80 border border-border/60 font-mono text-[11px] text-foreground max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {extractedText}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No extracted plain text on file for this candidate.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: GEMINI AI ASSESSMENT */}
        {activeTab === "ai" && (
          <div className="space-y-4 py-2">
            {isLoadingAi ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground animate-pulse">
                  Querying AI for contextual role alignment analysis...
                </p>
              </div>
            ) : aiData ? (
              <div className="space-y-4">
                {/* AI Summary Banner */}
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-tr from-indigo-950/20 to-purple-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Executive AI Alignment Summary
                    </span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {aiData.semantic_fit_score}% Contextual Fit
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {aiData.ai_summary}
                  </p>
                </div>

                {/* Strengths & Gaps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Key Strengths
                    </span>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {aiData.key_strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Potential Gaps
                    </span>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {aiData.skill_gaps.map((g, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400">•</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Suggested Interview Questions */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                    AI-Suggested Interview Questions
                  </h4>
                  <div className="space-y-2">
                    {aiData.suggested_interview_questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-border/80 bg-secondary/30 flex items-start justify-between gap-2 hover:border-primary/40 transition-all text-xs"
                      >
                        <p className="text-foreground leading-snug">{q}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyQuestion(q, idx)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                        >
                          {copiedQuestionIndex === idx ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No AI assessment available for this candidate.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HUMAN SCORECARDS */}
        {activeTab === "feedback" && (
          <div className="space-y-4 py-2">
            {!showForm && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => setShowForm(true)}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Scorecard
                </Button>
              </div>
            )}

            {/* Scorecard Form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  New Interview Evaluation
                </h4>
                <ScoreInput label="Communication & Articulation" value={commScore} onChange={setCommScore} />
                <ScoreInput label="Technical Competency & Alignment" value={techScore} onChange={setTechScore} />
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Overall Impression & Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Candidate demonstrated strong architecture knowledge..."
                    value={impression}
                    onChange={(e) => setImpression(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" variant="gradient" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit Scorecard"}
                  </Button>
                </div>
              </form>
            )}

            {/* Existing Scorecards */}
            {scorecards.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No scorecards submitted yet for this round.
              </p>
            ) : (
              <div className="space-y-3">
                {scorecards.map((sc) => (
                  <div key={sc.id} className="p-3.5 rounded-xl border border-border/80 bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <User2 className="h-3.5 w-3.5 text-primary" />
                        {sc.reviewer?.name || "Reviewer"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(sc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-background/60 border border-border/40">
                        <span className="text-muted-foreground block text-[10px]">Communication</span>
                        <span className="font-bold text-foreground">{sc.communication_score}/10</span>
                      </div>
                      <div className="p-2 rounded bg-background/60 border border-border/40">
                        <span className="text-muted-foreground block text-[10px]">Technical</span>
                        <span className="font-bold text-foreground">{sc.technical_score}/10</span>
                      </div>
                    </div>
                    {sc.overall_impression && (
                      <p className="text-xs text-muted-foreground italic bg-background/40 p-2 rounded">
                        "{sc.overall_impression}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => handleOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
