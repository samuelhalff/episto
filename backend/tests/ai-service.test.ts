import { describe, expect, it } from "vitest";
import { parseJsonResponse } from "../src/modules/ai/ai.service.js";

describe("parseJsonResponse", () => {
  it("parses plain JSON objects", () => {
    expect(parseJsonResponse<{ foo: string }>('{"foo":"bar"}')).toEqual({ foo: "bar" });
  });

  it("parses JSON wrapped in markdown code fences", () => {
    expect(
      parseJsonResponse<{ recipientCompany: string }>(
        '```json\n{"recipientCompany":"Swisscom"}\n```',
      ),
    ).toEqual({ recipientCompany: "Swisscom" });
  });

  it("parses JSON embedded in surrounding text", () => {
    expect(
      parseJsonResponse<{ ready: boolean; question: string }>(
        'Here is the result:\n{"ready":false,"question":"What service do you want to cancel?"}',
      ),
    ).toEqual({ ready: false, question: "What service do you want to cancel?" });
  });
});
