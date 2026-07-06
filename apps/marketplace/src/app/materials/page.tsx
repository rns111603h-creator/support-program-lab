import Link from "next/link";
import { LicenseBadges } from "@/components/license-badges";
import { SiteHeader } from "@/components/site-header";
import {
  CommentIcon,
  DownloadIcon,
  HeartIcon,
  SheetStackIcon,
  UploadIcon,
} from "@/components/ui-icons";
import { communityMaterials } from "@/lib/catalog";
import { getFreeCommunityMaterials, sortCommunityMaterials } from "@/lib/marketplace";

const coverClass = {
  gold: "text-[#C2A15D]",
  olive: "text-[#AEB438]",
  indigo: "text-[#6E7F8D]",
  rose: "text-[#A98A8A]",
  slate: "text-[#8A9098]",
};

export default function MaterialsFeedPage() {
  const freeMaterials = sortCommunityMaterials(
    getFreeCommunityMaterials(communityMaterials),
    "popular",
  );
  const categories = [...new Set(freeMaterials.map((material) => material.category))];
  const totalDownloads = freeMaterials.reduce((sum, material) => sum + material.downloads, 0);
  const totalComments = freeMaterials.reduce(
    (sum, material) => sum + material.comments.length,
    0,
  );

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="materials" />

      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-10 lg:grid-cols-[minmax(0,720px)_280px]">
        <section>
          <div className="mb-6 border-b border-[var(--line)] pb-6">
            <p className="font-en text-xs font-medium tracking-[0.34em] text-[var(--gold)]">
              FREE COMMUNITY MATERIALS
            </p>
            <h1 className="mt-3 text-4xl font-normal leading-[1.45]">みんなの教材</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              支援者や事業所が投稿した教材を、実践テーマごとに探せます。
              現在は無料公開を中心に、閲覧・保存・ダウンロードのしやすさを優先しています。
            </p>
            <div className="mt-5 grid gap-2 text-sm md:grid-cols-3">
              <Metric label="無料教材" value={`${freeMaterials.length}件`} />
              <Metric label="保存・DL" value={`${totalDownloads.toLocaleString()}回`} />
              <Metric label="コメント" value={`${totalComments}件`} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex min-h-9 items-center bg-[var(--foreground)] px-4 text-xs font-bold tracking-[0.12em] text-white">
                人気順
              </span>
              <span className="inline-flex min-h-9 items-center border border-[var(--line-strong)] bg-[var(--paper)] px-4 text-xs font-bold text-[var(--ink-soft)]">
                新着
              </span>
              {categories.map((category) => (
                <span
                  className="inline-flex min-h-9 items-center border border-[var(--line)] bg-[#FCFCFA] px-4 text-xs font-bold text-[var(--ink-soft)]"
                  key={category}
                >
                  {category}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            {freeMaterials.map((material) => (
              <article
                className="grid gap-5 border-b border-[var(--line)] bg-[var(--paper)] p-5 transition-colors hover:border-[var(--line-strong)] md:grid-cols-[1fr_220px]"
                key={material.id}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--foreground)] text-sm font-black text-white">
                      {material.authorAvatar}
                    </span>
                    <div>
                      <p className="text-sm font-black">{material.sellerName}</p>
                      <p className="text-xs font-bold text-[var(--ink-soft)]">
                        {material.publishedAt} ・ {material.category}
                      </p>
                    </div>
                  </div>

                  <Link href={`/materials/${material.slug}`}>
                    <h2 className="mt-4 text-2xl font-black leading-snug hover:text-[var(--indigo)]">
                      {material.title}
                    </h2>
                  </Link>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                    {material.summary}
                  </p>

                  <div className="mt-4">
                    <LicenseBadges {...material.license} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-bold text-[var(--ink-soft)]">
                    <span className="inline-flex items-center gap-1.5">
                      <HeartIcon />
                      {material.likes}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CommentIcon />
                      {material.comments.length}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <DownloadIcon />
                      {material.downloads}
                    </span>
                    <span className="bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      {material.downloadUrl ? "資料ダウンロード可" : "無料で閲覧できます"}
                    </span>
                    {material.futurePriceYen ? (
                      <span className="text-xs text-[var(--muted)]">
                        将来価格案 ¥{material.futurePriceYen.toLocaleString()}
                      </span>
                    ) : null}
                  </div>

                  {material.comments[0] ? (
                    <div className="mt-4 border-l-4 border-[var(--line-strong)] bg-[#FCFCFA] px-4 py-3">
                      <p className="text-xs font-black text-[var(--ink-soft)]">
                        {material.comments[0].authorName} のコメント
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                        {material.comments[0].body}
                      </p>
                    </div>
                  ) : null}
                </div>

                <Link
                  className={`relative min-h-44 overflow-hidden border border-[var(--line)] bg-[#FCFCFA] ${coverClass[material.coverTone]}`}
                  href={`/materials/${material.slug}`}
                  aria-label={`${material.title}の詳細を見る`}
                >
                  <span className="font-en absolute left-5 top-5 text-xs font-medium tracking-[0.24em] text-[var(--muted)]">
                    PROGRAM
                  </span>
                  <SheetStackIcon className="absolute right-2 top-11 h-24 w-36 text-current opacity-75" />
                  <span className="absolute bottom-5 left-5 right-5 text-xl font-black leading-snug text-[var(--foreground)]">
                    {material.title}
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="h-fit border border-[var(--line)] bg-[var(--paper)] p-5 lg:sticky lg:top-6">
          <h2 className="text-lg font-black">無料で共有する</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            現場で使える教材を投稿し、支援者同士で活用方法を共有できます。公開中の教材は無料で閲覧できます。
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
            {["講師用台本", "利用者ワーク", "振り返りシート", "PPT / Word / Canva 用データ"].map((item) => (
              <li className="flex items-center gap-2" key={item}>
                <span className="size-1.5 rounded-full bg-[var(--gold)]" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-l-4 border-[var(--line-strong)] bg-[#FCFCFA] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
            個人情報、支援記録、他者著作物が混ざらないよう、公開前に運営が確認します。
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[var(--foreground)] text-sm font-bold tracking-[0.12em] text-white"
            href="/seller/materials/new"
          >
            <UploadIcon />
            教材を投稿する
          </Link>
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            有料販売、単品購入、セット販売は今後の拡張として準備します。現在は無料共有を優先しています。
          </p>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line)] bg-[#FCFCFA] px-4 py-3">
      <p className="text-[11px] font-bold text-[var(--ink-soft)]">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
