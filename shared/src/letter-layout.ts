export const LETTER_PAGE_MM = {
  width: 210,
  height: 297,
} as const;

export const LETTER_LAYOUT_MM = {
  sender: {
    top: 20,
    left: 25,
    width: 80,
  },
  dispatch: {
    top: 40,
    left: 121,
    width: 59,
  },
  recipient: {
    top: 52,
    left: 121,
    width: 59,
    minHeight: 31,
  },
  rightMeta: {
    top: 87,
    left: 121,
    width: 59,
  },
  body: {
    paddingTop: 114,
    paddingRight: 20,
    paddingBottom: 20,
    paddingLeft: 25,
  },
  subject: {
    marginBottom: 6,
  },
  salutation: {
    marginBottom: 5,
  },
  letterBody: {
    marginBottom: 8,
  },
  closing: {
    marginTop: 8,
  },
  signature: {
    marginTop: 10,
  },
  signatureName: {
    marginTop: 2,
  },
  enclosure: {
    marginTop: 12,
    paddingTop: 3,
  },
} as const;

export const LETTER_LAYOUT_PT = {
  sender: 8.75,
  dispatch: 8.25,
  recipient: 10.5,
  date: 10,
  body: 10.5,
  subject: 11.25,
  heading1: 15,
  heading2: 12.5,
  heading3: 10.5,
  table: 9.5,
  signatureScript: 26,
  signatureName: 9.5,
} as const;

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

export function mmToPageCqw(value: number): string {
  return `${(value / LETTER_PAGE_MM.width) * 100}cqw`;
}

export function ptToPageCqw(value: number): string {
  return mmToPageCqw((value * 25.4) / 72);
}
