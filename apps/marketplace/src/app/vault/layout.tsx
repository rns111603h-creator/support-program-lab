import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/vault-auth";
import { VaultSessionBoundary } from "@/components/vault-session-boundary";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function VaultLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  return (
    <VaultSessionBoundary expectedUserId={user.id}>
      {children}
    </VaultSessionBoundary>
  );
}
