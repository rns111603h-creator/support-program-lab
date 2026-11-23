import { notFound } from "next/navigation";
import { requireUser } from "@/lib/vault-auth";
import { getVaultStore } from "@/lib/vault-store";
import { MaterialForm } from "@/components/vault-forms";
import {
  VaultShell,
  PageIntro,
  BackLink,
  cardClass,
} from "@/components/vault-ui";
import { createMaterialAction, logoutAction } from "@/app/vault/actions";

export const dynamic = "force-dynamic";

export default async function NewMaterialPage({
  params,
}: {
  params: Promise<{ vaultId: string }>;
}) {
  const user = await requireUser();
  const { vaultId } = await params;
  const vault = getVaultStore()
    .listVaults(user.id)
    .find((item) => item.id === vaultId);
  if (!vault) notFound();
  return (
    <VaultShell username={user.username} logout={logoutAction}>
      <div className="mx-auto max-w-3xl">
        <BackLink href={`/vault/${vaultId}`}>{vault.name}</BackLink>
        <PageIntro eyebrow="SAVE A PROGRAM" title="教材を保管する">
          保存先: {vault.name}（
          {vault.kind === "personal" ? "自分だけ" : "チーム共有"}
          ）。ファイルと進め方をまとめて保存できます。素材の確認候補は保存後に表示します。
        </PageIntro>
        <section className={cardClass}>
          <MaterialForm action={createMaterialAction} vaultId={vaultId} />
        </section>
      </div>
    </VaultShell>
  );
}
