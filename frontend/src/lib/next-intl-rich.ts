import { Fragment, createElement, type ReactNode } from "react";

type RichTranslatorLike = {
  rich?: (key: string, values?: Record<string, unknown>) => ReactNode;
  (key: string, values?: Record<string, unknown>): string;
};

export function renderRichText(
  t: unknown,
  key: string,
  values: Record<string, unknown>,
): ReactNode {
  const translator = t as RichTranslatorLike;

  if (typeof translator.rich === "function") {
    return translator.rich(key, values);
  }

  const raw = translator(key, values);
  const parts: ReactNode[] = [];
  const tagPattern = /<([a-zA-Z0-9]+)>(.*?)<\/\1>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push(raw.slice(lastIndex, match.index));
    }

    const renderTag = values[match[1] as string];
    if (typeof renderTag === "function") {
      parts.push(renderTag(match[2]));
    } else {
      parts.push(match[2]);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    parts.push(raw.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : createElement(Fragment, null, parts);
}
