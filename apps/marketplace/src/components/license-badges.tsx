import { buildLicenseBadges, type LicenseInput } from "@/lib/marketplace";

const toneClass = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};

export function LicenseBadges(input: LicenseInput) {
  return (
    <div className="flex flex-wrap gap-2">
      {buildLicenseBadges(input).map((badge) => (
        <span
          className={`inline-flex min-h-8 items-center border px-3 text-xs font-bold ${toneClass[badge.tone]}`}
          key={badge.label}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
