# Review Price Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit loading state to the review-page bottom primary action while live pricing is being calculated, and align the nearby price-summary copy with that same state.

**Architecture:** Keep the change narrowly scoped to the review flow. Derive a review-specific quote-loading flag in the review page, use it to drive the dock CTA label/loading/trailing total behavior, and extend `PriceSummary` with a small optional loading-message override so review can show more active copy without changing checkout behavior.

**Tech Stack:** Next.js App Router, TypeScript, next-intl, React Query, Tailwind CSS, Vitest

---

## File map

- **Create:** `frontend/tests/price-summary.test.ts` — focused regression test for `PriceSummary` loading-message override wiring
- **Modify:** `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx` — derive review quote-loading state, swap CTA label to calculating copy, hide trailing total chip while loading, pass review-specific loading copy into `PriceSummary`
- **Modify:** `frontend/src/components/product/PriceSummary.tsx` — accept an optional review-specific loading message override while preserving current checkout behavior
- **Modify:** `frontend/src/messages/en-CH.json` — add `review.calculatingPrice` and `review.calculatingPriceDetail`
- **Modify:** `frontend/src/messages/de-CH.json` — add `review.calculatingPrice` and `review.calculatingPriceDetail`
- **Modify:** `frontend/src/messages/fr-CH.json` — add `review.calculatingPrice` and `review.calculatingPriceDetail`
- **Modify:** `frontend/src/messages/it-CH.json` — add `review.calculatingPrice` and `review.calculatingPriceDetail`
- **Modify:** `frontend/tests/review-page.test.ts` — assert review-page CTA loading-state wiring and `PriceSummary` override wiring
- **Modify:** `frontend/tests/review.test.ts` — extend review i18n contract coverage with the new loading keys

---

### Task 1: Add review CTA calculating-state wiring

**Files:**
- Modify: `frontend/tests/review-page.test.ts`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`

- [ ] **Step 1: Write the failing review-page regression**

```ts
// frontend/tests/review-page.test.ts

it("shows an explicit calculating state on the review CTA while pricing is loading", () => {
  expect(reviewPageSource).toContain(
    "const isReviewPriceCalculating = canRequestQuote && quote.isLoading",
  );
  expect(reviewPageSource).toContain(
    "loading={isReviewPriceCalculating || reviewDraft.isPending || updateDraft.isPending}",
  );
  expect(reviewPageSource).toContain(
    '{isReviewPriceCalculating ? t("calculatingPrice") : t("proceedToPayment")}',
  );
  expect(reviewPageSource).toContain(
    "trailingMeta={!isReviewPriceCalculating && quote.data ? (",
  );
});
```

- [ ] **Step 2: Run the review-page test to verify it fails**

Run: `npm test -- frontend/tests/review-page.test.ts`

Expected: FAIL because `review/page.tsx` still renders the default `proceedToPayment` label, does not derive `isReviewPriceCalculating`, and still shows the total chip whenever `quote.data` exists.

- [ ] **Step 3: Write the minimal review-page implementation**

```tsx
// frontend/src/app/[locale]/draft/[draftId]/review/page.tsx

const canProceedToPayment =
  allComplete &&
  canRequestQuote &&
  Boolean(quote.data) &&
  !quote.isLoading &&
  !quote.isError &&
  !reviewDraft.isPending &&
  !updateDraft.isPending;
const isReviewPriceCalculating = canRequestQuote && quote.isLoading;

<ActionButton
  onClick={handleProceedToPayment}
  fullWidth
  className="sm:w-auto"
  disabled={!canProceedToPayment}
  loading={isReviewPriceCalculating || reviewDraft.isPending || updateDraft.isPending}
  trailingIcon={<ChevronRight className="h-4 w-4 shrink-0" />}
  trailingMeta={
    !isReviewPriceCalculating && quote.data ? (
      <span className="hidden rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--action-primary-fg)] sm:inline-flex">
        {formatCentsAsCHF(quote.data.totalCents)}
      </span>
    ) : null
  }
>
  {isReviewPriceCalculating ? t("calculatingPrice") : t("proceedToPayment")}
</ActionButton>
```

- [ ] **Step 4: Run the review-page test to verify it passes**

Run: `npm test -- frontend/tests/review-page.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the review CTA wiring**

