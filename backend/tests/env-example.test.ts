import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import type { z } from "zod";
import { describe, expect, it } from "vitest";

import { EnvSchema } from "../src/shared/config/env.js";

/**
 * `.env.example` is the onboarding contract: it is what a new machine copies to
 * `.env`. Nothing checked that the values it states still satisfy the schema, so
 * tightening a rule silently invalidated it — the CHF 6.00 cap added to
 * `PRICE_*_MARKUP_CENTS` left the template at a value that had never been valid,
 * and it surfaced much later as a backend that would not boot.
 *
 * Only *stated* values are checked. Secret slots are deliberately blank in the
 * template and must stay that way, so a whole-object parse is the wrong test: it
 * would demand the file contain credentials.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const example = dotenv.parse(
  fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8"),
);

/** Zod 4 keeps `.refine()` on the object itself, so the field shape is direct. */
function envShape(): z.ZodRawShape {
  return EnvSchema.shape;
}

describe(".env.example", () => {
  it("states no value the schema would reject", () => {
    const shape = envShape();
    const problems: string[] = [];

    for (const [key, value] of Object.entries(example)) {
      if (value === "") continue;
      const field = shape[key];
      if (!field) continue;
      const result = field.safeParse(value);
      if (!result.success) {
        problems.push(`${key}=${value}: ${result.error.issues[0]?.message}`);
      }
    }

    expect(problems).toEqual([]);
  });

  /**
   * A value that merely parses can still be wrong. Prices are where a stale
   * template is expensive rather than annoying, so the template must agree with
   * the schema's default rather than carrying a third opinion — which is exactly
   * how it drifted to 340 while the code said 290 and a machine ran 890.
   */
  it("uses the schema's own default markups", () => {
    const shape = envShape();
    for (const key of ["PRICE_STANDARD_MARKUP_CENTS", "PRICE_REGISTERED_MARKUP_CENTS"]) {
      const schemaDefault = shape[key]?.parse(undefined);
      expect(Number(example[key]), key).toBe(schemaDefault);
    }
  });
});
