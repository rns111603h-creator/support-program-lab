import Link from "next/link";
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
            FREE MATERIAL POST MOCK
          </p>
          <h1 className="mt-3 text-4xl font-normal">無料教材を投稿する</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            投稿者が自作教材を共有するときの入力項目です。今は保存しない静的モックで、まずは無料公開の流れを確認します。
            有料販売に必要な価格・決済項目は後の実装として分離します。
          </p>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-5 border border-[var(--line)] bg-[var(--paper)] p-6">
            <Field label="教材タイトル" value="質問の仕方" />
            <Field label="カテゴリ" value="コミュニケーション" />
            <Field label="概要" value="わからない時に、何がわからないかを短く伝える練習教材です。" />
            <Field label="本文・使い方" value="対象者、60分の流れ、講師の声かけ、利用者ワークの使い方を本文として入力します。" />
            <Field label="対象サービス" value="就労移行 / 就労継続A型 / 就労継続B型" />
            <Field label="公開設定" value="無料で公開する（MVPでは有料販売しない）" />
            <Field label="将来の有料版メモ" value="単品価格案 ¥1,800。反応を見て、後で有料版・セット版を検討します。" />

            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="min-h-40 border border-dashed border-[var(--line-strong)] bg-[#FCFCFA] p-5">
                <p className="text-sm font-black">イメージ画像</p>
                <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">
                  投稿一覧に表示する表紙画像。未設定の場合はカテゴリ色の教材カードを表示します。
                </p>
              </div>
              <div className="border border-dashed border-[var(--line-strong)] bg-[#FCFCFA] p-5">
                <p className="text-sm font-black">資料ファイル</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
                  {["講師用進行表.pdf", "利用者ワーク.docx", "場面カード.pptx"].map((file) => (
                    <li className="flex items-center gap-2" key={file}>
                      <span className="size-1.5 rounded-full bg-[var(--blue-soft)]" />
                      {file}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs leading-6 text-[var(--ink-soft)]">
                  実装時はPDF、Word、PowerPoint、画像をアップロードできる想定です。
                </p>
              </div>
            </div>

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
              <Check label="MVPでは無料公開として提出" />
            </div>
            <div className="mt-6 grid gap-3">
              <button className="inline-flex min-h-12 items-center justify-center gap-2 bg-[var(--foreground)] text-sm font-bold tracking-[0.12em] text-white">
                <UploadIcon />
                審査提出予定
              </button>
              <button className="min-h-12 border border-[var(--line-strong)] bg-[#FCFCFA] text-sm font-bold">
                下書き保存予定
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
