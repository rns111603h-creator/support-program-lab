import type { Material } from "@/lib/vault-store";
import type { RightsReport } from "@/lib/rights-check";
import { cardClass, DateLabel } from "./vault-ui";

export function RightsPanel({ report }: { report: RightsReport }) {
  return (
    <section className={`${cardClass} mt-6`} aria-labelledby="rights-title">
      <h2 id="rights-title" className="text-xl font-bold">
        素材・権利の確認メモ
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
        自動確認の結果は、出典や利用条件を見直すための手がかりです。保存を妨げるものではありません。
      </p>
      {report.findings.length > 0 ? (
        <ul className="mt-5 grid gap-3">
          {report.findings.map((finding, index) => (
            <li
              key={`${finding.code}-${index}`}
              className={`rounded-lg border p-4 ${finding.severity === "warning" ? "border-amber-300 bg-amber-50" : "border-[var(--line)] bg-[var(--background)]"}`}
            >
              <p className="text-xs font-bold text-[var(--indigo)]">
                {finding.severity === "warning"
                  ? "利用条件を確認"
                  : "確認の手がかり"}
                {finding.location ? ` · ${finding.location}` : ""}
              </p>
              <p className="mt-2 break-words text-sm leading-7">
                {finding.message}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg bg-[var(--background)] p-4 text-sm leading-7">
          今回のルールでは、確認候補の表記は見つかりませんでした。素材を自由に利用できることの保証ではありません。
        </p>
      )}
      <details className="mt-5 text-sm">
        <summary className="cursor-pointer py-2 font-bold">
          自動確認できた範囲・できないこと
        </summary>
        <ul className="mt-2 grid list-disc gap-2 pl-5 leading-7 text-[var(--ink-soft)]">
          {report.coverage.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function MaterialContent({
  material,
  sharedToken,
}: {
  material: Material;
  sharedToken?: string;
}) {
  return (
    <>
      <section className={cardClass}>
        <div className="flex flex-wrap gap-2">
          {material.tags.map((tag) => (
            <span
              className="rounded-full bg-[var(--background)] px-3 py-1 text-xs"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        {material.description && (
          <p className="mt-4 whitespace-pre-wrap break-words text-base leading-8">
            {material.description}
          </p>
        )}
        {material.body && (
          <div className="mt-6 border-t border-[var(--line)] pt-6">
            <h2 className="mb-3 text-lg font-bold">進め方・メモ</h2>
            <p className="whitespace-pre-wrap break-words text-sm leading-8">
              {material.body}
            </p>
          </div>
        )}
        {!material.description && !material.body && (
          <p className="text-sm text-[var(--ink-soft)]">
            本文のメモはありません。
          </p>
        )}
        <dl className="mt-6 grid gap-3 border-t border-[var(--line)] pt-5 text-sm leading-7">
          <div>
            <dt className="font-bold">版・更新日</dt>
            <dd>
              第{material.version}版 · <DateLabel value={material.updatedAt} />
            </dd>
          </div>
          {material.sourceUrl && (
            <div>
              <dt className="font-bold">出典URL</dt>
              <dd>
                <a
                  className="break-all text-[var(--indigo)] underline"
                  href={material.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {material.sourceUrl}
                </a>
              </dd>
            </div>
          )}
          {!sharedToken && material.rightsBasis && (
            <div>
              <dt className="font-bold">
                素材の権利・許可について（保管庫内のみ）
              </dt>
              <dd className="whitespace-pre-wrap break-words">
                {material.rightsBasis}
              </dd>
            </div>
          )}
        </dl>
      </section>
      <section className={`${cardClass} mt-6`}>
        <h2 className="text-xl font-bold">
          教材ファイル{" "}
          <span className="text-sm font-normal text-[var(--ink-soft)]">
            {material.files.length}点
          </span>
        </h2>
        {material.files.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            添付ファイルはありません。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {material.files.map((file) => (
              <li
                key={file.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="break-all text-sm font-bold">{file.name}</p>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    {file.size < 1024 * 1024
                      ? `${Math.ceil(file.size / 1024)} KB`
                      : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                  </p>
                </div>
                <a
                  className="inline-flex min-h-11 items-center rounded-lg border border-[var(--line-strong)] px-4 text-sm font-bold"
                  href={
                    sharedToken
                      ? `/api/share/${sharedToken}/files/${file.id}`
                      : `/api/vault/materials/${material.id}/files/${file.id}`
                  }
                >
                  ダウンロード<span className="sr-only">: {file.name}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
