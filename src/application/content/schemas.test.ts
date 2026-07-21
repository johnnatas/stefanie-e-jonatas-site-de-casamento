import { describe, expect, it } from "vitest";
import {
  settingsContentSchema,
  homeHeroContentSchema,
  homeMilestonePhotosContentSchema,
  homeTopicsContentSchema,
  tipsCerimoniaContentSchema,
  SITE_CONTENT_SLUGS,
  SITE_CONTENT_SCHEMAS,
} from "@/application/content/schemas";

describe("settingsContentSchema", () => {
  it("applies defaults matching today's hardcoded copy when parsing an empty object", () => {
    const result = settingsContentSchema.parse({});

    expect(result).toEqual({
      weddingDateIso: "2027-06-19T16:00:00-03:00",
      weddingLocationLabel: "Minas Gerais, Brasil",
    });
  });

  it("rejects an empty wedding date", () => {
    const result = settingsContentSchema.safeParse({ weddingDateIso: "", weddingLocationLabel: "x" });
    expect(result.success).toBe(false);
  });
});

describe("homeHeroContentSchema", () => {
  it("defaults to zero photos (fallback to 3 placeholder slides is a rendering concern)", () => {
    const result = homeHeroContentSchema.parse({});
    expect(result.photos).toEqual([]);
    expect(result.eyebrow).toBe("Estamos nos casando");
    expect(result.tagline).toBe("nas ditas linhas em que nos encontramos");
  });

  it("rejects more than 5 photos", () => {
    const result = homeHeroContentSchema.safeParse({ photos: ["a", "b", "c", "d", "e", "f"] });
    expect(result.success).toBe(false);
  });

  it("accepts 1 to 5 photos", () => {
    const result = homeHeroContentSchema.safeParse({ photos: ["a", "b"] });
    expect(result.success).toBe(true);
  });
});

describe("homeMilestonePhotosContentSchema", () => {
  it("defaults all three milestone photos to null", () => {
    const result = homeMilestonePhotosContentSchema.parse({});
    expect(result).toEqual({ beginning: null, proposal: null, wedding: null });
  });
});

describe("homeTopicsContentSchema", () => {
  it("defaults all 5 topics to today's hardcoded copy with null photos", () => {
    const result = homeTopicsContentSchema.parse({});

    expect(result.cerimonia).toEqual({
      title: "Cerimônia",
      description: "Horário, local e tudo sobre a celebração.",
      photo: null,
      address: null,
    });
    expect(result.presentes.title).toBe("Lista de presentes");
    expect(result.traje.title).toBe("Traje");
    expect(result.hospedagem.title).toBe("Hospedagem");
    expect(result.nossaHistoria.title).toBe("Nossa história");
  });

  it("rejects a topic missing its required title", () => {
    const result = homeTopicsContentSchema.safeParse({
      cerimonia: { description: "x", photo: null },
    });
    expect(result.success).toBe(false);
  });
});

describe("tipsCerimoniaContentSchema", () => {
  it("defaults to today's hardcoded copy", () => {
    const result = tipsCerimoniaContentSchema.parse({});

    expect(result.eyebrow).toBe("O grande dia");
    expect(result.title).toBe("Local e horário");
    expect(result.body).toContain("**16h**");
    expect(result.photo).toBeNull();
  });
});

describe("SITE_CONTENT_SLUGS / SITE_CONTENT_SCHEMAS", () => {
  it("has one schema per declared slug", () => {
    for (const slug of SITE_CONTENT_SLUGS) {
      expect(SITE_CONTENT_SCHEMAS[slug]).toBeDefined();
    }
  });
});
