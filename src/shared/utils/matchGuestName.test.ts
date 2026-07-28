import { describe, expect, it } from "vitest";
import { findBestGuestMatch, findGuestMatches } from "@/shared/utils/matchGuestName";

const GUESTS = [
  { id: "1", fullName: "João Pedro Almeida", nickname: "JP" },
  { id: "2", fullName: "Maria da Silva" },
  { id: "3", fullName: "Ana Beatriz Costa", nickname: "Bia" },
];

const GUESTS_WITH_SIMILAR_NAMES = [
  { id: "1", fullName: "João Pedro Almeida", nickname: "JP" },
  { id: "2", fullName: "Joana Souza" },
  { id: "3", fullName: "Jonatas Ferreira" },
  { id: "4", fullName: "Carla Nunes" },
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

describe("findGuestMatches", () => {
  it("lists every guest whose name plausibly matches, not just the single best", () => {
    const matches = findGuestMatches("jo", GUESTS_WITH_SIMILAR_NAMES);
    const ids = matches.map((guest) => guest.id);

    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).toContain("3");
    expect(ids).not.toContain("4");
  });

  it("ranks the closest match first", () => {
    const matches = findGuestMatches("joao", GUESTS_WITH_SIMILAR_NAMES);
    expect(matches[0]?.id).toBe("1");
  });

  it("returns an empty array for a query shorter than 2 characters", () => {
    expect(findGuestMatches("j", GUESTS)).toEqual([]);
    expect(findGuestMatches("", GUESTS)).toEqual([]);
  });

  it("returns an empty array when nothing is close enough", () => {
    expect(findGuestMatches("xyzxyzxyz", GUESTS)).toEqual([]);
  });

  it("respects the limit parameter", () => {
    const matches = findGuestMatches("jo", GUESTS_WITH_SIMILAR_NAMES, 2);
    expect(matches).toHaveLength(2);
  });

  it("returns each matching guest only once even if both name fields match", () => {
    const matches = findGuestMatches("jp", GUESTS);
    const ids = matches.map((guest) => guest.id);
    expect(ids.filter((id) => id === "1")).toHaveLength(1);
  });
});
