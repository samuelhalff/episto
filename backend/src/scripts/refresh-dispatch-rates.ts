import { closeDb, getDb } from "../db/index.js";
import { loadEnv } from "../shared/config/index.js";
import { syncDispatchRateMatrix } from "../modules/dispatch/dispatch-rate-matrix-sync.service.js";

async function main(): Promise<void> {
  loadEnv();

  try {
    const result = await syncDispatchRateMatrix({ db: getDb() });
    console.log(
      JSON.stringify(
        {
          versionId: result.versionId,
          entryCount: result.entryCount,
          expiresAt: result.expiresAt.toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
