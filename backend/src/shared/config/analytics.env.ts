import { z } from "zod";

/**
 * Everything the app needs to read acquisition data out of Google, and to write
 * one conversion back into it.
 *
 * Kept out of the main schema as one block because they are answers to the same
 * question — which channel produced a paying customer — and because every one
 * of them is optional. An unset analytics credential must degrade to "that
 * report is empty", never to a refusal to boot: an outage caused by a marketing
 * setting is the wrong trade for a letter-posting service.
 */
export const ANALYTICS_ENV_FIELDS = {
  // Read-only acquisition analytics. The service-account file is mounted
  // outside the repository in production; no credential JSON belongs in env.
  GOOGLE_SERVICE_ACCOUNT_FILE: z.string().min(1).optional(),
  GA4_PROPERTY_ID: z.string().regex(/^\d+$/).optional(),
  GSC_SITE_URL: z.string().min(1).optional(),
  GOOGLE_ADS_CUSTOMER_ID: z
    .string()
    .regex(/^\d{10}$/)
    .optional(),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: z
    .string()
    .regex(/^\d{10}$/)
    .optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().min(1).optional(),

  // Write side: the server-side GA4 `purchase` (Measurement Protocol). The send
  // needs both values and is skipped unless both are present.
  //
  // `GA4_MEASUREMENT_ID` must be the same "G-..." stream the frontend tags with.
  // Point them at different properties and GA4 has no opportunity to
  // de-duplicate the browser event against the server one, which turns a single
  // order into two.
  GA4_MEASUREMENT_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/)
    .optional(),
  GA4_API_SECRET: z.string().min(1).optional(),
};
