import { app } from "./index.js";
import { pool } from "./config/database.js";
import { parseRuntimeConfig } from "./config/environment.js";
import { createShutdownHandler } from "./server-shutdown.js";

const { PORT, SHUTDOWN_TIMEOUT_MS } = parseRuntimeConfig();

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});

const shutdown = createShutdownHandler(
  server,
  () => pool.end(),
  undefined,
  SHUTDOWN_TIMEOUT_MS
);
let shutdownResult: Promise<Awaited<ReturnType<typeof shutdown>>> | undefined;
let finalized = false;

function handleShutdownSignal() {
  shutdownResult ??= shutdown();

  void shutdownResult.then((result) => {
    if (!result.success) {
      process.exitCode = 1;
    }

    if (!finalized) {
      finalized = true;
      process.off("SIGTERM", handleShutdownSignal);
      process.off("SIGINT", handleShutdownSignal);
    }
  });
}

process.on("SIGTERM", handleShutdownSignal);
process.on("SIGINT", handleShutdownSignal);
