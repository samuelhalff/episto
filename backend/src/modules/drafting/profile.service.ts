import { eq, and } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";

// ---------------------------------------------------------------------------
// Sender profiles
// ---------------------------------------------------------------------------

export interface SenderProfileRow {
  id: string;
  sessionId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createSenderProfile(
  db: Db,
  sessionId: string,
  data: {
    firstName: string;
    lastName: string;
    company?: string | null | undefined;
    addressLine1: string;
    addressLine2?: string | null | undefined;
    postalCode: string;
    city: string;
    country?: string | undefined;
    email?: string | null | undefined;
    phone?: string | null | undefined;
  },
): Promise<SenderProfileRow> {
  const [row] = await db
    .insert(schema.senderProfiles)
    .values({
      sessionId,
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company ?? null,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? null,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country ?? "CH",
      email: data.email ?? null,
      phone: data.phone ?? null,
    })
    .returning();

  if (!row) throw new Error("Failed to create sender profile");
  return row as SenderProfileRow;
}

export async function getSenderProfile(
  db: Db,
  profileId: string,
  sessionId: string,
): Promise<SenderProfileRow | null> {
  const [row] = await db
    .select()
    .from(schema.senderProfiles)
    .where(
      and(
        eq(schema.senderProfiles.id, profileId),
        eq(schema.senderProfiles.sessionId, sessionId),
      ),
    )
    .limit(1);

  return (row as SenderProfileRow | undefined) ?? null;
}

export async function listSenderProfiles(
  db: Db,
  sessionId: string,
): Promise<SenderProfileRow[]> {
  const rows = await db
    .select()
    .from(schema.senderProfiles)
    .where(eq(schema.senderProfiles.sessionId, sessionId));

  return rows as SenderProfileRow[];
}

// ---------------------------------------------------------------------------
// Recipient profiles
// ---------------------------------------------------------------------------

export interface RecipientProfileRow {
  id: string;
  sessionId: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  department: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createRecipientProfile(
  db: Db,
  sessionId: string,
  data: {
    firstName?: string | null | undefined;
    lastName?: string | null | undefined;
    company?: string | null | undefined;
    department?: string | null | undefined;
    addressLine1: string;
    addressLine2?: string | null | undefined;
    postalCode: string;
    city: string;
    country?: string | undefined;
  },
): Promise<RecipientProfileRow> {
  const [row] = await db
    .insert(schema.recipientProfiles)
    .values({
      sessionId,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      company: data.company ?? null,
      department: data.department ?? null,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? null,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country ?? "CH",
    })
    .returning();

  if (!row) throw new Error("Failed to create recipient profile");
  return row as RecipientProfileRow;
}

export async function getRecipientProfile(
  db: Db,
  profileId: string,
  sessionId: string,
): Promise<RecipientProfileRow | null> {
  const [row] = await db
    .select()
    .from(schema.recipientProfiles)
    .where(
      and(
        eq(schema.recipientProfiles.id, profileId),
        eq(schema.recipientProfiles.sessionId, sessionId),
      ),
    )
    .limit(1);

  return (row as RecipientProfileRow | undefined) ?? null;
}

export async function listRecipientProfiles(
  db: Db,
  sessionId: string,
): Promise<RecipientProfileRow[]> {
  const rows = await db
    .select()
    .from(schema.recipientProfiles)
    .where(eq(schema.recipientProfiles.sessionId, sessionId));

  return rows as RecipientProfileRow[];
}
