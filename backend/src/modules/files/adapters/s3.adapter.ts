import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  GetObjectCommand,
  ListObjectsV2Command,
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
    typeof (body as { transformToWebStream?: unknown }).transformToWebStream ===
      "function"
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

export async function downloadObjectBuffer(key: string): Promise<{
  buffer: Buffer;
  contentLength?: number;
  contentType?: string;
}> {
  const object = await downloadObject(key);
  const chunks: Buffer[] = [];

  for await (const chunk of object.body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return {
    buffer: Buffer.concat(chunks),
    ...(object.contentLength !== undefined
      ? { contentLength: object.contentLength }
      : {}),
    ...(object.contentType !== undefined ? { contentType: object.contentType } : {}),
  };
}

/**
 * Delete an object from S3-compatible storage.
 *
 * Unconditional: correct only when a row owns the key, because a row's key is
 * unique and stays that row's forever. For an object nothing owns, use
 * `deleteObjectIfUnchanged`.
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

export interface ObjectHead {
  lastModified: Date | null;
  eTag: string | null;
}

/**
 * What storage currently holds at this key, or null if nothing does.
 *
 * The `eTag` is what makes a delete conditional; the `lastModified` is how a
 * caller re-checks an age it read from a listing, which may be minutes stale.
 */
export async function headObject(key: string): Promise<ObjectHead | null> {
  const client = getS3Client();
  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return {
      lastModified: result.LastModified ?? null,
      eTag: result.ETag ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Delete an object only if it is still the one identified by `eTag`.
 *
 * Returns false when the precondition fails — someone rewrote the key after we
 * looked at it, so the object is no longer the orphan we decided to remove.
 * That is a normal outcome, not an error. S3 and MinIO both support `If-Match`
 * on DeleteObject.
 */
export async function deleteObjectIfUnchanged(
  key: string,
  eTag: string,
): Promise<boolean> {
  const client = getS3Client();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: key,
        IfMatch: eTag,
      }),
    );
    return true;
  } catch (err) {
    if (isPreconditionFailure(err)) return false;
    throw err;
  }
}

function isPreconditionFailure(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const candidate = err as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.name === "PreconditionFailed" || candidate.$metadata?.httpStatusCode === 412
  );
}

export interface StoredObject {
  key: string;
  lastModified: Date | null;
}

/**
 * List every object under a prefix. Used by the orphan sweep to reconcile the
 * bucket against `file_assets`: retention iterates rows, so an object with no
 * row is invisible to it and would otherwise be kept forever.
 */
export async function listObjects(prefix: string): Promise<StoredObject[]> {
  const client = getS3Client();
  const objects: StoredObject[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: getBucket(),
        Prefix: prefix,
        ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
      }),
    );
    for (const item of page.Contents ?? []) {
      if (item.Key) {
        objects.push({ key: item.Key, lastModified: item.LastModified ?? null });
      }
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
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

export async function checkBucketAccess(): Promise<void> {
  const client = getS3Client();
  await client.send(
    new HeadBucketCommand({
      Bucket: getBucket(),
    }),
  );
}
