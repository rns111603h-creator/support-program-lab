import Link from "next/link";
import { LicenseBadges } from "@/components/license-badges";
import { communityMaterials } from "@/lib/catalog";
import { getFreeCommunityMaterials, sortCommunityMaterials } from "@/lib/marketplace";

const coverClass = {
  gold: "bg-[#d5bd82]",
  olive: "bg-[#bcc65a]",
  indigo: "bg-[#7d8fc9]",
  rose: "bg-[#d99aa3]",
  slate: "bg-[#8f918a]",
};

export default function MaterialsFeedPage() {
  const freeMaterials = sortCommunityMaterials(
    getFreeCommunityMaterials(communityMaterials),
    "popular",
  );

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link className="text-base font-black tracking-[0.08em]" href="/">
            支援プログラムLab
          </Link>
          <nav className="flex items-center gap-4 text-sm font-bold text-[var(--ink-soft)]">
            <Link href="/materials">教材</Link>
            <Link href="/seller">投稿する</Link>
            <Link href="/library">ライブラリ</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,720px)_280px]">
        <section>
          <div className="mb-6 border-b border-[var(--line)] pb-5">
            <p className="text-xs font-black tracking-[0.18em] text-[var(--gold)]">
              COMMUNITY MATERIALS
            </p>
            <h1 className="mt-2 text-3xl font-black">みんなの教材</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              支援者や事業所が投稿した教材を、noteのように一覧で読めます。現在はすべて無料で入手できます。
              有料版の価格設計は残しつつ、まずは共有と反応を育てます。
            </p>
          </div>

          <div className="grid gap-5">
            {freeMaterials.map((material) => (
              <article
                className="grid gap-5 border-b border-[var(--line)] bg-[var(--paper)] p-5 md:grid-cols-[1fr_220px]"
                key={material.id}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#31302c] text-sm font-black text-white">
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
                    <span>♡ {material.likes}</span>
                    <span>💬 {material.comments.length}</span>
                    <span className="text-emerald-700">無料で入手できます</span>
                    {material.futurePriceYen ? (
                      <span className="text-xs">
                        将来価格案 ¥{material.futurePriceYen.toLocaleString()}
                      </span>
                    ) : null}
                  </div>

                  {material.comments[0] ? (
                    <div className="mt-4 border-l-4 border-[var(--line)] bg-[#f8f4ea] px-4 py-3">
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
                  className={`relative min-h-44 overflow-hidden ${coverClass[material.coverTone]}`}
                  href={`/materials/${material.slug}`}
                  aria-label={`${material.title}の詳細を見る`}
                >
                  <span className="absolute left-5 top-5 text-xs font-black tracking-[0.18em] text-white/80">
                    PROGRAM
                  </span>
                  <span className="absolute bottom-5 left-5 right-5 text-xl font-black leading-snug text-white">
                    {material.title}
                  </span>
                  <span className="absolute right-4 top-4 size-16 rounded-full border border-white/60" />
                  <span className="absolute bottom-4 right-8 size-10 rounded-full border border-white/60" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <aside className="h-fit border border-[var(--line)] bg-[var(--paper)] p-5 lg:sticky lg:top-6">
          <h2 className="text-lg font-black">投稿できる教材</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
            <li>・講師用台本</li>
            <li>・利用者ワーク</li>
            <li>・振り返りシート</li>
            <li>・実施記録文例</li>
            <li>・PPT / Word / Canva 用データ</li>
          </ul>
          <Link
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center bg-[#31302c] text-sm font-bold text-white"
            href="/seller/materials/new"
          >
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
