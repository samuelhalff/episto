import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  AddressDetailsQueryInput,
  AddressSearchQueryInput,
  RecipientCompanyDetailsQueryInput,
  RecipientCompanySearchQueryInput,
} from "@swiss-mail/shared";

import { getDb } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { notFoundError } from "../../shared/errors/index.js";
import { getDraftById } from "./draft.service.js";
import {
  getAddressDetails,
  getRecipientCompanyDetails,
  searchAddresses,
  searchRecipientCompanies,
} from "./address-search.service.js";

export async function addressSearchRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireSession);

  app.get(
    "/drafts/:draftId/address-search",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { draftId: string };
        Querystring: { query?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      const { query } = AddressSearchQueryInput.parse(request.query);
      const results = await searchAddresses(query);

      reply.send({ results });
    },
  );

  app.get(
    "/drafts/:draftId/address-details",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { draftId: string };
        Querystring: { id?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      const { id } = AddressDetailsQueryInput.parse(request.query);
      const address = await getAddressDetails(id);

      reply.send({ address });
    },
  );

  app.get(
    "/drafts/:draftId/recipient/company-search",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { draftId: string };
        Querystring: { query?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      const { query } = RecipientCompanySearchQueryInput.parse(request.query);
      const results = await searchRecipientCompanies(query);

      reply.send({ results });
    },
  );

  app.get(
    "/drafts/:draftId/recipient/company-details",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { draftId: string };
        Querystring: { id?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { draftId } = request.params;

      const draft = await getDraftById(db, draftId, session.id);
      if (!draft) throw notFoundError("draft");

      const { id } = RecipientCompanyDetailsQueryInput.parse(request.query);
      const company = await getRecipientCompanyDetails(id);

      reply.send({ company });
    },
  );
}
