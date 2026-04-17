"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Globe,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
  type SavedFilterItem,
  type FilterState,
} from "../saved-filter-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedFiltersDropdownProps {
  workspaceId: string;
  projectId: string;
  currentUserId: string;
  currentFilters: FilterState;
  savedFilters: SavedFilterItem[];
  activeFilterId: string | null;
  onApply: (filter: SavedFilterItem) => void;
  onFiltersChange: (filters: SavedFilterItem[]) => void;
  hasActiveFilters: boolean;
}

// ─── Save dialog ──────────────────────────────────────────────────────────────

function SaveFilterDialog({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  currentFilters,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  projectId: string;
  currentFilters: FilterState;
  onSaved: (filter: SavedFilterItem) => void;
}) {
  const [name, setName]         = useState("");
  const [isShared, setIsShared] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) { setName(""); setIsShared(false); setError(null); }
  }, [open]);

  function handleClose() { onOpenChange(false); }

  function handleSave() {
    setError(null);
    start(async () => {
      const result = await createSavedFilter({
        workspaceId,
        projectId,
        name: name.trim(),
        filters: currentFilters,
        isShared,
      });
      if (!result.success) { setError(result.error ?? "Failed to save."); return; }
      onSaved(result.data!);
      handleClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Bookmark className="size-4 text-primary" />
            </div>
            Save current view
          </DialogTitle>
          <DialogDescription>
            Save your current filters as a named view you can quickly restore later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-name" className="text-sm font-medium">
              View name
            </Label>
            <Input
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleSave(); }}
              placeholder="e.g. My open bugs, High priority unassigned…"
              autoFocus
              disabled={isPending}
              maxLength={60}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">{name.length}/60</p>
          </div>

          {/* Filter preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Filters being saved
            </p>
            <FilterPreview filters={currentFilters} />
          </div>

          {/* Share toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2.5">
              {isShared
                ? <Globe className="size-4 text-primary" />
                : <Lock className="size-4 text-muted-foreground" />
              }
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isShared ? "Shared with workspace" : "Personal view"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isShared
                    ? "All workspace members can see and use this view"
                    : "Only visible to you"
                  }
                </p>
              </div>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} disabled={isPending} />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()} className="gap-1.5">
            {isPending
              ? <Loader2 className="size-4 animate-spin" />
              : <BookmarkCheck className="size-4" />
            }
            Save view
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditFilterDialog({
  filter,
  open,
  onOpenChange,
  onUpdated,
}: {
  filter: SavedFilterItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: (updated: SavedFilterItem) => void;
}) {
  const [name, setName]         = useState(filter.name);
  const [isShared, setIsShared] = useState(filter.isShared);
  const [error, setError]       = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  // Sync state when the filter prop changes (different filter opened)
  useEffect(() => {
    if (open) { setName(filter.name); setIsShared(filter.isShared); setError(null); }
  }, [open, filter.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() { onOpenChange(false); }

  function handleSave() {
    setError(null);
    start(async () => {
      const result = await updateSavedFilter(filter.id, { name: name.trim(), isShared });
      if (!result.success) { setError(result.error ?? "Failed to update."); return; }
      onUpdated(result.data!);
      handleClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit view</DialogTitle>
          <DialogDescription>
            Rename or change sharing settings for this saved view.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-filter-name" className="text-sm font-medium">Name</Label>
            <Input
              id="edit-filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleSave(); }}
              autoFocus
              disabled={isPending}
              maxLength={60}
              className="h-9"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2.5">
              {isShared
                ? <Globe className="size-4 text-primary" />
                : <Lock className="size-4 text-muted-foreground" />
              }
              <div>
                <p className="text-sm font-medium">
                  {isShared ? "Shared with workspace" : "Personal view"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isShared ? "Visible to all workspace members" : "Only visible to you"}
                </p>
              </div>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} disabled={isPending} />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()} className="gap-1.5">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filter preview ───────────────────────────────────────────────────────────

function FilterPreview({ filters }: { filters: FilterState }) {
  const chips: { label: string; value: string }[] = [];

  if (filters.search)
    chips.push({ label: "Search", value: `"${filters.search}"` });
  if (filters.status && filters.status !== "all")
    chips.push({ label: "Status", value: filters.status.replace(/_/g, " ") });
  if (filters.priority && filters.priority !== "all")
    chips.push({ label: "Priority", value: filters.priority.replace(/_/g, " ") });
  if (filters.assigneeId && filters.assigneeId !== "all")
    chips.push({ label: "Assignee", value: filters.assigneeId === "unassigned" ? "Unassigned" : "Specific user" });
  if (filters.dueDateFilter && filters.dueDateFilter !== "all")
    chips.push({ label: "Due date", value: filters.dueDateFilter.replace(/_/g, " ") });
  if (filters.sortKey && filters.sortKey !== "default")
    chips.push({ label: "Sort", value: filters.sortKey.replace(/([A-Z])/g, " $1").toLowerCase() });
  if (filters.groupBy && filters.groupBy !== "none")
    chips.push({ label: "Group by", value: filters.groupBy });

  if (chips.length === 0) {
    return <p className="text-xs italic text-muted-foreground">No active filters</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(({ label, value }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
        >
          <span className="text-primary/60">{label}:</span>
          <span className="capitalize">{value}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Filter row item (NOT a DropdownMenuItem — avoids auto-close on action clicks) ──

function FilterRow({
  filter,
  isActive,
  isOwner,
  onApply,
  onEdit,
  onDelete,
}: {
  filter: SavedFilterItem;
  isActive: boolean;
  isOwner: boolean;
  onApply: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="menuitem"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onApply(); }}
      className={cn(
        "group flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-accent/60 focus:bg-accent/60",
      )}
      onClick={onApply}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isActive
          ? <BookmarkCheck className="size-3.5 shrink-0 text-primary" />
          : <Bookmark className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
        }
        <span className="truncate text-sm">{filter.name}</span>
        {filter.isShared && (
          <Users className="size-3 shrink-0 text-muted-foreground" />
        )}
      </div>

      {isOwner && (
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Edit view"
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete view"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SavedFiltersDropdown({
  workspaceId,
  projectId,
  currentUserId,
  currentFilters,
  savedFilters,
  activeFilterId,
  onApply,
  onFiltersChange,
  hasActiveFilters,
}: SavedFiltersDropdownProps) {
  const [saveOpen, setSaveOpen]         = useState(false);
  const [editFilter, setEditFilter]     = useState<SavedFilterItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedFilterItem | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDeleting, startDelete]       = useTransition();

  const myFilters     = savedFilters.filter((f) => f.userId === currentUserId);
  const sharedFilters = savedFilters.filter((f) => f.isShared && f.userId !== currentUserId);
  const activeFilter  = savedFilters.find((f) => f.id === activeFilterId);

  function handleSaved(filter: SavedFilterItem) {
    onFiltersChange([filter, ...savedFilters]);
  }

  function handleUpdated(updated: SavedFilterItem) {
    onFiltersChange(savedFilters.map((f) => (f.id === updated.id ? updated : f)));
    setEditFilter(null);
  }

  function handleDelete(filter: SavedFilterItem) {
    startDelete(async () => {
      const result = await deleteSavedFilter(filter.id);
      if (result.success) {
        onFiltersChange(savedFilters.filter((f) => f.id !== filter.id));
        // If the deleted filter was active, clear it
        if (filter.id === activeFilterId) {
          onApply({ id: "", name: "", filters: {}, isShared: false, userId: "", createdAt: new Date() });
        }
      }
      setDeleteTarget(null);
    });
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs",
              activeFilterId && "border-primary bg-primary/5 text-primary",
            )}
          >
            {activeFilterId
              ? <BookmarkCheck className="size-3.5" />
              : <Bookmark className="size-3.5" />
            }
            <span className="hidden sm:inline max-w-[120px] truncate">
              {activeFilter ? activeFilter.name : "Saved views"}
            </span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-64 p-1.5"
          sideOffset={4}
          // Prevent closing when interacting with dialogs triggered from inside
          onInteractOutside={(e) => {
            // Don't close if a dialog is open
            if (saveOpen || editFilter || deleteTarget) e.preventDefault();
          }}
        >
          {/* Save current */}
          <div className="px-1 pb-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full justify-start gap-2 text-xs"
              onClick={() => { setSaveOpen(true); setDropdownOpen(false); }}
              disabled={!hasActiveFilters}
            >
              <Plus className="size-3.5" />
              Save current view
              {!hasActiveFilters && (
                <span className="ml-auto text-[10px] text-muted-foreground">No active filters</span>
              )}
            </Button>
          </div>

          <DropdownMenuSeparator />

          {/* My views */}
          {myFilters.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Star className="size-3" />
                My views
              </DropdownMenuLabel>
              {myFilters.map((f) => (
                <FilterRow
                  key={f.id}
                  filter={f}
                  isActive={f.id === activeFilterId}
                  isOwner={true}
                  onApply={() => { onApply(f); setDropdownOpen(false); }}
                  onEdit={(e) => {
                    e.stopPropagation();
                    setEditFilter(f);
                    setDropdownOpen(false);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(f);
                    setDropdownOpen(false);
                  }}
                />
              ))}
            </DropdownMenuGroup>
          )}

          {/* Shared views */}
          {sharedFilters.length > 0 && (
            <>
              {myFilters.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Globe className="size-3" />
                  Shared views
                </DropdownMenuLabel>
                {sharedFilters.map((f) => (
                  <FilterRow
                    key={f.id}
                    filter={f}
                    isActive={f.id === activeFilterId}
                    isOwner={false}
                    onApply={() => { onApply(f); setDropdownOpen(false); }}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </DropdownMenuGroup>
            </>
          )}

          {/* Empty state */}
          {savedFilters.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Bookmark className="size-6 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No saved views yet.</p>
              <p className="text-[11px] text-muted-foreground/70">
                Apply filters then save them as a view.
              </p>
            </div>
          )}

          {/* Clear active view */}
          <AnimatePresence>
            {activeFilterId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <DropdownMenuSeparator />
                <div className="px-1 pt-1">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      onApply({ id: "", name: "", filters: {}, isShared: false, userId: "", createdAt: new Date() });
                      setDropdownOpen(false);
                    }}
                  >
                    <X className="size-3" />
                    Clear active view
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save dialog — rendered outside dropdown to avoid portal conflicts */}
      <SaveFilterDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        workspaceId={workspaceId}
        projectId={projectId}
        currentFilters={currentFilters}
        onSaved={handleSaved}
      />

      {/* Edit dialog */}
      {editFilter && (
        <EditFilterDialog
          key={editFilter.id}
          filter={editFilter}
          open={!!editFilter}
          onOpenChange={(v) => { if (!v) setEditFilter(null); }}
          onUpdated={handleUpdated}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved view</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting
                ? <Loader2 className="size-4 animate-spin" />
                : <Trash2 className="size-4" />
              }
              Delete view
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
