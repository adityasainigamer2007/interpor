import { NavShell } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { requireAuth } from "@/lib/auth/guards";
import { navCountsFor, recentAnnouncementCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Shell for every signed-in page: role-aware sidebar, context bar, main column. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAuth();
  const counts = navCountsFor(user);

  return (
    <NavShell role={user.role} counts={counts}>
      <Topbar user={user} unreadAnnouncements={recentAnnouncementCount(user)} />
      <main className="main">{children}</main>
    </NavShell>
  );
}
