"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock, Globe, Users, UserPlus, Trash2,
  ChevronDown, Loader2, CheckCircle2, AlertCircle, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  updateProjectVisibility, addProjectMember,
  removeProjectMember, updateProjectMemberRole,
  type ProjectRole, type ProjectVisibility,
} from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectMemberItem {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: ProjectRole;
}

export interface WorkspaceMemberItem {
  userId: string;
  name: string;
  email: string;
  image: string | null;
}

interface AccessManagerProps {
  projectId: string;
  initialVisibility: ProjectVisibility;
  projectMembers: ProjectMemberItem[];
  workspaceMembers: WorkspaceMemberItem[];
  canManage: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ROLE_CONFIG: Record<ProjectRole, { label: string; description: string; color: string }> = {
  LEAD:   { label: "Lead",   description: "Can manage project settings and members", color: "text-primary" },
  MEMBER: { label: "Member", description: "Can view and edit issues",                color: "text-foreground" },
  VIEWER: { label: "Viewer", description: "Read-only access",                        color: "text-muted-foreground" },
};

// ─── Visibility toggle ────────────────────────────────────────────────────────

function VisibilityToggle({
  projectId,
  visibility,
  canManage,
}: {
  projectId: string;
  visibility: ProjectVisibility;
  canManage: boolean;
}) {
  const [current, setCurrent] = useState<ProjectVisibility>(visibility);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function handleChange(val: ProjectVisibility) {
    if (!canManage || val === current) return;
    setStatus("saving");
    startTransition(async () => {
      const result = await updateProjectVisibility(projectId, val);
      if (result.success) {
        setCurrent(val);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2500);
      } else {
        setStatus("error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {(["PUBLIC", "PRIVATE"] as ProjectVisibility[]).map((v) => {
          const isSelected = current === v;
          const Icon = v === "PUBLIC" ? Globe : Lock;
          return (
            <button
              key={v}
              type="button"
              disabled={!canManage || isPending}
              onClick={() => handleChange(v)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-card hover:border-primary/30",
                (!canManage || isPending) && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <div className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  isSelected ? "bg-primary/10" : "bg-muted",
                )}>
                  <Icon className={cn("size-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex size-5 items-center justify-center rounded-full bg-primary"
                  >
                    <CheckCircle2 className="size-3 text-primary-foreground" />
                  </motion.div>
                )}
              </div>
              <div>
                <p className={cn("text-sm font-semibold", isSelected ? "text-foreground" : "text-muted-foreground")}>
                  {v === "PUBLIC" ? "Public" : "Private"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {v === "PUBLIC"
                    ? "All workspace members can access this project"
                    : "Only invited members can access this project"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {status === "saving" && (
          <motion.p key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />Saving…
          </motion.p>
        )}
        {status === "saved" && (
          <motion.p key="saved" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-primary">
            <CheckCircle2 className="size-3.5" />Visibility updated
          </motion.p>
        )}
        {status === "error" && (
          <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-3.5" />Failed to update visibility
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  projectId,
  canManage,
  onRoleChange,
  onRemove,
}: {
  member: ProjectMemberItem;
  projectId: string;
  canManage: boolean;
  onRoleChange: (userId: string, role: ProjectRole) => void;
  onRemove: (userId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const roleCfg = ROLE_CONFIG[member.role];

  function handleRoleChange(role: ProjectRole) {
    startTransition(async () => {
      const result = await updateProjectMemberRole(projectId, member.userId, role);
      if (result.success) onRoleChange(member.userId, role);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeProjectMember(projectId, member.userId);
      if (result.success) onRemove(member.userId);
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={member.image ?? undefined} />
        <AvatarFallback className="text-xs font-semibold">{getInitials(member.name)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
        <span className="text-xs text-muted-foreground truncate">{member.email}</span>
      </div>

      {canManage ? (
        <Select
          value={member.role}
          onValueChange={(v) => handleRoleChange(v as ProjectRole)}
          disabled={isPending}
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(ROLE_CONFIG) as [ProjectRole, typeof ROLE_CONFIG[ProjectRole]][]).map(([role, cfg]) => (
              <SelectItem key={role} value={role}>
                <span className={cn("text-xs", cfg.color)}>{cfg.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="outline" className={cn("text-xs", roleCfg.color)}>
          {roleCfg.label}
        </Badge>
      )}

      {canManage && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member</AlertDialogTitle>
              <AlertDialogDescription>
                Remove <strong>{member.name}</strong> from this project? They will lose access if the project is private.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={handleRemove}>Remove</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AccessManager({
  projectId,
  initialVisibility,
  projectMembers: initialProjectMembers,
  workspaceMembers,
  canManage,
}: AccessManagerProps) {
  const [members, setMembers] = useState<ProjectMemberItem[]>(initialProjectMembers);
  const [addingUserId, setAddingUserId] = useState<string>("none");
  const [addingRole, setAddingRole] = useState<ProjectRole>("MEMBER");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberIds = new Set(members.map((m) => m.userId));
  const availableToAdd = workspaceMembers.filter((m) => !memberIds.has(m.userId));

  function handleRoleChange(userId: string, role: ProjectRole) {
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role } : m));
  }

  function handleRemove(userId: string) {
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  function handleAdd() {
    if (addingUserId === "none") return;
    setAddError(null);
    startTransition(async () => {
      const result = await addProjectMember(projectId, addingUserId, addingRole);
      if (!result.success) { setAddError(result.error ?? "Failed to add member."); return; }

      const ws = workspaceMembers.find((m) => m.userId === addingUserId);
      if (ws) {
        setMembers((prev) => [...prev, { ...ws, role: addingRole }]);
      }
      setAddingUserId("none");
      setIsAdding(false);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Visibility */}
      <div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Visibility</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Control who can see and access this project.
        </p>
        <VisibilityToggle
          projectId={projectId}
          visibility={initialVisibility}
          canManage={canManage}
        />
      </div>

      {/* Members */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Project members</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {initialVisibility === "PRIVATE"
                ? "Only these members can access the project."
                : "These members have explicit roles. All workspace members can also access."}
            </p>
          </div>
          {canManage && availableToAdd.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setIsAdding((v) => !v)}
            >
              <UserPlus className="size-3.5" />
              Add member
            </Button>
          )}
        </div>

        {/* Add member form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="mb-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-card p-3">
                <Select value={addingUserId} onValueChange={setAddingUserId}>
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue placeholder="Select member…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Select a member</SelectItem>
                    {availableToAdd.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
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

                <Select value={addingRole} onValueChange={(v) => setAddingRole(v as ProjectRole)}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ROLE_CONFIG) as [ProjectRole, typeof ROLE_CONFIG[ProjectRole]][]).map(([role, cfg]) => (
                      <SelectItem key={role} value={role}>
                        <span className={cn("text-xs", cfg.color)}>{cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={addingUserId === "none" || isPending}
                  onClick={handleAdd}
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0"
                  onClick={() => { setIsAdding(false); setAddError(null); }}
                >
                  Cancel
                </Button>
              </div>
              {addError && (
                <p className="mt-1.5 text-xs text-destructive">{addError}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Member list */}
        {members.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center"
          >
            <Users className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No explicit members yet</p>
            <p className="text-xs text-muted-foreground/60">
              {initialVisibility === "PUBLIC"
                ? "All workspace members have access."
                : "Add members to grant access to this private project."}
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  projectId={projectId}
                  canManage={canManage}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemove}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Role legend */}
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Shield className="size-3.5" />
            Role permissions
          </div>
          <div className="flex flex-col gap-1.5">
            {(Object.entries(ROLE_CONFIG) as [ProjectRole, typeof ROLE_CONFIG[ProjectRole]][]).map(([role, cfg]) => (
              <div key={role} className="flex items-center gap-2 text-xs">
                <span className={cn("w-12 font-medium", cfg.color)}>{cfg.label}</span>
                <span className="text-muted-foreground">{cfg.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
