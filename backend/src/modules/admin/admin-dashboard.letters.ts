import { sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import type {
  AdminLetterRow,
  AdminLettersResponse,
  AdminPaymentState,
  AdminDispatchState,
} from "@episto/shared";
import {
  parseDashboardPeriod,
  periodDays,
  parsePositiveInt,
  pickEnum,
  num,
  PAYMENT_STATES,
  DISPATCH_STATES,
  DELIVERY_TYPES,
} from "./admin-dashboard.compute.js";

export interface LettersQuery {
  period?: string;
  deliveryType?: string;
  dispatchState?: string;
  paymentState?: string;
  page?: string;
}

/**
 * Masked, filterable, paginated letters (plan §9): NO PII — only an order ref or
 * short draft id, locale, delivery type, amount and payment/dispatch state. Uses
 * the latest dispatch attempt per draft so raw retries never inflate the view.
 */
export async function lettersData(query: LettersQuery): Promise<AdminLettersResponse> {
  const db = getDb();
  const period = parseDashboardPeriod(query.period);
  const days = periodDays(period);
  const page = parsePositiveInt(query.page, 1, 100_000);
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const deliveryType = pickEnum(query.deliveryType, DELIVERY_TYPES);
  const dispatchState = pickEnum(query.dispatchState, DISPATCH_STATES);
  const paymentState = pickEnum(query.paymentState, PAYMENT_STATES);

  const filters = [sql`p.created_at > NOW() - make_interval(days => ${days})`];
  if (deliveryType) filters.push(sql`d.delivery_type = ${deliveryType}`);
  if (paymentState) filters.push(sql`p.state = ${paymentState}`);
  if (dispatchState) filters.push(sql`da.state = ${dispatchState}`);
  const where = sql.join(filters, sql` AND `);

  const base = sql`
    FROM payment_attempts p
    JOIN draft_letters d ON d.id = p.draft_id
    LEFT JOIN LATERAL (
      SELECT state, tracking_number
      FROM dispatch_attempts da
      WHERE da.draft_id = p.draft_id
      ORDER BY da.created_at DESC
      LIMIT 1
    ) da ON true
    LEFT JOIN receipts r ON r.payment_attempt_id = p.id
    WHERE p.id IN (
      SELECT DISTINCT ON (draft_id) id
      FROM payment_attempts
      ORDER BY draft_id, updated_at DESC, id DESC
    )
      AND ${where}
  `;

  const [rows, totals] = await Promise.all([
    db.execute<{
      ref: string;
      created_at: string;
      locale: string | null;
      delivery_type: string | null;
      amount_cents: number;
      payment_state: AdminPaymentState;
      dispatch_state: AdminDispatchState | null;
      tracking_number: string | null;
    }>(sql`
      SELECT
        COALESCE(r.order_ref, 'draft-' || LEFT(p.draft_id::text, 8)) AS ref,
        p.created_at::text AS created_at,
        d.locale::text AS locale,
        d.delivery_type::text AS delivery_type,
        p.amount_cents AS amount_cents,
        p.state AS payment_state,
        da.state AS dispatch_state,
        da.tracking_number AS tracking_number
      ${base}
      ORDER BY p.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    db.execute<{ total: number }>(sql`SELECT COUNT(*)::int AS total ${base}`),
  ]);

  const total = num(totals.rows[0]?.total);
  const mapped: AdminLetterRow[] = rows.rows.map((r) => ({
    ref: r.ref,
    createdAt: r.created_at,
    locale: r.locale,
    deliveryType: r.delivery_type,
    amountCents: num(r.amount_cents),
    paymentState: r.payment_state,
    dispatchState: r.dispatch_state,
    trackingNumber: r.tracking_number,
  }));

  return {
    rows: mapped,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    generatedAt: new Date().toISOString(),
  };
}

export const LETTERS_CSV_COLUMNS = [
  "ref",
  "createdAt",
  "locale",
  "deliveryType",
  "amountCents",
  "paymentState",
  "dispatchState",
  "trackingNumber",
] as const;
