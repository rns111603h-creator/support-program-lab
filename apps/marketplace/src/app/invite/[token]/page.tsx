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
          参加すると、チームの教材を閲覧・編集できます。この招待は1回限りです。期限切れや使用済みの場合は参加できません。
        </PageIntro>
        <section className={cardClass}>
          {user ? (
            <>
              <p className="mb-5 text-sm leading-7">
                <strong>{user.username}</strong>{" "}
                として、この招待を受け取ります。
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
                自分のアカウントでログインしてから、招待を受け取ってください。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  className={buttonClass}
                  href={`/login?next=${encodeURIComponent(next)}`}
                >
                  ログインして続ける
                </Link>
                <Link
                  className={secondaryClass}
                  href={`/signup?next=${encodeURIComponent(next)}`}
                >
                  アカウントを作成
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </VaultShell>
  );
}
