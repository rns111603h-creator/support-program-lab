export type LicenseInput = {
  allowModification: boolean;
  requireCredit: boolean;
  hasEditableFile: boolean;
};

export type LicenseBadge = {
  label: string;
  tone: "green" | "slate" | "amber" | "blue" | "indigo" | "rose";
};

export type MaterialSummary = {
  id: string;
  title: string;
  priceYen: number;
};

export type Entitlement = {
  id: string;
  buyerId: string;
  materialId: string;
  sourcePurchaseId: string;
};

export type PurchaseInput =
  | {
      type: "material";
      purchaseId: string;
      buyerId: string;
      materialId: string;
    }
  | {
      type: "bundle";
      purchaseId: string;
      buyerId: string;
      materialIds: string[];
    };

export function buildLicenseBadges(input: LicenseInput): LicenseBadge[] {
  return [
    input.allowModification
      ? { label: "アレンジ（改変）OK", tone: "green" }
      : { label: "そのまま利用（改変不可）", tone: "slate" },
    input.requireCredit
      ? { label: "著作権表記あり（削除不可）", tone: "amber" }
      : { label: "クレジット表記不要", tone: "blue" },
    ...(input.hasEditableFile
      ? [{ label: "編集用データ同梱（Word/PPT等）", tone: "indigo" as const }]
      : []),
    { label: "他法人への二次配布・転売禁止", tone: "rose" },
  ];
}

export function calculateBundleDisplay(input: {
  bundlePriceYen: number;
  materialPricesYen: number[];
}) {
  const singleTotalYen = input.materialPricesYen.reduce((sum, price) => sum + price, 0);
  const discountYen = Math.max(0, singleTotalYen - input.bundlePriceYen);
  const discountRate =
    singleTotalYen === 0 ? 0 : Math.round((discountYen / singleTotalYen) * 100);

  return {
    singleTotalYen,
    bundlePriceYen: input.bundlePriceYen,
    discountYen,
    discountRate,
  };
}

export function createEntitlementsForPurchase(input: PurchaseInput): Entitlement[] {
  const materialIds =
    input.type === "material" ? [input.materialId] : [...new Set(input.materialIds)];

  return materialIds.map((materialId) => ({
    id: `${input.purchaseId}:${materialId}`,
    buyerId: input.buyerId,
    materialId,
    sourcePurchaseId: input.purchaseId,
  }));
}

export function getLibraryMaterials<TMaterial extends MaterialSummary>(input: {
  buyerId: string;
  entitlements: Entitlement[];
  materials: TMaterial[];
}): TMaterial[] {
  const allowedMaterialIds = new Set(
    input.entitlements
      .filter((entitlement) => entitlement.buyerId === input.buyerId)
      .map((entitlement) => entitlement.materialId),
  );

  return input.materials.filter((material) => allowedMaterialIds.has(material.id));
}
