/**
 * SSE stream routes — real-time event streaming for draft workspace.
 *
 * Subscribes to the in-process draft event bus and relays events
 * to the connected client via Server-Sent Events.
 *
 * Event types (from api-contracts.md §3.3):
 * - ai_token: streaming AI text tokens
 * - ai_message_complete: full AI message with extracted fields
 * - field_update: draft field changed
 * - draft_status: draft state transition
 * - error: non-fatal processing error
 */

import type { FastifyInstance } from "fastify";
import { getDb } from "../../db/index.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import { getDraftById } from "./draft.service.js";
import { subscribeDraft, unsubscribeDraft } from "./draft-events.js";
import type { DraftEventHandler } from "./draft-events.js";
import { notFoundError } from "../../shared/errors/index.js";

export async function streamRoutes(app: FastifyInstance): Promise<void> {
  // GET /drafts/:draftId/stream — SSE event stream for real-time updates
  app.get<{ Params: { draftId: string } }>(
    "/drafts/:draftId/stream",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      let eventId = 0;

      reply.raw.write(
        `id: ${eventId++}\nevent: connected\ndata: ${JSON.stringify({ draftId })}\n\n`,
      );

      // Subscribe to draft events and relay to SSE
      const handler: DraftEventHandler = (event, payload) => {
        if (reply.raw.destroyed) return;
        reply.raw.write(
          `id: ${eventId++}\nevent: ${event}\ndata: ${JSON.stringify(payload)}\n\n`,
        );
      };

      subscribeDraft(draftId, handler);

      // Keepalive heartbeat every 30 seconds
      const keepalive = setInterval(() => {
        if (!reply.raw.destroyed) {
          reply.raw.write(": keepalive\n\n");
        }
      }, 30_000);

      // Cleanup on disconnect
      request.raw.on("close", () => {
        clearInterval(keepalive);
        unsubscribeDraft(draftId, handler);
      });
    },
  );
}
