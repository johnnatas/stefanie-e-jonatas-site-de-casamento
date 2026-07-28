import { describe, expect, it } from "vitest";
import {
  settingsContentSchema,
  homeHeroContentSchema,
  homeGalleryContentSchema,
  homeTopicsContentSchema,
  tipsCerimoniaContentSchema,
  tipsTrajeContentSchema,
  tipsHospedagemContentSchema,
  presentesContentSchema,
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

describe("homeGalleryContentSchema", () => {
  it("defaults to an empty gallery", () => {
    const result = homeGalleryContentSchema.parse({});
    expect(result).toEqual({ items: [] });
  });

  it("accepts a mix of photo and video items", () => {
    const result = homeGalleryContentSchema.safeParse({
      items: [
        { url: "https://example.com/a.jpg", type: "photo" },
        { url: "https://example.com/b.mp4", type: "video" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an item with an invalid type", () => {
    const result = homeGalleryContentSchema.safeParse({
      items: [{ url: "https://example.com/a.jpg", type: "gif" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 items", () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ url: `https://example.com/${i}.jpg`, type: "photo" }));
    const result = homeGalleryContentSchema.safeParse({ items });
    expect(result.success).toBe(false);
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
  it("defaults to the reference copy with no event details or routes", () => {
    const result = tipsCerimoniaContentSchema.parse({});

    expect(result.title).toBe("Informações sobre o grande dia!");
    expect(result.photo).toBeNull();
    expect(result.eventDateLabel).toBeNull();
    expect(result.eventTimeLabel).toBeNull();
    expect(result.eventVenueLabel).toBeNull();
    expect(result.eventAddress).toBeNull();
    expect(result.routes).toEqual([]);
  });

  it("strips legacy eyebrow/body keys from stored content", () => {
    const result = tipsCerimoniaContentSchema.parse({ eyebrow: "x", body: "y" });
    expect(result).not.toHaveProperty("eyebrow");
    expect(result).not.toHaveProperty("body");
  });

  it("accepts event details (incl. venue) and a list of routes", () => {
    const result = tipsCerimoniaContentSchema.safeParse({
      eventDateLabel: "29 de junho de 2027",
      eventTimeLabel: "A realizar-se às 16h",
      eventVenueLabel: "Cerimônia e recepção — Ville La Rochelle",
      eventAddress: "Estrada Municipal do Bairro Caioçara 1100, Jarinu - SP",
      routes: [
        { originLabel: "Para quem vem de SP Zona Sul", instructions: "1. Pela **Via Anhanguera**...", mapUrl: "https://maps.google.com/x" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a route missing required fields", () => {
    const result = tipsCerimoniaContentSchema.safeParse({ routes: [{ originLabel: "Vindo de BH" }] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 routes", () => {
    const routes = Array.from({ length: 11 }, (_, i) => ({
      originLabel: `Origem ${i}`,
      instructions: "Siga em frente.",
      mapUrl: null,
    }));
    const result = tipsCerimoniaContentSchema.safeParse({ routes });
    expect(result.success).toBe(false);
  });
});

describe("tipsTrajeContentSchema", () => {
  it("defaults to the reference copy with two null Pinterest boards", () => {
    const result = tipsTrajeContentSchema.parse({});

    expect(result.title).toBe("Convidados, preparem suas vestimentas!");
    expect(result.dressCodeName).toBe("Passeio completo");
    expect(result.body).toContain("inverno");
    expect(result.pinterestHimUrl).toBeNull();
    expect(result.pinterestHerUrl).toBeNull();
  });

  it("strips legacy forHim/forHer/pinterestBoardUrl keys", () => {
    const result = tipsTrajeContentSchema.parse({ forHim: "a", forHer: "b", pinterestBoardUrl: "c" });
    expect(result).not.toHaveProperty("forHim");
    expect(result).not.toHaveProperty("forHer");
    expect(result).not.toHaveProperty("pinterestBoardUrl");
  });

  it("accepts two Pinterest board URLs", () => {
    const result = tipsTrajeContentSchema.safeParse({
      pinterestHimUrl: "https://www.pinterest.com/stefanie/ele",
      pinterestHerUrl: "https://www.pinterest.com/stefanie/ela",
    });
    expect(result.success).toBe(true);
  });
});

describe("tipsHospedagemContentSchema", () => {
  it("defaults to the reference copy with empty lists, no map, and the boilerplate disclaimer", () => {
    const result = tipsHospedagemContentSchema.parse({});

    expect(result.title).toBe("Dicas de hospedagem e locomoção");
    expect(result.mapAddress).toBeNull();
    expect(result.distances).toEqual([]);
    expect(result.hotels).toEqual([]);
    expect(result.airports).toEqual([]);
    expect(result.disclaimer).toBe("Não temos vínculo, parceria ou comissão com as indicações acima.");
  });

  it("accepts a map address, distances, hotels, and airports", () => {
    const result = tipsHospedagemContentSchema.safeParse({
      mapAddress: "Ville La Rochelle, Jarinu - SP",
      distances: [{ label: "São Paulo", km: "75 km" }],
      hotels: [{ name: "La Maison Caiçara", distanceLabel: "500m", url: "https://example.com" }],
      airports: [{ name: "Viracopos", distanceLabel: "69,5 km", driveTimeLabel: "1h10" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a hotel entry missing its required name", () => {
    const result = tipsHospedagemContentSchema.safeParse({ hotels: [{ distanceLabel: "500m" }] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 15 hotels", () => {
    const hotels = Array.from({ length: 16 }, (_, i) => ({ name: `Hotel ${i}`, distanceLabel: null, url: null }));
    const result = tipsHospedagemContentSchema.safeParse({ hotels });
    expect(result.success).toBe(false);
  });

  it("rejects more than 6 airports", () => {
    const airports = Array.from({ length: 7 }, (_, i) => ({ name: `Aeroporto ${i}`, distanceLabel: null, driveTimeLabel: null }));
    const result = tipsHospedagemContentSchema.safeParse({ airports });
    expect(result.success).toBe(false);
  });
});

describe("presentesContentSchema", () => {
  it("defaults to no background image", () => {
    const result = presentesContentSchema.parse({});
    expect(result).toEqual({ backgroundImage: null });
  });

  it("accepts a non-empty background image URL", () => {
    const result = presentesContentSchema.safeParse({ backgroundImage: "https://example.com/bg.jpg" });
    expect(result.success).toBe(true);
    expect(result.data?.backgroundImage).toBe("https://example.com/bg.jpg");
  });

  it("rejects an empty-string background image", () => {
    const result = presentesContentSchema.safeParse({ backgroundImage: "" });
    expect(result.success).toBe(false);
  });
});

describe("SITE_CONTENT_SLUGS / SITE_CONTENT_SCHEMAS", () => {
  it("has one schema per declared slug", () => {
    for (const slug of SITE_CONTENT_SLUGS) {
      expect(SITE_CONTENT_SCHEMAS[slug]).toBeDefined();
    }
  });
});
