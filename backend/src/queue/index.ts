import { Queue, Worker } from "bullmq";
import type { Job, ConnectionOptions } from "bullmq";
import { env } from "../shared/config/index.js";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

let _connection: ConnectionOptions | undefined;

function getConnection(): ConnectionOptions {
  if (_connection) return _connection;
  const url = new URL(env().REDIS_URL);
  _connection = {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
  return _connection;
}

// ---------------------------------------------------------------------------
// Queue definitions (from backend-build-pack.md)
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  RENDER_PDF: "render-pdf",
  SUBMIT_DISPATCH: "submit-dispatch",
  RECONCILE_DISPATCH: "reconcile-ambiguous-dispatch",
  SEND_EMAIL: "send-transactional-email",
  CLEANUP_ASSETS: "cleanup-expired-assets",
} as const;

// ---------------------------------------------------------------------------
// Queue factory
// ---------------------------------------------------------------------------

const _queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  const existing = _queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
  _queues.set(name, queue);
  return queue;
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createWorker<T = unknown>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  opts?: { concurrency?: number },
): Worker<T> {
  return new Worker<T>(queueName, processor, {
    connection: getConnection(),
    concurrency: opts?.concurrency ?? 1,
  });
}

// ---------------------------------------------------------------------------
// Job type definitions
// ---------------------------------------------------------------------------

export interface RenderPdfJob {
  snapshotId: string;
  draftId: string;
}

export interface SubmitDispatchJob {
  draftId: string;
  snapshotId: string;
  paymentId: string;
}

export interface ReconcileDispatchJob {
  dispatchAttemptId: string;
}

export interface SendEmailJob {
  to: string;
  template: string;
  locale: string;
  data: Record<string, unknown>;
}

export interface CleanupAssetsJob {
  batchSize: number;
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

export async function closeAllQueues(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const queue of _queues.values()) {
    promises.push(queue.close());
  }
  await Promise.all(promises);
  _queues.clear();
}
