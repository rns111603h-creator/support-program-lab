import Link from "next/link";
import { LicenseBadges } from "@/components/license-badges";
import { bundles, materials } from "@/lib/catalog";
import { calculateBundleDisplay } from "@/lib/marketplace";

export default function Home() {
  const featuredBundle = bundles[0];
  const bundlePricing = calculateBundleDisplay({
    bundlePriceYen: featuredBundle.priceYen,
    materialPricesYen: featuredBundle.materialIds.map(
      (materialId) => materials.find((material) => material.id === materialId)?.priceYen ?? 0,
    ),
  });

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]/88">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link className="text-lg font-black tracking-[0.08em]" href="/">
            支援プログラムLab
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold text-[var(--ink-soft)]">
            <Link href="#materials">教材</Link>
            <Link href="#bundles">セット</Link>
            <Link href="/seller">出品者</Link>
            <Link href="/admin/review">審査</Link>
            <Link href="/library">マイライブラリ</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <p className="mb-5 text-xs font-black tracking-[0.24em] text-[var(--gold)]">
            CLOSED FREE MVP
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
            福祉現場の教材を、
            <br />
            安全に共有する土台。
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
            Phase 1では、無料教材のライブラリ、ライセンス表示、購入権限に基づく再ダウンロード導線を先に作ります。
            有料販売と出品者審査へ拡張できる本番アプリの入口です。
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-12 items-center bg-[#31302c] px-6 text-sm font-bold text-white"
              href="#materials"
            >
              教材を見る
            </Link>
            <Link
              className="inline-flex min-h-12 items-center border border-[var(--line)] bg-[var(--paper)] px-6 text-sm font-bold text-[var(--foreground)]"
              href="/library"
            >
              マイライブラリ
            </Link>
            <Link
              className="inline-flex min-h-12 items-center border border-[var(--line)] bg-[var(--paper)] px-6 text-sm font-bold text-[var(--foreground)]"
              href="/seller"
            >
              出品者モック
            </Link>
          </div>
        </div>

        <aside className="border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[0_24px_80px_rgba(49,48,44,0.08)]">
          <p className="text-xs font-black tracking-[0.18em] text-[var(--indigo)]">
            NEXT: BUNDLE PURCHASE
          </p>
          <h2 className="mt-4 text-2xl font-black">{featuredBundle.title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            {featuredBundle.description}
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div className="bg-[#f3efe5] p-3">
              <dt className="text-xs text-[var(--ink-soft)]">単品合計</dt>
              <dd className="mt-1 font-black">¥{bundlePricing.singleTotalYen.toLocaleString()}</dd>
            </div>
            <div className="bg-[#f3efe5] p-3">
              <dt className="text-xs text-[var(--ink-soft)]">セット</dt>
              <dd className="mt-1 font-black">¥{bundlePricing.bundlePriceYen.toLocaleString()}</dd>
            </div>
            <div className="bg-[#f3efe5] p-3">
              <dt className="text-xs text-[var(--ink-soft)]">割引</dt>
              <dd className="mt-1 font-black">{bundlePricing.discountRate}%</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section id="materials" className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-7 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-[var(--gold)]">
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
              className="border border-[var(--line)] bg-[var(--paper)] p-5"
              key={material.id}
            >
              <p className="text-xs font-bold text-[var(--gold)]">{material.category}</p>
              <h3 className="mt-3 text-xl font-black">{material.title}</h3>
              <p className="mt-3 min-h-20 text-sm leading-7 text-[var(--ink-soft)]">
                {material.summary}
              </p>
              <div className="mt-4">
                <LicenseBadges {...material.license} />
              </div>
              <Link
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center bg-[#31302c] text-sm font-bold text-white"
                href={`/materials/${material.slug}`}
              >
                詳細を見る
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="bundles" className="mx-auto max-w-7xl px-6 py-12 pb-20">
        <div className="border border-[var(--line)] bg-[#31302c] p-8 text-white">
          <p className="text-xs font-black tracking-[0.18em] text-[#d8bf80]">BUNDLE MODEL</p>
          <h2 className="mt-3 text-3xl font-black">セット販売は、同一出品者の承認済み教材から開始</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-[#e9e3d7]">
            Phase 1では購入処理はまだ行いませんが、セット商品の見せ方と価格計算は先に実装済みです。
            次のPhaseで、購入後に含まれる全教材へダウンロード権限を発行します。
          </p>
        </div>
      </section>
    </main>
  );
}
