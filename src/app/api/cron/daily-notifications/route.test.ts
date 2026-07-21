import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/infrastructure/composition", () => ({
  createSendReservationRemindersUseCase: vi.fn(() => ({ execute: vi.fn().mockResolvedValue(0) })),
  createSendGiftSuggestionRemindersUseCase: vi.fn(() => ({ execute: vi.fn().mockResolvedValue(0) })),
  createSendWeddingDayNotificationUseCase: vi.fn(() => ({ execute: vi.fn().mockResolvedValue(0) })),
  getSiteContentOrDefault: vi.fn().mockResolvedValue({ weddingDateIso: "2027-06-19T16:00:00-03:00" }),
}));

describe("GET /api/cron/daily-notifications", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  it("rejects requests without the correct CRON_SECRET", async () => {
    const { GET } = await import("@/app/api/cron/daily-notifications/route");
    const request = new NextRequest("http://localhost/api/cron/daily-notifications", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("rejects requests with no Authorization header at all", async () => {
    const { GET } = await import("@/app/api/cron/daily-notifications/route");
    const request = new NextRequest("http://localhost/api/cron/daily-notifications");

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
