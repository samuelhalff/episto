/**
 * The one promise a dispatch adapter makes to the worker that pays for it.
 *
 * When `adapter.submit()` throws, the worker has already written the point of
 * no return and cannot resubmit. The only question left is whether the user
 * gets their money back, and that turns entirely on whether the letter left
 * the building. Only the adapter knows: it is the code holding the socket.
 *
 * So the adapter says so explicitly rather than letting the worker infer it
 * from an error family. Families were the first design and they were wrong —
 * ePost's own pre-flight validation raises `validation_error`, which reads
 * like an ambiguous internal fault while in fact meaning "we never sent
 * anything". An unmarked error is treated as ambiguous, so forgetting to mark
 * one costs a manual review, never a refunded-but-posted letter.
 */
const NOTHING_SENT = Symbol.for("episto.dispatch.nothingSent");

/** Mark a failure that happened before any part of the letter was transmitted. */
export function markLetterNotSent<T>(err: T): T {
  if (typeof err === "object" && err !== null) {
    Object.defineProperty(err, NOTHING_SENT, {
      value: true,
      enumerable: false,
      configurable: true,
    });
  }
  return err;
}

/** Did the adapter guarantee that nothing reached the provider? */
export function isLetterNotSent(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as Record<symbol, unknown>)[NOTHING_SENT] === true
  );
}
