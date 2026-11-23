import type { Metadata } from "next";
import Link from "next/link";
import { getVaultStore } from "@/lib/vault-store";
import { MaterialContent } from "@/components/vault-content";
import { PageIntro, cardClass } from "@/components/vault-ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "共有された教材 | 支援プログラムLab",
  robots: { index: false, follow: false },
};

export default async function SharedMaterialPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const material = getVaultStore().getSharedMaterial(token);
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 sm:py-12">
      <Link
        className="mb-8 inline-flex min-h-11 items-center text-sm font-bold"
        href="/"
      >
        支援プログラムLab
      </Link>
      {material ? (
        <>
          <PageIntro
            eyebrow="SHARED PROGRAM · READ ONLY"
            title={material.title}
          >
            閲覧用リンクから開いています。本文の編集や、保管庫内のほかの教材の閲覧はできません。
          </PageIntro>
          <MaterialContent material={material} sharedToken={token} />
          <p className="mt-6 text-xs leading-7 text-[var(--ink-soft)]">
            このリンクは有効期限・無効化により利用できなくなります。素材の利用条件は、共有元の案内を確認してください。
          </p>
        </>
      ) : (
        <section className={cardClass}>
          <PageIntro
            eyebrow="SHARED PROGRAM"
            title="この共有リンクは利用できません"
          >
            有効期限切れ、共有の停止、教材の更新、またはリンクの誤りが考えられます。必要な場合は、共有元に新しいリンクを確認してください。
          </PageIntro>
        </section>
      )}
    </main>
  );
}
