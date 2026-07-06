import Link from "next/link";
import { LicenseBadges } from "@/components/license-badges";
import { SiteHeader } from "@/components/site-header";
import { DownloadIcon } from "@/components/ui-icons";
import { communityMaterials, demoEntitlements } from "@/lib/catalog";
import { getLibraryMaterials } from "@/lib/marketplace";

export default function LibraryPage() {
  const libraryMaterials = getLibraryMaterials({
    buyerId: "demo-buyer",
    entitlements: demoEntitlements,
    materials: communityMaterials,
  });

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="library" />
      <div className="mx-auto max-w-6xl px-5 py-10">

        <header className="mt-8 border border-[var(--line)] bg-[var(--paper)] p-8">
          <p className="font-en text-xs font-medium tracking-[0.34em] text-[var(--gold)]">
            MY LIBRARY
          </p>
          <h1 className="mt-3 text-4xl font-normal">マイライブラリ</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            デモ購入者に付与された教材単位の購入権限を表示しています。単品購入でもセット購入でも、
            最終的にはこの一覧から教材ごとに再ダウンロードできる設計です。現在は全教材を無料で入手できます。
          </p>
        </header>

        <section className="mt-6 grid gap-4">
          {libraryMaterials.map((material) => (
            <article
              className="grid gap-5 border border-[var(--line)] bg-[var(--paper)] p-5 transition-colors hover:border-[var(--line-strong)] md:grid-cols-[1fr_220px] md:items-center"
              key={material.id}
            >
              <div>
                <p className="font-en text-xs font-medium tracking-[0.22em] text-[var(--gold)]">{material.category}</p>
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
                  className="inline-flex min-h-11 items-center justify-center border border-[var(--foreground)] bg-[var(--foreground)] text-sm font-bold tracking-[0.12em] text-white"
                  href={`/materials/${material.slug}`}
                >
                  教材詳細
                </Link>
                {material.downloadUrl ? (
                  <a
                    className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--line-strong)] bg-[#FCFCFA] text-sm font-bold text-[var(--foreground)]"
                    href={material.downloadUrl}
                    download
                  >
                    <DownloadIcon />
                    資料をダウンロード
                  </a>
                ) : (
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--line)] bg-[#FCFCFA] text-sm font-bold text-[var(--muted)]"
                    disabled
                  >
                    <DownloadIcon />
                    資料準備中
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
