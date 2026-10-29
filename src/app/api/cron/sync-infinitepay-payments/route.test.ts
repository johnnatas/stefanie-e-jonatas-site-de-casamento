import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executeMock = vi.fn().mockResolvedValue({ checked: 2, updated: 1, errors: [] });

vi.mock("@/infrastructure/composition", () => ({
  createSyncInfinitePayPaymentsUseCase: vi.fn(() => ({ execute: executeMock })),
}));

describe("GET /api/cron/sync-infinitepay-payments", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  it("rejects requests without the correct CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/sync-infinitepay-payments/route");
    const request = new NextRequest("http://localhost/api/cron/sync-infinitepay-payments", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejects requests with no Authorization header at all", async () => {
    const { GET } = await import("@/app/api/cron/sync-infinitepay-payments/route");
    const request = new NextRequest("http://localhost/api/cron/sync-infinitepay-payments");

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("runs the sync use case and returns its result when authorized", async () => {
    const { GET } = await import("@/app/api/cron/sync-infinitepay-payments/route");
    const request = new NextRequest("http://localhost/api/cron/sync-infinitepay-payments", {
      headers: { authorization: "Bearer test-secret" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ checked: 2, updated: 1, errors: [] });
    expect(executeMock).toHaveBeenCalled();
  });

  it("returns a 500 error when the sync use case throws", async () => {
    executeMock.mockRejectedValueOnce(new Error("boom"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = await import("@/app/api/cron/sync-infinitepay-payments/route");
    const request = new NextRequest("http://localhost/api/cron/sync-infinitepay-payments", {
      headers: { authorization: "Bearer test-secret" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Internal error" });

    consoleErrorSpy.mockRestore();
  });
});
