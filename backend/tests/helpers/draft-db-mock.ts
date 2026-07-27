import { vi } from "vitest";

/**
 * Chainable stand-in for the drizzle client used by the AI handler tests.
 *
 * Every builder method returns the same object, so any call order works. It
 * also carries `for` and `transaction`, because draft field writes read-modify-
 * write `metadata` against a locked row: a generation that started before the
 * user changed the workspace would otherwise finish later and write back the
 * snapshot it loaded at the start of the turn.
 */
export function createDraftDbMock() {
  return {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    for: vi.fn(),
    transaction: vi.fn(),
  };
}

export type DraftDbMock = ReturnType<typeof createDraftDbMock>;

/** Resets every builder to the chaining default; call it in `beforeEach`. */
export function resetDraftDbMock(mockDb: DraftDbMock): void {
  for (const key of [
    "select",
    "from",
    "where",
    "orderBy",
    "update",
    "set",
    "for",
  ] as const) {
    mockDb[key].mockReset().mockReturnValue(mockDb);
  }
  mockDb.limit.mockReset().mockResolvedValue([{ metadata: null }]);
  mockDb.transaction
    .mockReset()
    .mockImplementation((fn: (tx: unknown) => unknown) => fn(mockDb));
}
