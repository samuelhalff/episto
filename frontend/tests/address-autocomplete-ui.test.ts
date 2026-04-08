import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const senderStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SenderStep.tsx"),
  "utf8",
);
const recipientStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientStep.tsx"),
  "utf8",
);
const useApiSource = readFileSync(
  path.join(repoRoot, "frontend/src/hooks/use-api.ts"),
  "utf8",
);
const messagesSource = readFileSync(
  path.join(repoRoot, "frontend/src/messages/en-CH.json"),
  "utf8",
);

describe("address autocomplete UI", () => {
  it("wires a shared address autocomplete field into sender and recipient flows", () => {
    expect(senderStepSource).toContain("AddressAutocompleteField");
    expect(recipientStepSource).toContain("AddressAutocompleteField");
  });

  it("exports dedicated address-search hooks through the shared hook barrel", () => {
    expect(useApiSource).toContain("useAddressSearch");
    expect(useApiSource).toContain("useAddressDetails");
  });

  it("adds localized copy for address search states", () => {
    expect(messagesSource).toContain('"addressSearchLabel"');
    expect(messagesSource).toContain('"addressSearchPlaceholder"');
    expect(messagesSource).toContain('"addressSearchHint"');
    expect(messagesSource).toContain('"addressSearchSourceNote"');
    expect(messagesSource).toContain('"searchingAddresses"');
    expect(messagesSource).toContain('"addressSearchUnavailable"');
    expect(messagesSource).toContain('"addressSearchNoResults"');
  });
});
