import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/vault-auth";
import { getVaultStore } from "@/lib/vault-store";
import { ActionForm } from "@/components/vault-forms";
import {
  VaultShell,
  PageIntro,
  BackLink,
  DateLabel,
  cardClass,
  fieldClass,
  buttonClass,
  secondaryClass,
} from "@/components/vault-ui";
import { inviteAction, logoutAction, removeMemberAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function VaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ vaultId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { vaultId } = await params;
  const store = getVaultStore();
  const vault = store.listVaults(user.id).find((item) => item.id === vaultId);
  if (!vault) notFound();
  const { q: query } = await searchParams;
  const q = typeof query === "string" ? query.trim().slice(0, 200) : "";
  const allMaterials = store.listMaterials(user.id, vaultId);
  const materials = q
    ? allMaterials.filter((item) =>
        `${item.title}\n${item.description}\n${item.body}\n${item.tags.join(" ")}`
          .toLocaleLowerCase("ja")
          .includes(q.toLocaleLowerCase("ja")),
      )
    : allMaterials;
  const members =
    vault.kind === "team" ? store.listMembers(user.id, vaultId) : [];
  return (
    <VaultShell username={user.username} logout={logoutAction}>
      <BackLink href="/vault">保管庫一覧</BackLink>
      <PageIntro
        eyebrow={vault.kind === "personal" ? "PERSONAL VAULT" : "TEAM VAULT"}
        title={vault.name}
      >
        {vault.kind === "personal"
          ? "あなた専用の教材保管庫です。外部共有は、教材ごとにリンクを発行した場合に限られます。"
          : "参加メンバーが教材を閲覧・編集できる保管庫です。チームへの招待と、教材の閲覧用リンクは別の機能です。"}
      </PageIntro>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <form method="get" className="flex w-full flex-wrap gap-2 sm:w-auto">
          <label className="grid flex-1 gap-2 text-sm font-bold">
            保管庫の中を検索
            <input
              className={`${fieldClass} sm:w-80`}
              type="search"
              name="q"
              defaultValue={q}
              maxLength={200}
              placeholder="教材名・タグ・メモ"
            />
          </label>
          <button className={`${buttonClass} self-end`}>検索</button>
          {q && (
            <Link
              href={`/vault/${vaultId}`}
              className={`${secondaryClass} self-end`}
            >
              解除
            </Link>
          )}
        </form>
        <Link href={`/vault/${vaultId}/materials/new`} className={buttonClass}>
          ＋ 教材を保存
        </Link>
      </div>
      <p className="mb-4 text-sm text-[var(--ink-soft)]">
        {materials.length}件{q ? ` / 「${q}」の検索結果` : "の教材"}
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="教材一覧" className="grid content-start gap-4">
          {materials.length === 0 ? (
            <div className={cardClass}>
              <h2 className="text-lg font-bold">
                {q
                  ? "条件に合う教材がありません"
                  : "最初の教材を保存しましょう"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                {q
                  ? "別のキーワードを試すか、検索を解除してください。"
                  : "台本やワーク、投影資料と、次に使うためのメモをまとめて保管できます。"}
              </p>
            </div>
          ) : (
            materials.map((material) => (
              <Link
                className={`${cardClass} block min-w-0 transition-colors hover:border-[var(--indigo)]`}
                key={material.id}
                href={`/vault/${vaultId}/materials/${material.id}`}
              >
                <div className="flex flex-wrap gap-2">
                  {material.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--background)] px-3 py-1 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 break-words text-xl font-bold">
                  {material.title}
                </h2>
                <p className="mt-3 line-clamp-3 break-words text-sm leading-7 text-[var(--ink-soft)]">
                  {material.description ||
                    material.body ||
                    "本文のメモはありません。"}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--ink-soft)]">
                  <span>添付 {material.files.length}点</span>
                  <span>第{material.version}版</span>
                  <span>
                    更新 <DateLabel value={material.updatedAt} />
                  </span>
                </div>
                {material.rightsReport.requiresReview && (
                  <p className="mt-4 text-xs font-bold text-amber-800">
                    素材・権利の確認候補があります
                  </p>
                )}
              </Link>
            ))
          )}
        </section>
        {vault.kind === "team" && (
          <aside className="grid h-fit gap-5">
            <section className={cardClass}>
              <h2 className="text-lg font-bold">
                メンバー{" "}
                <span className="text-sm font-normal">{members.length}人</span>
              </h2>
              <ul className="mt-4 grid gap-4">
                {members.map((member) => (
                  <li
                    key={member.userId}
                    className="border-t border-[var(--line)] pt-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="break-all text-sm font-bold">
                        {member.username}
                      </span>
                      <span className="text-xs text-[var(--ink-soft)]">
                        {member.role === "owner" ? "管理者" : "メンバー"}
                      </span>
                    </div>
                    {vault.role === "owner" && member.role !== "owner" && (
                      <ActionForm
                        action={removeMemberAction}
                        label="メンバーから外す"
                        className="mt-3"
                        confirm="このメンバーの保管庫へのアクセスを停止しますか？"
                      >
                        <input type="hidden" name="vaultId" value={vaultId} />
                        <input
                          type="hidden"
                          name="memberId"
                          value={member.userId}
                        />
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            {vault.role === "owner" && (
              <section className={cardClass}>
                <h2 className="text-lg font-bold">チームに招待</h2>
                <p className="mt-3 mb-4 text-sm leading-7 text-[var(--ink-soft)]">
                  1人が参加すると使えなくなる招待リンクです。受け取った人はログイン後、この保管庫の教材を閲覧・編集できます。
                </p>
                <ActionForm action={inviteAction} label="招待リンクを発行">
                  <input type="hidden" name="vaultId" value={vaultId} />
                  <label className="grid gap-2 text-sm font-bold">
                    有効期間
                    <select className={fieldClass} name="days" defaultValue="7">
                      <option value="1">1日</option>
                      <option value="7">7日</option>
                      <option value="30">30日</option>
                    </select>
                  </label>
                </ActionForm>
              </section>
            )}
          </aside>
        )}
      </div>
    </VaultShell>
  );
}
