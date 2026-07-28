/**
 * Template: dispatch-under-review.
 *
 * A sibling of `email-templates.ts` only because that file is at its size cap —
 * the layout, helpers and data block are exactly the ones every other template
 * uses, and this renderer must stay visually indistinguishable from them.
 *
 * Content rule (docs/04-product/email-flows.md, Template 5): this email must
 * not imply rejection, refund, delivery, or provider acceptance. It says what
 * we know, that nothing is required of the reader, and that we will write
 * again. Nothing else belongs here.
 */

import {
  wrapEmailHtml,
  escapeHtml,
  sectionDivider,
  detailRowMono,
  detailTable,
  heading,
  paragraph,
  mutedText,
} from "./email-layout.js";

import { resolveLocale, DISPATCH_UNDER_REVIEW_STRINGS } from "./email-strings.js";

import {
  layoutConfig,
  readString,
  type RenderedEmail,
} from "./email-template-helpers.js";

export function renderDispatchUnderReview(
  locale: string,
  data: Record<string, unknown>,
): RenderedEmail {
  const s = DISPATCH_UNDER_REVIEW_STRINGS[resolveLocale(locale)];
  const config = layoutConfig(locale, data);
  const orderRef = readString(data, "orderRef");
  const supportEmail = readString(data, "supportEmail");

  const rows = [detailRowMono(s.orderLabel, orderRef)].join("\n");

  const bodyParts = [
    heading(s.heading),
    paragraph(escapeHtml(s.body)),
    paragraph(escapeHtml(s.noActionNote)),
    detailTable(rows),
    mutedText(escapeHtml(s.followUp)),
  ];

  if (supportEmail) {
    bodyParts.push(sectionDivider());
    bodyParts.push(
      mutedText(
        `${escapeHtml(s.supportLine)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#161616;text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
      ),
    );
  }

  const textLines = [
    s.heading.toUpperCase(),
    "",
    s.body,
    "",
    s.noActionNote,
    "",
    `${s.orderLabel}: ${orderRef}`,
    "",
    s.followUp,
    "",
    supportEmail ? `${s.supportLine} ${supportEmail}` : null,
  ].filter((line): line is string => line !== null);

  return {
    subject: s.subject,
    text: textLines.join("\n"),
    html: wrapEmailHtml(config, bodyParts.filter(Boolean).join("\n")),
  };
}
