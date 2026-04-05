import { describe, expect, it } from "vitest";

import {
  getSheetFooterClassName,
  getSheetSurfaceClassName,
} from "../src/components/ui/sheet";

describe("sheet design helpers", () => {
  it("keeps action sheets as scrollable vertical panels", () => {
    expect(getSheetSurfaceClassName("action")).toContain("flex");
    expect(getSheetSurfaceClassName("action")).toContain("flex-col");
    expect(getSheetSurfaceClassName("action")).toContain("overflow-hidden");
  });

  it("keeps navigation sheets full-height on mobile", () => {
    expect(getSheetSurfaceClassName("navigation")).toContain("h-[100dvh]");
    expect(getSheetSurfaceClassName("navigation")).toContain("w-full");
  });

  it("keeps sticky footers inside the safe area", () => {
    const footerClassName = getSheetFooterClassName({ sticky: true });
    expect(footerClassName).toContain("sticky");
    expect(footerClassName).toContain("bottom-0");
    expect(footerClassName).toContain("safe-area-inset-bottom");
  });
});
