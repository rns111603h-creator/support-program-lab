import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseBadges } from "@/components/license-badges";
import { communityMaterials } from "@/lib/catalog";

export function generateStaticParams() {
  return communityMaterials.map((material) => ({ slug: material.slug }));
}

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const material = communityMaterials.find((item) => item.slug === slug);

  if (!material) {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-bold text-[var(--indigo)]" href="/">
          ← トップへ戻る
        </Link>
        <Link className="ml-5 text-sm font-bold text-[var(--indigo)]" href="/materials">
          教材フィードへ
        </Link>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <article className="border border-[var(--line)] bg-[var(--paper)] p-8">
            <p className="text-xs font-black tracking-[0.18em] text-[var(--gold)]">
              {material.category}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight">{material.title}</h1>
            <p className="mt-5 text-sm font-bold text-[var(--ink-soft)]">
              出品者: {material.sellerName}
            </p>
            <p className="mt-7 text-base leading-8 text-[var(--ink-soft)]">
              {material.description}
            </p>

            <div className="mt-8">
              <LicenseBadges {...material.license} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-bold text-[var(--ink-soft)]">
              <span>♡ {material.likes}</span>
              <span>💬 {material.comments.length}</span>
              <span className="text-emerald-700">無料公開中</span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="bg-[#f3efe5] p-5">
                <h2 className="text-sm font-black">対象サービス</h2>
                <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
                  {material.targetServices.map((service) => (
                    <li key={service}>・{service}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#f3efe5] p-5">
                <h2 className="text-sm font-black">含まれるファイル</h2>
                <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
                  {material.includedFiles.map((file) => (
                    <li key={file}>・{file}</li>
                  ))}
                </ul>
              </div>
            </div>

            {material.comments.length > 0 ? (
              <section className="mt-8 border-t border-[var(--line)] pt-6">
                <h2 className="text-lg font-black">コメント</h2>
                <div className="mt-4 grid gap-3">
                  {material.comments.map((comment) => (
                    <article
                      className="bg-[#f3efe5] p-4"
                      key={`${comment.authorName}:${comment.body}`}
                    >
                      <p className="text-sm font-black">{comment.authorName}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                        {comment.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside className="h-fit border border-[var(--line)] bg-[var(--paper)] p-6">
            <p className="text-xs font-black tracking-[0.18em] text-[var(--indigo)]">
              DOWNLOAD
            </p>
            <p className="mt-4 text-3xl font-black">
              無料
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              現在はすべての教材を無料で入手できます。将来の有料化に備えた価格・決済設計は保持しています。
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#31302c] text-sm font-bold text-white"
              href="/library"
            >
              無料でライブラリに追加
            </Link>
            <button className="mt-3 min-h-12 w-full border border-[var(--line)] bg-[#f3efe5] text-sm font-bold">
              ♡ いいね
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}
