/**
 * End-to-end smoke test for the Ayava intern portal.
 *
 * Drives a real browser through every flow that matters: sign-in, the whole
 * signed-in surface, task and project detail, sending and accepting an
 * invitation, self sign-up with email verification (including a wrong code),
 * the pending lobby, role enforcement and mobile layout.
 *
 * Run against a started server:  npm run build && npm start & npm run test:e2e
 * Env: SMOKE_BASE_URL, SMOKE_SHOTS, PW_CHROMIUM
 *
 * It writes to the datastore, so point it at a disposable database
 * (`npm run seed` first), never a live one.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SMOKE_SHOTS ?? "tests/screenshots";
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`;
  results.push(line);
  console.log(line);
  if (!ok) failures++;
}


// This sandbox blocks outbound HTTPS, and the hung font requests stall
// navigation waits. Block anything that isn't the app under test.
async function isolate(context) {
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    return route.abort();
  });
  return context;
}

// PW_CHROMIUM lets a pinned system Chromium be used instead of a downloaded one.
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const ctx = await isolate(await browser.newContext({ viewport: { width: 1440, height: 960 } }));
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const isBlockedAsset = (t) => /ERR_FAILED|ERR_BLOCKED|net::/.test(t);
page.on("console", (m) => { if (m.type() === "error" && !isBlockedAsset(m.text())) errors.push(m.text()); });

// ---- Landing
await page.goto(BASE, { waitUntil: "domcontentloaded" });
check("landing renders hero", (await page.locator("h1.display").innerText()).includes("Ayava"));
await page.screenshot({ path: `${SHOTS}/01-landing.png`, fullPage: false });

// ---- Sign in as admin using the demo chooser
await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: `${SHOTS}/02-signin.png` });
await page.getByRole("button", { name: "Use a demo account" }).click();
await page.getByRole("button", { name: /Studio Director/ }).click();
check("demo fill sets email", (await page.locator("#email").inputValue()) === "studio@ayavacreatives.com");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL("**/dashboard", { timeout: 15000 });
check("admin signs in and reaches dashboard", page.url().endsWith("/dashboard"));
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOTS}/03-dashboard-admin.png`, fullPage: true });

// ---- Walk every protected route
const routes = [
  ["/tasks", "Tasks"],
  ["/projects", "Projects"],
  ["/timesheet", "Timesheet"],
  ["/submissions", "Submissions"],
  ["/review", "Review queue"],
  ["/announcements", "Announcements"],
  ["/resources", "Resources"],
  ["/directory", "Directory"],
  ["/profile", "Profile"],
  ["/settings", "Account settings"],
  ["/admin", "Studio overview"],
  ["/admin/users", "Users"],
  ["/admin/invitations", "Invitations"],
  ["/admin/audit", "Audit log"],
];
for (const [path, heading] of routes) {
  const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  const h1 = await page.locator("h1").first().innerText().catch(() => "");
  check(`route ${path}`, res.status() === 200 && h1.includes(heading), `status=${res.status()} h1="${h1}"`);
}
await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: `${SHOTS}/04-admin.png`, fullPage: true });
await page.goto(`${BASE}/review`, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: `${SHOTS}/05-review.png`, fullPage: true });

// ---- Detail pages
await page.goto(`${BASE}/tasks`, { waitUntil: "domcontentloaded" });
await page.locator("a.task-card").first().click();
await page.waitForURL("**/tasks/**");
check("task detail opens", (await page.locator("h1").first().innerText()).length > 3);
await page.screenshot({ path: `${SHOTS}/06-task-detail.png`, fullPage: true });

await page.goto(`${BASE}/projects`, { waitUntil: "domcontentloaded" });
await page.locator("a.card.interactive").first().click();
await page.waitForURL("**/projects/**");
check("project detail opens", (await page.locator("h1").first().innerText()).length > 3);

// ---- Admin: send an invitation, then read the token from the outbox
await page.goto(`${BASE}/admin/invitations`, { waitUntil: "domcontentloaded" });
await page.locator("#email").fill("newintern@example.com");
await page.locator("#firstName").fill("Nadia");
await page.locator("#lastName").fill("Rahman");
await page.getByRole("button", { name: "Send invitation" }).click();
await page.waitForSelector(".alert-ok", { timeout: 15000 });
check("invitation created", (await page.locator(".alert-ok").innerText()).includes("newintern@example.com"));
await page.screenshot({ path: `${SHOTS}/07-invitations.png`, fullPage: true });

const outbox = JSON.parse(fs.readFileSync("data/outbox.json", "utf8"));
const inviteMail = outbox.find((m) => m.to === "newintern@example.com");
check("invitation email in outbox", !!inviteMail?.actionUrl, inviteMail?.actionUrl ?? "");

// ---- Sign out, accept the invitation in a clean context
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Account menu" }).click();
await page.getByRole("menuitem", { name: "Sign out" }).click();
await page.waitForURL("**/sign-in");
check("sign out returns to sign-in", page.url().includes("/sign-in"));

const ctx2 = await isolate(await browser.newContext({ viewport: { width: 1440, height: 960 } }));
const page2 = await ctx2.newPage();
page2.on("pageerror", (e) => errors.push(String(e)));
await page2.goto(inviteMail.actionUrl, { waitUntil: "domcontentloaded" });
check("invite page loads", (await page2.locator("h1").innerText()).includes("Join the Ayava studio"));
await page2.screenshot({ path: `${SHOTS}/08-invite.png` });
await page2.locator("#password").fill("StudioNadia2026");
await page2.getByRole("button", { name: "Accept invitation" }).click();
await page2.waitForURL("**/dashboard**", { timeout: 15000 });
check("invited user lands in the portal", page2.url().includes("/dashboard"));
await page2.waitForTimeout(400);
await page2.screenshot({ path: `${SHOTS}/09-dashboard-intern.png`, fullPage: true });

// invited intern must not reach admin
const adminRes = await page2.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
check("intern blocked from /admin", page2.url().includes("/dashboard"), `landed on ${page2.url()} status=${adminRes.status()}`);

// ---- Self sign-up + email verification code flow
const ctx3 = await isolate(await browser.newContext({ viewport: { width: 1440, height: 960 } }));
const page3 = await ctx3.newPage();
page3.on("pageerror", (e) => errors.push(String(e)));
await page3.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
await page3.locator("#firstName").fill("Tomas");
await page3.locator("#lastName").fill("Ferreira");
await page3.locator("#email").fill("tomas@example.com");
await page3.locator("#discipline").selectOption("Photography");
await page3.locator("#password").fill("ApplyToAyava2026");
await page3.screenshot({ path: `${SHOTS}/10-signup.png` });
await page3.getByRole("button", { name: "Create account" }).click();
await page3.waitForURL("**/verify**", { timeout: 15000 });
check("sign-up redirects to verify", page3.url().includes("/verify"));
await page3.screenshot({ path: `${SHOTS}/11-verify.png` });

const outbox2 = JSON.parse(fs.readFileSync("data/outbox.json", "utf8"));
const codeMail = outbox2.find((m) => m.to === "tomas@example.com");
const code = codeMail?.subject.match(/(\d{6})/)?.[1];
check("verification code issued", !!code, code ?? "none");

// wrong code first — the error path must work
await page3.locator(".otp input").first().fill("0");
for (let i = 1; i < 6; i++) await page3.locator(".otp input").nth(i).fill("0");
await page3.getByRole("button", { name: "Verify email" }).click();
await page3.waitForSelector(".alert-error", { timeout: 15000 });
check("wrong code is rejected", (await page3.locator(".alert-error").innerText()).length > 0);

await page3.reload({ waitUntil: "domcontentloaded" });
for (let i = 0; i < 6; i++) await page3.locator(".otp input").nth(i).fill(code[i]);
await page3.getByRole("button", { name: "Verify email" }).click();
await page3.waitForURL("**/pending", { timeout: 15000 });
check("verified applicant lands in the pending lobby", page3.url().includes("/pending"));
await page3.screenshot({ path: `${SHOTS}/12-pending.png` });

// applicant cannot reach the app while pending
await page3.goto(`${BASE}/tasks`, { waitUntil: "domcontentloaded" });
check("pending applicant blocked from /tasks", page3.url().includes("/pending"), `landed on ${page3.url()}`);

// ---- Mobile viewport
const ctx4 = await isolate(await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }));
const page4 = await ctx4.newPage();
await page4.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
await page4.screenshot({ path: `${SHOTS}/13-mobile-signin.png`, fullPage: true });
const overflow = await page4.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile sign-in has no horizontal overflow", overflow <= 1, `overflow=${overflow}px`);

await page4.goto(BASE, { waitUntil: "domcontentloaded" });
const overflow2 = await page4.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile landing has no horizontal overflow", overflow2 <= 1, `overflow=${overflow2}px`);
await page4.screenshot({ path: `${SHOTS}/14-mobile-landing.png`, fullPage: true });

check("no uncaught page errors", errors.length === 0, errors.slice(0, 5).join(" | "));

await browser.close();
console.log(results.join("\n"));
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
