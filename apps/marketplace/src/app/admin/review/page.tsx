import { SiteHeader } from "@/components/site-header";
import { demoSellerSubmissions } from "@/lib/catalog";
import { getReviewQueue } from "@/lib/marketplace";

export default function AdminReviewMockPage() {
  const reviewQueue = getReviewQueue(demoSellerSubmissions);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="review" />
      <div className="mx-auto max-w-7xl px-5 py-10">

        <header className="mt-8 grid gap-6 border border-[var(--line)] bg-[var(--paper)] p-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="font-en text-xs font-medium tracking-[0.34em] text-[var(--gold)]">
              ADMIN REVIEW MOCK
            </p>
            <h1 className="mt-3 text-4xl font-normal">運営審査キュー</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              Phase 2では、投稿された教材をすぐ公開せず、著作権・個人情報・表現・ライセンスを確認する運営画面を見せます。
              実際の承認処理はまだ行わないプロトタイプです。
            </p>
          </div>
          <div className="border border-[var(--line)] bg-[#FCFCFA] p-5">
            <p className="text-sm font-black">審査待ち</p>
            <p className="mt-2 text-5xl font-black">{reviewQueue.length}</p>
            <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
              新しい提出順に確認。リスクフラグがある教材は重点レビューします。
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-5">
          {reviewQueue.map((submission) => (
            <article
              className="grid gap-6 border border-[var(--line)] bg-[var(--paper)] p-6 lg:grid-cols-[1fr_340px]"
              key={submission.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-8 items-center bg-amber-50 px-3 text-xs font-bold text-amber-700">
                    審査中
                  </span>
                  <span className="text-xs font-bold text-[var(--ink-soft)]">
                    {submission.sellerName} / 更新 {submission.updatedAt}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-black">{submission.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  {submission.category} / {submission.licenseLabel} /{" "}
                  {submission.priceYen === 0
                    ? "無料"
                    : `¥${submission.priceYen.toLocaleString()}`}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {submission.riskFlags.map((flag) => (
                    <span
                      className="inline-flex min-h-8 items-center border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700"
                      key={flag}
                    >
                      {flag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <ReviewBlock
                    title="含まれるファイル"
                    items={submission.includedFiles}
                  />
                  <ReviewBlock
                    title="重点確認"
                    items={[
                      "個人情報が混ざっていないか",
                      "他者著作物の無断利用がないか",
                      "効果保証に見える表現がないか",
                    ]}
                  />
                </div>
              </div>

              <aside className="border border-[var(--line)] bg-[#FCFCFA] p-5">
                <p className="text-sm font-black">レビューコメント</p>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  {submission.reviewNote}
                </p>
                <div className="mt-6 grid gap-3">
                  <button className="min-h-11 bg-emerald-700 text-sm font-bold text-white">
                    承認予定
                  </button>
                  <button className="min-h-11 border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700">
                    差し戻し予定
                  </button>
                  <button className="min-h-11 border border-[var(--line)] bg-[var(--paper)] text-sm font-bold">
                    法務確認へ回す予定
                  </button>
                </div>
              </aside>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function ReviewBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-[var(--line)] bg-[#FCFCFA] p-4">
      <p className="text-sm font-black">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
        {items.map((item) => (
          <li className="flex items-center gap-2" key={item}>
            <span className="size-1.5 rounded-full bg-[var(--gold)]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
