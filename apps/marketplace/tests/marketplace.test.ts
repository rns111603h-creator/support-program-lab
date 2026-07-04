import { describe, expect, it } from "vitest";
import {
  buildLicenseBadges,
  calculateBundleDisplay,
  createEntitlementsForPurchase,
  getLibraryMaterials,
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
