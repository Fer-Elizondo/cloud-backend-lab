import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { createShutdownHandler } from "../server-shutdown.js";

afterEach(() => vi.useRealTimers());

describe("graceful shutdown", () => {
  it("closes HTTP before the pool when active requests finish within the limit", async () => {
    vi.useFakeTimers();
    const order: string[] = [];
    let completeServerClose: ((error?: Error) => void) | undefined;
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => {
        order.push("http");
        completeServerClose = callback;
        return {} as Server;
      }),
      closeAllConnections: vi.fn(),
    };
    const closePool = vi.fn(async () => { order.push("pool"); });
    const handler = createShutdownHandler(server, closePool, vi.fn(), 100);

    const result = handler();
    completeServerClose?.();
    await expect(result).resolves.toEqual({ success: true });

    expect(order).toEqual(["http", "pool"]);
    expect(server.closeAllConnections).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("force-closes HTTP connections that exceed the configured limit", async () => {
    vi.useFakeTimers();
    const logs: string[] = [];
    let completeServerClose: ((error?: Error) => void) | undefined;
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => {
        completeServerClose = callback;
        return {} as Server;
      }),
      closeAllConnections: vi.fn(() => completeServerClose?.()),
    };
    const closePool = vi.fn(async () => {});
    const handler = createShutdownHandler(server, closePool, (entry) => logs.push(entry), 25);

    const result = handler();
    await vi.advanceTimersByTimeAsync(25);

    await expect(result).resolves.toEqual({ success: false });
    expect(server.closeAllConnections).toHaveBeenCalledOnce();
    expect(closePool).toHaveBeenCalledOnce();
    expect(logs.join(" ")).toContain("graceful_shutdown_timeout");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("tries to close the pool after an HTTP close error", async () => {
    let completeServerClose: ((error?: Error) => void) | undefined;
    const logs: string[] = [];
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => {
        completeServerClose = callback;
        return {} as Server;
      }),
      closeAllConnections: vi.fn(),
    };
    const closePool = vi.fn(async () => {});
    const handler = createShutdownHandler(server, closePool, (entry) => logs.push(entry), 100);

    const result = handler();
    completeServerClose?.(new Error("sensitive-http-message"));

    await expect(result).resolves.toEqual({ success: false });
    expect(closePool).toHaveBeenCalledOnce();
    expect(logs.join(" ")).not.toContain("sensitive-http-message");
  });

  it("reports a pool close failure without exposing its error message", async () => {
    const logs: string[] = [];
    const handler = createShutdownHandler(
      { close: (callback) => callback(), closeAllConnections: vi.fn() },
      async () => { throw new Error("database-password-must-not-be-logged"); },
      (entry) => logs.push(entry),
      100
    );

    await expect(handler()).resolves.toEqual({ success: false });
    expect(logs.join(" ")).not.toContain("database-password-must-not-be-logged");
  });

  it("shares one in-flight shutdown for repeated calls", async () => {
    let completeServerClose: ((error?: Error) => void) | undefined;
    const server = {
      close: vi.fn((callback: (error?: Error) => void) => {
        completeServerClose = callback;
        return {} as Server;
      }),
      closeAllConnections: vi.fn(),
    };
    const closePool = vi.fn(async () => {});
    const handler = createShutdownHandler(server, closePool, vi.fn(), 100);

    const first = handler();
    const second = handler();
    expect(second).toBe(first);
    expect(server.close).toHaveBeenCalledOnce();

    completeServerClose?.();
    await expect(first).resolves.toEqual({ success: true });
    expect(closePool).toHaveBeenCalledOnce();
  });

  it("does not log arbitrary error details", async () => {
    const logs: string[] = [];
    const handler = createShutdownHandler(
      {
        close: (callback) => callback(new Error("token-and-password-value")),
        closeAllConnections: vi.fn(),
      },
      async () => {},
      (entry) => logs.push(entry),
      100
    );

    await handler();
    expect(logs.join(" ")).not.toContain("token-and-password-value");
  });
});
