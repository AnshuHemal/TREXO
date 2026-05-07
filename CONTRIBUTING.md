# Contributing to Trexo

Thank you for your interest in contributing. This document covers everything you need to get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create a branch** for your change (`git checkout -b feat/your-feature`)
4. **Make your changes**, commit, and push
5. **Open a Pull Request** against the `main` branch

---

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+

### Steps

```bash
git clone https://github.com/YOUR_USERNAME/trexo.git
cd trexo
npm install
cp .env.example .env
```

Fill in your `.env` values (database URL, Better Auth secret, OAuth credentials, Brevo SMTP).

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Making Changes

### Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/description` | `feat/issue-watcher` |
| Bug fix | `fix/description` | `fix/kanban-drag` |
| Docs | `docs/description` | `docs/api-reference` |
| Refactor | `refactor/description` | `refactor/auth-flow` |

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add issue watcher / follow feature
fix: resolve kanban drag-and-drop on mobile
docs: update README with new views
chore: bump better-auth to 1.6.9
```

### Schema changes

If your change requires a database schema update:

```bash
npm run db:migrate
```

Commit the generated migration file alongside your code changes.

---

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Run `npm run build` locally — the PR must build without errors
3. Run `npm run lint` and fix any issues
4. Fill in the PR template completely
5. Link any related issues using `Closes #123`
6. Request a review from a maintainer

PRs that break the build, introduce TypeScript errors, or skip the template will not be merged.

---

## Code Style

- **TypeScript** — strict mode, no `any` unless absolutely necessary
- **Tailwind CSS** — use theme tokens (`text-primary`, `bg-muted`) — no hardcoded colors
- **Animations** — use `motion/react` (not `framer-motion`)
- **Server Actions** — all mutations in `actions.ts` files with `"use server"` directive
- **Navigation** — use `window.location.href` for post-action redirects, not `router.push`
- **No comments** — code should be self-documenting; avoid inline comments

---

## Reporting Bugs

Open a [Bug Report issue](../../issues/new?template=bug_report.md) and include:

- Steps to reproduce
- Expected vs actual behavior
- Browser and OS
- Screenshots or screen recordings if relevant

---

## Requesting Features

Open a [Feature Request issue](../../issues/new?template=feature_request.md) and describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

---

## Questions?

Open a [GitHub Discussion](../../discussions) or reach out on [Twitter](https://twitter.com/trexo_app).
