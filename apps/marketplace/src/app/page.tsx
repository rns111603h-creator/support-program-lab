import Link from "next/link";
import { LicenseBadges } from "@/components/license-badges";
import { SiteHeader } from "@/components/site-header";
import { SheetStackIcon } from "@/components/ui-icons";
import { bundles, materials } from "@/lib/catalog";
import { calculateBundleDisplay } from "@/lib/marketplace";

export default function Home() {
  const featuredBundle = bundles[0];
  const bundlePricing = calculateBundleDisplay({
    bundlePriceYen: featuredBundle.priceYen,
    materialPricesYen: featuredBundle.materialIds.map(
      (materialId) =>
        materials.find((material) => material.id === materialId)?.futurePriceYen ?? 0,
    ),
  });

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="top" />

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-18 md:px-8 lg:grid-cols-[1fr_460px] lg:items-center">
        <div>
          <p className="font-en mb-7 text-xs font-medium tracking-[0.42em] text-[var(--muted)]">
            PROGRAM LIBRARY FOR WELFARE
          </p>
          <h1 className="max-w-4xl text-4xl font-normal leading-[1.65] tracking-normal md:text-6xl">
            福祉現場の教材を、
            <br />
            安全に共有する場所。
          </h1>
          <p className="mt-8 max-w-2xl text-sm leading-9 text-[var(--ink-soft)] md:text-base">
            まずはすべての教材を無料で共有できる場所として育てます。
            有料販売と決済の土台は残しながら、投稿・コメント・いいねで教材が見つかる体験を先に作ります。
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-14 items-center bg-[var(--foreground)] px-8 text-sm font-bold tracking-[0.14em] text-white"
              href="/materials"
            >
              教材を見る
            </Link>
            <Link
              className="inline-flex min-h-14 items-center border border-[var(--line-strong)] bg-[var(--paper)] px-8 text-sm font-bold tracking-[0.14em] text-[var(--foreground)]"
              href="/library"
            >
              マイライブラリ
            </Link>
            <Link
              className="inline-flex min-h-14 items-center border border-[var(--line-strong)] bg-[var(--paper)] px-8 text-sm font-bold tracking-[0.14em] text-[var(--foreground)]"
              href="/seller"
            >
              投稿者モック
            </Link>
          </div>
        </div>

        <aside className="relative border border-[var(--line-strong)] bg-[var(--paper)] p-7 shadow-[0_30px_90px_rgba(60,60,60,0.06)]">
          <SheetStackIcon className="mx-auto mb-6 h-36 w-56 text-[var(--indigo)]" />
          <p className="font-en text-xs font-medium tracking-[0.28em] text-[var(--indigo)]">
            FUTURE: BUNDLE PURCHASE
          </p>
          <h2 className="mt-4 text-2xl font-black">{featuredBundle.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            {featuredBundle.description}
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div className="border border-[var(--line)] bg-[#FCFCFA] p-3">
              <dt className="text-xs text-[var(--ink-soft)]">将来単品合計</dt>
              <dd className="mt-1 font-black">¥{bundlePricing.singleTotalYen.toLocaleString()}</dd>
            </div>
            <div className="border border-[var(--line)] bg-[#FCFCFA] p-3">
              <dt className="text-xs text-[var(--ink-soft)]">将来セット案</dt>
              <dd className="mt-1 font-black">¥{bundlePricing.bundlePriceYen.toLocaleString()}</dd>
            </div>
            <div className="border border-[var(--line)] bg-[#FCFCFA] p-3">
              <dt className="text-xs text-[var(--ink-soft)]">割引</dt>
              <dd className="mt-1 font-black">{bundlePricing.discountRate}%</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section id="materials" className="mx-auto max-w-7xl border-t border-[var(--line)] px-5 py-14 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="font-en text-xs font-medium tracking-[0.34em] text-[var(--gold)]">
              MATERIALS
            </p>
            <h2 className="mt-2 text-3xl font-black">無料MVP教材</h2>
          </div>
          <p className="hidden max-w-md text-sm leading-7 text-[var(--ink-soft)] md:block">
            ここに並ぶ教材は、将来の無料公開・単品販売・セット販売で同じデータ構造を使います。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {materials.map((material) => (
            <article
              className="border border-[var(--line)] bg-[var(--paper)] p-5 transition-colors hover:border-[var(--line-strong)]"
              key={material.id}
            >
              <p className="font-en text-xs font-medium tracking-[0.22em] text-[var(--gold)]">{material.category}</p>
              <h3 className="mt-3 text-xl font-black">{material.title}</h3>
              <p className="mt-3 min-h-20 text-sm leading-7 text-[var(--ink-soft)]">
                {material.summary}
              </p>
              <div className="mt-4">
                <LicenseBadges {...material.license} />
              </div>
              <Link
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center border border-[var(--foreground)] bg-[var(--foreground)] text-sm font-bold tracking-[0.12em] text-white"
                href={`/materials/${material.slug}`}
              >
                詳細を見る
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="bundles" className="mx-auto max-w-7xl px-6 py-12 pb-20">
        <div className="border border-[var(--foreground)] bg-[var(--foreground)] p-8 text-white">
          <p className="font-en text-xs font-medium tracking-[0.28em] text-[#D5C18C]">BUNDLE MODEL</p>
          <h2 className="mt-3 text-3xl font-black">セット販売は後で実装。いまは教材を無料で広げる</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-[#e9e3d7]">
            価格計算や購入権限のロジックは残したまま、表示上は無料共有を優先します。
            教材フィードで利用者の反応を集めたあと、必要に応じて単品販売やセット販売に拡張します。
          </p>
        </div>
      </section>
    </main>
  );
}
