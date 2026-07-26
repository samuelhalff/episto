import type { FastifyInstance } from "fastify";
import {
  createAdminPromoSchema,
  listAdminPromosQuerySchema,
  promoIdParamsSchema,
  toggleAdminPromoSchema,
  updateAdminPromoSchema,
  type AdminPromosResponse,
} from "@episto/shared";

import { getDb } from "../../db/index.js";
import { getRequiredAdmin } from "../../shared/middleware/require-admin.js";
import { recordSupportEvent } from "./index.js";
import {
  createAdminPromo,
  deleteAdminPromo,
  listAdminPromos,
  setAdminPromoActive,
  updateAdminPromo,
} from "./admin-promos.service.js";

// ---------------------------------------------------------------------------
// Admin promo-code management routes. Registered inside adminRoutes, so the
// requireAllowlistedAdminIp + requireAdmin hooks already protect every handler.
// ---------------------------------------------------------------------------

export async function adminPromosRoutes(app: FastifyInstance): Promise<void> {
  // Never cache promo state in a shared/browser cache.
  app.addHook("onSend", async (_req, reply, payload) => {
    reply.header("Cache-Control", "no-store");
    return payload;
  });

  // GET /admin/promos?filter=active|expired|inactive|all
  app.get("/admin/promos", async (request, reply) => {
    const { filter } = listAdminPromosQuerySchema.parse(request.query ?? {});
    const promos = await listAdminPromos(filter, getDb());
    const response: AdminPromosResponse = { promos };
    reply.send(response);
  });

  // POST /admin/promos — create
  app.post("/admin/promos", async (request, reply) => {
    const db = getDb();
    const input = createAdminPromoSchema.parse(request.body);
    const promo = await createAdminPromo(input, db);
    await recordSupportEvent(db, {
      eventType: "promo_created",
      actor: getRequiredAdmin(request).actor,
      details: { promoId: promo.id, code: promo.code, kind: promo.kind },
    });
    reply.status(201).send(promo);
  });

  // PATCH /admin/promos/:id — edit settings
  app.patch<{ Params: { id: string } }>("/admin/promos/:id", async (request, reply) => {
    const db = getDb();
    const { id } = promoIdParamsSchema.parse(request.params);
    const input = updateAdminPromoSchema.parse(request.body);
    const promo = await updateAdminPromo(id, input, db);
    await recordSupportEvent(db, {
      eventType: "promo_updated",
      actor: getRequiredAdmin(request).actor,
      details: { promoId: promo.id, code: promo.code },
    });
    reply.send(promo);
  });

  // POST /admin/promos/:id/toggle-active — activate / deactivate
  app.post<{ Params: { id: string } }>(
    "/admin/promos/:id/toggle-active",
    async (request, reply) => {
      const db = getDb();
      const { id } = promoIdParamsSchema.parse(request.params);
      const { active } = toggleAdminPromoSchema.parse(request.body);
      const promo = await setAdminPromoActive(id, active, db);
      await recordSupportEvent(db, {
        eventType: active ? "promo_activated" : "promo_deactivated",
        actor: getRequiredAdmin(request).actor,
        details: { promoId: promo.id, code: promo.code },
      });
      reply.send(promo);
    },
  );

  // DELETE /admin/promos/:id — hard-delete if unused, else archive
  app.delete<{ Params: { id: string } }>("/admin/promos/:id", async (request, reply) => {
    const db = getDb();
    const { id } = promoIdParamsSchema.parse(request.params);
    const result = await deleteAdminPromo(id, db);
    await recordSupportEvent(db, {
      eventType: "promo_deleted",
      actor: getRequiredAdmin(request).actor,
      details: { promoId: id, outcome: result.outcome },
    });
    reply.send(result);
  });
}
