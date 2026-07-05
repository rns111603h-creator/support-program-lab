type IconProps = {
  className?: string;
};

export function BrandMark({ className = "size-9" }: IconProps) {
  return (
    <span className={`relative inline-block ${className}`} aria-hidden="true">
      <span className="absolute left-1 top-2 h-5 w-3 rotate-[-9deg] rounded-[3px] bg-[#C2C7CC]" />
      <span className="absolute left-3 top-1 h-6 w-3 rotate-[6deg] rounded-[3px] bg-[#8CA0B3]" />
      <span className="absolute left-5 top-2 h-5 w-3 rotate-[13deg] rounded-[3px] bg-[#5F6B76]" />
    </span>
  );
}

export function SheetStackIcon({ className = "h-32 w-44" }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 150"
      fill="none"
      role="img"
      aria-label="教材ファイルのイメージ"
    >
      <rect
        x="18"
        y="34"
        width="82"
        height="104"
        rx="2"
        stroke="currentColor"
        strokeOpacity=".28"
        transform="rotate(-9 18 34)"
      />
      <rect
        x="112"
        y="43"
        width="82"
        height="104"
        rx="2"
        stroke="currentColor"
        strokeDasharray="4 4"
        strokeOpacity=".28"
        transform="rotate(9 112 43)"
      />
      <rect x="72" y="18" width="86" height="112" rx="10" stroke="currentColor" />
      <path d="M98 66h34M98 82h34" stroke="currentColor" strokeLinecap="round" opacity=".72" />
    </svg>
  );
}

export function HeartIcon({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-9-9.1C1.7 7.7 3.6 5 6.7 5c1.8 0 3.2 1 4.1 2.3C11.7 6 13.1 5 14.9 5c3.1 0 5 2.7 3.7 5.9C16.6 15.6 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CommentIcon({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.5h14v9H9.5L5 19v-3.5h0V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 10h7M8.5 13h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v10m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function UploadIcon({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15V5m0 0 4 4m-4-4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className = "size-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
