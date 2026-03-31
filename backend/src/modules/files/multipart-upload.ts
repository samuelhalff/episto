import { validationError } from "../../shared/errors/index.js";

type UploadFieldPart = {
  type: "field";
  fieldname: string;
  value: unknown;
};

type UploadFilePart = {
  type: "file";
  fieldname: string;
  filename?: string;
  mimetype?: string;
  toBuffer: () => Promise<Buffer>;
};

type UploadPart = UploadFieldPart | UploadFilePart;

export type ParsedUploadMultipart = {
  buffer: Buffer | null;
  fileName: string;
  mimeType: string;
  kind: string | undefined;
};

export async function parseUploadMultipartParts(
  parts: AsyncIterable<UploadPart>,
): Promise<ParsedUploadMultipart> {
  let buffer: Buffer | null = null;
  let fileName = "untitled";
  let mimeType = "application/octet-stream";
  let kind: string | undefined;

  for await (const part of parts) {
    if (part.type === "file") {
      if (buffer) {
        throw validationError("Only one file can be uploaded at a time", [
          { field: "file", message: "Upload a single file per request" },
        ]);
      }

      buffer = await part.toBuffer();
      fileName = part.filename ?? fileName;
      mimeType = part.mimetype ?? mimeType;
      continue;
    }

    if (part.fieldname === "kind" && typeof part.value === "string") {
      kind = part.value;
    }
  }

  return { buffer, fileName, mimeType, kind };
}
