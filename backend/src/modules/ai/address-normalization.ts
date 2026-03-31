function normalizeWordPreservingDelimiters(value: string): string {
  return value.replace(/[A-Za-zÀ-ÿ]+/g, (token) => {
    const lower = token.toLocaleLowerCase("de-CH");
    return lower.charAt(0).toLocaleUpperCase("de-CH") + lower.slice(1);
  });
}

export function normalizeAddressPresentation(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .map((segment) => {
      if (/\d/.test(segment)) {
        return segment;
      }

      return normalizeWordPreservingDelimiters(segment);
    })
    .join(" ");
}
