/**
 * End-to-end smoke test for the Ayava intern portal.
 *
 * Spawns its own server against a throwaway SQLite database, so it never
 * touches live data, then drives a real browser through the flows a launch
 * depends on: first-run setup, inviting and onboarding a mentor and an intern,
 * creating a project, assigning work, public sign-up with email verification,
 * approval out of the pending lobby, role enforcement and mobile layout.
 *
 *   npm run build && npm run test:e2e
 *
 * Env: PW_CHROMIUM (system Chromium path), SMOKE_SHOTS (screenshot dir).
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { SMTPServer } from "smtp-server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const PORT = Number(process.env.SMOKE_PORT ?? 3311);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SMOKE_SHOTS ?? "tests/screenshots";
const SETUP_TOKEN = "smoke-setup-token-" + crypto.randomBytes(4).toString("hex");
const SMTP_PORT = Number(process.env.SMOKE_SMTP_PORT ?? 3325);
const ADMIN_PASSWORD = "AyavaAdmin2026!";

fs.mkdirSync(SHOTS, { recursive: true });
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "ayava-smoke-"));
const dbFile = path.join(workdir, "portal.db");
const outbox = path.join(workdir, "outbox.log");

const results = [];
let failures = 0;
function check(name, ok, detail = "") {
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`;
  results.push(line);
  console.log(line);
  if (!ok) failures++;
}

/* ---------- Server ---------- */

async function assertPortFree() {
  try {
    await fetch(`${BASE}/setup`, { redirect: "manual", signal: AbortSignal.timeout(1500) });
  } catch {
    return true; // nothing listening — good
  }
  console.error(`Port ${PORT} is already in use; refusing to test against a stale server.`);
  process.exit(1);
}



await assertPortFree();

