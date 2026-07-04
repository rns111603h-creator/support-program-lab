import type { LicenseInput } from "./marketplace";

export type MarketplaceMaterial = {
  id: string;
  slug: string;
  title: string;
  category: string;
  sellerName: string;
  summary: string;
  description: string;
  durationMinutes: number;
  targetServices: string[];
  includedFiles: string[];
  priceYen: number;
  accessType: "free" | "paid-preview";
  license: LicenseInput;
};

export type MarketplaceBundle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sellerName: string;
  materialIds: string[];
  priceYen: number;
};

export const materials: MarketplaceMaterial[] = [
  {
    id: "greeting-first-impression",
    slug: "greeting-first-impression",
    title: "挨拶と第一印象",
    category: "ビジネスマナー",
    sellerName: "支援プログラムLab公式",
    summary: "挨拶の声量、表情、姿勢を練習し、相手に伝わる第一印象を考えます。",
    description:
      "初回プログラムでも使いやすい、講師用台本・利用者ワーク・振り返りシートのセットです。緊張が強い利用者にも配慮し、視線や声量を一律に求めすぎない進行にしています。",
    durationMinutes: 45,
    targetServices: ["就労移行", "就労継続B型", "生活訓練"],
    includedFiles: ["講師用台本", "利用者ワーク", "振り返りシート", "実施記録文例"],
    priceYen: 0,
    accessType: "free",
    license: {
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    },
  },
  {
    id: "report-contact-consult",
    slug: "report-contact-consult",
    title: "報告・連絡・相談",
    category: "コミュニケーション",
    sellerName: "支援プログラムLab公式",
    summary: "仕事で困った場面を例に、誰に、いつ、何を伝えるかを整理します。",
    description:
      "報告・連絡・相談の違いを、現場で起こりやすい短い場面カードで練習します。相談できなかった経験を責めず、次に使える選択肢を増やす構成です。",
    durationMinutes: 60,
    targetServices: ["就労移行", "就労継続A型", "就労継続B型"],
    includedFiles: ["場面カード", "講師用台本", "利用者ワーク", "実施記録文例"],
    priceYen: 0,
    accessType: "free",
    license: {
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    },
  },
  {
    id: "basic-money-management",
    slug: "basic-money-management",
    title: "金銭管理の基本",
    category: "金銭管理",
    sellerName: "支援プログラムLab公式",
    summary: "収入、固定費、自由に使えるお金を分け、給料日後の使い方を考えます。",
    description:
      "給料日後の困りごとを題材に、必要な支払いを先に確認する流れを練習します。本人責任として扱いすぎず、予防の仕組みづくりに焦点を当てます。",
    durationMinutes: 60,
    targetServices: ["就労移行", "就労継続B型", "生活訓練"],
    includedFiles: ["予算ワーク", "買い物前チェック", "講師用台本", "記録文例"],
    priceYen: 0,
    accessType: "free",
    license: {
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    },
  },
];

export const bundles: MarketplaceBundle[] = [
  {
    id: "employment-starter-set",
    slug: "employment-starter-set",
    title: "就労支援スターターセット",
    description:
      "初回導入で使いやすいビジネスマナー、報連相、金銭管理の基本教材をまとめたセットです。",
    sellerName: "支援プログラムLab公式",
    materialIds: [
      "greeting-first-impression",
      "report-contact-consult",
      "basic-money-management",
    ],
    priceYen: 7800,
  },
];

export const demoEntitlements = [
  {
    id: "demo:greeting-first-impression",
    buyerId: "demo-buyer",
    materialId: "greeting-first-impression",
    sourcePurchaseId: "free_access",
  },
  {
    id: "demo:report-contact-consult",
    buyerId: "demo-buyer",
    materialId: "report-contact-consult",
    sourcePurchaseId: "free_access",
  },
];
