import type { LicenseInput, SellerSubmission } from "./marketplace";

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
  supportItems?: string[];
  priceYen: number;
  accessType: "free" | "paid-preview";
  authorAvatar: string;
  coverTone: "gold" | "olive" | "indigo" | "rose" | "slate";
  likes: number;
  downloads: number;
  comments: {
    authorName: string;
    body: string;
  }[];
  publishedAt: string;
  futurePriceYen?: number;
  downloadUrl?: string;
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
    includedFiles: ["講師用台本", "利用者ワーク", "振り返りシート"],
    supportItems: ["記録の書き方例"],
    priceYen: 0,
    futurePriceYen: 3000,
    accessType: "free",
    authorAvatar: "公",
    coverTone: "gold",
    likes: 42,
    downloads: 186,
    comments: [
      {
        authorName: "就労移行 支援員",
        body: "初回の導入で使いやすく、緊張が強い方にも説明しやすかったです。",
      },
      {
        authorName: "B型 生活支援員",
        body: "振り返りシートだけ単独でも活用できました。",
      },
    ],
    publishedAt: "2026-07-04",
    downloadUrl: "/downloads/greeting-first-impression-kit.html",
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
    includedFiles: ["場面カード", "講師用台本", "利用者ワーク"],
    supportItems: ["記録の書き方例"],
    priceYen: 0,
    futurePriceYen: 3000,
    accessType: "free",
    authorAvatar: "公",
    coverTone: "indigo",
    likes: 36,
    downloads: 142,
    comments: [
      {
        authorName: "サービス管理責任者",
        body: "報連相の違いを短時間で確認できる構成がよいです。",
      },
    ],
    publishedAt: "2026-07-03",
    downloadUrl: "/downloads/report-contact-consult-kit.html",
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
    includedFiles: ["予算ワーク", "買い物前チェック", "講師用台本"],
    supportItems: ["記録の書き方例"],
    priceYen: 0,
    futurePriceYen: 3000,
    accessType: "free",
    authorAvatar: "公",
    coverTone: "olive",
    likes: 29,
    downloads: 98,
    comments: [
      {
        authorName: "生活訓練スタッフ",
        body: "金銭の話を責める雰囲気にせず進められました。",
      },
    ],
    publishedAt: "2026-07-02",
    downloadUrl: "/downloads/basic-money-management-kit.html",
    license: {
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    },
  },
];

