import Link from "next/link";
import { LicenseBadges } from "@/components/license-badges";
import { SiteHeader } from "@/components/site-header";
import { CommentIcon, HeartIcon, SheetStackIcon, UploadIcon } from "@/components/ui-icons";
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

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="materials" />

      <div className="mx-auto grid max-w-6xl gap-9 px-5 py-10 lg:grid-cols-[minmax(0,720px)_280px]">
        <section>
          <div className="mb-6 border-b border-[var(--line)] pb-5">
            <p className="font-en text-xs font-medium tracking-[0.34em] text-[var(--gold)]">
              COMMUNITY MATERIALS
            </p>
            <h1 className="mt-3 text-4xl font-normal leading-[1.45]">みんなの教材</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              支援者や事業所が投稿した教材を、noteのように一覧で読めます。現在はすべて無料で入手できます。
              有料版の価格設計は残しつつ、まずは共有と反応を育てます。
            </p>
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
                    <span className="text-[#5F6B76]">無料で入手できます</span>
                    {material.futurePriceYen ? (
                      <span className="text-xs">
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
          <h2 className="text-lg font-black">投稿できる教材</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
            {["講師用台本", "利用者ワーク", "振り返りシート", "PPT / Word / Canva 用データ"].map((item) => (
              <li className="flex items-center gap-2" key={item}>
                <span className="size-1.5 rounded-full bg-[var(--gold)]" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-l-4 border-[var(--line-strong)] bg-[#FCFCFA] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
            記録の書き方例は、必要な教材にだけ付属資料として添える想定です。
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[var(--foreground)] text-sm font-bold tracking-[0.12em] text-white"
            href="/seller/materials/new"
          >
            <UploadIcon />
            教材を投稿する
          </Link>
          <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
            投稿後は運営審査を通して公開。個人情報や他者著作物を含む教材は公開できません。
          </p>
        </aside>
      </div>
    </main>
  );
}
