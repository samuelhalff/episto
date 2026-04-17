# Blue Signature Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every drawn signature in blue ink across in-app previews, stored/final PDFs, and the confirmation-bundle PDF while keeping preview and PDF generation centralized.

**Architecture:** Keep the existing centralized preview and PDF entry points: frontend preview surfaces continue to use the same-origin `/v1/files/:fileId/preview` route plus `LetterPreview`, and backend PDFs continue to originate from `renderLetterHtml()` and `renderPdfBufferFromHtml()`. Introduce one backend-owned blue-signature SVG transform and one shared letter color token so both the preview route and the PDF template consume the same rendering rule instead of duplicating tint logic.

**Tech Stack:** TypeScript, Fastify, Vitest, shared workspace package, Puppeteer HTML-to-PDF rendering

---

### Task 1: Add the canonical blue-ink token

**Files:**

- Modify: `shared/src/letter-layout.ts`
- Modify: `shared/tests/letter-layout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe("letter color palette", () => {
  it("defines a dedicated blue ink token for drawn signatures", () => {
    expect(LETTER_COLORS.signatureDrawnInk).toBe("#1d4ed8");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w shared -- letter-layout.test.ts`  
Expected: FAIL because `LETTER_COLORS.signatureDrawnInk` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export const LETTER_COLORS = {
  text: "#1a1a1a",
  date: "#444444",
  signatureScript: "#222222",
  signatureName: "#555555",
  signatureDrawnInk: "#1d4ed8",
  enclosure: "#666666",
  tableBorder: "#d1d5db",
  tableHeaderBg: "#f3f4f6",
  enclosureBorder: "#d7d7d7",
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w shared -- letter-layout.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/src/letter-layout.ts shared/tests/letter-layout.test.ts
git commit -m "test: add drawn signature ink token"
```

### Task 2: Build one backend blue-signature transform and use it for preview responses

**Files:**

- Create: `backend/src/modules/rendering/drawn-signature.ts`
- Modify: `backend/src/modules/files/file.routes.ts`
- Modify: `backend/tests/file-preview-route.test.ts`
- Test: `backend/tests/file-preview-route.test.ts`
- Test: `backend/tests/drawn-signature-rendering.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// backend/tests/drawn-signature-rendering.test.ts
import { describe, expect, it } from "vitest";
import { LETTER_COLORS } from "@swiss-mail/shared";

import {
  buildBlueSignatureSvgMarkup,
  buildBlueSignatureSvgResponse,
} from "../src/modules/rendering/drawn-signature.js";

describe("drawn signature rendering", () => {
  it("wraps png signatures in a blue svg mask", () => {
    const markup = buildBlueSignatureSvgMarkup({
      mimeType: "image/png",
      base64: "ZmFrZQ==",
    });

    expect(markup).toContain(LETTER_COLORS.signatureDrawnInk);
    expect(markup).toContain("data:image/png;base64,ZmFrZQ==");
  });

  it("preserves jpeg signatures inside the svg wrapper", () => {
    const markup = buildBlueSignatureSvgMarkup({
      mimeType: "image/jpeg",
      base64: "ZmFrZWpwZWc=",
    });

    expect(markup).toContain("data:image/jpeg;base64,ZmFrZWpwZWc=");
  });
});
```

```ts
// backend/tests/file-preview-route.test.ts
it("serves signature previews as blue-ink svg from the app origin", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/files/signature-file-1/preview",
  });

  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toContain("image/svg+xml");
  expect(response.headers.location).toBeUndefined();
  expect(response.body).toContain("#1d4ed8");
  expect(response.body).toContain("data:image/png;base64,cG5nYnl0ZXM=");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w backend -- drawn-signature-rendering.test.ts file-preview-route.test.ts`  
Expected: FAIL because the helper file does not exist and the preview route still returns the raw image.

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/modules/rendering/drawn-signature.ts
import { LETTER_COLORS } from "@swiss-mail/shared";

export interface DrawnSignatureAsset {
  mimeType: "image/png" | "image/jpeg";
  base64: string;
}

export function buildBlueSignatureSvgMarkup(asset: DrawnSignatureAsset): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" preserveAspectRatio="xMinYMid meet">
  <defs>
    <mask id="signature-mask">
      <image href="data:${asset.mimeType};base64,${asset.base64}" width="100%" height="100%" preserveAspectRatio="xMinYMid meet" />
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="${LETTER_COLORS.signatureDrawnInk}" mask="url(#signature-mask)" />
</svg>`;
}

