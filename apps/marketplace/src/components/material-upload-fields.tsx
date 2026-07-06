"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { UploadIcon } from "./ui-icons";

type UploadFile = {
  name: string;
  size: number;
};

export function MaterialUploadFields() {
  const [coverFiles, setCoverFiles] = useState<UploadFile[]>([]);
  const [materialFiles, setMaterialFiles] = useState<UploadFile[]>([]);

  const totalMaterialSize = useMemo(
    () => materialFiles.reduce((sum, file) => sum + file.size, 0),
    [materialFiles],
  );

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <UploadBox
        accept="image/png,image/jpeg,image/webp"
        files={coverFiles}
        label="イメージ画像"
        name="coverImage"
        onFiles={setCoverFiles}
        summary="投稿一覧に表示する表紙画像を選択できます。"
      />
      <UploadBox
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.png,.jpg,.jpeg,.webp"
        files={materialFiles}
        label="資料ファイル"
        multiple
        name="materialFiles"
        onFiles={setMaterialFiles}
        summary="講師用台本、利用者ワーク、スライド、補助資料をまとめて選択できます。"
      >
        {materialFiles.length > 0 ? (
          <p className="mt-3 text-xs font-bold text-[var(--ink-soft)]">
            合計 {formatBytes(totalMaterialSize)}
          </p>
        ) : null}
      </UploadBox>
    </div>
  );
}

function UploadBox({
  accept,
  children,
  files,
  label,
  multiple = false,
  name,
  onFiles,
  summary,
}: {
  accept: string;
  children?: ReactNode;
  files: UploadFile[];
  label: string;
  multiple?: boolean;
  name: string;
  onFiles: (files: UploadFile[]) => void;
  summary: string;
}) {
  const inputId = `upload-${name}`;

  return (
    <div className="border border-dashed border-[var(--line-strong)] bg-[#FCFCFA] p-5">
      <p className="text-sm font-black">{label}</p>
      <p className="mt-3 text-xs leading-6 text-[var(--ink-soft)]">{summary}</p>
      <label
        className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-[var(--foreground)] bg-[var(--foreground)] px-4 text-xs font-bold tracking-[0.12em] text-white"
        htmlFor={inputId}
      >
        <UploadIcon />
        ファイルを選択
      </label>
      <input
        accept={accept}
        className="sr-only"
        id={inputId}
        multiple={multiple}
        name={name}
        onChange={(event) => {
          onFiles(
            Array.from(event.currentTarget.files ?? []).map((file) => ({
              name: file.name,
              size: file.size,
            })),
          );
        }}
        type="file"
      />
      {files.length > 0 ? (
        <ul className="mt-4 space-y-2 text-xs leading-6 text-[var(--ink-soft)]">
          {files.map((file) => (
            <li
              className="flex items-center justify-between gap-3"
              key={`${file.name}:${file.size}`}
            >
              <span className="min-w-0 truncate">{file.name}</span>
              <span className="shrink-0 font-bold">{formatBytes(file.size)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs leading-6 text-[var(--muted)]">選択されたファイルはありません。</p>
      )}
      {children}
    </div>
  );
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size}B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 102.4) / 10}KB`;
  }

  return `${Math.round(size / 1024 / 102.4) / 10}MB`;
}
