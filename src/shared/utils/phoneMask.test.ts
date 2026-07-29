import { describe, expect, it } from "vitest";
import { formatBrazilianPhoneMask, normalizePhoneToE164 } from "@/shared/utils/phoneMask";

describe("formatBrazilianPhoneMask", () => {
  it("formats digits incrementally as the user types", () => {
    expect(formatBrazilianPhoneMask("1")).toBe("(1");
    expect(formatBrazilianPhoneMask("11")).toBe("(11)");
    expect(formatBrazilianPhoneMask("119876")).toBe("(11)9876");
    expect(formatBrazilianPhoneMask("11987654321")).toBe("(11)98765-4321");
  });

  it("ignores non-digit characters and caps at 11 digits", () => {
    expect(formatBrazilianPhoneMask("(11) 98765-4321-extra")).toBe("(11)98765-4321");
  });

  it("returns an empty string for empty input", () => {
    expect(formatBrazilianPhoneMask("")).toBe("");
  });
});

describe("normalizePhoneToE164", () => {
  it("converts a fully-filled mask to +55 E.164", () => {
    expect(normalizePhoneToE164("(11)98765-4321")).toBe("+5511987654321");
  });

  it("returns null for empty input", () => {
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164(undefined as unknown as string)).toBeNull();
  });

  it("returns null for a partially-filled or malformed number", () => {
    expect(normalizePhoneToE164("(11)9876")).toBeNull();
    expect(normalizePhoneToE164("not a phone")).toBeNull();
  });
});
