# Welfare Materials Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 支援プログラムLab from a static sample site into a marketplace where welfare-program creators can share free materials, sell single programs, and sell bundled sets such as 就労支援セット.

**Architecture:** Keep the current GitHub Pages site as the public concept sample, then create a separate production web app for accounts, uploads, license control, checkout, downloads, and seller payouts. The production app should treat materials, bundles, licenses, orders, entitlements, and review status as first-class records so legal and operational rules are enforced by the system rather than by page copy only.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL via Supabase or Neon, Prisma ORM, Supabase Storage or S3-compatible storage, Stripe Connect or an equivalent marketplace PSP, Vercel, Playwright, Vitest.

---

## Legal And Operating Assumptions

This is not legal advice. Before paid marketplace launch, have a Japanese lawyer or qualified legal professional review the marketplace terms, seller terms, privacy policy, 特定商取引法 display, license terms, copyright takedown flow, and payment flow.

The concept is legally realistic if these constraints are enforced:

- Sellers may upload only materials they created themselves or have full permission to license and sell.
- Seller terms must grant the platform the right to host, display, reproduce for delivery, watermark, promote, and process downloads of uploaded materials.
- Buyer license terms must clearly define whether modification is allowed, whether credit is required, and that redistribution or resale to other corporations is prohibited.
- The platform must not promise clinical, medical, employment, benefit, or legal outcomes from programs.
- Personal case data, user names, photos, support records, and identifiable disability information must be prohibited in uploaded examples unless properly anonymized and reviewed.
- Paid sales must display price, payment timing, delivery timing, cancellation/refund policy, seller/platform identity, operating environment, and final confirmation details.
- Avoid platform wallet, stored balance, points redeemable for money, or manual escrow in MVP. Use a PSP marketplace flow so funds movement, seller verification, refunds, and payout operations are handled through the PSP.
- If the platform becomes the seller of record, tax and consumer-law responsibility becomes heavier. MVP should prefer a clear marketplace model where the seller is responsible for their listed content and the platform provides marketplace and delivery infrastructure.

## Product Model

### Material

A single downloadable program, worksheet, facilitator script, template, or record example.

Required fields:

```ts
type Material = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  sellerId: string;
  priceYen: number;
  accessType: "free" | "paid" | "preview";
  status: "draft" | "submitted" | "approved" | "rejected" | "archived";
  licenseType: "STANDARD_FREE" | "STANDARD_EDIT" | "CUSTOM";
  allowModification: boolean;
  allowCommercial: boolean;
  requireCredit: boolean;
  hasEditableFile: boolean;
};
```

### Bundle

A purchasable set containing multiple materials, such as 就労支援セット, 生活管理セット, or 新人職員研修セット.

Required fields:

```ts
type Bundle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sellerId: string;
  priceYen: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "archived";
  itemMaterialIds: string[];
};
```

Bundle rules:

- A bundle can contain only approved materials from the same seller in MVP.
- A bundle purchase grants entitlement to every material in the bundle.
- A material can still be sold separately unless the seller marks it as bundle-only.
- Bundle discounts must show the single-item total and bundle price.

## File Structure For Production App

Create a new production app separate from this static sample:

```text
apps/marketplace/
  app/
    (public)/
      page.tsx
      materials/[slug]/page.tsx
      bundles/[slug]/page.tsx
      categories/[slug]/page.tsx
    (account)/
      dashboard/page.tsx
      library/page.tsx
      seller/materials/new/page.tsx
      seller/materials/[id]/edit/page.tsx
      seller/bundles/new/page.tsx
      seller/bundles/[id]/edit/page.tsx
      admin/review/page.tsx
    api/
      checkout/route.ts
      downloads/[entitlementId]/route.ts
      webhooks/stripe/route.ts
  components/
    license/license-badges.tsx
    license/license-selector.tsx
    marketplace/material-card.tsx
    marketplace/bundle-card.tsx
    checkout/purchase-summary.tsx
    seller/file-uploader.tsx
    admin/review-panel.tsx
  lib/
    auth.ts
    db.ts
    entitlement.ts
    license.ts
    pricing.ts
    storage.ts
    stripe.ts
    watermark.ts
  prisma/
    schema.prisma
  tests/
    license.test.ts
    pricing.test.ts
    entitlement.test.ts
    checkout.test.ts
  docs/
    legal-checklist.md
    seller-rules.md
```

Keep the current static files in this repository as `public-demo` or a separate GitHub Pages branch. Do not add login, payment, private downloads, or personal data to the GitHub Pages static sample.

