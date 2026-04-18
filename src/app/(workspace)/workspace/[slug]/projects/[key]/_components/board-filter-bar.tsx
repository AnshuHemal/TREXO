"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, SlidersHorizontal, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ISSUE_PRIORITIES } from "@/lib/issue-config";
import { cn } from "@/lib/utils";
import { RealtimeIndicator } from "@/components/shared/realtime-indicator";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SwimlaneMode = "none" | "assignee" | "priority";

interface Member { id: string; name: string; image: string | null; }

export interface EpicOption { id: string; key: number; title: string; }

interface BoardFilterBarProps {
  members: Member[];
  epics?: EpicOption[];
  filterAssignee: string;
  filterPriority: string;
  filterEpic?: string;
  swimlane: SwimlaneMode;
  onFilterAssignee: (v: string) => void;
  onFilterPriority: (v: string) => void;
  onFilterEpic?: (v: string) => void;
  onSwimlane: (v: SwimlaneMode) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  realtimeStatus?: "connecting" | "connected" | "disconnected";
  projectKey?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BoardFilterBar({
  members, epics = [], filterAssignee, filterPriority, filterEpic = "all",
  swimlane, onFilterAssignee, onFilterPriority, onFilterEpic, onSwimlane,
  onClear, hasActiveFilters, realtimeStatus, projectKey,
}: BoardFilterBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm"
    >
      <SlidersHorizontal className="size-3.5 shrink-0 text-muted-foreground" />

      {/* Assignee filter */}
      <Select value={filterAssignee} onValueChange={onFilterAssignee}>
        <SelectTrigger className={cn("h-7 w-36 text-xs", filterAssignee !== "all" && "border-primary text-primary")}>
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="flex items-center gap-2 text-xs">
                <Avatar className="size-4">
                  <AvatarImage src={m.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback>
                </Avatar>
                {m.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select value={filterPriority} onValueChange={onFilterPriority}>
        <SelectTrigger className={cn("h-7 w-32 text-xs", filterPriority !== "all" && "border-primary text-primary")}>
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-2 text-xs">
                <Icon className={cn("size-3.5", color)} />{label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Epic filter */}
      {epics.length > 0 && onFilterEpic && (
        <Select value={filterEpic} onValueChange={onFilterEpic}>
          <SelectTrigger className={cn("h-7 w-36 text-xs", filterEpic !== "all" && "border-purple-500 text-purple-600 dark:text-purple-400")}>
            <Zap className="mr-1 size-3 shrink-0 text-purple-500" />
            <SelectValue placeholder="Epic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All epics</SelectItem>
            <SelectItem value="none">No epic</SelectItem>
            {epics.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                <span className="flex items-center gap-1.5 text-xs">
                  <Zap className="size-3 text-purple-500" />
                  {projectKey ? `${projectKey}-${e.key} ` : ""}{e.title}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Swimlane */}
      <Select value={swimlane} onValueChange={(v) => onSwimlane(v as SwimlaneMode)}>
        <SelectTrigger className={cn("h-7 w-auto min-w-[9rem] text-xs", swimlane !== "none" && "border-primary text-primary")}>
          <Layers className="mr-1.5 size-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No swimlanes</SelectItem>
          <SelectItem value="assignee">By assignee</SelectItem>
          <SelectItem value="priority">By priority</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onClear}>
              <X className="size-3.5" />Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time indicator */}
      {realtimeStatus && (
        <div className="ml-auto">
          <RealtimeIndicator status={realtimeStatus} />
        </div>
      )}
    </motion.div>
  );
}
