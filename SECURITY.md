# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Latest (`main`) | ✅ |
| Older releases | ❌ |

We only provide security fixes for the latest version on the `main` branch.

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, report it responsibly by emailing:

**security@trexo.com**

Include as much detail as possible:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

### What to expect

- **Acknowledgement** within 48 hours
- **Status update** within 5 business days
- **Fix timeline** communicated once the issue is confirmed
- **Credit** in the release notes if you wish (opt-in)

We ask that you give us reasonable time to address the issue before any public disclosure.

---

## Scope

The following are in scope for security reports:

- Authentication and session management
- Authorization and access control bypasses
- SQL injection or data exposure via Prisma queries
- Cross-site scripting (XSS) in the Tiptap editor or comment system
- Server-side request forgery (SSRF)
- Sensitive data exposure (tokens, passwords, PII)

The following are **out of scope**:

- Denial of service attacks
- Issues in third-party dependencies (report those upstream)
- Social engineering attacks
- Physical security

---

## Security Practices

Trexo follows these practices to keep user data safe:

- Passwords hashed with **bcrypt** via Better Auth
- Sessions managed with **secure, httpOnly cookies**
- All database queries use **Prisma parameterized queries** — no raw SQL interpolation
- Environment secrets stored in `.env` — never committed to source control
- OAuth tokens never stored in plaintext
- Route protection at two layers: middleware cookie check + server-side session validation
