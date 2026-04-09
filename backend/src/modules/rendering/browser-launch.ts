export const DEFAULT_PUPPETEER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];

interface PuppeteerLaunchOptions {
  executablePath?: string;
  headless: true;
  args: string[];
}

export function getPuppeteerLaunchOptions(
  executablePath = process.env.PUPPETEER_EXECUTABLE_PATH,
): PuppeteerLaunchOptions {
  return {
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: DEFAULT_PUPPETEER_ARGS,
  };
}
