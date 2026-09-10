import type { Metadata } from "next";

import { NewResourceForm } from "@/components/studio/NewResourceForm";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { can, requireAuth } from "@/lib/auth/guards";
import { deleteResourceAction } from "@/lib/actions/admin";
import type { ResourceKind } from "@/lib/db/schema";
import { allResources } from "@/lib/queries";

export const metadata: Metadata = { title: "Resources" };

const KIND_ICON: Record<ResourceKind, (p: { size?: number }) => React.ReactNode> = {
  doc: Icon.doc,
  link: Icon.link,
  video: Icon.play,
  template: Icon.projects,
  brand: Icon.sparkle,
};

const KIND_LABEL: Record<ResourceKind, string> = {
  doc: "Document",
  link: "Link",
  video: "Video",
  template: "Template",
  brand: "Brand",
};

export default async function ResourcesPage() {
  const { user } = await requireAuth();

  const resources = allResources();
  const categories = [...new Set(resources.map((r) => r.category))];
  const isMentor = can(user, "mentor");
  const isAdmin = can(user, "admin");

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="The studio's playbook"
        title="Resources"
        description="The brand book, the specs, the templates and the handbook — the same things the full-time team works from."
      />

      {isMentor ? <NewResourceForm categories={categories} /> : null}

      {resources.length ? (
        <div className="stack g-6">
          {categories.map((category) => (
            <section key={category} className="stack g-4">
              <div className="row g-3">
                <h2 style={{ fontSize: "var(--step-2)" }}>{category}</h2>
                <hr className="rule grow" />
              </div>

              <div className="grid grid-auto">
                {resources
                  .filter((r) => r.category === category)
                  .map((resource, i) => {
                    const KindIcon = KIND_ICON[resource.kind];
                    return (
                      <div
                        key={resource.id}
                        className="card interactive stack g-3 rise"
                        style={{ ["--d" as string]: `${i * 0.04}s` }}
                      >
                        <div className="row between g-3">
                          <span
                            className="row center"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              border: "1px solid var(--line-strong)",
                              background: "var(--gold-wash)",
                              color: "var(--gold)",
                            }}
                          >
                            <KindIcon size={17} />
                          </span>

                          <div className="row g-2">
                            <span className="badge">{KIND_LABEL[resource.kind]}</span>
                            {isAdmin ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await deleteResourceAction(resource.id);
                                }}
                              >
                                <button type="submit" className="btn btn-icon btn-quiet" aria-label="Remove resource">
                                  <Icon.x size={14} />
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>

                        <a href={resource.url} target="_blank" rel="noreferrer noopener" className="stack g-2">
                          <span className="medium">{resource.title}</span>
                          {resource.description ? (
                            <span className="t-sm muted" style={{ lineHeight: 1.6 }}>
                              {resource.description}
                            </span>
                          ) : null}
                        </a>

                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link t-xs row g-2 mt-auto"
                          style={{ width: "fit-content", paddingTop: 4 }}
                        >
                          Open <Icon.arrow size={13} />
                        </a>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState title="No resources yet" description="The studio hasn't added anything here." />
        </div>
      )}
    </div>
  );
}
