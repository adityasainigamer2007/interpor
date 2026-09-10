import type { Metadata } from "next";

import { NewAnnouncementForm } from "@/components/studio/NewAnnouncementForm";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { can, requireAuth } from "@/lib/auth/guards";
import { deleteAnnouncementAction } from "@/lib/actions/admin";
import { formatDate, relativeTime } from "@/lib/format";
import { announcementsFor, userMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const { user } = await requireAuth();

  const announcements = announcementsFor(user);
  const people = userMap();
  const isMentor = can(user, "mentor");

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="From the studio"
        title="Announcements"
        description="Everything the studio needs you to know, newest first."
      />

      {isMentor ? <NewAnnouncementForm /> : null}

      {announcements.length ? (
        <div className="stack g-4">
          {announcements.map((announcement, i) => {
            const author = people.get(announcement.authorId);
            const canDelete = user.role === "admin" || announcement.authorId === user.id;
            return (
              <article
                key={announcement.id}
                className={announcement.pinned ? "card accent stack g-4 rise" : "card stack g-4 rise"}
                style={{ ["--d" as string]: `${i * 0.05}s` }}
              >
                <div className="row between g-3 wrap">
                  <div className="row g-2 wrap">
                    {announcement.pinned ? (
                      <span className="badge gold">
                        <Icon.sparkle size={11} /> Pinned
                      </span>
                    ) : null}
                    {announcement.audience !== "all" ? (
                      <span className="badge">{announcement.audience}s only</span>
                    ) : null}
                  </div>

                  {canDelete ? (
                    <form
                      action={async () => {
                        "use server";
                        await deleteAnnouncementAction(announcement.id);
                      }}
                    >
                      <button type="submit" className="btn btn-icon btn-quiet" aria-label="Delete announcement">
                        <Icon.x size={15} />
                      </button>
                    </form>
                  ) : null}
                </div>

                <h2 style={{ fontSize: "var(--step-2)" }}>{announcement.title}</h2>

                <p className="muted" style={{ lineHeight: 1.72, whiteSpace: "pre-wrap" }}>
                  {announcement.body}
                </p>

                <div className="row g-3" style={{ paddingTop: 4 }}>
                  <Avatar name={author?.fullName ?? "Studio"} color={author?.avatarColor} size="sm" />
                  <span className="t-xs faint">
                    {author?.fullName ?? "Studio"} · {relativeTime(announcement.createdAt)} ·{" "}
                    {formatDate(announcement.createdAt)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel">
          <EmptyState title="Nothing posted yet" description="Studio news will appear here." />
        </div>
      )}
    </div>
  );
}
