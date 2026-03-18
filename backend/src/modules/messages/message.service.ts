import { eq, desc, and, or, lt, sql } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageRow {
  id: string;
  draftId: string;
  role: string;
  content: string;
  toolCalls: unknown;
  createdAt: Date;
}

function toMessageRow(
  row: typeof schema.conversationMessages.$inferSelect,
): MessageRow {
  return {
    id: row.id,
    draftId: row.draftId,
    role: row.role,
    content: row.content,
    toolCalls: row.toolCalls,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Create message
// ---------------------------------------------------------------------------

export async function createMessage(
  db: Db,
  data: {
    draftId: string;
    role: "user" | "assistant" | "system";
    content: string;
  },
): Promise<MessageRow> {
  const [row] = await db
    .insert(schema.conversationMessages)
    .values({
      draftId: data.draftId,
      role: data.role,
      content: data.content,
    })
    .returning();

  if (!row) throw new Error("Failed to create conversation message");
  return toMessageRow(row);
}

// ---------------------------------------------------------------------------
// List messages (cursor-based, newest first)
// ---------------------------------------------------------------------------

export async function listMessages(
  db: Db,
  draftId: string,
  opts?: { cursor?: string | undefined; limit?: number | undefined },
): Promise<{ data: MessageRow[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(opts?.limit ?? 20, 100);
  const fetchCount = limit + 1; // fetch one extra to determine hasMore

  let rows: (typeof schema.conversationMessages.$inferSelect)[];

  if (opts?.cursor) {
    // Cursor format: "createdAt|id"
    const parts = opts.cursor.split("|");
    const cursorDate = parts[0];
    const cursorId = parts[1];

    if (!cursorDate || !cursorId) {
      rows = await db
        .select()
        .from(schema.conversationMessages)
        .where(eq(schema.conversationMessages.draftId, draftId))
        .orderBy(
          desc(schema.conversationMessages.createdAt),
          desc(schema.conversationMessages.id),
        )
        .limit(fetchCount);
    } else {
      rows = await db
        .select()
        .from(schema.conversationMessages)
        .where(
          and(
            eq(schema.conversationMessages.draftId, draftId),
            or(
              lt(schema.conversationMessages.createdAt, new Date(cursorDate)),
              and(
                eq(
                  schema.conversationMessages.createdAt,
                  new Date(cursorDate),
                ),
                lt(schema.conversationMessages.id, cursorId),
              ),
            ),
          ),
        )
        .orderBy(
          desc(schema.conversationMessages.createdAt),
          desc(schema.conversationMessages.id),
        )
        .limit(fetchCount);
    }
  } else {
    rows = await db
      .select()
      .from(schema.conversationMessages)
      .where(eq(schema.conversationMessages.draftId, draftId))
      .orderBy(
        desc(schema.conversationMessages.createdAt),
        desc(schema.conversationMessages.id),
      )
      .limit(fetchCount);
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const lastRow = page[page.length - 1];
  const nextCursor = lastRow
    ? `${lastRow.createdAt.toISOString()}|${lastRow.id}`
    : null;

  return {
    data: page.map(toMessageRow),
    cursor: hasMore ? nextCursor : null,
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// Count messages for rate limiting
// ---------------------------------------------------------------------------

export async function getMessageCount(
  db: Db,
  draftId: string,
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.conversationMessages)
    .where(eq(schema.conversationMessages.draftId, draftId));

  return result?.count ?? 0;
}
