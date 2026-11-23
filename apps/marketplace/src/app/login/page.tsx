import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/vault-auth";
import { AuthForm } from "@/components/vault-forms";
import { VaultShell, PageIntro, cardClass } from "@/components/vault-ui";
import { loginAction } from "@/app/vault/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ログイン | 支援プログラムLab",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
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
        <PageIntro eyebrow="WELCOME BACK" title="保管庫にログイン">
          自分とチームの教材を、保存したところから。
        </PageIntro>
        <section className={cardClass}>
          <AuthForm action={loginAction} next={next} />
          <p className="mt-6 text-sm leading-7">
            初めての方は{" "}
            <Link
              className="font-bold text-[var(--indigo)] underline"
              href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            >
              アカウントを作成
            </Link>
          </p>
        </section>
      </div>
    </VaultShell>
  );
}
