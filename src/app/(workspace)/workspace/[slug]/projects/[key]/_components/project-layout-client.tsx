"use client";

import { useState } from "react";
import { ProjectShortcutsProvider } from "./project-shortcuts-provider";
import { CreateIssueDialog } from "../issues/_components/create-issue-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface ProjectLayoutClientProps {
  children: React.ReactNode;
  workspaceSlug: string;
  projectId: string;
  projectKey: string;
  members: Member[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectLayoutClient({
  children,
  workspaceSlug,
  projectId,
  projectKey,
  members,
}: ProjectLayoutClientProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <ProjectShortcutsProvider
      workspaceSlug={workspaceSlug}
      projectKey={projectKey}
      onCreateIssue={() => setCreateOpen(true)}
    >
      {children}

      {/* Global create issue dialog — triggered by "C" shortcut */}
      <CreateIssueDialog
        projectId={projectId}
        projectKey={projectKey}
        workspaceSlug={workspaceSlug}
        members={members}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </ProjectShortcutsProvider>
  );
}
