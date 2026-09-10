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

## First run

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. At minimum you need `AUTH_SECRET`, `APP_URL` and `SETUP_TOKEN`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"   # SETUP_TOKEN
```

Then:

```bash
npm run build && npm start
```

The portal starts **completely empty — there is no seed or demo data.** Visit `/setup`
(any other URL redirects you there) and create the first administrator using your
`SETUP_TOKEN`. That page seals itself permanently the moment an account exists, so it
cannot be used to hijack the studio later.

From there, everything is real: invite your mentors and interns from **Admin →
Invitations**, create projects on the **Projects** page, and assign tasks from **Tasks**.

## Email

Verification codes, password resets and invitations go out over SMTP. Set `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`, then confirm the connection at
**Admin → Invitations → Email delivery**, which runs a live check against your server.

In production, a missing or broken SMTP configuration is a hard error rather than a
silent no-op — a verification code that vanishes is indistinguishable, to the person
waiting for it, from a broken product. In development with no SMTP set, messages are
printed to the console and appended to `data/outbox.log` so flows stay walkable.

Common settings:

| Provider | Host | Port |
| --- | --- | --- |
| Zoho (India) | `smtp.zoho.in` | 465 |
| Zoho (global) | `smtp.zoho.com` | 465 |
| Google Workspace | `smtp.gmail.com` | 465 (needs an App Password) |
| Microsoft 365 | `smtp.office365.com` | 587 |

## Deploying

Built for a single long-lived Node process — a VPS, Railway, Render, or any host that
runs `npm start` continuously.

```bash
npm ci
npm run build
npm start          # put this behind a process manager, e.g. pm2 or a systemd unit
```

Put Nginx or Caddy in front for TLS, and set `APP_URL` to the real https address —
invitation and reset links are built from it. It is read at runtime (not baked into
the build), and in production the portal refuses to start a send without it rather
than emailing broken localhost links.

**Back up `data/portal.db`.** It holds every account, timesheet and piece of feedback.
SQLite in WAL mode also writes `portal.db-wal` and `portal.db-shm`; the simplest correct
backup is:

```bash
sqlite3 data/portal.db ".backup '/backups/portal-$(date +%F).db'"
```

This is **not** suitable for serverless hosts (Vercel, Netlify): their filesystem is
wiped between invocations, so the database would disappear. If you move there, replace
`read()`/`mutate()` in `src/lib/db/store.ts` with a Postgres-backed implementation — they
are the entire persistence interface — and move the rate limiter
(`src/lib/auth/rate-limit.ts`, currently process-local) to Redis.

## Testing

```bash
npm run typecheck
npm run build
npm run test:e2e      # drives a real browser against a throwaway database
```

The end-to-end test provisions its own empty SQLite file, runs first-run setup, then
walks the real flows: inviting a mentor and an intern, accepting an invitation, public
sign-up with a wrong-then-right verification code, the pending lobby, every signed-in
route, role enforcement and mobile layout. It never touches your live database.

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
  proxy.ts             fast-path redirect for signed-out visitors
```

### Security

- **Passwords** — scrypt (N=16384) with a 16-byte per-account salt, compared in constant time. No native dependency.
- **Sessions** — server-side records referenced by an HTTP-only, SameSite=Lax, `Secure`-in-production cookie carrying an HMAC signature, so a guessed or forged session id is rejected before any lookup. 30-day expiry, revocable per device.
- **Tokens and codes** — invitation tokens and email codes are stored only as HMAC digests; the plaintext exists solely in the email.
- **Rate limiting** — per-account throttling on sign-in, sign-up, verification, resend and reset.
- **Authority** — `proxy.ts` (Next 16's rename of Middleware) only checks for a cookie's presence, because it runs on the edge runtime where scrypt isn't available. Every protected page independently validates the signature, the session record and the user's status via `requireAuth()`/`requireRole()`.
- **Audit** — every security-relevant action is recorded with actor, target, IP and metadata.
- **Escalation guards** — the last active admin cannot be demoted or suspended; suspending a user revokes their sessions immediately; changing a password signs out every other device.

`AUTH_SECRET` is mandatory in production — the app refuses to start without it. In
development it falls back to a fixed dev secret.

### Data layer

SQLite (`data/portal.db`, WAL mode) is the durable source of truth. The working set is
held in memory so reads never touch the disk, and every mutation is flushed inside a
single transaction — a crash or power cut cannot leave a half-written state. Layout is
one table per collection, one row per entity.

`read()` and `mutate()` in `src/lib/db/store.ts` are the entire persistence interface, so
swapping in Postgres later means reimplementing two functions and nothing else.

### Design

A hand-built system in `src/app/globals.css` — no CSS framework. Near-black warm
canvas (`#0b0b0c`), gold accent (`#c9a227`), an editorial serif (Fraunces) for display
type over Inter for everything else, hairline borders, glass panels, and restrained
fade-up motion that respects `prefers-reduced-motion`. Fonts are linked rather than
bundled, and fall back to system serif/sans stacks if the CDN is unreachable, so the
app builds and renders in networkless environments.

Every colour, radius, shadow and type step is a custom property at the top of the
stylesheet — retheming to different brand colours is a token edit, not a rewrite.
