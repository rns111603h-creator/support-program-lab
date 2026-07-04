import Link from "next/link";

export default function NewMaterialMockPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm font-bold text-[var(--indigo)]" href="/seller">
          ← 出品者ダッシュボードへ戻る
        </Link>

        <header className="mt-8 border border-[var(--line)] bg-[var(--paper)] p-8">
          <p className="text-xs font-black tracking-[0.18em] text-[var(--gold)]">
            MATERIAL DRAFT MOCK
          </p>
          <h1 className="mt-3 text-4xl font-black">教材作成モック</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            出品者が教材を登録するときの入力項目です。今は保存しない静的モックで、サービスの流れ確認用です。
          </p>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-5 border border-[var(--line)] bg-[var(--paper)] p-6">
            <Field label="教材タイトル" value="質問の仕方" />
            <Field label="カテゴリ" value="コミュニケーション" />
            <Field label="概要" value="わからない時に、何がわからないかを短く伝える練習教材です。" />
            <Field label="対象サービス" value="就労移行 / 就労継続A型 / 就労継続B型" />
            <Field label="価格" value="¥1,800" />

            <div className="border border-dashed border-[var(--line)] bg-[#f8f4ea] p-5">
              <p className="text-sm font-black">ファイル構成</p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
                <li>・講師用進行表.pdf</li>
                <li>・利用者ワーク.docx</li>
                <li>・場面カード.pptx</li>
              </ul>
            </div>
          </div>

          <aside className="h-fit border border-[var(--line)] bg-[var(--paper)] p-6">
            <h2 className="text-lg font-black">公開前チェック</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <Check label="自作教材、または販売許諾あり" />
              <Check label="個人情報・支援記録を含まない" />
              <Check label="効果保証の表現を含まない" />
              <Check label="ライセンスは現場で編集OK" />
            </div>
            <div className="mt-6 grid gap-3">
              <button className="min-h-12 bg-[#31302c] text-sm font-bold text-white">
                審査提出予定
              </button>
              <button className="min-h-12 border border-[var(--line)] bg-[#f3efe5] text-sm font-bold">
                下書き保存予定
              </button>
            </div>
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
      <span className="min-h-12 border border-[var(--line)] bg-[#f8f4ea] px-4 py-3 text-sm text-[var(--ink-soft)]">
        {value}
      </span>
    </label>
  );
}

function Check({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 border border-[var(--line)] bg-[#f8f4ea] p-3">
      <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-[var(--olive)] text-xs font-black text-white">
        ✓
      </span>
      <span className="leading-6 text-[var(--ink-soft)]">{label}</span>
    </div>
  );
}