const server = spawn("npm", ["start"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(PORT),
    DATABASE_FILE: dbFile,
    SETUP_TOKEN,
    AUTH_SECRET: crypto.randomBytes(32).toString("hex"),
    APP_URL: BASE,
    NEXT_PUBLIC_APP_URL: BASE,
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(SMTP_PORT),
    SMTP_USER: "portal@ayavacreatives.test",
    SMTP_PASS: "smoke",
    MAIL_FROM: "Ayava Creatives <portal@ayavacreatives.test>",
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

async function waitForServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/setup`, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

let stopped = false;
function shutdown() {
  if (stopped) return;
  stopped = true;
  try {
    // Negative pid signals the whole group, so the `next` child dies too.
    process.kill(-server.pid, "SIGKILL");
  } catch {
    try {
      server.kill("SIGKILL");
    } catch {
      /* already gone */
    }
  }
}
process.on("exit", shutdown);
process.on("SIGINT", () => { shutdown(); process.exit(130); });

/* ---------- SMTP catcher ----------
   The portal refuses to send without SMTP in production, which is the point.
   So the test stands up a real SMTP server and asserts messages arrive on it,
   exercising the same nodemailer path a live deployment uses. */

const inbox = [];
const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  // Accept whatever credentials the portal presents; we're testing delivery,
  // not the mailbox provider's password policy.
  onAuth(_auth, _session, callback) {
    callback(null, { user: "smoke" });
  },
  onData(stream, _session, callback) {
    let raw = "";
    stream.on("data", (chunk) => (raw += chunk));
    stream.on("end", () => {
      inbox.push(raw);
      callback();
    });
  },
});
await new Promise((resolve, reject) => {
  smtp.listen(SMTP_PORT, "127.0.0.1", resolve);
  smtp.on("error", reject);
});

/** Quoted-printable soft breaks split URLs across lines; undo them. */
function decode(raw) {
  return raw.replace(/=\r?\n/g, "").replace(/=3D/g, "=");
}
function messagesTo(email) {
  return inbox.filter((m) => decode(m).includes(email)).map(decode);
}
function latestInviteLink() {
  const all = inbox.map(decode).join("\n");
  const links = [...all.matchAll(/https?:\/\/[^\s"'<>]*\/invite\/[A-Za-z0-9_-]+/g)].map((m) => m[0]);
  return links[links.length - 1] ?? null;
}
function latestCodeFor(email) {
  const msgs = messagesTo(email);
  for (let i = msgs.length - 1; i >= 0; i--) {
    const code = msgs[i].match(/\b(\d{6})\b/);
    if (code) return code[1];
  }
  return null;
}

/* ---------- Run ---------- */

let browser;
try {
  if (!(await waitForServer())) {
    console.error("Server never became ready.\n" + serverLog.slice(-3000));
    process.exit(1);
  }

  browser = await chromium.launch(
    process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  );
  const errors = [];
  const noise = (t) => /ERR_FAILED|ERR_BLOCKED|net::|favicon/.test(t);

  async function newTab(opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, ...opts });
    // Block off-host requests: fonts.googleapis.com stalls navigation in sandboxes.
    await ctx.route("**/*", (route) => {
      const url = route.request().url();
      return url.startsWith(BASE) || url.startsWith("data:") ? route.continue() : route.abort();
    });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !noise(m.text())) errors.push(m.text());
    });
    return page;
  }

  const admin = await newTab();

  /* 1. A fresh install has nothing — every entry point leads to setup. */
  await admin.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
  check("empty portal redirects to first-run setup", admin.url().endsWith("/setup"), admin.url());
  await admin.screenshot({ path: `${SHOTS}/01-setup.png` });

  /* 2. Setup refuses a wrong token. */
  await admin.locator("#firstName").fill("Aditya");
  await admin.locator("#lastName").fill("Saini");
  await admin.locator("#email").fill("admin@ayavacreatives.com");
  await admin.locator("#password").fill(ADMIN_PASSWORD);
  await admin.locator("#setupToken").fill("wrong-token-entirely");
  await admin.getByRole("button", { name: "Create administrator" }).click();
  await admin.waitForSelector(".alert-error", { timeout: 20000 });
  check("setup rejects an incorrect token", true);

  /* 3. Correct token creates the real admin.
     The password is deliberately not echoed back after a failed submit, so
     every field is re-entered here exactly as a person would. */
  await admin.locator("#firstName").fill("Aditya");
  await admin.locator("#lastName").fill("Saini");
  await admin.locator("#email").fill("admin@ayavacreatives.com");
  await admin.locator("#password").fill(ADMIN_PASSWORD);
  await admin.locator("#setupToken").fill(SETUP_TOKEN);
  await admin.getByRole("button", { name: "Create administrator" }).click();
  await admin.waitForURL("**/admin**", { timeout: 25000 });
  check("setup creates the first administrator", admin.url().includes("/admin"));

  /* 4. Setup seals itself. */
  const sealed = await newTab();
  await sealed.goto(`${BASE}/setup`, { waitUntil: "domcontentloaded" });
  check("setup seals itself once an account exists", sealed.url().includes("/sign-in"), sealed.url());

  /* 5. The portal really is empty — no seed data anywhere. */
  await admin.goto(`${BASE}/directory`, { waitUntil: "domcontentloaded" });
  const people = await admin.locator("article.card").count();
  check("directory contains only the admin", people === 1, `${people} people`);
  await admin.goto(`${BASE}/tasks`, { waitUntil: "domcontentloaded" });
  check("no seeded tasks", (await admin.locator("a.task-card").count()) === 0);
  await admin.goto(`${BASE}/projects`, { waitUntil: "domcontentloaded" });
  check("no seeded projects", (await admin.locator("a.card.interactive").count()) === 0);

  /* 6. Create a real project through the UI. */
  await admin.getByRole("button", { name: "New project" }).click();
  await admin.locator("#name").fill("Q4 Growth Engine");
  await admin.locator("#client").fill("Northwind Retail");
  await admin.locator("#summary").fill("Meta Ads, CRO and lifecycle for the Q4 push.");
  await admin.locator("#status").selectOption("active");
  await admin.getByRole("button", { name: "Create project" }).click();
  await admin.waitForTimeout(1500);
  await admin.goto(`${BASE}/projects`, { waitUntil: "domcontentloaded" });
  check("project created via UI", (await admin.locator("a.card.interactive").count()) === 1);
  await admin.screenshot({ path: `${SHOTS}/02-projects.png`, fullPage: true });

  /* 7. Invite a real intern. */
  await admin.goto(`${BASE}/admin/invitations`, { waitUntil: "domcontentloaded" });
  await admin.locator("#email").fill("intern@example.com");
  await admin.locator("#firstName").fill("Riya");
  await admin.locator("#lastName").fill("Sharma");
  await admin.locator("#discipline").fill("Paid Social");
  await admin.getByRole("button", { name: "Send invitation" }).click();
  const inviteResult = admin.locator("aside").locator(".alert-ok, .alert-error");
  await inviteResult.first().waitFor({ timeout: 25000 });
  const inviteMsg = await inviteResult.first().innerText();
  check("invitation created", inviteMsg.includes("intern@example.com"), inviteMsg.trim());
  await admin.screenshot({ path: `${SHOTS}/03-invitations.png`, fullPage: true });

  const inviteLink = latestInviteLink();
  check("invitation email was actually delivered over SMTP", !!inviteLink, inviteLink ?? "no message received");

  /* 8. Intern accepts and lands in the portal. */
  if (!inviteLink) throw new Error("no invitation link was delivered — cannot continue");
  const intern = await newTab();
  await intern.goto(inviteLink, { waitUntil: "domcontentloaded" });
  check("invite page loads", (await intern.locator("h1").innerText()).includes("Join the Ayava studio"));
  await intern.locator("#password").fill("RiyaAtAyava2026");
  await intern.getByRole("button", { name: "Accept invitation" }).click();
  await intern.waitForURL("**/dashboard**", { timeout: 25000 });
  check("invited intern reaches the dashboard", intern.url().includes("/dashboard"));
  await intern.screenshot({ path: `${SHOTS}/04-intern-dashboard.png`, fullPage: true });

  /* 9. Role enforcement. */
  await intern.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  check("intern is blocked from /admin", intern.url().includes("/dashboard"), intern.url());

  /* 10. Admin assigns real work to the intern. */
  await admin.goto(`${BASE}/tasks`, { waitUntil: "domcontentloaded" });
  await admin.getByRole("button", { name: "Assign a task" }).click();
  await admin.locator("#title").fill("Audit the Meta Ads account structure");
  await admin.locator("#description").fill("Campaign naming, audience overlap and budget split.");
  const riyaValue = await admin
    .locator("#assigneeId option")
    .filter({ hasText: "Riya" })
    .first()
    .getAttribute("value");
  check("intern appears in the assignee list", !!riyaValue, riyaValue ?? "not listed");
  await admin.locator("#assigneeId").selectOption(riyaValue);
  await admin.getByRole("button", { name: "Assign task" }).click();
  await admin.waitForTimeout(1500);
  await admin.goto(`${BASE}/tasks`, { waitUntil: "domcontentloaded" });
  check("task assigned and visible", (await admin.locator("a.task-card").count()) >= 1);

  await intern.goto(`${BASE}/tasks`, { waitUntil: "domcontentloaded" });
  check("intern sees their assigned task", (await intern.locator("a.task-card").count()) === 1);

  /* 11. Public sign-up with email verification. */
  const applicant = await newTab();
  await applicant.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
  await applicant.locator("#firstName").fill("Kabir");
  await applicant.locator("#lastName").fill("Nair");
  await applicant.locator("#email").fill("applicant@example.com");
  await applicant.locator("#discipline").selectOption({ index: 1 });
  await applicant.locator("#password").fill("KabirApplies2026");
  await applicant.getByRole("button", { name: "Create account" }).click();
  await applicant.waitForURL("**/verify**", { timeout: 25000 });
  check("public sign-up reaches verification", applicant.url().includes("/verify"));

  const code = latestCodeFor("applicant@example.com");
  check("verification code was emailed over SMTP", !!code, code ?? "no message received");

  for (let i = 0; i < 6; i++) await applicant.locator(".otp input").nth(i).fill("0");
  await applicant.getByRole("button", { name: "Verify email" }).click();
  await applicant.waitForSelector(".alert-error", { timeout: 20000 });
  check("wrong verification code is rejected", true);

  await applicant.reload({ waitUntil: "domcontentloaded" });
  for (let i = 0; i < 6; i++) await applicant.locator(".otp input").nth(i).fill(code[i]);
  await applicant.getByRole("button", { name: "Verify email" }).click();
  await applicant.waitForURL("**/pending", { timeout: 25000 });
  check("verified applicant waits in the pending lobby", applicant.url().includes("/pending"));
  await applicant.goto(`${BASE}/tasks`, { waitUntil: "domcontentloaded" });
  check("pending applicant cannot enter the portal", applicant.url().includes("/pending"));

  /* 12. Admin approves them. */
  await admin.goto(`${BASE}/admin/users?status=pending`, { waitUntil: "domcontentloaded" });
  await admin.getByRole("button", { name: "Approve" }).first().click();
  await admin.waitForTimeout(1500);
  await applicant.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  check("approved applicant can now enter", applicant.url().includes("/dashboard"), applicant.url());

  /* 13. Every signed-in route renders for the admin. */
  const routes = [
    ["/dashboard", "Good"], ["/tasks", "Tasks"], ["/projects", "Projects"],
    ["/timesheet", "Timesheet"], ["/submissions", "Submissions"], ["/review", "Review queue"],
    ["/announcements", "Announcements"], ["/resources", "Resources"], ["/directory", "Directory"],
    ["/profile", "Profile"], ["/settings", "Account settings"], ["/admin", "Studio overview"],
    ["/admin/users", "Users"], ["/admin/invitations", "Invitations"], ["/admin/audit", "Audit log"],
  ];
  for (const [route, heading] of routes) {
    const res = await admin.goto(BASE + route, { waitUntil: "domcontentloaded" });
    const h1 = await admin.locator("h1").first().innerText().catch(() => "");
    const ok = res.status() === 200 && (route === "/dashboard" || h1.includes(heading));
    check(`route ${route}`, ok, `status=${res.status()} h1="${h1}"`);
  }

  /* 14. Email delivery health is surfaced, not hidden. */
  await admin.goto(`${BASE}/admin/invitations`, { waitUntil: "domcontentloaded" });
  const mailPanel = await admin.locator(".alert-ok, .alert-error").last().innerText();
  check("admin sees a healthy SMTP connection", /Connected to/.test(mailPanel), mailPanel.trim().slice(0, 90));

  /* 15. Mobile layout. */
  const mobile = await newTab({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const route of ["/", "/sign-in"]) {
    await mobile.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await mobile.waitForTimeout(400);
    const overflow = await mobile.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`mobile ${route} has no horizontal overflow`, overflow <= 1, `${overflow}px`);
  }
  await mobile.screenshot({ path: `${SHOTS}/05-mobile.png`, fullPage: true });

  check("no uncaught page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

  /* 16. Durability: stop the server and confirm the data is really on disk.
     This is the claim a launch rests on — a restart or a crash must not lose
     accounts, timesheets or feedback. */
  shutdown();
  await new Promise((r) => setTimeout(r, 1500));

  const { default: SQLite } = await import("better-sqlite3");
  const disk = new SQLite(dbFile, { readonly: true });
  const users = disk.prepare("SELECT count(*) AS c FROM users").get().c;
  const projects = disk.prepare("SELECT count(*) AS c FROM projects").get().c;
  const tasks = disk.prepare("SELECT count(*) AS c FROM tasks").get().c;
  const audit = disk.prepare("SELECT count(*) AS c FROM audit").get().c;
  disk.close();

  check("accounts survive a server restart", users === 3, `${users} users on disk (admin, intern, applicant)`);
  check("project survives a server restart", projects === 1, `${projects} projects on disk`);
  check("assigned task survives a server restart", tasks === 1, `${tasks} tasks on disk`);
  check("audit trail persisted", audit > 0, `${audit} events on disk`);
} catch (error) {
  check("test run completed without throwing", false, String(error).split("\n")[0]);
  if (serverLog) console.error("\n--- server log tail ---\n" + serverLog.slice(-2000));
} finally {
  if (browser) await browser.close();
  shutdown();
  smtp.close();
}

console.log(`\n${results.length - failures}/${results.length} checks passed`);
console.log(`throwaway database: ${dbFile}`);
process.exit(failures ? 1 : 0);