---

## Task 1: Legal Review Checklist

**Files:**

- Create: `apps/marketplace/docs/legal-checklist.md`
- Create: `apps/marketplace/docs/seller-rules.md`

- [ ] **Step 1: Write the legal checklist**

Create `apps/marketplace/docs/legal-checklist.md`:

```md
# Legal Checklist

This document must be reviewed before paid marketplace launch.

## Copyright

- Sellers may upload only materials they created themselves or have written permission to license and sell.
- Seller grants the platform permission to host, preview, reproduce for delivery, watermark, promote, and archive materials for order history.
- Buyer license must distinguish:
  - modification allowed or not
  - commercial use allowed or not
  - credit required or not
  - redistribution and resale prohibited
- Platform must provide a copyright infringement report flow.
- Platform must keep upload history, seller identity, license settings, and purchase records.

## Consumer And Commerce

- Product page must show price, included files, license, operating environment, delivery method, refund/cancellation policy, seller/platform identity, and support contact.
- Checkout confirmation must show quantity, price, payment method, delivery timing, cancellation/refund policy, and final purchase action.
- Digital downloads should state when cancellation is unavailable after download starts, if adopted.

## Privacy And Welfare-Specific Data

- Uploads must not include personal names, faces, case records, assessment sheets, disability details, workplace names, or service-user identifiers unless anonymized and reviewed.
- Seller onboarding must collect only necessary identity, payment, tax, and contact information.
- Buyer accounts must store purchase and download history securely.
- Admin tools must use role-based access.

## Payments And Tax

- MVP should use a marketplace PSP. Do not hold seller balances manually.
- Avoid wallet points, platform deposits, or stored-value credits in MVP.
- Record seller payout status, platform fee, PSP fee, refund status, and invoice/receipt metadata.
- Confirm invoice-system handling with accountant before launch.
```

- [ ] **Step 2: Write seller rules**

Create `apps/marketplace/docs/seller-rules.md`:

```md
# Seller Rules

## Upload Rules

You may upload only materials that you created or have permission to sell.

Do not upload:

- service-user names, photos, case records, support plans, assessment records, or identifiable disability information
- copyrighted books, worksheets, illustrations, photos, videos, music, screenshots, or templates without permission
- materials that promise employment, diagnosis, treatment, benefit approval, or clinical effects
- materials that discriminate, shame, threaten, or pressure service users

## License Settings

Every material must choose one license:

- Standard Free: free use, no redistribution, modification depends on the material setting
- Standard Edit: workplace customization allowed, credit required, redistribution and resale prohibited
- Custom: requires admin review

## Review

The platform may reject, suspend, or remove materials that create legal, privacy, welfare, quality, or safety risk.
```

- [ ] **Step 3: Commit**

Run:

```bash
git add apps/marketplace/docs/legal-checklist.md apps/marketplace/docs/seller-rules.md
git commit -m "docs: add marketplace legal checklist"
```

## Task 2: Scaffold Production App

**Files:**

- Create: `apps/marketplace/package.json`
- Create: `apps/marketplace/next.config.ts`
- Create: `apps/marketplace/tsconfig.json`
- Create: `apps/marketplace/app/layout.tsx`
- Create: `apps/marketplace/app/(public)/page.tsx`

- [ ] **Step 1: Scaffold Next.js app**

Run from repository root:

```bash
pnpm create next-app apps/marketplace --ts --tailwind --eslint --app --src-dir false --import-alias "@/*"
```

Expected:

```text
Success! Created marketplace
```

- [ ] **Step 2: Set the product shell**

Replace `apps/marketplace/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "支援プログラムLab",
  description: "福祉事業所向けプログラム教材の共有・販売プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Add public home placeholder**

Replace `apps/marketplace/app/(public)/page.tsx` with:

```tsx
export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold">支援プログラムLab</h1>
      <p className="mt-4 text-slate-600">
        福祉事業所向け教材を、無料公開・単品購入・セット購入で探せるプラットフォームです。
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run:

```bash
cd apps/marketplace
pnpm lint
pnpm build
```

Expected:

```text
✓ Lint passed
✓ Compiled successfully
```

- [ ] **Step 5: Commit**

```bash
git add apps/marketplace
git commit -m "feat: scaffold marketplace app"
```

## Task 3: Database Schema

**Files:**

