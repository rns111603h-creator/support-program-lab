import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/vault-auth";
import { getVaultStore } from "@/lib/vault-store";
import { ActionForm } from "@/components/vault-forms";
import {
  VaultShell,
  PageIntro,
  cardClass,
  fieldClass,
} from "@/components/vault-ui";
import { createVaultAction, logoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "教材保管庫 | 支援プログラムLab",
  robots: { index: false, follow: false },
};

export default async function VaultsPage() {
  const user = await requireUser();
  const vaults = getVaultStore().listVaults(user.id);
  return (
    <VaultShell username={user.username} logout={logoutAction}>
      <PageIntro eyebrow="PROGRAM VAULT" title="教材を、次の実施につなげる">
        自分用のメモと教材、チームで育てるプログラムを保管できます。保存しただけでは、外部に公開されません。
      </PageIntro>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-label="参加している保管庫"
          className="grid content-start gap-4"
        >
          {vaults.map((vault) => (
            <Link
              className={`${cardClass} block transition-colors hover:border-[var(--indigo)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--indigo)]`}
              href={`/vault/${vault.id}`}
              key={vault.id}
            >
              <span className="rounded-full bg-[var(--background)] px-3 py-1 text-xs font-bold text-[var(--indigo)]">
                {vault.kind === "personal" ? "自分だけ" : "チーム共有"}
              </span>
              <h2 className="mt-4 break-words text-2xl font-bold">
                {vault.name}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                {vault.kind === "personal"
                  ? "あなた専用の保管庫。教材ごとに、閲覧用リンクを発行できます。"
                  : `メンバーが教材を閲覧・編集できます。${vault.role === "owner" ? "あなたは管理者です。" : "あなたはメンバーです。"}`}
              </p>
              <span className="mt-5 inline-block text-sm font-bold text-[var(--indigo)]">
                教材を見る →
              </span>
            </Link>
          ))}
        </section>
        <aside className={`${cardClass} h-fit`}>
          <h2 className="text-lg font-bold">チームの保管庫をつくる</h2>
          <p className="mt-3 mb-5 text-sm leading-7 text-[var(--ink-soft)]">
            一緒に使う職員を招待して、教材をまとめて管理できます。招待するまでは、あなたのみが利用できます。
          </p>
          <ActionForm action={createVaultAction} label="チーム保管庫を作成">
            <label className="grid gap-2 text-sm font-bold">
              保管庫名
              <input
                name="name"
                required
                maxLength={80}
                className={fieldClass}
                placeholder="例: プログラム準備チーム"
              />
            </label>
          </ActionForm>
        </aside>
      </div>
    </VaultShell>
  );
}