export function buildBlueSignatureSvgResponse(asset: DrawnSignatureAsset): Buffer {
  return Buffer.from(buildBlueSignatureSvgMarkup(asset), "utf8");
}
```

```ts
// backend/src/modules/files/file.routes.ts
import { buildBlueSignatureSvgResponse } from "../rendering/drawn-signature.js";

// ...

const object = await downloadObjectBuffer(file.storageKey);
const mimeType = (object.contentType ?? file.mimeType) as "image/png" | "image/jpeg";
const body = buildBlueSignatureSvgResponse({
  mimeType,
  base64: object.buffer.toString("base64"),
});

reply.header("Content-Type", "image/svg+xml; charset=utf-8");
reply.header("Content-Length", String(body.byteLength));
reply.header("Content-Disposition", "inline");
reply.header("Cache-Control", "private, max-age=300");

await reply.send(body);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w backend -- drawn-signature-rendering.test.ts file-preview-route.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/rendering/drawn-signature.ts backend/src/modules/files/file.routes.ts backend/tests/drawn-signature-rendering.test.ts backend/tests/file-preview-route.test.ts
git commit -m "feat: centralize blue signature preview rendering"
```

### Task 3: Make the PDF path consume the same signature transform

**Files:**

- Modify: `backend/src/modules/rendering/signature-image.ts`
- Modify: `backend/src/modules/rendering/render-template.ts`
- Modify: `backend/src/modules/rendering/render-snapshot-pipeline.ts`
- Modify: `backend/src/modules/rendering/pdf-access.ts`
- Modify: `backend/tests/regression-pdf-template.test.ts`
- Modify: `backend/tests/pdf-access.test.ts`
- Test: `backend/tests/regression-pdf-template.test.ts`
- Test: `backend/tests/pdf-access.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// backend/tests/regression-pdf-template.test.ts
it("renders drawn signatures through the blue svg source instead of a raw png data url", async () => {
  const { renderLetterHtml } = await import("../src/modules/rendering/render.service.js");

  const html = renderLetterHtml(
    makeSnapshotData({
      signatureMode: "drawn",
      signatureAssetId: "22222222-2222-4222-8222-222222222222",
    }),
    {
      signatureImage: {
        mimeType: "image/jpeg",
        base64: "ZmFrZWpwZWc=",
      },
    },
  );

  expect(html).toContain("image/svg+xml");
  expect(html).toContain("#1d4ed8");
  expect(html).toContain("data:image/jpeg;base64,ZmFrZWpwZWc=");
  expect(html).not.toContain("data:image/png;base64");
});
```

```ts
// backend/tests/pdf-access.test.ts
expect(mocks.renderLetterHtml).toHaveBeenCalledWith(
  expect.objectContaining({
    signatureMode: "drawn",
  }),
  {
    signatureImage: {
      mimeType: "image/png",
      base64: Buffer.from("pngbytes").toString("base64"),
    },
  },
);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -w backend -- regression-pdf-template.test.ts pdf-access.test.ts`  
Expected: FAIL because the render path still expects `signatureImageBase64` and hardcodes `data:image/png`.

- [ ] **Step 3: Write minimal implementation**

```ts
// backend/src/modules/rendering/signature-image.ts
export interface SignatureRenderAsset {
  mimeType: "image/png" | "image/jpeg";
  base64: string;
}