```bash
git add frontend/src/app/[locale]/draft/[draftId]/review/page.tsx frontend/tests/review-page.test.ts
git commit -m "feat(frontend): add review price loading cta"
```

---

### Task 2: Add review-specific summary copy and i18n coverage

**Files:**
- Create: `frontend/tests/price-summary.test.ts`
- Modify: `frontend/src/app/[locale]/draft/[draftId]/review/page.tsx`
- Modify: `frontend/src/components/product/PriceSummary.tsx`
- Modify: `frontend/src/messages/en-CH.json`
- Modify: `frontend/src/messages/de-CH.json`
- Modify: `frontend/src/messages/fr-CH.json`
- Modify: `frontend/src/messages/it-CH.json`
- Modify: `frontend/tests/review.test.ts`
- Modify: `frontend/tests/review-page.test.ts`

- [ ] **Step 1: Write the failing tests for summary override + review i18n keys**

```ts
// frontend/tests/price-summary.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const priceSummarySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/PriceSummary.tsx"),
  "utf8",
);
const reviewPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/review/page.tsx"),
  "utf8",
);

describe("price summary loading copy", () => {
  it("lets review override the active loading copy while quote calculation is in flight", () => {
    expect(priceSummarySource).toContain("loadingMessage?: string | undefined");
    expect(priceSummarySource).toContain('? loadingMessage ?? t("pricingLoading")');
    expect(reviewPageSource).toContain('loadingMessage={t("calculatingPriceDetail")}');
  });
});
```

```ts
// frontend/tests/review.test.ts
const REQUIRED_REVIEW_KEYS = [
  "title",
  "subtitle",
  "checklist",
  "senderDetails",
  "recipientDetails",
  "letterBody",
  "subjectLine",
  "signature",
  "attachments",
  "deliveryTypeLabel",
  "deliveryStandard",
  "deliveryRegistered",
  "deliveryStandardBadge",
  "deliveryStandardDescription",
  "deliveryRegisteredBadge",
  "deliveryRegisteredDescription",
  "requiredBeforeSending",
  "pricingPending",
  "pricingLoading",
  "calculatingPrice",
  "calculatingPriceDetail",
  "signatureMissingHelp",
  "attachmentsOptionalHelp",
  "edit",
  "add",
  "proceedToPayment",
  "backToDraft",
  "total",
] as const;
```

- [ ] **Step 2: Run the focused review/summary tests to verify they fail**

Run: `npm test -- frontend/tests/price-summary.test.ts frontend/tests/review.test.ts frontend/tests/review-page.test.ts`

Expected: FAIL because `PriceSummary` does not yet accept `loadingMessage`, the review page does not pass it, and the new review i18n keys do not exist.

- [ ] **Step 3: Write the minimal `PriceSummary` + i18n implementation**

```tsx
// frontend/src/components/product/PriceSummary.tsx
export function PriceSummary({
  draftId,
  deliveryType,
  subject,
  showTrustNote = false,
  quoteEnabled = true,
  pendingLabel,
  loadingMessage,
}: {
  draftId?: string;
  deliveryType: string;
  subject: string | null;
  showTrustNote?: boolean;
  quoteEnabled?: boolean;
  pendingLabel?: string | undefined;
  loadingMessage?: string | undefined;
}) {
  const t = useTranslations("checkout");
  const quote = useDispatchQuote(draftId ?? "", Boolean(draftId) && quoteEnabled);
  const quoteErrorMessage = getApiErrorUserMessage(quote.error) ?? t("priceUnavailable");
  const summaryNote = !quoteEnabled
    ? pendingLabel
    : quote.isLoading
      ? loadingMessage ?? t("pricingLoading")
      : quote.isError
        ? quoteErrorMessage
        : t("draftingIncluded");
```

```tsx
// frontend/src/app/[locale]/draft/[draftId]/review/page.tsx
<PriceSummary
  draftId={draftId}
  deliveryType={displayDeliveryType}
  subject={displaySubject}
  quoteEnabled={canRequestQuote}
  pendingLabel={allComplete ? t("pricingPending") : t("requiredBeforeSending")}
  loadingMessage={t("calculatingPriceDetail")}
/>
```

