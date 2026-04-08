import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import { env } from "./config/index.js";
import { createLogger } from "./logging/index.js";

const logger = createLogger("redis-lock");
const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

let redisClient: Redis | undefined;

function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(env().REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  redisClient.on("error", (err) => {
    logger.error({ err }, "Redis lock client error");
  });

  return redisClient;
}

export interface RedisLock {
  release: () => Promise<void>;
}

export async function acquireRedisLock(
  key: string,
  ttlMs: number,
): Promise<RedisLock | null> {
  const token = randomUUID();
  const result = await getRedisClient().set(key, token, "PX", ttlMs, "NX");
  if (result !== "OK") {
    return null;
  }

  return {
    release: async () => {
      await getRedisClient().eval(RELEASE_LOCK_LUA, 1, key, token);
    },
  };
}

export async function closeRedisLockClient(): Promise<void> {
  if (!redisClient) {
    return;
  }

  await redisClient.quit();
  redisClient = undefined;
}
