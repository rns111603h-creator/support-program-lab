import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/vault-auth";
import { AuthForm } from "@/components/vault-forms";
import { VaultShell, PageIntro, cardClass } from "@/components/vault-ui";
import { signupAction } from "@/app/vault/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "アカウント作成 | 支援プログラムLab",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getCurrentUser())
    redirect(next && /^\/invite\/[a-zA-Z0-9_-]+$/.test(next) ? next : "/vault");
  return (
    <VaultShell>
      <div className="mx-auto max-w-lg">
        <PageIntro eyebrow="YOUR PROGRAM VAULT" title="自分の保管庫をつくる">
          IDとパスワードを設定すると、非公開の個人保管庫が作成されます。チームの保管庫は、あとから追加できます。
        </PageIntro>
        <section className={cardClass}>
          <AuthForm action={signupAction} signup next={next} />
          <p className="mt-6 text-sm leading-7">
            登録済みの方は{" "}
            <Link
              className="font-bold text-[var(--indigo)] underline"
              href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            >
              ログイン
            </Link>
          </p>
        </section>
      </div>
    </VaultShell>
  );
}
