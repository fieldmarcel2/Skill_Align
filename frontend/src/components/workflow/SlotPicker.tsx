import React from "react";
import { Plus, Trash2, Calendar, AlertCircle } from "lucide-react";

export interface SlotItem {
  id: string;
  slot_datetime: string;
  slot_end_datetime?: string;
  duration_minutes: number;
}

interface SlotPickerProps {
  slots: SlotItem[];
  onChange: (slots: SlotItem[]) => void;
  minSlots?: number;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  onChange,
  minSlots = 2,
}) => {
  const getDefaultDateTime = (daysAhead = 1, hour = 10): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    // Format to YYYY-MM-DDTHH:mm
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  const handleAddSlot = () => {
    const lastSlot = slots[slots.length - 1];
    let nextDateStr = getDefaultDateTime(slots.length + 1, 10 + (slots.length % 4));
    if (lastSlot && lastSlot.slot_datetime) {
      try {
        const d = new Date(lastSlot.slot_datetime);
        d.setDate(d.getDate() + 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        nextDateStr = `${year}-${month}-${day}T${hours}:${mins}`;
      } catch {
        // use fallback
      }
    }

    const newSlot: SlotItem = {
      id: `slot-${Date.now()}-${Math.random()}`,
      slot_datetime: nextDateStr,
      duration_minutes: 45,
    };
    onChange([...slots, newSlot]);
  };

  const handleRemoveSlot = (index: number) => {
    const updated = slots.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleUpdateSlotDateTime = (index: number, val: string) => {
    const updated = [...slots];
    updated[index] = {
      ...updated[index],
      slot_datetime: val,
    };
    onChange(updated);
  };

  const handleUpdateDuration = (index: number, duration: number) => {
    const updated = [...slots];
    updated[index] = {
      ...updated[index],
      duration_minutes: duration,
    };
    onChange(updated);
  };

  const hasEnoughSlots = slots.length >= minSlots;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Proposed Interview Time Slots
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Propose at least{" "}
            <span className="text-primary font-semibold">{minSlots} alternative options</span> for the candidate to choose from.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddSlot}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Another Slot
        </button>
      </div>

      {!hasEnoughSlots && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Enterprise workflow policy requires proposing at least {minSlots} time slots. Currently {slots.length} proposed.
          </span>
        </div>
      )}

      {/* Slots List */}
      <div className="space-y-3">
        {slots.map((slot, index) => (
          <div
            key={slot.id || index}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-xl bg-card border border-border/80 shadow-xs hover:border-border transition"
          >
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/20">
                {index + 1}
              </span>
              <span className="text-xs font-medium text-muted-foreground sm:hidden">
                Slot Option #{index + 1}
              </span>
            </div>

            {/* DateTime Input */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Date & Start Time
              </label>
              <input
                type="datetime-local"
                value={slot.slot_datetime}
                onChange={(e) => handleUpdateSlotDateTime(index, e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition font-mono"
                required
              />
            </div>

            {/* Duration Selector */}
            <div className="w-full sm:w-36">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                Duration
              </label>
              <select
                value={slot.duration_minutes}
                onChange={(e) => handleUpdateDuration(index, parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-background border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins (1 hr)</option>
                <option value={90}>90 mins (1.5 hr)</option>
              </select>
            </div>

            {/* Remove Button */}
            <div className="flex sm:flex-col justify-end pt-1 sm:pt-4">
              <button
                type="button"
                onClick={() => handleRemoveSlot(index)}
                disabled={slots.length <= minSlots && slots.length === 1}
                className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove this slot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SlotPicker;
