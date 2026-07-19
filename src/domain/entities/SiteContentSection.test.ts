import { describe, expect, it } from "vitest";
import { SiteContentSection } from "@/domain/entities/SiteContentSection";
import { InvalidSiteContentError } from "@/domain/errors/DomainError";

describe("SiteContentSection", () => {
  it("creates a section with the given slug and content", () => {
    const section = SiteContentSection.create({ slug: "settings", content: { a: 1 } });

    expect(section.slug).toBe("settings");
    expect(section.content).toEqual({ a: 1 });
    expect(section.updatedAt).toBeInstanceOf(Date);
  });

  it("defaults updatedAt to now when not provided", () => {
    const before = new Date();
    const section = SiteContentSection.create({ slug: "settings", content: {} });
    const after = new Date();

    expect(section.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(section.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("rejects an empty slug", () => {
    expect(() => SiteContentSection.create({ slug: "", content: {} })).toThrow(InvalidSiteContentError);
  });
});
