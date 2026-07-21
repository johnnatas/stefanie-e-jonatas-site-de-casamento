import { describe, expect, it } from "vitest";
import {
  canReserveForLater,
  latestReservableDate,
  parseExpectedPaymentDateEndOfDay,
  RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING,
} from "@/shared/utils/giftReservationWindow";

describe("giftReservationWindow", () => {
  it("computes the latest reservable date as 30 days before the wedding", () => {
    const weddingDate = new Date("2027-06-19T16:00:00-03:00");

    const result = latestReservableDate(weddingDate);

    expect(result.getTime()).toBe(
      weddingDate.getTime() - RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING * 24 * 60 * 60 * 1000
    );
  });

  it("allows reserving when more than 30 days remain before the wedding", () => {
    const weddingDate = new Date("2027-06-19T16:00:00-03:00");
    const now = new Date("2027-01-01T12:00:00-03:00");

    expect(canReserveForLater(weddingDate, now)).toBe(true);
  });

  it("blocks reserving when fewer than 30 days remain before the wedding", () => {
    const weddingDate = new Date("2027-06-19T16:00:00-03:00");
    const now = new Date("2027-06-01T12:00:00-03:00");

    expect(canReserveForLater(weddingDate, now)).toBe(false);
  });

  it("parses a date-only string as the end of that day in Brasília time", () => {
    const result = parseExpectedPaymentDateEndOfDay("2027-05-01");

    expect(result.toISOString()).toBe(new Date("2027-05-01T23:59:59-03:00").toISOString());
  });
});
