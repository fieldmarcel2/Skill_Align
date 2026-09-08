import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Inbox,
  Send,
  CalendarCheck,
  FileCheck,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
} from "lucide-react";
import { workflowApi, offerApi } from "../../services/api";
import { ActionCenterItem } from "../../types";
import ActionCenterCard from "../../components/workflow/ActionCenterCard";

export const ActionCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActionCenterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workflowApi.getActionCenter();
      setItems(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch Action Center tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleExecuteAction = async (item: ActionCenterItem) => {
    if (!item.match_result_id) return;
    setActionLoadingId(item.task_id);
    setError(null);
    setSuccessMsg(null);

    try {
      if (item.action_type === "SEND_SLOTS_TO_CANDIDATE") {
        await workflowApi.sendSlotsToCandidate(item.match_result_id);
        setSuccessMsg(`Interview slots sent to ${item.candidate_name || "candidate"}!`);
        await fetchItems();
      } else if (item.action_type === "CONFIRM_INTERVIEW") {
        await workflowApi.confirmInterview(item.match_result_id);
        setSuccessMsg(`Interview confirmed for ${item.candidate_name || "candidate"}! Confirmation emails sent.`);
        await fetchItems();
      } else if (item.action_type === "CREATE_OFFER") {
        navigate(`/recruiter/offers/create?match_id=${item.match_result_id}`);
      } else if (item.action_type === "SEND_OFFER") {
        // Find offer for this match
        navigate(`/recruiter/candidates/${item.match_result_id}`);
      } else {
        navigate(`/recruiter/candidates/${item.match_result_id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Action failed to execute. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (typeFilter !== "ALL" && item.action_type !== typeFilter) return false;
    if (priorityFilter !== "ALL" && item.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.candidate_name?.toLowerCase().includes(q);
      const matchJob = item.job_title?.toLowerCase().includes(q);
      const matchTitle = item.title?.toLowerCase().includes(q);
      if (!matchName && !matchJob && !matchTitle) return false;
    }
    return true;
  });

  const countByType = (type: string) => items.filter((i) => i.action_type === type).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Recruiter Command Center
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Workflow Action Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pending lifecycle actions across your candidate pipelines requiring prompt attention.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchItems}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setTypeFilter("ALL")}
          className={`p-4 rounded-xl border text-left transition-all ${
            typeFilter === "ALL"
              ? "bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/20"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Inbox className="w-4 h-4 text-cyan-400" />
            Total Pending
          </span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {items.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter("SEND_SLOTS_TO_CANDIDATE")}
          className={`p-4 rounded-xl border text-left transition-all ${
            typeFilter === "SEND_SLOTS_TO_CANDIDATE"
              ? "bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/20"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Send className="w-4 h-4 text-cyan-400" />
            Slots to Send
          </span>
          <div className="text-2xl font-bold text-cyan-300 font-mono mt-1">
            {countByType("SEND_SLOTS_TO_CANDIDATE")}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter("CONFIRM_INTERVIEW")}
          className={`p-4 rounded-xl border text-left transition-all ${
            typeFilter === "CONFIRM_INTERVIEW"
              ? "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            To Confirm
          </span>
          <div className="text-2xl font-bold text-emerald-300 font-mono mt-1">
            {countByType("CONFIRM_INTERVIEW")}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter("CREATE_OFFER")}
          className={`p-4 rounded-xl border text-left transition-all ${
            typeFilter === "CREATE_OFFER"
              ? "bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
          }`}
        >
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-amber-400" />
            Offers to Draft
          </span>
          <div className="text-2xl font-bold text-amber-300 font-mono mt-1">
            {countByType("CREATE_OFFER")}
          </div>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate name, job title, or task..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>
      </div>

      {/* Task Cards List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">All Caught Up!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have no pending workflow actions requiring immediate recruiter attention right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ActionCenterCard
              key={item.task_id}
              item={item}
              onExecuteAction={handleExecuteAction}
              loading={actionLoadingId === item.task_id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
export default ActionCenterPage;
