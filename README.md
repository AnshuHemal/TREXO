# Trexo

> **Track less. Ship more.**

Trexo is a modern, open-source project management platform built for teams that move fast. It is a full-featured JIRA-style clone built with the latest Next.js, React, and TypeScript — production-ready from day one.

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
| Email | Resend |
| Icons | Lucide React |
| Fonts | Inter · JetBrains Mono |

---

## Features

### Authentication
- Email + password sign-up with **OTP email verification** (6-char alphanumeric, uppercase)
- OAuth sign-in via **GitHub** and **Google**
- Session-based auth with Better Auth
- Route protection via Next.js 16 `proxy.ts` (cookie check) + server-side layout guards
- Automatic redirect: logged-in users are bounced away from auth pages
- Animated OTP input — auto-advance, paste support, shake on error, resend with cooldown

### UI / UX
- Light / dark / system theme toggle with animated Sun ↔ Moon icon
- Framer Motion page entry animations throughout
- Animated brand logo — "TREX" + pill shape that morphs into a circle every 5s
- Fully responsive — mobile-first layout
- Accessible — ARIA labels, keyboard navigation, focus management

### Database
- Full Prisma schema covering the entire JIRA domain model
- Better Auth tables co-located in the same database

---

## Project Structure

```
trexo/
├── prisma/
│   └── schema.prisma          # Full database schema
├── proxy.ts                   # Next.js 16 route protection
├── src/
│   ├── app/
│   │   ├── (auth)/            # /login  /signup  /verify-email
│   │   ├── (dashboard)/       # /dashboard  (protected)
│   │   ├── (marketing)/       # /  (landing page)
│   │   ├── api/auth/[...all]/ # Better Auth catch-all handler
│   │   ├── layout.tsx         # Root layout — fonts, ThemeProvider
│   │   └── not-found.tsx      # 404 page
│   ├── components/
│   │   ├── motion/            # Framer Motion wrappers (FadeIn, StaggerChildren)
│   │   ├── providers/         # ThemeProvider
│   │   ├── shared/            # Header, Logo, ThemeToggle, UserMenu
│   │   └── ui/                # shadcn/ui components (56 components)
│   ├── config/
│   │   └── site.ts            # Central site config — name, URL, metadata
│   ├── lib/
│   │   ├── auth.ts            # Better Auth server instance
│   │   ├── auth-client.ts     # Better Auth browser client
│   │   ├── email.ts           # Resend client + HTML email templates
│   │   ├── prisma.ts          # Prisma singleton
│   │   ├── session.ts         # Server-side session helpers
│   │   └── utils.ts           # cn() utility
│   └── generated/
│       └── prisma/            # Auto-generated Prisma client (gitignored)
```

---

## Database Schema

### Better Auth tables *(required — do not rename)*
`users` · `sessions` · `accounts` · `verifications`

### Application models
| Model | Description |
|---|---|
| `Workspace` | Top-level org container |
| `WorkspaceMember` | User ↔ Workspace join with role (`OWNER` `ADMIN` `MEMBER` `VIEWER`) |
| `Project` | Lives inside a workspace, has a short key (e.g. `TRX`) |
| `Sprint` | Time-boxed iteration (`PLANNED` `ACTIVE` `COMPLETED`) |
| `Issue` | Atomic unit of work — type, status, priority, position, sub-tasks |
| `Label` / `IssueLabel` | Free-form tags on issues |
| `Comment` | Rich-text comments on issues |
| `Activity` | Audit log — records every field change on an issue |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/AnshuHemal/TREXO.git
cd TREXO
npm install
```

### 2. Configure environment variables

Copy the example file and fill in the values:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Better Auth
BETTER_AUTH_SECRET=          # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/trexo

# Resend (email)
RESEND_API_KEY=              # https://resend.com/api-keys
RESEND_FROM_EMAIL=Trexo <noreply@trexo.com>

# OAuth — GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# OAuth — Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 3. Set up the database

Run the first migration to create all tables:

```bash
npm run db:migrate
# When prompted, name it: init
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
  └── POST /api/auth/sign-up/email
        └── Account created (emailVerified: false)
        └── OTP sent via Resend (6-char, uppercase alphanumeric)
        └── Redirect → /verify-email?email=...&password=...

Verify email
  └── POST /api/auth/email-otp/verify-email
        └── emailVerified: true
        └── Auto sign-in → POST /api/auth/sign-in/email
        └── Redirect → /dashboard

Sign in (existing user)
  └── POST /api/auth/sign-in/email  OR  signIn.social({ provider })
        └── Session created
        └── Redirect → /dashboard

Sign out
  └── POST /api/auth/sign-out
        └── Session destroyed
        └── Redirect → /
```

### OAuth callback URLs

Register these in your OAuth app settings:

| Provider | Callback URL |
|---|---|
| GitHub | `http://localhost:3000/api/auth/callback/github` |
| Google | `http://localhost:3000/api/auth/callback/google` |

For production, replace `http://localhost:3000` with your domain.

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

## Route Protection

| Route | Access |
|---|---|
| `/` | Public |
| `/login` `/signup` `/verify-email` | Guest only (redirect to `/dashboard` if logged in) |
| `/dashboard` `/workspace/*` `/settings/*` | Authenticated only (redirect to `/login` if not) |

Protection is two-layered:
1. **`proxy.ts`** — fast cookie-presence check on every request (optimistic, not a security boundary)
2. **Layout guards** — `requireSession()` in `(dashboard)/layout.tsx` performs a real database session validation

---

## Resend Setup

For local development, use `onboarding@resend.dev` as the from address — it works without domain verification but can only send to your own Resend account email.

For production:
1. Go to [resend.com/domains](https://resend.com/domains)
2. Add and verify `trexo.com`
3. Set `RESEND_FROM_EMAIL=Trexo <noreply@trexo.com>`

---

## Roadmap

- [ ] Workspace creation and onboarding flow
- [ ] Project management (create, settings, members)
- [ ] Kanban board with drag-and-drop (`@dnd-kit`)
- [ ] Issue CRUD — detail modal, rich text editor (Tiptap)
- [ ] Sprint management
- [ ] Comments and activity log
- [ ] Real-time updates
- [ ] Notifications
- [ ] Search
- [ ] Forgot password flow
- [ ] Settings pages (profile, workspace, billing)

---

## License

MIT
