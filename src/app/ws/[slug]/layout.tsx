import { notFound, redirect } from "next/navigation";
import PageTransition from "@/components/PageTransition";
import WsSidebar from "@/components/ws/WsSidebar";

import { en } from "@/locales/en";
import { getServerUser } from "@/lib/auth";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/db/queries/workspaces";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function WsSlugLayout({ children, params }: Props) {
  const { slug } = await params;
  const user = await getServerUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const membership = await getWorkspaceMember(workspace.id, user.userId);
  if (
    !membership ||
    membership.role !== "admin" ||
    membership.status !== "active"
  ) {
    redirect("/me");
  }

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--surface-1)" }}>
      {/* PWA meta tags */}
      <link rel="manifest" href="/manifest-ws.json" />
      <meta name="theme-color" content="#0d2118" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={`${en.brand.shortName} WS`} />

      {/* Sidebar — fixed height, no scroll */}
      <WsSidebar slug={slug} />

      {/* Main content — scrolls independently */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100dvh", overflowY: "auto", overflowX: "hidden" }}>
        <main style={{ flex: 1 }}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <PwaInstallPrompt />
    </div>
  );
}
