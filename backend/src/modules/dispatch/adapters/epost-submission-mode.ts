export type EpostSubmissionMode = "mock" | "live";

export function getEpostProviderName(mode: EpostSubmissionMode): string {
  return mode === "mock" ? "epost-oneapi-mock" : "epost-oneapi";
}

export function isMockEpostProviderName(
  providerName: string | null | undefined,
): boolean {
  return providerName === getEpostProviderName("mock");
}
