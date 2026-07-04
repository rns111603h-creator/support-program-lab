import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseBadges } from "@/components/license-badges";
import { materials } from "@/lib/catalog";

export function generateStaticParams() {
  return materials.map((material) => ({ slug: material.slug }));
}

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const material = materials.find((item) => item.slug === slug);

  if (!material) {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-bold text-[var(--indigo)]" href="/">
          ← 教材一覧へ戻る
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
          </article>

          <aside className="h-fit border border-[var(--line)] bg-[var(--paper)] p-6">
            <p className="text-xs font-black tracking-[0.18em] text-[var(--indigo)]">
              DOWNLOAD
            </p>
            <p className="mt-4 text-3xl font-black">
              {material.priceYen === 0 ? "無料" : `¥${material.priceYen.toLocaleString()}`}
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              Phase 1では無料教材のライブラリ登録とダウンロード導線を検証します。
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#31302c] text-sm font-bold text-white"
              href="/library"
            >
              ライブラリで確認
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
