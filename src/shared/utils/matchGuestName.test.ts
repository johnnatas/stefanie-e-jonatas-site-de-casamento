import { describe, expect, it } from "vitest";
import { findBestGuestMatch } from "@/shared/utils/matchGuestName";

const GUESTS = [
  { id: "1", fullName: "João Pedro Almeida", nickname: "JP" },
  { id: "2", fullName: "Maria da Silva" },
  { id: "3", fullName: "Ana Beatriz Costa", nickname: "Bia" },
];

describe("findBestGuestMatch", () => {
  it("matches by exact full name, case insensitive", () => {
    const match = findBestGuestMatch("MARIA DA SILVA", GUESTS);
    expect(match?.id).toBe("2");
  });

  it("matches by nickname", () => {
    const match = findBestGuestMatch("bia", GUESTS);
    expect(match?.id).toBe("3");
  });

  it("matches a prefix of the first name", () => {
    const match = findBestGuestMatch("jo", GUESTS);
    expect(match?.id).toBe("1");
  });

  it("ignores accents", () => {
    const match = findBestGuestMatch("joao", GUESTS);
    expect(match?.id).toBe("1");
  });

  it("tolerates a small typo in a single word", () => {
    const match = findBestGuestMatch("marya", GUESTS);
    expect(match?.id).toBe("2");
  });

  it("returns null when nothing is close enough", () => {
    const match = findBestGuestMatch("xyzxyzxyz", GUESTS);
    expect(match).toBeNull();
  });

  it("returns null for a query shorter than 2 characters", () => {
    expect(findBestGuestMatch("j", GUESTS)).toBeNull();
    expect(findBestGuestMatch("", GUESTS)).toBeNull();
  });
});
