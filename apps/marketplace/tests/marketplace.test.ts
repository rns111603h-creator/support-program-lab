import { describe, expect, it } from "vitest";
import {
  buildLicenseBadges,
  calculateBundleDisplay,
  createEntitlementsForPurchase,
  getFreeCommunityMaterials,
  getLibraryMaterials,
  getReviewQueue,
  sortCommunityMaterials,
  summarizeSellerSubmissions,
} from "../src/lib/marketplace";

describe("buildLicenseBadges", () => {
  it("shows workplace-edit, credit, editable-file, and no-redistribution badges", () => {
    const badges = buildLicenseBadges({
      allowModification: true,
      requireCredit: true,
      hasEditableFile: true,
    });

    expect(badges.map((badge) => badge.label)).toEqual([
      "アレンジ（改変）OK",
      "著作権表記あり（削除不可）",
      "編集用データ同梱（Word/PPT等）",
      "他法人への二次配布・転売禁止",
    ]);
  });
});

describe("calculateBundleDisplay", () => {
  it("shows the single-item total and bundle discount", () => {
    expect(
      calculateBundleDisplay({
        bundlePriceYen: 7800,
        materialPricesYen: [3000, 3000, 3000],
      }),
    ).toEqual({
      singleTotalYen: 9000,
      bundlePriceYen: 7800,
      discountYen: 1200,
      discountRate: 13,
    });
  });
});

describe("createEntitlementsForPurchase", () => {
  it("creates one entitlement for a single material purchase", () => {
    expect(
      createEntitlementsForPurchase({
        purchaseId: "order_1",
        buyerId: "buyer_1",
        type: "material",
        materialId: "greeting-first-impression",
      }),
    ).toEqual([
      {
        id: "order_1:greeting-first-impression",
        buyerId: "buyer_1",
        materialId: "greeting-first-impression",
        sourcePurchaseId: "order_1",
      },
    ]);
  });

  it("creates a unique entitlement for every material in a bundle purchase", () => {
    expect(
      createEntitlementsForPurchase({
        purchaseId: "order_2",
        buyerId: "buyer_1",
        type: "bundle",
        materialIds: ["greeting-first-impression", "money-management", "money-management"],
      }),
    ).toEqual([
      {
        id: "order_2:greeting-first-impression",
        buyerId: "buyer_1",
        materialId: "greeting-first-impression",
        sourcePurchaseId: "order_2",
      },
      {
        id: "order_2:money-management",
        buyerId: "buyer_1",
        materialId: "money-management",
        sourcePurchaseId: "order_2",
      },
    ]);
  });
});

describe("getLibraryMaterials", () => {
  it("returns only materials the buyer can download", () => {
    const library = getLibraryMaterials({
      buyerId: "buyer_1",
      entitlements: [
        {
          id: "ent_1",
          buyerId: "buyer_1",
          materialId: "greeting-first-impression",
          sourcePurchaseId: "order_1",
        },
        {
          id: "ent_2",
          buyerId: "buyer_2",
          materialId: "money-management",
          sourcePurchaseId: "order_2",
        },
      ],
      materials: [
        {
          id: "greeting-first-impression",
          title: "挨拶と第一印象",
          priceYen: 0,
        },
        {
          id: "money-management",
          title: "金銭管理の基本",
          priceYen: 2400,
        },
      ],
    });

    expect(library).toEqual([
      {
        id: "greeting-first-impression",
        title: "挨拶と第一印象",
        priceYen: 0,
      },
    ]);
  });
});

describe("getReviewQueue", () => {
  it("returns submitted materials sorted by most recent update first", () => {
    const queue = getReviewQueue([
      {
        id: "draft_1",
        title: "睡眠リズムを整える",
        sellerName: "アソシア教材チーム",
        status: "draft",
        updatedAt: "2026-07-01",
      },
      {
        id: "submitted_1",
        title: "質問の仕方",
        sellerName: "就労支援サンプル事業所",
        status: "submitted",
        updatedAt: "2026-07-03",
      },
      {
        id: "submitted_2",
        title: "時間を守る工夫",
        sellerName: "アソシア教材チーム",
        status: "submitted",
        updatedAt: "2026-07-04",
      },
    ]);

    expect(queue.map((item) => item.id)).toEqual(["submitted_2", "submitted_1"]);
  });
});

describe("summarizeSellerSubmissions", () => {
  it("counts draft, submitted, approved, and rejected materials", () => {
    const summary = summarizeSellerSubmissions([
      {
        id: "draft_1",
        title: "睡眠リズムを整える",
        sellerName: "アソシア教材チーム",
        status: "draft",
        updatedAt: "2026-07-01",
      },
      {
        id: "submitted_1",
        title: "質問の仕方",
        sellerName: "アソシア教材チーム",
        status: "submitted",
        updatedAt: "2026-07-03",
      },
      {
        id: "approved_1",
        title: "挨拶と第一印象",
        sellerName: "アソシア教材チーム",
        status: "approved",
        updatedAt: "2026-07-02",
      },
      {
        id: "rejected_1",
        title: "面接準備の入口",
        sellerName: "アソシア教材チーム",
        status: "rejected",
        updatedAt: "2026-07-04",
      },
    ]);

    expect(summary).toEqual({
      draft: 1,
      submitted: 1,
      approved: 1,
      rejected: 1,
    });
  });
});

describe("getFreeCommunityMaterials", () => {
  it("returns only materials that are currently free to download", () => {
    const posts = getFreeCommunityMaterials([
      {
        id: "free_1",
        title: "挨拶と第一印象",
        priceYen: 0,
        likes: 24,
        comments: [],
        publishedAt: "2026-07-04",
      },
      {
        id: "future_paid_1",
        title: "面接準備の入口",
        priceYen: 1800,
        likes: 11,
        comments: [],
        publishedAt: "2026-07-03",
      },
    ]);

    expect(posts.map((post) => post.id)).toEqual(["free_1"]);
  });
});

describe("sortCommunityMaterials", () => {
  it("sorts by engagement with likes and comments", () => {
    const posts = sortCommunityMaterials(
      [
        {
          id: "newer_low_engagement",
          title: "予定管理の基本",
          priceYen: 0,
          likes: 4,
          comments: [{ authorName: "職員A", body: "導入に使えそうです。" }],
          publishedAt: "2026-07-05",
        },
        {
          id: "older_high_engagement",
          title: "報告・連絡・相談",
          priceYen: 0,
          likes: 18,
          comments: [
            { authorName: "職員B", body: "場面カードがわかりやすい。" },
            { authorName: "職員C", body: "B型でも使えそう。" },
          ],
          publishedAt: "2026-07-04",
        },
      ],
      "popular",
    );

    expect(posts.map((post) => post.id)).toEqual([
      "older_high_engagement",
      "newer_low_engagement",
    ]);
  });
});
