import { describe, expect, it } from "vitest";
import { formatWeddingDateLabel } from "@/shared/utils/formatWeddingDateLabel";

describe("formatWeddingDateLabel", () => {
  it("formats an ISO datetime as a Portuguese long-form date", () => {
    expect(formatWeddingDateLabel("2027-06-19T16:00:00-03:00")).toBe("19 de junho de 2027");
  });

  it("formats a different month/day correctly", () => {
    expect(formatWeddingDateLabel("2028-01-01T12:00:00-03:00")).toBe("1 de janeiro de 2028");
  });

  it("is stable across a date that would shift under a naive UTC read near midnight", () => {
    expect(formatWeddingDateLabel("2027-12-31T23:30:00-03:00")).toBe("31 de dezembro de 2027");
  });
});
