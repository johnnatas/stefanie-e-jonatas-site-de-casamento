import { describe, expect, it } from "vitest";
import { daysBetweenBrasiliaDates, formatBrasiliaDate } from "@/shared/utils/brasiliaCalendarDays";

describe("daysBetweenBrasiliaDates", () => {
  it("returns 0 for the same calendar day", () => {
    const from = new Date("2027-05-01T09:00:00-03:00");
    const to = new Date("2027-05-01T23:00:00-03:00");

    expect(daysBetweenBrasiliaDates(from, to)).toBe(0);
  });

  it("returns a positive count when 'to' is in the future", () => {
    const from = new Date("2027-05-01T12:00:00-03:00");
    const to = new Date("2027-05-11T12:00:00-03:00");

    expect(daysBetweenBrasiliaDates(from, to)).toBe(10);
  });

  it("returns a negative count when 'to' is in the past", () => {
    const from = new Date("2027-05-11T12:00:00-03:00");
    const to = new Date("2027-05-01T12:00:00-03:00");

    expect(daysBetweenBrasiliaDates(from, to)).toBe(-10);
  });

  it("counts correctly across a month boundary", () => {
    const from = new Date("2027-04-25T12:00:00-03:00");
    const to = new Date("2027-05-05T12:00:00-03:00");

    expect(daysBetweenBrasiliaDates(from, to)).toBe(10);
  });
});

describe("formatBrasiliaDate", () => {
  it("formats a date as dd/mm/yyyy in Brasília time", () => {
    expect(formatBrasiliaDate(new Date("2027-05-01T23:59:59-03:00"))).toBe("01/05/2027");
  });
});
