import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/shared/utils/formatCurrency";

describe("formatCurrency", () => {
  it("formats a number as BRL currency", () => {
    expect(formatCurrency(1500)).toBe("R$ 1.500,00");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("R$ 0,00");
  });
});