```json
// frontend/src/messages/en-CH.json
"review": {
  "pricingPending": "Final pricing will appear as soon as the PDF preview finishes rendering.",
  "pricingLoading": "Fetching live postal pricing.",
  "calculatingPrice": "Calculating…",
  "calculatingPriceDetail": "We're calculating the live postal price for this letter.",
  "proceedToPayment": "Next"
}
```

```json
// frontend/src/messages/de-CH.json
"review": {
  "pricingPending": "Der finale Preis erscheint, sobald die PDF-Vorschau fertig gerendert ist.",
  "pricingLoading": "Wir laden den aktuellen Postpreis.",
  "calculatingPrice": "Berechnung…",
  "calculatingPriceDetail": "Wir berechnen gerade den aktuellen Postpreis für diesen Brief.",
  "proceedToPayment": "Weiter"
}
```

```json
// frontend/src/messages/fr-CH.json
"review": {
  "pricingPending": "Le prix final apparaîtra dès que l'aperçu PDF aura terminé son rendu.",
  "pricingLoading": "Nous récupérons le tarif postal en direct.",
  "calculatingPrice": "Calcul…",
  "calculatingPriceDetail": "Nous calculons le tarif postal en direct pour cette lettre.",
  "proceedToPayment": "Suivant"
}
```

```json
// frontend/src/messages/it-CH.json
"review": {
  "pricingPending": "Il prezzo finale apparirà non appena l'anteprima PDF avrà terminato il rendering.",
  "pricingLoading": "Stiamo recuperando il prezzo postale in tempo reale.",
  "calculatingPrice": "Calcolo…",
  "calculatingPriceDetail": "Stiamo calcolando il prezzo postale in tempo reale per questa lettera.",
  "proceedToPayment": "Avanti"
}
```

- [ ] **Step 4: Run the focused review/summary tests to verify they pass**

Run: `npm test -- frontend/tests/price-summary.test.ts frontend/tests/review.test.ts frontend/tests/review-page.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the summary-copy and i18n work**

```bash
git add frontend/src/components/product/PriceSummary.tsx frontend/src/messages/en-CH.json frontend/src/messages/de-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json frontend/tests/price-summary.test.ts frontend/tests/review.test.ts frontend/tests/review-page.test.ts frontend/src/app/[locale]/draft/[draftId]/review/page.tsx
git commit -m "feat(frontend): add review price loading copy"
```

---

### Task 3: Verify the full frontend + repo contract

**Files:**
- Test: `frontend/tests/price-summary.test.ts`
- Test: `frontend/tests/review.test.ts`
- Test: `frontend/tests/review-page.test.ts`
- Verify: repo root scripts in `package.json`

- [ ] **Step 1: Run the targeted review-flow regression suite**

Run: `npm test -- frontend/tests/price-summary.test.ts frontend/tests/review.test.ts frontend/tests/review-page.test.ts`

Expected: PASS

- [ ] **Step 2: Run full repo tests**

Run: `npm test`

Expected: PASS

- [ ] **Step 3: Run full repo typecheck and lint**

Run: `npm run typecheck && npm run lint`

Expected: PASS

- [ ] **Step 4: Run the build under the repo’s declared Node 20 runtime**

Run: `NEXT_PUBLIC_API_URL=https://api.swissmail.ch NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy npx -y -p node@20 -c 'npm run build'`

Expected: PASS

- [ ] **Step 5: Commit the verified final state**

```bash
git add frontend/src/app/[locale]/draft/[draftId]/review/page.tsx frontend/src/components/product/PriceSummary.tsx frontend/src/messages/en-CH.json frontend/src/messages/de-CH.json frontend/src/messages/fr-CH.json frontend/src/messages/it-CH.json frontend/tests/price-summary.test.ts frontend/tests/review.test.ts frontend/tests/review-page.test.ts
git commit -m "feat(frontend): add review price loading state"
```

---

## Spec coverage check

- **CTA loading state while review price is loading:** Covered by Task 1
- **Review-specific wording instead of checkout payment wording:** Covered by Task 2
- **Hide trailing total chip while loading:** Covered by Task 1
- **Supportive price-summary copy aligned with CTA:** Covered by Task 2
- **Focused scope, no broad checkout refactor:** Preserved across Tasks 1-3
- **Targeted + full verification:** Covered by Task 3
