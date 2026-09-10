# Ayava Creatives — Intern Portal

A private, self-contained portal for the Ayava Creatives internship programme, separate
from the public ayavacreatives.com site. It gives interns their briefs, hours,
deliverables and feedback in one place, gives mentors a review queue, and gives the
studio an admin console — behind a Clerk-style authentication system built in-house.

---

## What's inside

**Authentication (Clerk-shaped, no third-party dependency)**

| Flow | Route | Notes |
| --- | --- | --- |
| Sign in | `/sign-in` | Email + password, throttled, with a demo-account chooser |
| Apply / sign up | `/sign-up` | Creates a *pending* applicant with a live password-strength meter |
| Verify email | `/verify` | Six-digit code, 15-minute expiry, six attempts |
| Forgot / reset password | `/forgot-password`, `/reset-password` | Code-based; resets revoke every existing session |
| Accept invitation | `/invite/[token]` | Invited people skip verification and land active |
| Pending lobby | `/pending` | Verified applicants wait here until an admin activates them |

Component API mirrors Clerk's, so the calling code reads the same:

```tsx
<SignedIn>…</SignedIn>
<SignedOut>…</SignedOut>
<Protect role="mentor" fallback={…}>…</Protect>
<UserButton user={user} />

const { user, session } = await requireAuth();   // any signed-in user
const { user } = await requireRole("admin");     // role-gated page
```

**The portal**

- **Dashboard** — hours sparkline, open tasks, approved-hours total, average rating, live clock-in widget, week-one onboarding checklist (interns only), studio announcements.
- **Tasks** — board and list views, filters, priorities, due-date pressure, threaded comments, mentor sign-off.
- **Projects** — client work with progress, team, hours and linked tasks.
- **Timesheet** — clock in/out with a live timer, manual entries, week navigation, submit-for-approval, approved-hours ledger.
- **Submissions** — hand in deliverables as links, get a 1–5 rating plus written feedback back.
- **Review queue** (mentors/admins) — deliverables, task sign-offs and timesheets in one pass, with bulk week approval.
- **Announcements, Resources, Directory** — studio playbook and who's who.
- **Profile & Settings** — public profile, password change, and active-device sessions with per-device revoke.
- **Admin console** — studio analytics, user management (roles, mentors, approve/suspend), invitations with a dev outbox, and a full audit log.

## Roles

`intern` → `mentor` → `admin`, ranked. An intern sees only their own work; a mentor also
sees their mentees'; an admin sees everything. The rule lives in one place
(`visibleUserIds` in `src/lib/queries.ts`) and every read goes through it.

## Getting started

```bash
npm install
cp .env.example .env.local          # then set AUTH_SECRET
npm run dev                         # http://localhost:3000
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The datastore seeds itself on first request with a full demo cohort — 9 people,
4 projects, 12 tasks, 45 time entries, submissions with real feedback.

**Demo accounts** (password for all: `AyavaStudio2026`)

| Role | Email |
| --- | --- |
| Admin | `studio@ayavacreatives.com` |
| Mentor | `priya@ayavacreatives.com`, `daniel@…`, `sofia@…` |
| Intern | `arjun@ayavacreatives.com`, `maya@…`, `leo@…`, `hana@…`, `noah@…` |

`npm run seed` clears the datastore so it rebuilds from seed on the next request.

## No email is sent

Verification codes, password resets and invitation links are written to
`data/outbox.json` and printed to the server console. The admin console surfaces them
at **Admin → Invitations → Dev outbox**, so every flow is walkable without an SMTP
account. To go live, replace `deliver()` in `src/lib/mail.ts` with your provider —
nothing else calls out.

## Testing

```bash
npm run typecheck
npm run build
npm start &
npm run test:e2e      # 33 checks through a real browser
```

The end-to-end test drives sign-in, all 14 signed-in routes, task/project detail,
sending and accepting an invitation, self sign-up with a wrong-then-right verification
code, the pending lobby, role enforcement and mobile layout. It writes to the datastore
— point it at a disposable one.

`PW_CHROMIUM=/path/to/chrome` uses a system Chromium instead of a downloaded one.

## Architecture

```
src/
  app/
    page.tsx           marketing landing
    (auth)/            split-screen credential screens
    (app)/             protected shell — sidebar, topbar, every portal page
  components/
    clerk/             SignedIn · SignedOut · Protect
    app/               shell — sidebar, topbar, UserButton, wordmark
    ui/                design-system primitives
  lib/
    auth/              crypto · session · guards · actions · rate-limit
    db/                schema · store · seed
    actions/           tasks · time · submissions · profile · admin
    queries.ts         every read, with visibility rules applied
    format.ts          dates, hours, durations
  middleware.ts        fast-path redirect for signed-out visitors
```

### Security

- **Passwords** — scrypt (N=16384) with a 16-byte per-account salt, compared in constant time. No native dependency.
- **Sessions** — server-side records referenced by an HTTP-only, SameSite=Lax, `Secure`-in-production cookie carrying an HMAC signature, so a guessed or forged session id is rejected before any lookup. 30-day expiry, revocable per device.
- **Tokens and codes** — invitation tokens and email codes are stored only as HMAC digests; the plaintext exists solely in the email.
- **Rate limiting** — per-account throttling on sign-in, sign-up, verification, resend and reset.
- **Authority** — `middleware.ts` only checks for a cookie's presence (it runs on the edge runtime, where scrypt isn't available). Every protected page independently validates the signature, the session record and the user's status via `requireAuth()`/`requireRole()`.
- **Audit** — every security-relevant action is recorded with actor, target, IP and metadata.
- **Escalation guards** — the last active admin cannot be demoted or suspended; suspending a user revokes their sessions immediately; changing a password signs out every other device.

`AUTH_SECRET` is mandatory in production — the app refuses to start without it. In
development it falls back to a fixed dev secret.

### Data layer

Everything persists to one JSON document (`data/db.json`), read into memory once and
written atomically (temp file + rename). It is deliberately the only module that knows
how persistence works: `read()` and `mutate()` in `src/lib/db/store.ts` are the entire
interface, so moving to Postgres/Prisma means reimplementing those two functions and
nothing else.

This suits a cohort-sized portal (tens of users) on a single long-lived Node process.
Before scaling past that — or deploying to serverless, where the filesystem isn't
durable — swap the store for a real database and move the rate limiter
(`src/lib/auth/rate-limit.ts`, currently process-local) to Redis.

### Design

A hand-built system in `src/app/globals.css` — no CSS framework. Near-black warm
canvas (`#0b0b0c`), gold accent (`#c9a227`), an editorial serif (Fraunces) for display
type over Inter for everything else, hairline borders, glass panels, and restrained
fade-up motion that respects `prefers-reduced-motion`. Fonts are linked rather than
bundled, and fall back to system serif/sans stacks if the CDN is unreachable, so the
app builds and renders in networkless environments.

Every colour, radius, shadow and type step is a custom property at the top of the
stylesheet — retheming to different brand colours is a token edit, not a rewrite.
