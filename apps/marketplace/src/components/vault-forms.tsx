"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import { buttonClass, fieldClass, secondaryClass } from "./vault-ui";

export type ActionState = { error?: string; success?: string; link?: string };
export type FormAction = (
  state: ActionState,
  data: FormData,
) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  label,
  pendingLabel = "処理中…",
  className = "",
  confirm,
}: {
  action: FormAction;
  children?: ReactNode;
  label: string;
  pendingLabel?: string;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState("");
  return (
    <form
      action={formAction}
      className={`grid gap-4 ${className}`}
      onReset={(event) => event.preventDefault()}
      onSubmit={(event) => {
        setLocalError("");
        setCopied(false);
        const files = new FormData(event.currentTarget)
          .getAll("files")
          .filter(
            (file): file is File => file instanceof File && file.size > 0,
          );
        if (
          files.length > 10 ||
          files.reduce((sum, file) => sum + file.size, 0) > 10 * 1024 * 1024
        ) {
          event.preventDefault();
          setLocalError(
            "添付は10点以内、1点・合計ともに10MB以下で選択してください。",
          );
          return;
        }
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
      {(localError || state.error) && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
        >
          {localError || state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"
        >
          {state.success}
        </p>
      )}
      {state.link && (
        <div className="min-w-0 rounded-lg border border-[var(--line-strong)] bg-[var(--background)] p-3">
          <p className="text-sm font-bold">発行したリンク</p>
          <a
            href={state.link}
            className="mt-2 block break-all text-sm underline"
          >
            {state.link}
          </a>
          <button
            type="button"
            className={`${secondaryClass} mt-3`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  new URL(state.link!, window.location.origin).href,
                );
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "コピーしました" : "リンクをコピー"}
          </button>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">
            コピーできない場合は、リンクを開いてアドレスをコピーしてください。
          </p>
        </div>
      )}
      <button
        disabled={pending}
        className={`${buttonClass} justify-self-start`}
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}

export function AuthForm({
  action,
  signup = false,
  next,
}: {
  action: FormAction;
  signup?: boolean;
  next?: string;
}) {
  return (
    <ActionForm
      action={action}
      label={signup ? "アカウントを作成" : "ログイン"}
    >
      {next && <input type="hidden" name="next" value={next} />}
      <label className="grid gap-2 text-sm font-bold">
        ユーザーID
        <input
          className={fieldClass}
          name="username"
          required
          autoComplete="username"
          minLength={3}
          maxLength={40}
          pattern="[a-zA-Z0-9_.\-]+"
          placeholder="例: program_user"
        />
      </label>
      <p className="-mt-2 text-xs leading-5 text-[var(--ink-soft)]">
        半角英数字・ピリオド・ハイフン・アンダースコア、3〜40文字。メールアドレスは不要です。
      </p>
      <label className="grid gap-2 text-sm font-bold">
        パスワード
        <input
          className={fieldClass}
          type="password"
          name="password"
          required
          autoComplete={signup ? "new-password" : "current-password"}
          minLength={signup ? 12 : undefined}
          maxLength={128}
        />
      </label>
      {signup && (
        <>
          <p className="-mt-2 text-xs leading-5 text-[var(--ink-soft)]">
            12文字以上。ほかのサービスと異なるパスワードを設定してください。
          </p>
          <label className="grid gap-2 text-sm font-bold">
            パスワード（確認）
            <input
              className={fieldClass}
              type="password"
              name="passwordConfirmation"
              required
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
            />
          </label>
          <p className="text-xs leading-5 text-[var(--ink-soft)]">
            現在はメールによるパスワード再発行に対応していません。IDとパスワードを安全に保管してください。
          </p>
        </>
      )}
    </ActionForm>
  );
}

type MaterialDefaults = {
  id?: string;
  version: number;
  title: string;
  description: string;
  body: string;
  tags: string[];
  sourceUrl: string;
  rightsBasis: string;
  files?: { id: string; name: string }[];
};

export function MaterialForm({
  action,
  vaultId,
  material,
}: {
  action: FormAction;
  vaultId: string;
  material?: MaterialDefaults;
}) {
  return (
    <ActionForm
      action={action}
      label={material ? "変更を保存" : "教材を保存"}
      pendingLabel="教材を保存中…"
    >
      <input type="hidden" name="vaultId" value={vaultId} />
      {material?.id && (
        <>
          <input type="hidden" name="materialId" value={material.id} />
          <input type="hidden" name="version" value={material.version} />
        </>
      )}
      <label className="grid gap-2 text-sm font-bold">
        教材名
        <input
          className={fieldClass}
          name="title"
          required
          maxLength={120}
          defaultValue={material?.title}
          placeholder="例: 報告・連絡・相談 60分"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        概要
        <textarea
          className={fieldClass}
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={material?.description}
          placeholder="ねらい、対象、所要時間など"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        進め方・メモ
        <textarea
          className={fieldClass}
          name="body"
          rows={12}
          maxLength={50000}
          defaultValue={material?.body}
          placeholder="当日の流れや、次に使うときの工夫を記録できます。"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        タグ
        <input
          className={fieldClass}
          name="tags"
          maxLength={300}
          defaultValue={material?.tags.join(", ")}
          placeholder="報連相, 60分, コミュニケーション"
        />
      </label>
      <p className="-mt-2 text-xs text-[var(--ink-soft)]">
        カンマで区切って入力してください。
      </p>
      <label className="grid gap-2 text-sm font-bold">
        出典URL（任意）
        <input
          className={fieldClass}
          name="sourceUrl"
          type="url"
          maxLength={2000}
          defaultValue={material?.sourceUrl}
          placeholder="https://…"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        素材の権利・許可について（任意）
        <textarea
          className={fieldClass}
          name="rightsBasis"
          rows={3}
          maxLength={2000}
          defaultValue={material?.rightsBasis}
          placeholder="例: 自分で作成。イラストは○○の利用条件を確認。"
        />
      </label>
      {material?.files && material.files.length > 0 && (
        <fieldset className="rounded-lg border border-[var(--line)] p-4">
          <legend className="px-1 text-sm font-bold">保存済みの添付</legend>
          <p className="mb-3 text-xs text-[var(--ink-soft)]">
            削除する添付だけにチェックしてください。
          </p>
          {material.files.map((file) => (
            <label
              className="flex min-h-11 items-center gap-3 break-all text-sm"
              key={file.id}
            >
              <input
                type="checkbox"
                name="removeFileIds"
                value={file.id}
                className="size-4"
              />
              {file.name} を削除
            </label>
          ))}
        </fieldset>
      )}
      <label className="grid gap-2 text-sm font-bold">
        教材ファイルを追加
        <input
          className={`${fieldClass} text-sm file:mr-3 file:rounded file:border-0 file:bg-[var(--background)] file:px-3 file:py-2`}
          type="file"
          multiple
          name="files"
          accept=".pdf,.pptx,.docx,.png,.jpg,.jpeg,.txt,.md"
        />
      </label>
      <p className="-mt-2 text-xs leading-6 text-[var(--ink-soft)]">
        PDF / PPTX / DOCX / PNG / JPEG / TXT /
        Markdown。10点以内、1点・合計ともに10MBまで。権利チェックのための外部サービスへの送信は行いません。
      </p>
      {material && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          保存すると、以前の教材共有リンクは無効になります。変更後の内容を確認してから、必要に応じて新しいリンクを発行してください。
        </p>
      )}
    </ActionForm>
  );
}