- Create: `apps/marketplace/prisma/schema.prisma`
- Create: `apps/marketplace/lib/db.ts`
- Create: `apps/marketplace/tests/schema-smoke.test.ts`

- [ ] **Step 1: Install Prisma**

Run:

```bash
cd apps/marketplace
pnpm add @prisma/client
pnpm add -D prisma vitest
```

- [ ] **Step 2: Add schema**

Create `apps/marketplace/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  BUYER
  SELLER
  ADMIN
}

enum ListingStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
  ARCHIVED
}

enum LicenseType {
  STANDARD_FREE
  STANDARD_EDIT
  CUSTOM
}

enum ProductType {
  MATERIAL
  BUNDLE
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  role      UserRole @default(BUYER)
  createdAt DateTime @default(now())
  seller    Seller?
}

model Seller {
  id               String   @id @default(uuid())
  userId           String   @unique
  displayName      String
  profile          String?
  stripeAccountId  String?
  onboardingStatus String   @default("pending")
  createdAt        DateTime @default(now())
  user             User     @relation(fields: [userId], references: [id])
  materials        Material[]
  bundles          Bundle[]
}

model Category {
  id        String     @id
  label     String
  summary   String
  materials Material[]
}

model Material {
  id                String        @id @default(uuid())
  slug              String        @unique
  title             String
  description       String
  categoryId        String
  sellerId          String
  priceYen          Int           @default(0)
  status            ListingStatus @default(DRAFT)
  licenseType       LicenseType   @default(STANDARD_EDIT)
  allowModification Boolean       @default(true)
  allowCommercial   Boolean       @default(false)
  requireCredit     Boolean       @default(true)
  hasEditableFile   Boolean       @default(false)
  fileKey           String?
  previewText       String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  category          Category      @relation(fields: [categoryId], references: [id])
  seller            Seller        @relation(fields: [sellerId], references: [id])
  bundleItems       BundleItem[]
}

model Bundle {
  id          String        @id @default(uuid())
  slug        String        @unique
  title       String
  description String
  sellerId    String
  priceYen    Int
  status      ListingStatus @default(DRAFT)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  seller      Seller        @relation(fields: [sellerId], references: [id])
  items       BundleItem[]
}

model BundleItem {
  id         String   @id @default(uuid())
  bundleId   String
  materialId String
  sortOrder  Int      @default(0)
  bundle     Bundle   @relation(fields: [bundleId], references: [id])
  material   Material @relation(fields: [materialId], references: [id])

  @@unique([bundleId, materialId])
}

model Order {
  id              String      @id @default(uuid())
  buyerId         String
  productType     ProductType
  materialId      String?
  bundleId        String?
  amountYen       Int
  platformFeeYen  Int
  stripeSessionId String?     @unique
  status          String      @default("pending")
  createdAt       DateTime    @default(now())
  entitlements    Entitlement[]
}

model Entitlement {
  id         String   @id @default(uuid())
  orderId    String
  buyerId    String
  materialId String
  createdAt  DateTime @default(now())
  order      Order    @relation(fields: [orderId], references: [id])

  @@unique([buyerId, materialId])
}
```

- [ ] **Step 3: Add Prisma client**

Create `apps/marketplace/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 4: Verify Prisma generates**

Run:

```bash
cd apps/marketplace
pnpm prisma generate
```

Expected:

```text
Generated Prisma Client
```

- [ ] **Step 5: Commit**

```bash
git add apps/marketplace/prisma/schema.prisma apps/marketplace/lib/db.ts apps/marketplace/package.json pnpm-lock.yaml
git commit -m "feat: add marketplace data model"
```

## Task 4: License Components

**Files:**

- Create: `apps/marketplace/lib/license.ts`
- Create: `apps/marketplace/components/license/license-badges.tsx`
- Create: `apps/marketplace/components/license/license-selector.tsx`
- Create: `apps/marketplace/tests/license.test.ts`

- [ ] **Step 1: Add license helper test**

Create `apps/marketplace/tests/license.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildLicenseBadges } from "../lib/license";

