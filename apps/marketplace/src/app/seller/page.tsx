import Link from "next/link";
import { demoSellerSubmissions } from "@/lib/catalog";
import { summarizeSellerSubmissions } from "@/lib/marketplace";

const statusLabel = {
  draft: "下書き",
  submitted: "審査中",
  approved: "公開中",
  rejected: "差し戻し",
};

const statusClass = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

export default function SellerDashboardPage() {
  const sellerName = "アソシア教材チーム";
  const sellerSubmissions = demoSellerSubmissions.filter(
    (submission) => submission.sellerName === sellerName,
  );
  const summary = summarizeSellerSubmissions(sellerSubmissions);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <Link className="text-sm font-bold text-[var(--indigo)]" href="/">
          ← トップへ戻る
        </Link>

        <header className="mt-8 grid gap-6 border border-[var(--line)] bg-[var(--paper)] p-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-[var(--gold)]">
              SELLER BETA MOCK
            </p>
            <h1 className="mt-3 text-4xl font-black">出品者ダッシュボード</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              教材を下書きし、ファイル構成とライセンスを確認して、運営審査へ提出する流れのプロトタイプです。
              実際の保存・アップロード・本人確認は次の本格実装で接続します。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Metric label="下書き" value={summary.draft} />
            <Metric label="審査中" value={summary.submitted} />
            <Metric label="公開中" value={summary.approved} />
            <Metric label="差し戻し" value={summary.rejected} />
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-lg font-black">次の操作</h2>
            <div className="mt-5 grid gap-3">
              <Link
                className="inline-flex min-h-12 items-center justify-center bg-[#31302c] text-sm font-bold text-white"
                href="/seller/materials/new"
              >
                教材を作成する
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center border border-[var(--line)] bg-[#f3efe5] text-sm font-bold"
                href="/admin/review"
              >
                審査画面を見る
              </Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-[var(--ink-soft)]">
              Phase 2では招待制の出品者ベータを想定。公開前に必ず運営レビューを通します。
            </p>
          </aside>

          <section className="grid gap-4">
            {sellerSubmissions.map((submission) => (
              <article
                className="grid gap-5 border border-[var(--line)] bg-[var(--paper)] p-5 md:grid-cols-[1fr_180px]"
                key={submission.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex min-h-8 items-center px-3 text-xs font-bold ${statusClass[submission.status]}`}
                    >
                      {statusLabel[submission.status]}
                    </span>
                    <span className="text-xs font-bold text-[var(--ink-soft)]">
                      更新: {submission.updatedAt}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-black">{submission.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                    {submission.category} / {submission.licenseLabel} /{" "}
                    {submission.priceYen === 0
                      ? "無料"
                      : `¥${submission.priceYen.toLocaleString()}`}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                    {submission.reviewNote}
                  </p>
                </div>
                <button className="min-h-11 self-center border border-[var(--line)] bg-[#f3efe5] text-sm font-bold">
                  編集モック
                </button>
              </article>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#f3efe5] p-4">
      <p className="text-xs font-bold text-[var(--ink-soft)]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
