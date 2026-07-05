import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseBadges } from "@/components/license-badges";
import { SiteHeader } from "@/components/site-header";
import { CommentIcon, DownloadIcon, HeartIcon } from "@/components/ui-icons";
import { communityMaterials } from "@/lib/catalog";

export function generateStaticParams() {
  return communityMaterials.map((material) => ({ slug: material.slug }));
}

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const material = communityMaterials.find((item) => item.slug === slug);

  if (!material) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="materials" />
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link className="text-sm font-bold text-[var(--indigo)]" href="/materials">
          ← 教材フィードへ戻る
        </Link>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <article className="border border-[var(--line)] bg-[var(--paper)] p-8">
            <p className="font-en text-xs font-medium tracking-[0.34em] text-[var(--gold)]">
              {material.category}
            </p>
            <h1 className="mt-4 text-4xl font-normal leading-[1.45]">{material.title}</h1>
            <p className="mt-5 text-sm font-bold text-[var(--ink-soft)]">
              投稿者: {material.sellerName}
            </p>
            <p className="mt-7 text-base leading-8 text-[var(--ink-soft)]">
              {material.description}
            </p>

            <div className="mt-8">
              <LicenseBadges {...material.license} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-bold text-[var(--ink-soft)]">
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
              <span className="text-[#5F6B76]">無料公開中</span>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="border border-[var(--line)] bg-[#FCFCFA] p-5">
                <h2 className="text-sm font-black">対象サービス</h2>
                <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
                  {material.targetServices.map((service) => (
                    <li className="flex items-center gap-2" key={service}>
                      <span className="size-1.5 rounded-full bg-[var(--gold)]" />
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-[var(--line)] bg-[#FCFCFA] p-5">
                <h2 className="text-sm font-black">含まれるファイル</h2>
                <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
                  {material.includedFiles.map((file) => (
                    <li className="flex items-center gap-2" key={file}>
                      <span className="size-1.5 rounded-full bg-[var(--blue-soft)]" />
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {material.supportItems && material.supportItems.length > 0 ? (
              <div className="mt-4 border border-[var(--line)] bg-[#FCFCFA] p-4">
                <h2 className="text-sm font-black">補助資料</h2>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  教材実施後に必要な場合だけ参照する付属資料です。教材そのものの主役にはしていません。
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
                  {material.supportItems.map((item) => (
                    <li className="flex items-center gap-2" key={item}>
                      <span className="size-1.5 rounded-full bg-[var(--line-strong)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {material.comments.length > 0 ? (
              <section className="mt-8 border-t border-[var(--line)] pt-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">コメント</h2>
                    <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">
                      実際の実装ではログイン利用者が感想や活用メモを投稿できます。
                    </p>
                  </div>
                  <button className="inline-flex min-h-10 items-center gap-2 border border-[var(--line-strong)] bg-[#FCFCFA] px-4 text-xs font-bold">
                    <CommentIcon />
                    コメントする
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  {material.comments.map((comment) => (
                    <article
                      className="border border-[var(--line)] bg-[#FCFCFA] p-4"
                      key={`${comment.authorName}:${comment.body}`}
                    >
                      <p className="text-sm font-black">{comment.authorName}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                        {comment.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside className="h-fit border border-[var(--line)] bg-[var(--paper)] p-6">
            <p className="font-en text-xs font-medium tracking-[0.28em] text-[var(--indigo)]">
              DOWNLOAD
            </p>
            <p className="mt-4 text-3xl font-normal">
              無料
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              現在はすべての教材を無料で入手できます。将来の有料化に備えた価格・決済設計は保持しています。
            </p>
            {material.futurePriceYen ? (
              <div className="mt-4 border border-[var(--line)] bg-[#FCFCFA] p-4">
                <p className="text-xs font-black text-[var(--ink-soft)]">将来の有料版メモ</p>
                <p className="mt-1 text-sm font-black">
                  単品価格案 ¥{material.futurePriceYen.toLocaleString()}
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
                  MVPでは課金せず、無料利用と反応データを優先します。
                </p>
              </div>
            ) : null}
            <Link
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[var(--foreground)] text-sm font-bold tracking-[0.12em] text-white"
              href="/library"
            >
              <DownloadIcon />
              無料でライブラリに追加
            </Link>
            <button className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-[var(--line-strong)] bg-[#FCFCFA] text-sm font-bold">
              <HeartIcon />
              いいね
            </button>
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <p className="text-sm font-black">共有前の確認</p>
              <ul className="mt-3 space-y-2 text-xs leading-6 text-[var(--ink-soft)]">
                <li>個人情報や実際の支援記録は含まない</li>
                <li>事業所内での編集可否を確認する</li>
                <li>他法人への再配布・転売はしない</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
