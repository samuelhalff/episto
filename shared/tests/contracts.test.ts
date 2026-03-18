import { describe, it, expect } from "vitest";
import {
  CreateSessionInput,
  UpdateDraftInput,
  CreateSenderProfileInput,
  CreateRecipientProfileInput,
} from "../src/contracts/index.js";

// ---------------------------------------------------------------------------
// CreateSessionInput
// ---------------------------------------------------------------------------

describe("CreateSessionInput", () => {
  it("parses with a valid locale", () => {
    const result = CreateSessionInput.parse({ locale: "de-CH" });
    expect(result.locale).toBe("de-CH");
  });

  it("parses without locale (optional)", () => {
    const result = CreateSessionInput.parse({});
    expect(result.locale).toBeUndefined();
  });

  it("rejects an invalid locale", () => {
    expect(() => CreateSessionInput.parse({ locale: "en-US" })).toThrow();
  });

  it("accepts empty object", () => {
    expect(CreateSessionInput.parse({})).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// UpdateDraftInput
// ---------------------------------------------------------------------------

describe("UpdateDraftInput", () => {
  it("parses a valid partial update", () => {
    const result = UpdateDraftInput.parse({ subject: "Hello", body: "World" });
    expect(result.subject).toBe("Hello");
    expect(result.body).toBe("World");
  });

  it("accepts an empty object (all fields optional)", () => {
    const result = UpdateDraftInput.parse({});
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("rejects subject over 200 chars", () => {
    expect(() => UpdateDraftInput.parse({ subject: "x".repeat(201) })).toThrow();
  });

  it("rejects body over 10000 chars", () => {
    expect(() => UpdateDraftInput.parse({ body: "x".repeat(10001) })).toThrow();
  });

  it("accepts valid deliveryType", () => {
    const result = UpdateDraftInput.parse({ deliveryType: "registered" });
    expect(result.deliveryType).toBe("registered");
  });

  it("rejects invalid deliveryType", () => {
    expect(() => UpdateDraftInput.parse({ deliveryType: "express" })).toThrow();
  });

  it("accepts signatureMode as null", () => {
    const result = UpdateDraftInput.parse({ signatureMode: null });
    expect(result.signatureMode).toBeNull();
  });

  it("accepts signatureMode typed/image", () => {
    expect(UpdateDraftInput.parse({ signatureMode: "typed" }).signatureMode).toBe("typed");
    expect(UpdateDraftInput.parse({ signatureMode: "image" }).signatureMode).toBe("image");
  });

  it("rejects invalid signatureMode", () => {
    expect(() => UpdateDraftInput.parse({ signatureMode: "drawn" })).toThrow();
  });

  it("rejects unknown extra fields by stripping them", () => {
    const result = UpdateDraftInput.parse({ unknownField: 123, subject: "ok" });
    expect((result as Record<string, unknown>).unknownField).toBeUndefined();
    expect(result.subject).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// CreateSenderProfileInput
// ---------------------------------------------------------------------------

describe("CreateSenderProfileInput", () => {
  const validSender = () => ({
    firstName: "Max",
    lastName: "Muster",
    addressLine1: "Bahnhofstrasse 1",
    postalCode: "8001",
    city: "Zürich",
  });

  it("parses a valid complete profile", () => {
    const result = CreateSenderProfileInput.parse(validSender());
    expect(result.firstName).toBe("Max");
    expect(result.country).toBe("CH"); // default
  });

  it("defaults country to CH", () => {
    const result = CreateSenderProfileInput.parse(validSender());
    expect(result.country).toBe("CH");
  });

  it("rejects missing firstName", () => {
    const s = validSender();
    delete (s as Record<string, unknown>).firstName;
    expect(() => CreateSenderProfileInput.parse(s)).toThrow();
  });

  it("rejects missing lastName", () => {
    const s = validSender();
    delete (s as Record<string, unknown>).lastName;
    expect(() => CreateSenderProfileInput.parse(s)).toThrow();
  });

  it("rejects empty firstName", () => {
    expect(() => CreateSenderProfileInput.parse({ ...validSender(), firstName: "" })).toThrow();
  });

  it("rejects missing addressLine1", () => {
    const s = validSender();
    delete (s as Record<string, unknown>).addressLine1;
    expect(() => CreateSenderProfileInput.parse(s)).toThrow();
  });

  it("rejects invalid postalCode", () => {
    expect(() =>
      CreateSenderProfileInput.parse({ ...validSender(), postalCode: "123" }),
    ).toThrow();
  });

  it("accepts optional email as valid email", () => {
    const result = CreateSenderProfileInput.parse({ ...validSender(), email: "a@b.ch" });
    expect(result.email).toBe("a@b.ch");
  });

  it("rejects invalid email format", () => {
    expect(() =>
      CreateSenderProfileInput.parse({ ...validSender(), email: "not-an-email" }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// CreateRecipientProfileInput
// ---------------------------------------------------------------------------

describe("CreateRecipientProfileInput", () => {
  const validRecipient = () => ({
    addressLine1: "Seestrasse 10",
    postalCode: "6300",
    city: "Zug",
  });

  it("parses a valid profile with only required fields", () => {
    const result = CreateRecipientProfileInput.parse(validRecipient());
    expect(result.addressLine1).toBe("Seestrasse 10");
    expect(result.country).toBe("CH");
  });

  it("accepts nullable firstName and lastName", () => {
    const result = CreateRecipientProfileInput.parse({
      ...validRecipient(),
      firstName: null,
      lastName: null,
    });
    expect(result.firstName).toBeNull();
    expect(result.lastName).toBeNull();
  });

  it("rejects missing addressLine1", () => {
    expect(() => CreateRecipientProfileInput.parse({ postalCode: "6300", city: "Zug" })).toThrow();
  });

  it("rejects missing postalCode", () => {
    const r = validRecipient();
    delete (r as Record<string, unknown>).postalCode;
    expect(() => CreateRecipientProfileInput.parse(r)).toThrow();
  });

  it("rejects missing city", () => {
    const r = validRecipient();
    delete (r as Record<string, unknown>).city;
    expect(() => CreateRecipientProfileInput.parse(r)).toThrow();
  });

  it("accepts optional company and department", () => {
    const result = CreateRecipientProfileInput.parse({
      ...validRecipient(),
      company: "ACME AG",
      department: "Legal",
    });
    expect(result.company).toBe("ACME AG");
    expect(result.department).toBe("Legal");
  });
});
