import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { env } from "../../../shared/config/index.js";

let _client: S3Client | undefined;

function getS3Client(): S3Client {
  if (_client) return _client;
  const config = env();
  _client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY,
      secretAccessKey: config.S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO compatibility
  });
  return _client;
}

function getBucket(): string {
  return env().S3_BUCKET;
}

/**
 * Upload a file buffer to S3-compatible object storage.
 */
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
    }),
  );
}

/**
 * Generate a time-limited presigned GET URL for file download.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const client = getS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
    { expiresIn: expiresInSeconds },
  );
}

type ObjectDownload = {
  body: Readable;
  contentLength?: number;
  contentType?: string;
  eTag?: string;
  lastModified?: Date;
};

function toNodeReadable(body: unknown): Readable {
  if (body instanceof Readable) return body;

  if (
    body &&
    typeof body === "object" &&
    "transformToWebStream" in body &&
    typeof (body as { transformToWebStream?: unknown }).transformToWebStream === "function"
  ) {
    const webStream = (
      body as { transformToWebStream: () => globalThis.ReadableStream<Uint8Array> }
    ).transformToWebStream();
    return Readable.fromWeb(webStream);
  }

  throw new Error("S3 object body is not a readable stream");
}

/**
 * Download an object from S3-compatible storage as a Node.js stream.
 */
export async function downloadObject(key: string): Promise<ObjectDownload> {
  const client = getS3Client();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );

  if (!result.Body) {
    throw new Error(`S3 object ${key} returned an empty body`);
  }

  const object: ObjectDownload = {
    body: toNodeReadable(result.Body),
  };

  if (result.ContentLength !== undefined) {
    object.contentLength = result.ContentLength;
  }
  if (result.ContentType !== undefined) {
    object.contentType = result.ContentType;
  }
  if (result.ETag !== undefined) {
    object.eTag = result.ETag;
  }
  if (result.LastModified !== undefined) {
    object.lastModified = result.LastModified;
  }

  return object;
}

/**
 * Delete an object from S3-compatible storage.
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}

/**
 * Check if an object exists in storage.
 */
export async function objectExists(key: string): Promise<boolean> {
  const client = getS3Client();
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: getBucket(),
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
