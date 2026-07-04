import Link from "next/link";
import { LicenseBadges } from "@/components/license-badges";
import { demoEntitlements, materials } from "@/lib/catalog";
import { getLibraryMaterials } from "@/lib/marketplace";

export default function LibraryPage() {
  const libraryMaterials = getLibraryMaterials({
    buyerId: "demo-buyer",
    entitlements: demoEntitlements,
    materials,
  });

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-bold text-[var(--indigo)]" href="/">
          ← トップへ戻る
        </Link>

        <header className="mt-8 border border-[var(--line)] bg-[var(--paper)] p-8">
          <p className="text-xs font-black tracking-[0.18em] text-[var(--gold)]">
            MY LIBRARY
          </p>
          <h1 className="mt-3 text-4xl font-black">マイライブラリ</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            デモ購入者に付与された教材単位の購入権限を表示しています。単品購入でもセット購入でも、
            最終的にはこの一覧から教材ごとに再ダウンロードできる設計です。
          </p>
        </header>

        <section className="mt-6 grid gap-4">
          {libraryMaterials.map((material) => (
            <article
              className="grid gap-5 border border-[var(--line)] bg-[var(--paper)] p-5 md:grid-cols-[1fr_220px] md:items-center"
              key={material.id}
            >
              <div>
                <p className="text-xs font-bold text-[var(--gold)]">{material.category}</p>
                <h2 className="mt-2 text-2xl font-black">{material.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  {material.summary}
                </p>
                <div className="mt-4">
                  <LicenseBadges {...material.license} />
                </div>
              </div>
              <div className="grid gap-2">
                <Link
                  className="inline-flex min-h-11 items-center justify-center bg-[#31302c] text-sm font-bold text-white"
                  href={`/materials/${material.slug}`}
                >
                  教材詳細
                </Link>
                <button className="min-h-11 border border-[var(--line)] bg-[#f3efe5] text-sm font-bold text-[var(--foreground)]">
                  ダウンロード準備中
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
