import type { Server } from "node:http";

type ShutdownLogger = (entry: string) => void;

export interface ShutdownResult {
  success: boolean;
}

const safeErrorTypes = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ReferenceError",
  "AggregateError",
  "ZodError",
  "DatabaseError",
  "ConnectionError",
]);

function safeErrorLog(component: string, error: unknown, logger: ShutdownLogger) {
  const candidateName = error instanceof Error ? error.name : "UnknownError";
  const errorType = safeErrorTypes.has(candidateName) ? candidateName : "UnknownError";

  try {
    logger(JSON.stringify({
      event: "graceful_shutdown_error",
      component,
      errorType,
    }));
  } catch {
    // Logging failures must not prevent the remaining shutdown phases.
  }
}

function safeTimeoutLog(logger: ShutdownLogger) {
  try {
    logger(JSON.stringify({
      event: "graceful_shutdown_timeout",
      component: "http_server",
    }));
  } catch {
    // Logging failures must not prevent the remaining shutdown phases.
  }
}

function closeHttpServer(
  server: Pick<Server, "close" | "closeAllConnections">,
  timeoutMs: number,
  logger: ShutdownLogger
): Promise<boolean> {
  let timeout: NodeJS.Timeout | undefined;

  const closeResult = new Promise<boolean>((resolve) => {
    try {
      server.close((error) => {
        if (error) {
          safeErrorLog("http_server", error, logger);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (error) {
      safeErrorLog("http_server", error, logger);
      resolve(false);
    }
  });

  const timeoutResult = new Promise<false>((resolve) => {
    timeout = setTimeout(() => {
      safeTimeoutLog(logger);
      resolve(false);
      try {
        server.closeAllConnections();
      } catch (error) {
        safeErrorLog("http_server", error, logger);
      }
    }, timeoutMs);
    timeout.unref();
  });

  return Promise.race([closeResult, timeoutResult]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export function createShutdownHandler(
  server: Pick<Server, "close" | "closeAllConnections">,
  closePool: () => Promise<void>,
  logger: ShutdownLogger = (entry) => console.error(entry),
  timeoutMs = 5000
): () => Promise<ShutdownResult> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError("Shutdown timeout must be a positive integer");
  }

  let shutdownPromise: Promise<ShutdownResult> | undefined;

  return () => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      let success = await closeHttpServer(server, timeoutMs, logger);

      try {
        await closePool();
      } catch (error) {
        success = false;
        safeErrorLog("database_pool", error, logger);
      }

      return { success };
    })();

    return shutdownPromise;
  };
}
