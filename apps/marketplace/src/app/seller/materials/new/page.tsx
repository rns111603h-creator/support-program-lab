import Link from "next/link";
import { MaterialUploadFields } from "@/components/material-upload-fields";
import { SiteHeader } from "@/components/site-header";
import { CheckIcon, UploadIcon } from "@/components/ui-icons";

export default function NewMaterialMockPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <SiteHeader active="seller" />
      <div className="mx-auto max-w-6xl px-5 py-10">
        <Link className="text-sm font-bold text-[var(--indigo)]" href="/seller">
          ← 投稿者ダッシュボードへ戻る
        </Link>

        <header className="mt-8 border border-[var(--line)] bg-[var(--paper)] p-8">
          <p className="font-en text-xs font-medium tracking-[0.34em] text-[var(--gold)]">
            MATERIAL POST
          </p>
          <h1 className="mt-3 text-4xl font-normal">無料教材を投稿する</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            自作教材を登録し、公開前の確認へ進めます。現在は無料公開を中心に受け付けています。
            有料販売に必要な価格・決済項目は今後の拡張として管理します。
          </p>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-5 border border-[var(--line)] bg-[var(--paper)] p-6">
            <Field label="教材タイトル" value="質問の仕方" />
            <Field label="カテゴリ" value="コミュニケーション" />
            <Field label="概要" value="わからない時に、何がわからないかを短く伝える練習教材です。" />
            <Field label="本文・使い方" value="対象者、60分の流れ、講師の声かけ、利用者ワークの使い方を本文として入力します。" />
            <Field label="対象サービス" value="就労移行 / 就労継続A型 / 就労継続B型" />
            <Field label="公開設定" value="無料で公開する（現在は有料販売を受け付けていません）" />
            <Field label="将来の有料版メモ" value="単品価格案 ¥1,800。反応を見て、後で有料版・セット版を検討します。" />

            <MaterialUploadFields />

            <div className="grid gap-3 border border-[var(--line)] bg-[#FCFCFA] p-5 md:grid-cols-3">
              <MiniPolicy title="利用条件" body="現場で編集OK / クレジット表記あり" />
              <MiniPolicy title="コメント" body="公開後に利用者同士で活用メモを投稿" />
              <MiniPolicy title="いいね" body="人気順・特集掲載の参考指標にする" />
            </div>
          </div>

          <aside className="h-fit border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-lg font-black">公開前チェック</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <Check label="自作教材、または共有許諾あり" />
              <Check label="個人情報・支援記録を含まない" />
              <Check label="効果保証の表現を含まない" />
              <Check label="ライセンスは現場で編集OK" />
              <Check label="無料公開として提出" />
            </div>
            <div className="mt-6 grid gap-3">
              <button className="inline-flex min-h-12 items-center justify-center gap-2 bg-[var(--foreground)] text-sm font-bold tracking-[0.12em] text-white">
                <UploadIcon />
                審査へ提出
              </button>
              <button className="min-h-12 border border-[var(--line-strong)] bg-[#FCFCFA] text-sm font-bold">
                下書き保存
              </button>
            </div>
            <p className="mt-5 border-l-4 border-[var(--line-strong)] bg-[#FCFCFA] px-4 py-3 text-xs leading-6 text-[var(--ink-soft)]">
              有料化時は、この下書きに価格、販売単位、セット紐づけ、本人確認、売上受取設定を追加します。
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black">{label}</span>
      <span className="min-h-12 border border-[var(--line)] bg-[#FCFCFA] px-4 py-3 text-sm text-[var(--ink-soft)]">
        {value}
      </span>
    </label>
  );
}

function MiniPolicy({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-black">{title}</p>
      <p className="mt-1 text-xs leading-6 text-[var(--ink-soft)]">{body}</p>
    </div>
  );
}

function Check({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 border border-[var(--line)] bg-[#FCFCFA] p-3">
      <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-[var(--olive)] text-xs font-black text-white">
        <CheckIcon className="size-3.5" />
      </span>
      <span className="leading-6 text-[var(--ink-soft)]">{label}</span>
    </div>
  );
}
