import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_PUPPETEER_ARGS,
  getPuppeteerLaunchOptions,
} from "../src/modules/rendering/browser-launch.js";

describe("browser launch options", () => {
  afterEach(() => {
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
  });

  it("omits executablePath when no override is configured", () => {
    delete process.env.PUPPETEER_EXECUTABLE_PATH;

    expect(getPuppeteerLaunchOptions()).toEqual({
      headless: true,
      args: DEFAULT_PUPPETEER_ARGS,
    });
  });

  it("uses PUPPETEER_EXECUTABLE_PATH when configured", () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = "/custom/chrome";

    expect(getPuppeteerLaunchOptions()).toEqual({
      executablePath: "/custom/chrome",
      headless: true,
      args: DEFAULT_PUPPETEER_ARGS,
    });
  });
});
