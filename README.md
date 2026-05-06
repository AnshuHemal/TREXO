# Trexo

> **Track less. Ship more.**

Trexo is a modern, full-featured project management platform — a production-grade JIRA clone built with Next.js 16, React 19, and TypeScript. Built for teams that move fast.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Runtime | React 19 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (new-york style) |
| Animations | Motion (Framer Motion v12) |
| Authentication | Better Auth v1.6 |
| Database ORM | Prisma 7 |
| Database | PostgreSQL |
| Email | Nodemailer + Brevo SMTP |
| Rich Text | Tiptap (with @mention support) |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| Icons | Lucide React |
| Fonts | Inter · JetBrains Mono |

---

## Features

### Authentication
- Email + password sign-up with **OTP email verification** (6-char alphanumeric, uppercase)
- OAuth sign-in via **GitHub** and **Google**
- Forgot password — 3-step flow: email → OTP → reset
- Session-based auth with Better Auth
- Route protection via Next.js 16 `proxy.ts` + server-side layout guards
- Active session management — view and revoke sessions per device
- Connected accounts — link/unlink OAuth providers

### Workspace
- Multi-workspace support with workspace switcher
- Workspace roles: **OWNER · ADMIN · MEMBER · VIEWER**
- Email invitations with secure token-based acceptance (`/invite/[token]`)
- Workspace settings — rename, change slug, danger zone (delete)
- Workspace-level labels management (name + color picker)
- Workspace-level issue templates (type, priority, title prefix, description)

### Projects
- Create / edit / delete projects with auto-generated keys (e.g. `TRX`)
- **PUBLIC** (all workspace members) or **PRIVATE** (explicit members only) visibility
- Project-level access control — roles: **LEAD · MEMBER · VIEWER**
- Project settings — general, access management, danger zone

### Issues
- Full CRUD with rich text descriptions (Tiptap)
- Issue types: **EPIC · STORY · TASK · BUG · SUBTASK**
- Statuses: **BACKLOG · TODO · IN_PROGRESS · IN_REVIEW · DONE · CANCELLED**
- Priorities: **URGENT · HIGH · MEDIUM · LOW · NO_PRIORITY**
- Assignee, reporter, due dates, story point estimates
- Labels (colored badges), sub-tasks with progress bar
- Issue linking — **BLOCKS · BLOCKED_BY · DUPLICATES · RELATES_TO**
- @mentions in comments (Tiptap Mention extension + Brevo notification email)
- Comment edit / delete, unified activity timeline
- Auto-incrementing issue keys per project (e.g. `TRX-42`)

### Views
- **Kanban Board** — drag-and-drop columns, swimlanes (by assignee or priority), WIP limits, epic badges, priority left-border color coding, filter bar
- **Backlog** — group by (status/priority/assignee), sort by (due date/priority/status/created/updated), bulk actions (status/priority/assignee), inline create per group, column visibility toggles, saved filters (personal + shared)
- **List View** — tabular issue list with inline editing
- **Sprints** — create/start/complete sprints, move incomplete issues to backlog or next sprint, sprint backlog view
- **Roadmap** — horizontal timeline, drag to move/resize sprint bars, epic bars, today line, progress fill
- **My Issues** — cross-project view of issues assigned to the current user

### Sprint Planning
- Sprint capacity planning with story points
- Active sprint widget on workspace dashboard
- Velocity chart (points completed per sprint over time)
- Sprint progress bars with done/total counts

### Workspace Dashboard
- Active sprint widget (progress, days remaining, story points)
- My open issues (top 5)
- Recent activity feed
- Issue status donut chart (Recharts)
- Recently updated issues
- Velocity chart (last 6 completed sprints)
- Stats row: members, projects, total issues

### Team Pages
- **Members** — invite by email, role management, remove members
- **Workload** — per-member open issue count with animated load bars, overdue indicators, story point totals
- **Activity** — full workspace audit log grouped by day, paginated, with actor avatars

### Notifications
- In-app notification bell with unread count badge (30s polling)
- Types: assigned, mentioned, status changed, comment added
- Mark as read / mark all as read
- Per-type notification preferences (toggle on/off)
- "Manage preferences" link in bell dropdown → `/settings/notifications`

### Global Search
- `Cmd+K` / `Ctrl+K` palette
- Searches issues + projects across the workspace
- Filter by status, priority, assignee, project
- Keyboard navigation (↑↓ Enter)

### Keyboard Shortcuts
- `C` — create issue (from anywhere in a project)
- `B` — go to Backlog
- `G B` — go to Board
- `G S` — go to Sprints
- `G R` — go to Roadmap
- `?` — show shortcuts help modal
- `E` — edit issue title (when detail modal is open)
- `A` — assign to me (when detail modal is open)
- `Esc` — close modal

