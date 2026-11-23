import Link from "next/link";
import type { ReactNode } from "react";

export const fieldClass =
  "min-h-12 w-full rounded-lg border border-[var(--line-strong)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--blue-soft)]/30";
export const buttonClass =
  "inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--foreground)] px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50";
export const secondaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-white px-5 py-3 text-sm font-bold";
export const cardClass =
  "rounded-xl border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-7";

export function VaultShell({
  children,
  username,
  logout,
}: {
  children: ReactNode;
  username?: string;
  logout?: () => Promise<void>;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Link
            href="/vault"
            className="inline-flex min-h-11 items-center gap-3 font-bold"
          >
            <span
              className="grid size-10 place-items-center rounded-xl bg-[var(--indigo)] text-white"
              aria-hidden="true"
            >
              支
            </span>
            <span>
              支援プログラムLab
              <span className="mt-0.5 block text-xs font-normal text-[var(--ink-soft)]">
                自分とチームの教材保管庫
              </span>
            </span>
          </Link>
          <nav
            aria-label="保管庫ナビゲーション"
            className="flex flex-wrap items-center gap-4 text-sm"
          >
            <Link
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
              href="/"
            >
              公開教材
            </Link>
            {username ? (
              <>
                <Link
                  className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                  href="/vault"
                >
                  保管庫
                </Link>
                <span className="max-w-36 truncate text-[var(--ink-soft)]">
                  {username}
                </span>
                {logout && (
                  <form action={logout}>
                    <button className="min-h-11 rounded-lg border border-[var(--line)] px-3">
                      ログアウト
                    </button>
                  </form>
                )}
              </>
            ) : (
              <Link
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                href="/login"
              >
                ログイン
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">{children}</main>
      <footer className="mx-auto max-w-6xl border-t border-[var(--line)] px-5 py-6 text-xs leading-6 text-[var(--ink-soft)]">
        個人プロジェクトの教材保管庫です。実利用者の個人情報や、持ち出せない業務資料は保存しないでください。
      </footer>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <p className="font-en text-xs font-semibold tracking-[0.18em] text-[var(--indigo)]">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
        {title}
      </h1>
      {children && (
        <div className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          {children}
        </div>
      )}
    </header>
  );
}

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex min-h-11 items-center text-sm font-bold text-[var(--indigo)]"
    >
      ← {children}
    </Link>
  );
}

export function DateLabel({
  value,
  includeTime = false,
}: {
  value: string | number;
  includeTime?: boolean;
}) {
  const date = new Date(value);
  return (
    <time dateTime={date.toISOString()}>
      {includeTime
        ? date.toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : date.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
    </time>
  );
}
