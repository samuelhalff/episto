import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.doUnmock("next/navigation");
  vi.doUnmock("../src/components/product/draft-flow/DraftWorkspaceClient");
  vi.doUnmock("../src/app/[locale]/draft/[draftId]/review/page");
  vi.doUnmock("../src/app/[locale]/draft/[draftId]/checkout/page");
});

describe("draft step route dispatch", () => {
  it("routes the review step to the dedicated review page on direct loads", async () => {
    vi.stubGlobal("React", React);

    const notFound = vi.fn(() => {
      throw new Error("NOT_FOUND");
    });
    const workspacePage = vi.fn();
    const reviewPage = vi.fn();
    const checkoutPage = vi.fn();

    vi.doMock("next/navigation", () => ({ notFound }));
    vi.doMock("../src/components/product/draft-flow/DraftWorkspaceClient", () => ({
      DraftWorkspaceClient: workspacePage,
    }));
    vi.doMock("../src/app/[locale]/draft/[draftId]/review/page", () => ({
      default: reviewPage,
    }));
    vi.doMock("../src/app/[locale]/draft/[draftId]/checkout/page", () => ({
      default: checkoutPage,
    }));

    const { default: DraftWorkspaceStepPage } =
      await import("../src/app/[locale]/draft/[draftId]/[step]/page");

    const element = await DraftWorkspaceStepPage({
      params: Promise.resolve({
        draftId: "draft-123",
        locale: "en-CH",
        step: "review",
      }),
    });

    expect(notFound).not.toHaveBeenCalled();
    expect(element.type).toBe(reviewPage);
    expect(element.props.params).toBeInstanceOf(Promise);
    await expect(element.props.params).resolves.toEqual({ draftId: "draft-123" });
    expect(workspacePage).not.toHaveBeenCalled();
    expect(checkoutPage).not.toHaveBeenCalled();
  });

  it("routes the checkout step to the dedicated checkout page on direct loads", async () => {
    vi.stubGlobal("React", React);

    const notFound = vi.fn(() => {
      throw new Error("NOT_FOUND");
    });
    const workspacePage = vi.fn();
    const reviewPage = vi.fn();
    const checkoutPage = vi.fn();

    vi.doMock("next/navigation", () => ({ notFound }));
    vi.doMock("../src/components/product/draft-flow/DraftWorkspaceClient", () => ({
      DraftWorkspaceClient: workspacePage,
    }));
    vi.doMock("../src/app/[locale]/draft/[draftId]/review/page", () => ({
      default: reviewPage,
    }));
    vi.doMock("../src/app/[locale]/draft/[draftId]/checkout/page", () => ({
      default: checkoutPage,
    }));

    const { default: DraftWorkspaceStepPage } =
      await import("../src/app/[locale]/draft/[draftId]/[step]/page");

    const element = await DraftWorkspaceStepPage({
      params: Promise.resolve({
        draftId: "draft-123",
        locale: "en-CH",
        step: "checkout",
      }),
    });

    expect(notFound).not.toHaveBeenCalled();
    expect(element.type).toBe(checkoutPage);
    expect(element.props.params).toBeInstanceOf(Promise);
    await expect(element.props.params).resolves.toEqual({
      draftId: "draft-123",
      locale: "en-CH",
    });
    expect(workspacePage).not.toHaveBeenCalled();
    expect(reviewPage).not.toHaveBeenCalled();
  });
});
