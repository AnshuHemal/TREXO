"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { MoreHorizontal, Shield, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateMemberRole, removeMember } from "../actions";
import type { WorkspaceRole } from "@/generated/prisma/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemberItem {
  id: string; // WorkspaceMember.id
  role: WorkspaceRole;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface MembersListProps {
  members: MemberItem[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  workspaceId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ROLE_BADGE_VARIANT: Record<
  WorkspaceRole,
  "default" | "secondary" | "outline"
> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
};

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const ASSIGNABLE_ROLES: WorkspaceRole[] = ["ADMIN", "MEMBER", "VIEWER"];

// ─── Row component ────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: MemberItem;
  canManage: boolean;
  isCurrentUser: boolean;
  index: number;
  onRoleChange: (memberId: string, role: WorkspaceRole) => void;
  onRemove: (memberId: string) => void;
}

function MemberRow({
  member,
  canManage,
  isCurrentUser,
  index,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  const canEdit = canManage && member.role !== "OWNER" && !isCurrentUser;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      {/* Avatar */}
      <Avatar className="size-9 shrink-0">
        <AvatarImage
          src={member.user.image ?? undefined}
          alt={member.user.name}
        />
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(member.user.name)}
        </AvatarFallback>
      </Avatar>

      {/* Name + email */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {member.user.name}
          {isCurrentUser && (
            <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
          )}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {member.user.email}
        </span>
      </div>

      {/* Role badge */}
      <Badge variant={ROLE_BADGE_VARIANT[member.role]} className="shrink-0">
        {ROLE_LABELS[member.role]}
      </Badge>

      {/* Actions */}
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground"
              aria-label={`Actions for ${member.user.name}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Change role
            </DropdownMenuLabel>
            {ASSIGNABLE_ROLES.filter((r) => r !== member.role).map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => onRoleChange(member.id, role)}
                className="flex items-center gap-2"
              >
                <Shield className="size-3.5 text-muted-foreground" />
                {ROLE_LABELS[role]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRemove(member.id)}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <UserMinus className="size-3.5" />
              Remove member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MembersList({
  members: initialMembers,
  currentUserId,
  currentUserRole,
  workspaceId,
}: MembersListProps) {
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const canManage =
    currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  function handleRoleChange(memberId: string, role: WorkspaceRole) {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRole(memberId, role);
      if (!result.success) {
        setError(result.error ?? "Failed to update role.");
        return;
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
      );
    });
  }

  function handleRemove(memberId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeMember(memberId, workspaceId);
      if (!result.success) {
        setError(result.error ?? "Failed to remove member.");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    });
  }

  return (
    <div className="flex flex-col gap-1">
      {error && (
        <p className="mb-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {members.map((member, index) => (
        <MemberRow
          key={member.id}
          member={member}
          canManage={canManage}
          isCurrentUser={member.user.id === currentUserId}
          index={index}
          onRoleChange={handleRoleChange}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}
