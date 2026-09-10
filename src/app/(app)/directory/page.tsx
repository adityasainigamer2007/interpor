import type { Metadata } from "next";

import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badges";
import { PageHeader } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireAuth } from "@/lib/auth/guards";
import { allUsers, userMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Directory" };

export default async function DirectoryPage() {
  const { user } = await requireAuth();

  const people = allUsers().filter((p) => p.status === "active");
  const byId = userMap();
  const team = people.filter((p) => p.role !== "intern");
  const interns = people.filter((p) => p.role === "intern");

  return (
    <div className="stack g-6">
      <PageHeader
        eyebrow="Who's who"
        title="Directory"
        description="The studio team and this cohort. Your mentor is your first port of call for anything."
      />

      {[
        { title: "The studio team", list: team },
        { title: "Your cohort", list: interns },
      ].map((group) =>
        group.list.length ? (
          <section key={group.title} className="stack g-4">
            <div className="row g-3">
              <h2 style={{ fontSize: "var(--step-2)" }}>{group.title}</h2>
              <hr className="rule grow" />
              <span className="badge tnum">{group.list.length}</span>
            </div>

            <div className="grid grid-auto">
              {group.list.map((person, i) => {
                const mentor = person.mentorId ? byId.get(person.mentorId) : null;
                const isYou = person.id === user.id;
                return (
                  <article
                    key={person.id}
                    className={isYou ? "card accent stack g-4 rise" : "card stack g-4 rise"}
                    style={{ ["--d" as string]: `${i * 0.04}s` }}
                  >
                    <div className="row between g-3">
                      <Avatar name={person.fullName} color={person.avatarColor} size="lg" />
                      <div className="row g-2">
                        {isYou ? <span className="badge gold">You</span> : null}
                        <RoleBadge role={person.role} />
                      </div>
                    </div>

                    <div className="stack g-1">
                      <h3 style={{ fontSize: "var(--step-1)" }}>{person.fullName}</h3>
                      <span className="t-sm" style={{ color: "var(--gold)" }}>
                        {person.title || person.discipline || "Studio"}
                      </span>
                    </div>

                    {person.bio ? (
                      <p className="t-sm muted clamp-2" style={{ lineHeight: 1.6 }}>
                        {person.bio}
                      </p>
                    ) : null}

                    <div className="stack g-2 mt-auto" style={{ paddingTop: 4 }}>
                      {person.discipline ? (
                        <span className="t-xs faint">
                          {person.discipline}
                          {person.cohort ? ` · ${person.cohort}` : ""}
                        </span>
                      ) : null}
                      {person.location ? <span className="t-xs faint">{person.location}</span> : null}
                      {mentor ? <span className="t-xs faint">Mentored by {mentor.fullName}</span> : null}
                    </div>

                    <div className="row between g-3 wrap" style={{ paddingTop: 6 }}>
                      <a href={`mailto:${person.email}`} className="link t-xs row g-2">
                        <Icon.mail size={13} /> Email
                      </a>
                      {person.links.length ? (
                        <a
                          href={person.links[0].url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-quiet t-xs row g-2"
                        >
                          <Icon.link size={13} /> {person.links[0].label}
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