export async function loadSignatureImageAsset(
  db: Db,
  snapshotData: SnapshotData,
): Promise<SignatureRenderAsset | null> {
  if (snapshotData.signatureMode !== "drawn" || !snapshotData.signatureAssetId) {
    return null;
  }

  const [signatureAsset] = await db
    .select({
      storageKey: schema.fileAssets.storageKey,
      mimeType: schema.fileAssets.mimeType,
    })
    .from(schema.fileAssets)
    .where(eq(schema.fileAssets.id, snapshotData.signatureAssetId))
    .limit(1);

  if (!signatureAsset) {
    return null;
  }

  const { buffer } = await downloadObjectBuffer(signatureAsset.storageKey);

  return {
    mimeType: signatureAsset.mimeType as "image/png" | "image/jpeg",
    base64: buffer.toString("base64"),
  };
}
```

```ts
// backend/src/modules/rendering/render-template.ts
import {
  buildBlueSignatureSvgMarkup,
  type DrawnSignatureAsset,
} from "./drawn-signature.js";

export interface RenderLetterHtmlOptions {
  signatureImage?: DrawnSignatureAsset | null;
}

if (data.signatureMode === "drawn" && options?.signatureImage) {
  const signatureSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildBlueSignatureSvgMarkup(options.signatureImage),
  )}`;

  signatureBlock = `<div class="signature-block">
  <img class="signature-image" src="${signatureSrc}" alt="Signature" />
  <div class="signature-name">${escapeHtml(signatureName)}</div>
</div>`;
}
```

```ts
// backend/src/modules/rendering/render-snapshot-pipeline.ts
const signatureImage = await loadSignatureImageAsset(db, snapshotData);
const html = renderLetterHtml(snapshotData, { signatureImage });
```

```ts
// backend/src/modules/rendering/pdf-access.ts
const signatureImage = await loadSignatureImageAsset(db, renderedLetter.snapshotData);
const letterHtml = renderLetterHtml(renderedLetter.snapshotData, { signatureImage });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -w backend -- regression-pdf-template.test.ts pdf-access.test.ts drawn-signature-rendering.test.ts file-preview-route.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/rendering/signature-image.ts backend/src/modules/rendering/render-template.ts backend/src/modules/rendering/render-snapshot-pipeline.ts backend/src/modules/rendering/pdf-access.ts backend/tests/regression-pdf-template.test.ts backend/tests/pdf-access.test.ts
git commit -m "feat: reuse blue signature rendering for pdf generation"
```

### Task 4: Validate the end-to-end rendering contract

**Files:**

- Modify: `shared/src/letter-layout.ts`
- Modify: `shared/tests/letter-layout.test.ts`
- Create: `backend/src/modules/rendering/drawn-signature.ts`
- Modify: `backend/src/modules/files/file.routes.ts`
- Modify: `backend/src/modules/rendering/signature-image.ts`
- Modify: `backend/src/modules/rendering/render-template.ts`
- Modify: `backend/src/modules/rendering/render-snapshot-pipeline.ts`
- Modify: `backend/src/modules/rendering/pdf-access.ts`
- Modify: `backend/tests/file-preview-route.test.ts`
- Create: `backend/tests/drawn-signature-rendering.test.ts`
- Modify: `backend/tests/regression-pdf-template.test.ts`
- Modify: `backend/tests/pdf-access.test.ts`

- [ ] **Step 1: Run targeted package tests**

Run: `npm run test -w shared -- letter-layout.test.ts && npm run test -w backend -- drawn-signature-rendering.test.ts file-preview-route.test.ts regression-pdf-template.test.ts pdf-access.test.ts`  
Expected: PASS

- [ ] **Step 2: Run repo validation**

Run: `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run lint && NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run typecheck && NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm test && NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy NEXT_PUBLIC_APP_ENV=test npm run build`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add shared/src/letter-layout.ts shared/tests/letter-layout.test.ts backend/src/modules/rendering/drawn-signature.ts backend/src/modules/files/file.routes.ts backend/src/modules/rendering/signature-image.ts backend/src/modules/rendering/render-template.ts backend/src/modules/rendering/render-snapshot-pipeline.ts backend/src/modules/rendering/pdf-access.ts backend/tests/file-preview-route.test.ts backend/tests/drawn-signature-rendering.test.ts backend/tests/regression-pdf-template.test.ts backend/tests/pdf-access.test.ts
git commit -m "feat: render drawn signatures in blue across previews and pdfs"
```