### User Settings
- Profile — name, avatar
- Security — change password, connected OAuth accounts, active sessions
- Notifications — per-type toggles with live persistence

### UI / UX
- Light / dark / system theme toggle
- Animated brand logo — "TREX" + pill morphing into circle
- Motion animations throughout (FadeIn, StaggerChildren, AnimatePresence)
- Accessible — ARIA labels, keyboard navigation, focus management
- Tiptap rich text editor with toolbar (bold, italic, headings, lists, code, task lists)
- `@mention` support in comments with animated member dropdown

---

## Project Structure

```
trexo/
├── prisma/
│   ├── schema.prisma              # Full database schema
│   └── migrations/                # Migration history
├── proxy.ts                       # Next.js 16 route protection (cookie check)
├── src/
│   ├── app/
│   │   ├── (auth)/                # /login /signup /verify-email /forgot-password
│   │   ├── (dashboard)/           # /dashboard — workspace picker
│   │   ├── (marketing)/           # / — landing page
│   │   ├── (onboarding)/          # /onboarding — workspace setup wizard
│   │   ├── (settings)/            # /settings — user profile/security/notifications
│   │   ├── (workspace)/           # /workspace/[slug]/... — main app
│   │   │   └── workspace/[slug]/
│   │   │       ├── page.tsx       # Workspace home dashboard
│   │   │       ├── my-issues/     # Cross-project assigned issues
│   │   │       ├── members/       # Member management + invitations
│   │   │       ├── workload/      # Team workload view
│   │   │       ├── activity/      # Workspace activity log
│   │   │       ├── settings/      # Workspace settings, labels, templates
│   │   │       └── projects/[key]/
│   │   │           ├── page.tsx   # Kanban board (default project view)
│   │   │           ├── backlog/   # Backlog with grouping/sorting/bulk actions
│   │   │           ├── list/      # List view
│   │   │           ├── sprints/   # Sprint management
│   │   │           ├── roadmap/   # Timeline roadmap
│   │   │           └── settings/  # Project settings + access control
│   │   ├── invite/[token]/        # Workspace invitation acceptance
│   │   └── api/
│   │       ├── auth/[...all]/     # Better Auth catch-all
│   │       ├── issues/[id]/       # Issue detail API
│   │       ├── notifications/     # Notifications API (GET + PATCH)
│   │       ├── search/            # Global search API
│   │       └── sse/               # Server-Sent Events (real-time)
│   ├── components/
│   │   ├── editor/                # RichTextEditor, MentionSuggestion
│   │   ├── motion/                # FadeIn, StaggerChildren
│   │   ├── providers/             # ThemeProvider, WorkspaceProvider
│   │   ├── shared/                # Header, Logo, GlobalSearch, NotificationBell,
│   │   │                          # KeyboardShortcutsModal, ShortcutHint,
│   │   │                          # RealtimeIndicator, LabelPicker, UserMenu
│   │   └── ui/                    # 56 shadcn/ui components
│   ├── config/
│   │   └── site.ts                # Central site config
│   ├── hooks/
│   │   ├── use-keyboard-shortcuts.ts
│   │   ├── use-kanban-keyboard.ts
│   │   ├── use-realtime.ts
│   │   ├── use-realtime-issues.ts
│   │   └── use-mobile.ts
│   └── lib/
│       ├── auth.ts                # Better Auth server instance
│       ├── auth-client.ts         # Better Auth browser client
│       ├── email.ts               # Nodemailer + Brevo SMTP (OTP + invite emails)
│       ├── invite-actions.ts      # Workspace invitation server actions
│       ├── notifications.ts       # Notification creation helpers
│       ├── project-access.ts      # Project visibility + access control
│       ├── mentions.ts            # @mention HTML parsing
│       ├── due-date.ts            # Due date utilities
│       ├── issue-config.tsx       # Issue type/status/priority config
│       ├── workflow.ts            # Custom workflow management
│       ├── custom-fields.ts       # Custom field definitions
│       ├── sse.ts                 # SSE event utilities
│       ├── broadcast.ts           # Pub/sub broadcast
│       ├── prisma.ts              # Prisma singleton
│       ├── session.ts             # Server-side session helpers
│       └── utils.ts               # cn() and general utilities
```

---

## Database Schema

### Better Auth tables *(required — do not rename)*
`users` · `sessions` · `accounts` · `verifications`

### Application models

