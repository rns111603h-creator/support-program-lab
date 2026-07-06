import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { UploadIcon } from "@/components/ui-icons";
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
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="seller" />
      <div className="mx-auto max-w-7xl px-5 py-10">

        <header className="mt-8 grid gap-6 border border-[var(--line)] bg-[var(--paper)] p-8 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="font-en text-xs font-medium tracking-[0.34em] text-[var(--gold)]">
              CREATOR DASHBOARD
            </p>
            <h1 className="mt-3 text-4xl font-normal">投稿者ダッシュボード</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
              教材を下書きし、無料公開の設定、ファイル構成、ライセンスを確認して、運営審査へ提出できます。
              有料販売は後の実装として残し、いまは投稿者と利用者を増やす設計にしています。
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
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-[var(--foreground)] text-sm font-bold tracking-[0.12em] text-white"
                href="/seller/materials/new"
              >
                <UploadIcon />
                無料教材を投稿する
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center border border-[var(--line-strong)] bg-[#FCFCFA] text-sm font-bold"
                href="/admin/review"
              >
                審査画面を見る
              </Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-[var(--ink-soft)]">
              投稿された教材は、公開前に必ず運営レビューを通します。
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
                    無料公開
                    {submission.futurePriceYen
                      ? ` / 将来価格案 ¥${submission.futurePriceYen.toLocaleString()}`
                      : ""}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                    {submission.reviewNote}
                  </p>
                </div>
                <button className="min-h-11 self-center border border-[var(--line-strong)] bg-[#FCFCFA] text-sm font-bold">
                  編集する
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
    <div className="border border-[var(--line)] bg-[#FCFCFA] p-4">
      <p className="text-xs font-bold text-[var(--ink-soft)]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