describe("buildLicenseBadges", () => {
  it("shows editable, credit, editable-file, and redistribution badges", () => {
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
```

- [ ] **Step 2: Implement helper**

Create `apps/marketplace/lib/license.ts`:

```ts
export type LicenseInput = {
  allowModification: boolean;
  requireCredit: boolean;
  hasEditableFile: boolean;
};

export type LicenseBadge = {
  label: string;
  tone: "green" | "slate" | "amber" | "blue" | "indigo" | "rose";
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
```

- [ ] **Step 3: Implement badges**

Create `apps/marketplace/components/license/license-badges.tsx`:

```tsx
import { buildLicenseBadges, type LicenseInput } from "@/lib/license";

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
          key={badge.label}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClass[badge.tone]}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/marketplace
pnpm vitest run tests/license.test.ts
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Commit**

```bash
git add apps/marketplace/lib/license.ts apps/marketplace/components/license apps/marketplace/tests/license.test.ts
git commit -m "feat: add license display logic"
```

## Task 5: Pricing And Bundle Rules

**Files:**

- Create: `apps/marketplace/lib/pricing.ts`
- Create: `apps/marketplace/tests/pricing.test.ts`

- [ ] **Step 1: Add pricing tests**

Create `apps/marketplace/tests/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateBundleDisplay } from "../lib/pricing";

describe("calculateBundleDisplay", () => {
  it("calculates single total and bundle discount", () => {
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
```

- [ ] **Step 2: Implement pricing**

Create `apps/marketplace/lib/pricing.ts`:

```ts
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
```

- [ ] **Step 3: Run tests**

```bash
cd apps/marketplace
pnpm vitest run tests/pricing.test.ts
```

Expected:

```text
1 passed
```

- [ ] **Step 4: Commit**

```bash
git add apps/marketplace/lib/pricing.ts apps/marketplace/tests/pricing.test.ts
git commit -m "feat: add bundle pricing logic"
```

## Task 6: Entitlements

**Files:**

- Create: `apps/marketplace/lib/entitlement.ts`
- Create: `apps/marketplace/tests/entitlement.test.ts`

- [ ] **Step 1: Add entitlement test**

Create `apps/marketplace/tests/entitlement.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { materialIdsForPurchase } from "../lib/entitlement";

describe("materialIdsForPurchase", () => {
  it("returns one material for a single purchase", () => {
    expect(
      materialIdsForPurchase({
        type: "material",
        materialId: "mat_1",
      }),
    ).toEqual(["mat_1"]);
  });

  it("returns every material in a bundle", () => {
    expect(
      materialIdsForPurchase({
        type: "bundle",
        materialIds: ["mat_1", "mat_2", "mat_3"],
      }),
    ).toEqual(["mat_1", "mat_2", "mat_3"]);
  });
});
```

- [ ] **Step 2: Implement entitlement helper**

Create `apps/marketplace/lib/entitlement.ts`:

```ts
type MaterialPurchase = {
  type: "material";
  materialId: string;
};

type BundlePurchase = {
  type: "bundle";
  materialIds: string[];
};

export function materialIdsForPurchase(input: MaterialPurchase | BundlePurchase) {
  if (input.type === "material") {
    return [input.materialId];
  }

  return [...new Set(input.materialIds)];
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/marketplace
pnpm vitest run tests/entitlement.test.ts
```

Expected:

```text
2 passed
```

- [ ] **Step 4: Commit**

```bash
git add apps/marketplace/lib/entitlement.ts apps/marketplace/tests/entitlement.test.ts
git commit -m "feat: add purchase entitlement rules"
```

## Task 7: Seller Upload And Review MVP

**Files:**

- Create: `apps/marketplace/app/(account)/seller/materials/new/page.tsx`
- Create: `apps/marketplace/app/(account)/admin/review/page.tsx`
- Create: `apps/marketplace/components/seller/file-uploader.tsx`
- Create: `apps/marketplace/components/admin/review-panel.tsx`

- [ ] **Step 1: Build upload form**

Implement a seller form with:

- title
- category
- description
- price
- file upload
- license selector
- checkbox confirming ownership and no personal data
- submit for review

- [ ] **Step 2: Build admin review queue**

Implement review states:

- submitted
- approved
- rejected with reason
- archived

- [ ] **Step 3: Add server validation**

Reject submission if:

- title is under 4 characters
- description is under 40 characters
- price is negative
- ownership confirmation is false
- no file is attached
- custom license has no admin note

- [ ] **Step 4: Verify**

Run:

```bash
cd apps/marketplace
pnpm lint
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/marketplace/app apps/marketplace/components
git commit -m "feat: add seller upload and review flow"
```

## Task 8: Checkout And Downloads

**Files:**

- Create: `apps/marketplace/app/api/checkout/route.ts`
- Create: `apps/marketplace/app/api/webhooks/stripe/route.ts`
- Create: `apps/marketplace/app/api/downloads/[entitlementId]/route.ts`
- Create: `apps/marketplace/lib/stripe.ts`
- Create: `apps/marketplace/lib/watermark.ts`

- [ ] **Step 1: Implement checkout**

Use PSP marketplace checkout. For MVP, prefer one seller per cart. Use separate charges and transfers only after a legal/payment review, because multi-seller carts increase refund, payout, and liability complexity.

- [ ] **Step 2: Implement webhook**

On successful payment:

- create order
- create entitlement records
- record platform fee
- record PSP payment id
- email buyer receipt

- [ ] **Step 3: Implement download authorization**

Download route must:

- require login
- confirm entitlement belongs to current user
- generate signed storage URL or stream file
- add buyer/license metadata where possible
- log download event

- [ ] **Step 4: Verify**

Run:

```bash
cd apps/marketplace
pnpm vitest run
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/marketplace/app/api apps/marketplace/lib
git commit -m "feat: add checkout entitlements and downloads"
```

## Task 9: Public Product Pages

**Files:**

- Create: `apps/marketplace/app/(public)/materials/[slug]/page.tsx`
- Create: `apps/marketplace/app/(public)/bundles/[slug]/page.tsx`
- Create: `apps/marketplace/components/marketplace/material-card.tsx`
- Create: `apps/marketplace/components/marketplace/bundle-card.tsx`

- [ ] **Step 1: Build material page**

Show:

- title
- seller
- category
- price
- included files
- license badges
- preview
- buy/download button
- no-redistribution notice

- [ ] **Step 2: Build bundle page**

Show:

- bundle title
- seller
- included materials
- single total
- bundle price
- discount
- license summary
- buy button

- [ ] **Step 3: Add structured data**

Add JSON-LD for `CreativeWork` and `Offer`.

- [ ] **Step 4: Verify**

Run:

```bash
cd apps/marketplace
pnpm lint
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/marketplace/app/(public) apps/marketplace/components/marketplace
git commit -m "feat: add material and bundle pages"
```

## Task 10: Launch Gates

**Files:**

- Modify: `apps/marketplace/docs/legal-checklist.md`
- Create: `apps/marketplace/docs/launch-gates.md`

- [ ] **Step 1: Create launch gate document**

Create `apps/marketplace/docs/launch-gates.md`:

```md
# Launch Gates

## Public Free MVP

- [ ] Static sample remains public
- [ ] No login required
- [ ] No personal data
- [ ] No payment
- [ ] Free downloads only

## Closed Seller Beta

- [ ] Seller terms reviewed
- [ ] Upload review flow enabled
- [ ] Admin can reject unsafe materials
- [ ] Seller identity collected
- [ ] No paid sales yet

## Paid Beta

- [ ] Marketplace terms reviewed
- [ ] Privacy policy reviewed
- [ ] 特定商取引法 display reviewed
- [ ] PSP marketplace flow reviewed
- [ ] Refund and cancellation policy reviewed
- [ ] Copyright report flow available
- [ ] Download watermark/metadata logging enabled
- [ ] Tax and invoice handling reviewed by accountant

## Public Marketplace

- [ ] Monitoring enabled
- [ ] Backup and restore tested
- [ ] Incident response owner assigned
- [ ] Content moderation SLA defined
- [ ] Seller support flow defined
- [ ] Buyer support flow defined
```

- [ ] **Step 2: Commit**

```bash
git add apps/marketplace/docs/launch-gates.md apps/marketplace/docs/legal-checklist.md
git commit -m "docs: add marketplace launch gates"
```

---

## Recommended Build Order

1. Legal and operating documents
2. Production app scaffold
3. Database schema
4. License display and rules
5. Material listing pages
6. Bundle listing pages
7. Seller upload draft flow
8. Admin review flow
9. Free download entitlements
10. Paid single-material checkout
11. Paid bundle checkout
12. Seller payout onboarding
13. Download watermark and audit logs
14. Public paid beta

## MVP Scope

First paid MVP should support:

- one seller per purchase
- single material purchase
- bundle purchase from one seller
- platform review before publishing
- standard editable license
- direct file downloads after purchase
- simple refund policy
- no wallet
- no user-to-user messaging
- no multi-seller cart
- no subscriptions
- no AI-generated material marketplace until separate policy is written

## Post-MVP Scope

Add later:

- multi-seller carts
- subscriptions for事業所
- team accounts for法人
- seller analytics
- coupon codes
- school/office license tiers
- editable template preview
- content quality scoring
- copyright similarity screening
- invoice automation