export const communityMaterials: MarketplaceMaterial[] = [
  ...materials,
  {
    id: "question-template",
    slug: "question-template",
    title: "質問の仕方テンプレート",
    category: "コミュニケーション",
    sellerName: "就労支援サンプル事業所",
    summary: "「ここまでできました」「この先がわかりません」を短く伝える練習教材です。",
    description:
      "質問が苦手な利用者向けに、状況を整理して短く伝えるための文例とワークをまとめています。職員が問い詰める進行にならないよう、選択肢を増やす構成にしています。",
    durationMinutes: 45,
    targetServices: ["就労移行", "就労継続A型", "就労継続B型"],
    includedFiles: ["質問テンプレート", "場面カード", "講師メモ"],
    priceYen: 0,
    futurePriceYen: 1800,
    accessType: "free",
    authorAvatar: "就",
    coverTone: "rose",
    likes: 51,
    downloads: 211,
    comments: [
      {
        authorName: "就労定着 支援員",
        body: "実習前の練習にちょうどよさそうです。",
      },
      {
        authorName: "B型 職業指導員",
        body: "作業場面カードを増やして使ってみます。",
      },
      {
        authorName: "相談支援専門員",
        body: "相談先を選ぶワークにも展開できそう。",
      },
    ],
    publishedAt: "2026-07-05",
    license: {
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    },
  },
  {
    id: "sleep-rhythm-sheet",
    slug: "sleep-rhythm-sheet",
    title: "睡眠リズムを整える週間シート",
    category: "生活管理",
    sellerName: "アソシア教材チーム",
    summary: "起床、就寝、通所への影響を見える化し、無理のない一つの工夫を決めます。",
    description:
      "睡眠の問題を本人責任にせず、生活の流れを一緒に確認するための週間シートです。医療的判断はせず、相談につなげる観点も含めています。",
    durationMinutes: 60,
    targetServices: ["生活訓練", "就労移行", "就労継続B型"],
    includedFiles: ["週間シート", "講師メモ", "振り返り欄"],
    priceYen: 0,
    futurePriceYen: 1200,
    accessType: "free",
    authorAvatar: "ア",
    coverTone: "slate",
    likes: 18,
    downloads: 74,
    comments: [
      {
        authorName: "生活訓練スタッフ",
        body: "通院や服薬の話題に踏み込みすぎない点が使いやすいです。",
      },
    ],
    publishedAt: "2026-07-01",
    license: {
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    },
  },
  {
    id: "time-keeping-routine",
    slug: "time-keeping-routine",
    title: "時間を守るための朝の段取り",
    category: "生活管理",
    sellerName: "アソシア教材チーム",
    summary: "遅刻を責めずに、前日準備・出発前確認・連絡文の型を一緒に整える教材です。",
    description:
      "時間管理が苦手な利用者に対して、注意や反省だけで終わらせず、前日の準備、朝の行動、遅れそうな時の連絡を分けて練習します。支援者が本人の困りごとを聞き取りながら調整できるワーク付きです。",
    durationMinutes: 60,
    targetServices: ["就労移行", "就労継続B型", "生活訓練"],
    includedFiles: ["朝の段取りワーク", "連絡文テンプレート", "講師用メモ"],
    supportItems: ["個別支援記録の観察ポイント"],
    priceYen: 0,
    futurePriceYen: 1600,
    accessType: "free",
    authorAvatar: "ア",
    coverTone: "gold",
    likes: 33,
    downloads: 126,
    comments: [
      {
        authorName: "就労移行 支援員",
        body: "遅刻の原因を責めずに分解できるのが現場向きです。",
      },
    ],
    publishedAt: "2026-07-05",
    license: {
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    },
  },
  {
    id: "emotion-meter",
    slug: "emotion-meter",
    title: "気持ちの温度計ワーク",
    category: "心理・対人",
    sellerName: "生活訓練サンプルラボ",
    summary: "怒り・不安・疲れを数値化し、相談や休憩につなげる練習をします。",
    description:
      "心理療法ではなく、日常支援で使いやすいセルフモニタリング教材です。気持ちを0から10で表し、しんどさが上がる前にできる行動を選ぶ構成にしています。",
    durationMinutes: 45,
    targetServices: ["生活訓練", "就労継続B型", "就労移行"],
    includedFiles: ["温度計ワーク", "相談カード", "講師用進行表"],
    priceYen: 0,
    futurePriceYen: 1400,
    accessType: "free",
    authorAvatar: "生",
    coverTone: "indigo",
    likes: 24,
    downloads: 88,
    comments: [
      {
        authorName: "相談支援専門員",
        body: "医療的な判断に踏み込まない説明が安心です。",
      },
      {
        authorName: "B型 生活支援員",
        body: "休憩の相談練習と合わせて使えそうです。",
      },
    ],
    publishedAt: "2026-07-04",
    license: {
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    },
  },
  {
    id: "ai-information-check",
    slug: "ai-information-check",
    title: "AI時代の情報確認ワーク",
    category: "AI・情報",
    sellerName: "支援プログラムLab公式",
    summary: "検索やAIの回答をそのまま信じず、出典・日付・自分の状況に合うかを確認します。",
    description:
      "スマホ検索やAIチャットを使う場面を想定し、情報の出どころ、更新日、相談先を確認する練習を行います。職員がAI利用を禁止するのではなく、安全に使う観点を共有する教材です。",
    durationMinutes: 60,
    targetServices: ["就労移行", "就労継続A型", "就労継続B型", "生活訓練"],
    includedFiles: ["情報確認チェック表", "場面カード", "講師用台本"],
    priceYen: 0,
    futurePriceYen: 1800,
    accessType: "free",
    authorAvatar: "公",
    coverTone: "olive",
    likes: 39,
    downloads: 119,
    comments: [
      {
        authorName: "管理者",
        body: "スマホ研修の前段として使いやすいテーマです。",
      },
    ],
    publishedAt: "2026-07-06",
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
  {
    id: "demo:basic-money-management",
    buyerId: "demo-buyer",
    materialId: "basic-money-management",
    sourcePurchaseId: "free_access",
  },
  {
    id: "demo:question-template",
    buyerId: "demo-buyer",
    materialId: "question-template",
    sourcePurchaseId: "free_access",
  },
  {
    id: "demo:sleep-rhythm-sheet",
    buyerId: "demo-buyer",
    materialId: "sleep-rhythm-sheet",
    sourcePurchaseId: "free_access",
  },
  {
    id: "demo:time-keeping-routine",
    buyerId: "demo-buyer",
    materialId: "time-keeping-routine",
    sourcePurchaseId: "free_access",
  },
  {
    id: "demo:emotion-meter",
    buyerId: "demo-buyer",
    materialId: "emotion-meter",
    sourcePurchaseId: "free_access",
  },
  {
    id: "demo:ai-information-check",
    buyerId: "demo-buyer",
    materialId: "ai-information-check",
    sourcePurchaseId: "free_access",
  },
];

export type Phase2Submission = SellerSubmission & {
  category: string;
  priceYen: number;
  futurePriceYen?: number;
  licenseLabel: string;
  riskFlags: string[];
  includedFiles: string[];
  supportItems?: string[];
  publishMode: "free_now" | "future_paid";
  reviewNote: string;
};

export const demoSellerSubmissions: Phase2Submission[] = [
  {
    id: "draft_sleep_rhythm",
    title: "睡眠リズムを整える",
    sellerName: "アソシア教材チーム",
    status: "draft",
    updatedAt: "2026-07-01",
    category: "生活管理",
    priceYen: 0,
    futurePriceYen: 1200,
    licenseLabel: "現場で編集OK",
    riskFlags: [],
    includedFiles: ["生活リズム表", "講師メモ", "振り返りシート"],
    publishMode: "free_now",
    reviewNote: "画像なし。無料公開のサンプル教材として準備中。",
  },
  {
    id: "submitted_question",
    title: "質問の仕方",
    sellerName: "就労支援サンプル事業所",
    status: "submitted",
    updatedAt: "2026-07-03",
    category: "コミュニケーション",
    priceYen: 0,
    futurePriceYen: 1800,
    licenseLabel: "現場で編集OK",
    riskFlags: ["外部投稿者", "文例出典確認"],
    includedFiles: ["場面カード", "利用者ワーク", "講師用進行表"],
    publishMode: "free_now",
    reviewNote: "文例の出典確認と、利用者事例が架空であることの確認が必要。",
  },
  {
    id: "submitted_time",
    title: "時間を守る工夫",
    sellerName: "アソシア教材チーム",
    status: "submitted",
    updatedAt: "2026-07-04",
    category: "ビジネスマナー",
    priceYen: 0,
    futurePriceYen: 1600,
    licenseLabel: "現場で編集OK",
    riskFlags: ["表現確認"],
    includedFiles: ["朝の手順ワーク", "連絡文テンプレート"],
    supportItems: ["記録の書き方例"],
    publishMode: "free_now",
    reviewNote: "遅刻を責める表現になっていないか重点確認。",
  },
  {
    id: "approved_greeting",
    title: "挨拶と第一印象",
    sellerName: "アソシア教材チーム",
    status: "approved",
    updatedAt: "2026-07-02",
    category: "ビジネスマナー",
    priceYen: 0,
    licenseLabel: "現場で編集OK",
    riskFlags: [],
    includedFiles: ["講師用台本", "利用者ワーク", "振り返りシート"],
    publishMode: "free_now",
    reviewNote: "公開済み。無料教材として利用中。",
  },
  {
    id: "rejected_interview",
    title: "面接準備の入口",
    sellerName: "就労支援サンプル事業所",
    status: "rejected",
    updatedAt: "2026-07-04",
    category: "就労準備",
    priceYen: 0,
    futurePriceYen: 2400,
    licenseLabel: "そのまま利用",
    riskFlags: ["効果表現の確認", "差し戻し"],
    includedFiles: ["面接質問例", "回答メモ"],
    publishMode: "future_paid",
    reviewNote: "採用可能性を高める表現が強いため、保証に見えない表現へ修正依頼。",
  },
];
