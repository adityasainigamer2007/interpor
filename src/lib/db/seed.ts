import "server-only";

import { hashPassword } from "../auth/crypto";
import { type Database, EMPTY_DB } from "./schema";
import { id, now } from "./store";

/**
 * Demo cohort for the Ayava Creatives intern portal.
 *
 * Regenerate at any time with `npm run seed`. Every account below shares the
 * same demo password so the portal can be walked through immediately; change
 * or delete these before the portal goes anywhere near real interns.
 */

export const DEMO_PASSWORD = "AyavaStudio2026";

const DAY = 86_400_000;

function iso(offsetDays: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function day(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}

export function seedDatabase(): Database {
  const db: Database = structuredClone(EMPTY_DB);
  const password = hashPassword(DEMO_PASSWORD);
  const created = now();

  const mkUser = (u: {
    email: string;
    firstName: string;
    lastName: string;
    role: "admin" | "mentor" | "intern";
    title: string;
    discipline: string;
    cohort: string;
    bio: string;
    avatarColor: string;
    location: string;
    mentorId?: string | null;
    onboarding?: Record<string, boolean>;
    links?: { label: string; url: string }[];
  }) => {
    const user = {
      id: id("usr"),
      email: u.email.toLowerCase(),
      passwordHash: password,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      status: "active" as const,
      emailVerified: true,
      title: u.title,
      bio: u.bio,
      avatarColor: u.avatarColor,
      discipline: u.discipline,
      cohort: u.cohort,
      mentorId: u.mentorId ?? null,
      location: u.location,
      links: u.links ?? [],
      onboarding: u.onboarding ?? {},
      createdAt: created,
      updatedAt: created,
      lastSignInAt: iso(-1, 9, 12),
    };
    db.users.push(user);
    return user;
  };

  /* ---------- People ---------- */

  const admin = mkUser({
    email: "studio@ayavacreatives.com",
    firstName: "Ayava",
    lastName: "Studio",
    role: "admin",
    title: "Studio Director",
    discipline: "Creative Direction",
    cohort: "Core team",
    bio: "Runs the studio, the roster and the internship programme.",
    avatarColor: "#c9a227",
    location: "Studio",
    onboarding: {},
  });

  const mentorBrand = mkUser({
    email: "priya@ayavacreatives.com",
    firstName: "Priya",
    lastName: "Raghavan",
    role: "mentor",
    title: "Design Lead — Brand",
    discipline: "Brand & Identity",
    cohort: "Core team",
    bio: "Identity systems, packaging and the bits of a brand nobody else wants to name.",
    avatarColor: "#8f7bd6",
    location: "Studio",
  });

  const mentorMotion = mkUser({
    email: "daniel@ayavacreatives.com",
    firstName: "Daniel",
    lastName: "Okonkwo",
    role: "mentor",
    title: "Motion & Film Lead",
    discipline: "Motion / Film",
    cohort: "Core team",
    bio: "Edits, grades and quietly rescues every shoot day.",
    avatarColor: "#5b9dc0",
    location: "Studio",
  });

  const mentorContent = mkUser({
    email: "sofia@ayavacreatives.com",
    firstName: "Sofia",
    lastName: "Marchetti",
    role: "mentor",
    title: "Content Strategy Lead",
    discipline: "Content & Social",
    cohort: "Core team",
    bio: "Turns a brand voice into a calendar people actually read.",
    avatarColor: "#5da37c",
    location: "Remote",
  });

  const interns = [
    mkUser({
      email: "arjun@ayavacreatives.com",
      firstName: "Arjun",
      lastName: "Kapoor",
      role: "intern",
      title: "Design Intern",
      discipline: "Brand & Identity",
      cohort: "Autumn 2026",
      bio: "Final-year visual communication student. Type nerd.",
      avatarColor: "#c9a227",
      location: "Studio · Tue–Thu",
      mentorId: mentorBrand.id,
      links: [{ label: "Portfolio", url: "https://example.com/arjun" }],
      onboarding: { profile: true, brand: true, tools: true, mentor: true, first_task: true },
    }),
    mkUser({
      email: "maya@ayavacreatives.com",
      firstName: "Maya",
      lastName: "Fernandes",
      role: "intern",
      title: "Motion Intern",
      discipline: "Motion / Film",
      cohort: "Autumn 2026",
      bio: "After Effects, Blender, and an unreasonable number of LUTs.",
      avatarColor: "#5b9dc0",
      location: "Studio",
      mentorId: mentorMotion.id,
      onboarding: { profile: true, brand: true, tools: true, mentor: true },
    }),
    mkUser({
      email: "leo@ayavacreatives.com",
      firstName: "Leo",
      lastName: "Bianchi",
      role: "intern",
      title: "Content Intern",
      discipline: "Content & Social",
      cohort: "Autumn 2026",
      bio: "Writes short, thinks long.",
      avatarColor: "#5da37c",
      location: "Remote",
      mentorId: mentorContent.id,
      onboarding: { profile: true, brand: true },
    }),
    mkUser({
      email: "hana@ayavacreatives.com",
      firstName: "Hana",
      lastName: "Suzuki",
      role: "intern",
      title: "Web Intern",
      discipline: "Digital & Web",
      cohort: "Autumn 2026",
      bio: "Front-end leaning designer. Cares about focus states.",
      avatarColor: "#c07a5b",
      location: "Studio · Mon–Wed",
      mentorId: mentorBrand.id,
      onboarding: { profile: true, brand: true, tools: true },
    }),
    mkUser({
      email: "noah@ayavacreatives.com",
      firstName: "Noah",
      lastName: "Adeyemi",
      role: "intern",
      title: "Photography Intern",
      discipline: "Photography",
      cohort: "Autumn 2026",
      bio: "Stills, sets and the studio's second-best coffee.",
      avatarColor: "#a4788f",
      location: "Studio",
      mentorId: mentorMotion.id,
      onboarding: { profile: true },
    }),
  ];

  const [arjun, maya, leo, hana, noah] = interns;

  /* ---------- Projects ---------- */

  const mkProject = (p: {
    name: string;
    client: string;
    summary: string;
    status: "planning" | "active" | "review" | "complete";
    leadId: string;
    memberIds: string[];
    start: number;
    due: number;
  }) => {
    const project = {
      id: id("prj"),
      name: p.name,
      client: p.client,
      summary: p.summary,
      status: p.status,
      leadId: p.leadId,
      memberIds: p.memberIds,
      startDate: day(p.start),
      dueDate: day(p.due),
      createdAt: iso(p.start),
    };
    db.projects.push(project);
    return project;
  };

  const solstice = mkProject({
    name: "Solstice — Identity System",
    client: "Solstice Wellness",
    summary:
      "Full identity rebuild: wordmark, type system, packaging and a rollout kit for a wellness brand moving from three sub-brands to one.",
    status: "active",
    leadId: mentorBrand.id,
    memberIds: [mentorBrand.id, arjun.id, hana.id],
    start: -28,
    due: 24,
  });

  const northbound = mkProject({
    name: "Northbound — Launch Film",
    client: "Northbound Outdoor",
    summary: "90-second launch film plus a cutdown suite for paid social. Shot over two days on location.",
    status: "active",
    leadId: mentorMotion.id,
    memberIds: [mentorMotion.id, maya.id, noah.id],
    start: -18,
    due: 12,
  });

  const cadence = mkProject({
    name: "Cadence — Content Engine",
    client: "Cadence Coffee",
    summary: "Quarterly content system: voice guidelines, a repeatable format library and a 12-week calendar.",
    status: "review",
    leadId: mentorContent.id,
    memberIds: [mentorContent.id, leo.id, noah.id],
    start: -40,
    due: 5,
  });

  const atlas = mkProject({
    name: "Atlas — Site Refresh",
    client: "Atlas Architects",
    summary: "Portfolio site rebuild with an editorial project template and a case-study CMS.",
    status: "planning",
    leadId: mentorBrand.id,
    memberIds: [mentorBrand.id, hana.id],
    start: -6,
    due: 46,
  });

  /* ---------- Tasks ---------- */

  const mkTask = (t: {
    title: string;
    description: string;
    projectId: string | null;
    assigneeId: string;
    createdBy: string;
    status: "todo" | "in_progress" | "submitted" | "changes_requested" | "done";
    priority: "low" | "medium" | "high";
    due: number | null;
    estimate: number | null;
    tags: string[];
    createdOffset: number;
    approvedBy?: string | null;
    comments?: { authorId: string; body: string; offset: number }[];
  }) => {
    const task = {
      id: id("tsk"),
      title: t.title,
      description: t.description,
      projectId: t.projectId,
      assigneeId: t.assigneeId,
      createdBy: t.createdBy,
      status: t.status,
      priority: t.priority,
      dueDate: t.due === null ? null : day(t.due),
      estimateHours: t.estimate,
      tags: t.tags,
      createdAt: iso(t.createdOffset),
      updatedAt: iso(Math.min(t.createdOffset + 2, 0)),
      completedAt: t.status === "done" ? iso(-2, 16) : null,
      approvedBy: t.approvedBy ?? null,
      approvedAt: t.approvedBy ? iso(-2, 17) : null,
      comments: (t.comments ?? []).map((c) => ({
        id: id("cmt"),
        authorId: c.authorId,
        body: c.body,
        createdAt: iso(c.offset, 14),
      })),
    };
    db.tasks.push(task);
    return task;
  };

  mkTask({
    title: "Wordmark exploration — round 2",
    description:
      "Take the three directions from the first review and push the serif route further. Six lockups, letterspaced tests at 16px and on the packaging mock.",
    projectId: solstice.id,
    assigneeId: arjun.id,
    createdBy: mentorBrand.id,
    status: "in_progress",
    priority: "high",
    due: 2,
    estimate: 12,
    tags: ["identity", "typography"],
    createdOffset: -9,
    comments: [
      {
        authorId: mentorBrand.id,
        body: "Direction C is the one. Tighten the counters on the 'a' and try a slightly higher x-height before Thursday.",
        offset: -3,
      },
      { authorId: arjun.id, body: "On it — I'll bring three refinements of C to the review.", offset: -3 },
    ],
  });

  mkTask({
    title: "Packaging dielines — 250ml + 500ml",
    description: "Set up print-ready dielines for both bottle sizes. Check bleed against the printer's spec sheet in Resources.",
    projectId: solstice.id,
    assigneeId: arjun.id,
    createdBy: mentorBrand.id,
    status: "todo",
    priority: "medium",
    due: 9,
    estimate: 8,
    tags: ["packaging", "print"],
    createdOffset: -4,
  });

  mkTask({
    title: "Type scale + spacing tokens",
    description: "Define the type scale and spacing tokens for the Solstice design system, documented in the Figma library.",
    projectId: solstice.id,
    assigneeId: hana.id,
    createdBy: mentorBrand.id,
    status: "submitted",
    priority: "medium",
    due: -1,
    estimate: 6,
    tags: ["design-system"],
    createdOffset: -12,
    comments: [{ authorId: hana.id, body: "Submitted — scale is a 1.25 ratio, tokens are in the shared library.", offset: -1 }],
  });

  mkTask({
    title: "Rough cut — 90s launch film",
    description: "Assemble the rough from the two shoot days. Aim for 95s so there's room to trim in the grade review.",
    projectId: northbound.id,
    assigneeId: maya.id,
    createdBy: mentorMotion.id,
    status: "in_progress",
    priority: "high",
    due: 1,
    estimate: 16,
    tags: ["edit", "film"],
    createdOffset: -7,
    comments: [
      { authorId: mentorMotion.id, body: "Lead with the ridge line shot, not the logo. Let it breathe for four seconds.", offset: -2 },
    ],
  });

  mkTask({
    title: "Social cutdowns — 15s / 6s",
    description: "Once the rough is locked, cut the vertical 15s and 6s variants. Safe areas per the platform spec in Resources.",
    projectId: northbound.id,
    assigneeId: maya.id,
    createdBy: mentorMotion.id,
    status: "todo",
    priority: "medium",
    due: 8,
    estimate: 10,
    tags: ["social", "edit"],
    createdOffset: -7,
  });

  mkTask({
    title: "Select and retouch 20 hero stills",
    description: "Pull the strongest 20 stills from the shoot, retouch and deliver at print and web sizes.",
    projectId: northbound.id,
    assigneeId: noah.id,
    createdBy: mentorMotion.id,
    status: "changes_requested",
    priority: "medium",
    due: 3,
    estimate: 9,
    tags: ["photography", "retouch"],
    createdOffset: -10,
    comments: [
      {
        authorId: mentorMotion.id,
        body: "Selects are good but the grade is running warm against the film. Match to the LUT and resubmit.",
        offset: -2,
      },
    ],
  });

  mkTask({
    title: "Voice & tone guidelines",
    description: "Write the voice section of the Cadence guidelines: principles, do/don't pairs and three worked examples.",
    projectId: cadence.id,
    assigneeId: leo.id,
    createdBy: mentorContent.id,
    status: "done",
    priority: "high",
    due: -4,
    estimate: 14,
    tags: ["copy", "strategy"],
    createdOffset: -22,
    approvedBy: mentorContent.id,
    comments: [{ authorId: mentorContent.id, body: "Signed off. The do/don't pairs are genuinely useful — nice work.", offset: -2 }],
  });

  mkTask({
    title: "12-week content calendar",
    description: "Build the Q4 calendar against the format library. Flag anything that needs a shoot day.",
    projectId: cadence.id,
    assigneeId: leo.id,
    createdBy: mentorContent.id,
    status: "in_progress",
    priority: "high",
    due: 4,
    estimate: 12,
    tags: ["planning", "social"],
    createdOffset: -8,
  });

  mkTask({
    title: "Competitor audit — 8 studios",
    description: "Audit eight architecture practice sites. One slide each: structure, project template, what to steal, what to avoid.",
    projectId: atlas.id,
    assigneeId: hana.id,
    createdBy: mentorBrand.id,
    status: "done",
    priority: "medium",
    due: -3,
    estimate: 7,
    tags: ["research", "web"],
    createdOffset: -6,
    approvedBy: mentorBrand.id,
  });

  mkTask({
    title: "Case study template — wireframes",
    description: "Wireframe the editorial case-study template at three breakpoints before we design it.",
    projectId: atlas.id,
    assigneeId: hana.id,
    createdBy: mentorBrand.id,
    status: "todo",
    priority: "low",
    due: 15,
    estimate: 8,
    tags: ["web", "wireframe"],
    createdOffset: -2,
  });

  mkTask({
    title: "Studio reel — pull 2026 highlights",
    description: "Go through this year's delivered work and shortlist shots for the studio reel refresh.",
    projectId: null,
    assigneeId: maya.id,
    createdBy: admin.id,
    status: "todo",
    priority: "low",
    due: 20,
    estimate: 6,
    tags: ["studio"],
    createdOffset: -3,
  });

  mkTask({
    title: "Asset library clean-up",
    description: "Archive superseded logo files and re-tag the shared library so search stops returning 2023 versions.",
    projectId: null,
    assigneeId: arjun.id,
    createdBy: admin.id,
    status: "done",
    priority: "low",
    due: -6,
    estimate: 4,
    tags: ["studio", "admin"],
    createdOffset: -14,
    approvedBy: admin.id,
  });

  /* ---------- Time entries ---------- */

  const mkTime = (t: {
    userId: string;
    dayOffset: number;
    projectId: string | null;
    hours: number;
    note: string;
    status: "draft" | "submitted" | "approved" | "rejected";
    reviewedBy?: string | null;
  }) => {
    db.timeEntries.push({
      id: id("tme"),
      userId: t.userId,
      date: day(t.dayOffset),
      projectId: t.projectId,
      taskId: null,
      hours: t.hours,
      note: t.note,
      status: t.status,
      startedAt: null,
      submittedAt: t.status === "draft" ? null : iso(t.dayOffset, 18),
      reviewedBy: t.reviewedBy ?? null,
      reviewedAt: t.reviewedBy ? iso(t.dayOffset + 1, 10) : null,
      reviewNote: "",
      createdAt: iso(t.dayOffset, 18),
    });
  };

  const week = [
    { u: arjun.id, p: solstice.id, m: mentorBrand.id, note: "Wordmark round 2" },
    { u: maya.id, p: northbound.id, m: mentorMotion.id, note: "Rough cut assembly" },
    { u: leo.id, p: cadence.id, m: mentorContent.id, note: "Calendar build" },
    { u: hana.id, p: atlas.id, m: mentorBrand.id, note: "Competitor audit" },
    { u: noah.id, p: northbound.id, m: mentorMotion.id, note: "Retouching selects" },
  ];

  for (const person of week) {
    // Two approved weeks behind us, plus this week in progress.
    for (const offset of [-12, -11, -10, -9, -8]) {
      mkTime({
        userId: person.u,
        dayOffset: offset,
        projectId: person.p,
        hours: 6 + (offset % 2 === 0 ? 1 : 0),
        note: person.note,
        status: "approved",
        reviewedBy: person.m,
      });
    }
    for (const offset of [-5, -4, -3]) {
      mkTime({
        userId: person.u,
        dayOffset: offset,
        projectId: person.p,
        hours: 7,
        note: person.note,
        status: "submitted",
      });
    }
    mkTime({
      userId: person.u,
      dayOffset: -1,
      projectId: person.p,
      hours: 6.5,
      note: person.note,
      status: "draft",
    });
  }

  /* ---------- Submissions ---------- */

  const mkSub = (s: {
    userId: string;
    projectId: string | null;
    title: string;
    description: string;
    links: { label: string; url: string }[];
    status: "pending" | "approved" | "changes_requested";
    offset: number;
    reviewerId?: string | null;
    rating?: number | null;
    feedback?: string;
  }) => {
    db.submissions.push({
      id: id("sub"),
      userId: s.userId,
      taskId: null,
      projectId: s.projectId,
      title: s.title,
      description: s.description,
      links: s.links,
      status: s.status,
      submittedAt: iso(s.offset, 17),
      reviewerId: s.reviewerId ?? null,
      reviewedAt: s.reviewerId ? iso(s.offset + 1, 11) : null,
      rating: s.rating ?? null,
      feedback: s.feedback ?? "",
    });
  };

  mkSub({
    userId: hana.id,
    projectId: solstice.id,
    title: "Solstice type scale + spacing tokens",
    description: "Scale, tokens and a usage page in the shared Figma library. Ready for review.",
    links: [{ label: "Figma — Solstice DS", url: "https://example.com/figma/solstice-ds" }],
    status: "pending",
    offset: -1,
  });

  mkSub({
    userId: leo.id,
    projectId: cadence.id,
    title: "Cadence voice & tone — final",
    description: "Principles, do/don't pairs and three worked examples across channels.",
    links: [{ label: "Doc", url: "https://example.com/docs/cadence-voice" }],
    status: "approved",
    offset: -5,
    reviewerId: mentorContent.id,
    rating: 5,
    feedback:
      "Genuinely one of the clearest voice docs we've shipped. The worked examples do the heavy lifting — keep that pattern.",
  });

  mkSub({
    userId: noah.id,
    projectId: northbound.id,
    title: "Northbound hero stills — v1",
    description: "20 selects, retouched, delivered at print and web sizes.",
    links: [{ label: "Drive folder", url: "https://example.com/drive/northbound-stills" }],
    status: "changes_requested",
    offset: -3,
    reviewerId: mentorMotion.id,
    rating: 3,
    feedback: "Strong selects. The grade runs warm against the film — match the LUT and resubmit and this is there.",
  });

  mkSub({
    userId: arjun.id,
    projectId: solstice.id,
    title: "Wordmark directions — round 1",
    description: "Three directions with lockups and small-size tests.",
    links: [{ label: "Figma", url: "https://example.com/figma/solstice-wordmark" }],
    status: "approved",
    offset: -9,
    reviewerId: mentorBrand.id,
    rating: 4,
    feedback: "C is the direction. Push it further — the other two got us there but don't spend more time on them.",
  });

  /* ---------- Announcements ---------- */

  const mkAnn = (a: {
    title: string;
    body: string;
    authorId: string;
    pinned: boolean;
    audience: "all" | "admin" | "mentor" | "intern";
    offset: number;
  }) => {
    db.announcements.push({
      id: id("ann"),
      title: a.title,
      body: a.body,
      authorId: a.authorId,
      pinned: a.pinned,
      audience: a.audience,
      createdAt: iso(a.offset, 9),
    });
  };

  mkAnn({
    title: "Welcome to the Autumn 2026 cohort",
    body: "Five of you, four disciplines, twelve weeks. Your mentor is your first port of call for anything — work, feedback, or the things nobody tells you in week one. Start with the onboarding checklist on your dashboard and don't be precious about asking questions.",
    authorId: admin.id,
    pinned: true,
    audience: "all",
    offset: -30,
  });

  mkAnn({
    title: "Friday crits are back — 4pm, studio floor",
    body: "Bring one thing you're stuck on, not one thing you're proud of. Twenty minutes each, no decks, work on the wall. Interns present first because you get the freshest eyes.",
    authorId: mentorBrand.id,
    pinned: true,
    audience: "all",
    offset: -6,
  });

  mkAnn({
    title: "Timesheets close Monday 10am",
    body: "Submit your week by Monday morning so mentors can approve before invoicing. If you forget, the entry stays in draft and doesn't count toward your hours.",
    authorId: admin.id,
    pinned: false,
    audience: "intern",
    offset: -4,
  });

  mkAnn({
    title: "Northbound shoot — call sheet posted",
    body: "Second unit call is 06:30 at the trailhead. Kit list and the weather contingency are in Resources. Wear layers, it will be colder than the forecast says.",
    authorId: mentorMotion.id,
    pinned: false,
    audience: "all",
    offset: -2,
  });

  /* ---------- Resources ---------- */

  const mkRes = (r: {
    title: string;
    description: string;
    url: string;
    kind: "doc" | "link" | "video" | "template" | "brand";
    category: string;
    offset: number;
  }) => {
    db.resources.push({
      id: id("res"),
      title: r.title,
      description: r.description,
      url: r.url,
      kind: r.kind,
      category: r.category,
      addedBy: admin.id,
      createdAt: iso(r.offset, 12),
    });
  };

  mkRes({
    title: "Ayava brand book",
    description: "How we look, write and present. Read this before your first client-facing anything.",
    url: "https://example.com/ayava/brand-book",
    kind: "brand",
    category: "Studio",
    offset: -60,
  });
  mkRes({
    title: "Studio handbook",
    description: "Hours, expectations, how feedback works, and who to ask about what.",
    url: "https://example.com/ayava/handbook",
    kind: "doc",
    category: "Studio",
    offset: -60,
  });
  mkRes({
    title: "Figma — shared asset library",
    description: "Logos, type styles, grids and the component library used across client work.",
    url: "https://example.com/figma/ayava-library",
    kind: "link",
    category: "Toolkit",
    offset: -58,
  });
  mkRes({
    title: "Case study template",
    description: "The deck structure we use to present finished work to clients.",
    url: "https://example.com/ayava/case-study-template",
    kind: "template",
    category: "Templates",
    offset: -45,
  });
  mkRes({
    title: "Print spec sheet — packaging",
    description: "Bleed, dielines and colour handling for our two regular print partners.",
    url: "https://example.com/ayava/print-spec",
    kind: "doc",
    category: "Production",
    offset: -40,
  });
  mkRes({
    title: "Platform safe-area spec",
    description: "Crop and safe areas for vertical video across the platforms we deliver to.",
    url: "https://example.com/ayava/safe-areas",
    kind: "doc",
    category: "Production",
    offset: -33,
  });
  mkRes({
    title: "Giving and taking feedback",
    description: "A short film from a past crit on how to run — and survive — a critique.",
    url: "https://example.com/ayava/feedback-film",
    kind: "video",
    category: "Craft",
    offset: -25,
  });
  mkRes({
    title: "Invoice + expenses form",
    description: "For paid interns: monthly invoice template and the expenses policy.",
    url: "https://example.com/ayava/invoicing",
    kind: "template",
    category: "Admin",
    offset: -20,
  });

  /* ---------- Audit ---------- */

  db.audit.push({
    id: id("aud"),
    actorId: admin.id,
    actorEmail: admin.email,
    action: "portal.seeded",
    target: "database",
    meta: { users: String(db.users.length), projects: String(db.projects.length) },
    ip: "127.0.0.1",
    createdAt: created,
  });

  return db;
}
