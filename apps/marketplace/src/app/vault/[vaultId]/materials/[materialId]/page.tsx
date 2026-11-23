import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/vault-auth";
import { getVaultStore, VaultError } from "@/lib/vault-store";
import { ActionForm } from "@/components/vault-forms";
import { MaterialContent, RightsPanel } from "@/components/vault-content";
import {
  VaultShell,
  PageIntro,
  BackLink,
  DateLabel,
  cardClass,
  fieldClass,
  secondaryClass,
} from "@/components/vault-ui";
import {
  createShareAction,
  deleteMaterialAction,
  logoutAction,
  revokeShareAction,
} from "@/app/vault/actions";

export const dynamic = "force-dynamic";

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ vaultId: string; materialId: string }>;
}) {
  const user = await requireUser();
  const { vaultId, materialId } = await params;
  const store = getVaultStore();
  let material;
  try {
    material = store.getMaterial(user.id, materialId);
  } catch (error) {
    if (error instanceof VaultError && error.status === 404) notFound();
    throw error;
  }
  if (material.vaultId !== vaultId) notFound();
  const vault = store.listVaults(user.id).find((item) => item.id === vaultId);
  if (!vault) notFound();
  const shares = store.listShares(user.id, materialId);
  return (
    <VaultShell username={user.username} logout={logoutAction}>
      <BackLink href={`/vault/${vaultId}`}>{vault.name}</BackLink>
      <div className="mb-2 flex flex-wrap justify-between gap-4">
        <PageIntro
          eyebrow={
            vault.kind === "personal" ? "PERSONAL PROGRAM" : "TEAM PROGRAM"
          }
          title={material.title}
        >
          {vault.kind === "personal" ? "個人保管庫" : "チーム保管庫"} ·{" "}
          {vault.name}
        </PageIntro>
        <Link
          className={`${secondaryClass} h-fit`}
          href={`/vault/${vaultId}/materials/${materialId}/edit`}
        >
          教材を編集
        </Link>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <MaterialContent material={material} />
          <RightsPanel report={material.rightsReport} />
        </div>
        <aside className="grid min-w-0 gap-5">
          <section className={cardClass}>
            <h2 className="text-lg font-bold">リンクで教材を共有</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              ログインなしで閲覧・ダウンロードできるリンクです。リンクを知っている人は誰でも開けるため、転送先も閲覧できます。
            </p>
            <div className="mt-4 mb-5 rounded-lg bg-[var(--background)] p-3 text-xs leading-6">
              <p className="font-bold">共有される内容</p>
              <p>
                教材名・概要・進め方のメモ・タグ・出典URL・版・添付ファイル。
              </p>
              <p className="mt-2">
                権利の確認メモ、自動確認の結果、保管庫名・チーム名・メンバー情報は表示されません。添付ファイル内のメモや個人情報は、ご自身で確認してください。
              </p>
            </div>
            <ActionForm action={createShareAction} label="閲覧リンクを発行">
              <input type="hidden" name="materialId" value={materialId} />
              <input type="hidden" name="version" value={material.version} />
              <label className="grid gap-2 text-sm font-bold">
                有効期間
                <select className={fieldClass} name="days" defaultValue="7">
                  <option value="1">1日</option>
                  <option value="7">7日</option>
                  <option value="30">30日</option>
                </select>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-[var(--line)] p-3 text-sm leading-7">
                <input
                  className="mt-1.5 size-4 shrink-0"
                  type="checkbox"
                  name="acknowledged"
                  required
                />
                <span>
                  素材・権利の確認候補と共有される内容を確認しました。
                </span>
              </label>
            </ActionForm>
            <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
              教材を更新・削除した場合も、以前の共有リンクは無効になります。
            </p>
          </section>
          <section className={cardClass}>
            <h2 className="text-lg font-bold">発行済みの閲覧リンク</h2>
            {shares.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--ink-soft)]">
                まだリンクはありません。
              </p>
            ) : (
              <ul className="mt-4 grid gap-4">
                {shares.map((share, index) => {
                  const active = share.active;
                  return (
                    <li
                      key={share.id}
                      className="border-t border-[var(--line)] pt-4"
                    >
                      <p className="text-sm font-bold">
                        リンク {index + 1} ·{" "}
                        {active ? "有効" : share.revoked ? "無効" : "期限切れ"}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                        発行 <DateLabel value={share.createdAt} />
                        <br />
                        有効期限{" "}
                        <DateLabel value={share.expiresAt} includeTime />
                        （日本時間）
                      </p>
                      {active && (
                        <ActionForm
                          className="mt-3"
                          action={revokeShareAction}
                          label="このリンクを無効にする"
                        >
                          <input
                            type="hidden"
                            name="materialId"
                            value={materialId}
                          />
                          <input
                            type="hidden"
                            name="shareId"
                            value={share.id}
                          />
                        </ActionForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
              リンクのアドレスは発行時に表示されます。再表示できない場合は、新しく発行してください。
            </p>
          </section>
          <details className={`${cardClass} text-sm`}>
            <summary className="cursor-pointer py-1 font-bold">
              教材を削除する
            </summary>
            <p className="mt-3 mb-4 leading-7 text-[var(--ink-soft)]">
              本文・添付を削除し、共有リンクを無効にします。この操作は取り消せません。
            </p>
            <ActionForm
              action={deleteMaterialAction}
              label="教材を削除"
              confirm="この教材と添付ファイルを削除しますか？元に戻せません。"
            >
              <input type="hidden" name="materialId" value={materialId} />
            </ActionForm>
          </details>
        </aside>
      </div>
    </VaultShell>
  );
}
