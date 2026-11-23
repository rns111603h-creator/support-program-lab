import { notFound } from "next/navigation";
import { requireUser } from "@/lib/vault-auth";
import { getVaultStore, VaultError } from "@/lib/vault-store";
import { MaterialForm } from "@/components/vault-forms";
import {
  VaultShell,
  PageIntro,
  BackLink,
  cardClass,
} from "@/components/vault-ui";
import { updateMaterialAction, logoutAction } from "@/app/vault/actions";

export const dynamic = "force-dynamic";

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ vaultId: string; materialId: string }>;
}) {
  const user = await requireUser();
  const { vaultId, materialId } = await params;
  let material;
  try {
    material = getVaultStore().getMaterial(user.id, materialId);
  } catch (error) {
    if (error instanceof VaultError && error.status === 404) notFound();
    throw error;
  }
  if (material.vaultId !== vaultId) notFound();
  return (
    <VaultShell username={user.username} logout={logoutAction}>
      <div className="mx-auto max-w-3xl">
        <BackLink href={`/vault/${vaultId}/materials/${materialId}`}>
          教材に戻る
        </BackLink>
        <PageIntro eyebrow="EDIT PROGRAM" title="教材を編集する">
          現在は第{material.version}
          版です。保存すると版が更新され、既存の閲覧用リンクは無効になります。
        </PageIntro>
        <section className={cardClass}>
          <MaterialForm
            action={updateMaterialAction}
            vaultId={vaultId}
            material={material}
          />
        </section>
      </div>
    </VaultShell>
  );
}
