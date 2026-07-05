import { buildLicenseBadges, type LicenseInput } from "@/lib/marketplace";

const toneClass = {
  green: "border-[#D5D5CC] bg-[#FCFCFA] text-[#5A5A52]",
  slate: "border-[#E5E5DF] bg-[#FCFCFA] text-[#77776F]",
  amber: "border-[#E8DEC5] bg-[#FCFCFA] text-[#8C6F2F]",
  blue: "border-[#D7DEE3] bg-[#FCFCFA] text-[#5F6B76]",
  indigo: "border-[#D7DEE3] bg-[#FCFCFA] text-[#6E7F8D]",
  rose: "border-[#E5D8D8] bg-[#FCFCFA] text-[#8C5D5D]",
};

export function LicenseBadges(input: LicenseInput) {
  return (
    <div className="flex flex-wrap gap-2">
      {buildLicenseBadges(input).map((badge) => (
        <span
          className={`inline-flex min-h-8 items-center gap-2 border px-3 text-xs font-bold ${toneClass[badge.tone]}`}
          key={badge.label}
        >
          <span className="size-1.5 rounded-full bg-current opacity-55" />
          {badge.label}
        </span>
      ))}
    </div>
  );
}
