import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/vault-auth";
import { ActionForm } from "@/components/vault-forms";
import {
  VaultShell,
  PageIntro,
  cardClass,
  buttonClass,
  secondaryClass,
} from "@/components/vault-ui";
import { acceptInviteAction, logoutAction } from "@/app/vault/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "チームへの招待 | 支援プログラムLab",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  const next = `/invite/${token}`;
  return (
    <VaultShell
      username={user?.username}
      logout={user ? logoutAction : undefined}
    >
      <div className="mx-auto max-w-xl">
        <PageIntro eyebrow="TEAM INVITATION" title="チームの保管庫に参加する">
          管理者が指定した登録済みアカウントだけが参加できます。参加後はチームの教材を閲覧・編集・削除・共有できます。この招待は1回限りです。期限切れ・使用済み・宛先指定のない古い招待は、管理者に再発行を依頼してください。
        </PageIntro>
        <section className={cardClass}>
          {user ? (
            <>
              <p className="mb-5 text-sm leading-7">
                <strong>{user.username}</strong>{" "}
                として、この招待を受け取ります。管理者が指定したIDと一致するか確認してください。異なるアカウントで試しても、招待は消費されません。
              </p>
              <ActionForm
                action={acceptInviteAction}
                label="招待を受け取って参加"
              >
                <input type="hidden" name="token" value={token} />
              </ActionForm>
            </>
          ) : (
            <>
              <p className="mb-5 text-sm leading-7 text-[var(--ink-soft)]">
                管理者が指定した登録済みアカウントでログインしてから、招待を受け取ってください。新しく作成した別のIDでは受け取れません。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  className={buttonClass}
                  href={`/login?next=${encodeURIComponent(next)}`}
                >
                  ログインして続ける
                </Link>
                <Link className={secondaryClass} href="/signup">
                  アカウントを先に作成
                </Link>
              </div>
              <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
                未登録の方は先にアカウントを作成し、管理者にそのID宛ての新しい招待を依頼してください。
              </p>
            </>
          )}
        </section>
      </div>
    </VaultShell>
  );
}
