/**
 * A small, decorative "letter" drawn in CSS — a stylized sheet with a recipient
 * block, an accent-tinted subject line and a few body lines. Used at the top of
 * template cards so the hub reads as a wall of letters rather than a plain link
 * list. Language-neutral by design (the real, in-language template name and
 * description sit below it in the card), and purely decorative for a11y.
 */
export function LetterMotif({ className }: { className?: string }) {
  const bar = "rounded-full bg-[var(--app-border-strong)]/45";

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-lg border border-[var(--app-border)] bg-white shadow-[0_6px_18px_rgba(22,22,22,0.06)] dark:bg-zinc-100 ${className ?? ""}`}
    >
      <div className="flex h-full flex-col gap-2 p-4">
        {/* Sender/date row */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className={`block h-1 w-10 ${bar}`} />
            <span className={`block h-1 w-14 ${bar}`} />
          </div>
          <span className={`block h-1 w-8 ${bar}`} />
        </div>

        {/* Subject line — accent tinted so the sheet reads as a formal letter */}
        <span className="mt-1 block h-1.5 w-24 rounded-full bg-[var(--action-primary-bg)]/70" />

        {/* Body lines */}
        <div className="mt-1 space-y-1.5">
          <span className={`block h-1 w-full ${bar}`} />
          <span className={`block h-1 w-full ${bar}`} />
          <span className={`block h-1 w-[82%] ${bar}`} />
          <span className={`block h-1 w-[90%] ${bar}`} />
        </div>

        {/* Signature */}
        <span className={`mt-auto block h-1 w-12 self-end ${bar}`} />
      </div>
    </div>
  );
}