| Model | Description |
|---|---|
| `Workspace` | Top-level organisation container |
| `WorkspaceMember` | User ↔ Workspace join (`OWNER` `ADMIN` `MEMBER` `VIEWER`) |
| `Project` | Lives inside a workspace, has key + visibility + workflow config |
| `ProjectMember` | User ↔ Project join (`LEAD` `MEMBER` `VIEWER`) |
| `Sprint` | Time-boxed iteration (`PLANNED` `ACTIVE` `COMPLETED`) |
| `Issue` | Atomic unit of work — type, status, priority, estimate, custom fields |
| `IssueLink` | Issue relationships (`BLOCKS` `BLOCKED_BY` `DUPLICATES` `RELATES_TO`) |
| `Label` / `IssueLabel` | Free-form coloured tags on issues |
| `Comment` | Rich-text comments on issues |
| `CommentReaction` | Emoji reactions on comments |
| `Activity` | Audit log — records every field change |
| `Notification` | In-app notifications |
| `NotificationPreference` | Per-user notification type toggles |
| `ProjectNotificationMute` | Mute all notifications from a project |
| `SavedFilter` | Named filter presets per project (personal + shared) |
| `IssueTemplate` | Issue templates with default type/priority/description |
| `Invitation` | Workspace invitations with secure token + expiry |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/AnshuHemal/TREXO.git
cd TREXO
npm install
```

### 2. Configure environment variables

```env
# ── App ────────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Better Auth ────────────────────────────────────────────────────────────────
BETTER_AUTH_SECRET=          # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# ── Database (PostgreSQL) ──────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/trexo

# ── Brevo SMTP (email) ────────────────────────────────────────────────────────
# Get from: brevo.com → SMTP & API → SMTP tab
BREVO_SMTP_USER=             # Login shown on SMTP settings page
BREVO_SMTP_PASS=             # SMTP key (starts with xsmtpsib-)
EMAIL_FROM=Trexo <noreply@yourdomain.com>

# ── OAuth — GitHub ─────────────────────────────────────────────────────────────
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ── OAuth — Google ─────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 3. Set up the database

```bash
npm run db:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Scripts

| Command | Description |
|---|---|
| `npm run db:generate` | Regenerate the Prisma client after schema changes |
| `npm run db:migrate` | Create and apply a new migration |
| `npm run db:push` | Push schema directly without a migration file (prototyping) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:reset` | Wipe and re-apply all migrations |

---

## Authentication Flow

```
Sign up
  └── Account created (emailVerified: false)
  └── OTP sent via Brevo SMTP (6-char, uppercase alphanumeric)
  └── Redirect → /verify-email

Verify email
  └── emailVerified: true → auto sign-in → /dashboard

Sign in (existing user)
  └── Email/password  OR  OAuth (GitHub / Google)
  └── Session created → /dashboard → /workspace/[slug]

Forgot password
  └── Enter email → OTP sent → verify OTP → set new password

Workspace invitation
  └── OWNER/ADMIN sends invite → Brevo email with /invite/[token]
  └── Recipient clicks link → accepts → added to workspace
```

### OAuth callback URLs

| Provider | Callback URL |
|---|---|
| GitHub | `http://localhost:3000/api/auth/callback/github` |
| Google | `http://localhost:3000/api/auth/callback/google` |

---

## Email Setup (Brevo)

1. Sign up at [brevo.com](https://brevo.com) — free, 300 emails/day
2. Go to **SMTP & API → SMTP** tab
3. Copy the **Login** and generate an **SMTP key**
4. Add to `.env` as `BREVO_SMTP_USER` and `BREVO_SMTP_PASS`
5. Go to **Senders & IPs → Senders** — add and verify your sender email
6. Set `EMAIL_FROM` to that verified address

Brevo handles:
- OTP verification emails
- Password reset emails
- Workspace invitation emails

---

## Route Protection

| Route | Access |
|---|---|
| `/` | Public |
| `/login` `/signup` `/verify-email` `/forgot-password` | Guest only |
| `/dashboard` `/workspace/*` `/settings/*` `/onboarding` | Authenticated only |
| `/invite/[token]` | Public (redirects to login if not authenticated) |

Protection is two-layered:
1. **`proxy.ts`** — fast cookie-presence check on every request
2. **Layout guards** — `requireUser()` performs real database session validation

---

## OTP Configuration

| Setting | Value |
|---|---|
| Length | 6 characters |
| Charset | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous `0/O`, `1/I`) |
| Expiry | 10 minutes |
| Max attempts | 5 |
| Resend strategy | Reuse same OTP within expiry window |
| Resend cooldown | 60 seconds |

---

## License

MIT
