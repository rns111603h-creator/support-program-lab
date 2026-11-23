import Link from "next/link";
import { BrandMark } from "./ui-icons";

type SiteHeaderProps = {
  active?: "top" | "materials" | "library" | "seller" | "review" | "vault";
};

const navItems = [
  { key: "top", en: "TOP", label: "トップ", href: "/" },
  { key: "vault", en: "VAULT", label: "保管庫", href: "/vault" },
  { key: "materials", en: "LIBRARY", label: "教材", href: "/materials" },
  { key: "library", en: "MY", label: "保存済み", href: "/library" },
  { key: "seller", en: "SELLER", label: "投稿", href: "/seller" },
  { key: "review", en: "REVIEW", label: "審査", href: "/admin/review" },
] as const;

export function SiteHeader({ active = "top" }: SiteHeaderProps) {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--paper)]/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-5 md:px-8">
        <Link
          className="inline-flex items-center gap-3 text-sm font-black tracking-[0.12em]"
          href="/"
        >
          <BrandMark className="size-9 shrink-0" />
          <span>支援プログラムLab</span>
        </Link>
        <nav
          aria-label="主要ナビゲーション"
          className="order-3 flex w-full items-center gap-5 overflow-x-auto py-1 md:order-none md:w-auto md:gap-7"
        >
          {navItems.map((item) => (
            <Link
              className={`border-b pb-2 text-[11px] font-semibold tracking-[0.28em] transition-colors ${
                active === item.key
                  ? "border-[var(--gold)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
              href={item.href}
              key={item.key}
            >
              <span className="block whitespace-nowrap py-2">{item.label}</span>
            </Link>
          ))}
        </nav>
        <Link
          href="/login"
          className="shrink-0 py-3 text-xs font-bold text-[var(--indigo)]"
        >
          ログイン
        </Link>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3 text-[11px] font-bold tracking-[0.12em] text-[var(--muted)] md:px-8">
          <span className="size-1.5 rounded-full bg-[var(--gold)]" />
          <span>
            教材棚・保存済み・投稿・審査はデモ表示です。実際の保存・共有は「保管庫」から利用できます。
          </span>
        </div>
      </div>
    </header>
  );
}
