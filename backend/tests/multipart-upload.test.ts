import { describe, expect, it } from "vitest";
import { parseUploadMultipartParts } from "../src/modules/files/multipart-upload.js";

describe("parseUploadMultipartParts", () => {
  it("captures kind even when it arrives after the file part", async () => {
    const result = await parseUploadMultipartParts(
      (async function* () {
        yield {
          type: "file" as const,
          fieldname: "file",
          filename: "notice.pdf",
          mimetype: "application/pdf",
          async toBuffer() {
            return Buffer.from("pdf");
          },
        };
        yield {
          type: "field" as const,
          fieldname: "kind",
          value: "attachment",
        };
      })(),
    );

    expect(result.kind).toBe("attachment");
    expect(result.fileName).toBe("notice.pdf");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.buffer?.toString()).toBe("pdf");
  });

  it("captures kind when it arrives before the file part", async () => {
    const result = await parseUploadMultipartParts(
      (async function* () {
        yield {
          type: "field" as const,
          fieldname: "kind",
          value: "signature",
        };
        yield {
          type: "file" as const,
          fieldname: "file",
          filename: "signature.png",
          mimetype: "image/png",
          async toBuffer() {
            return Buffer.from("png");
          },
        };
      })(),
    );

    expect(result.kind).toBe("signature");
    expect(result.fileName).toBe("signature.png");
    expect(result.mimeType).toBe("image/png");
    expect(result.buffer?.toString()).toBe("png");
  });

  it("rejects multiple files in one request", async () => {
    await expect(
      parseUploadMultipartParts(
        (async function* () {
          yield {
            type: "file" as const,
            fieldname: "file",
            filename: "first.pdf",
            mimetype: "application/pdf",
            async toBuffer() {
              return Buffer.from("first");
            },
          };
          yield {
            type: "file" as const,
            fieldname: "file",
            filename: "second.pdf",
            mimetype: "application/pdf",
            async toBuffer() {
              return Buffer.from("second");
            },
          };
        })(),
      ),
    ).rejects.toMatchObject({
      message: "Only one file can be uploaded at a time",
    });
  });
});
