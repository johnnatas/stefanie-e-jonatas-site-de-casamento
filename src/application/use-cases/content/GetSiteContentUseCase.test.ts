import { describe, expect, it } from "vitest";
import { GetSiteContentUseCase } from "@/application/use-cases/content/GetSiteContentUseCase";
import { InMemorySiteContentRepository } from "@/application/testing/InMemorySiteContentRepository";

describe("GetSiteContentUseCase", () => {
  it("returns the schema's defaults when no row exists for the slug", async () => {
    const useCase = new GetSiteContentUseCase(new InMemorySiteContentRepository());

    const result = await useCase.execute("settings");

    expect(result).toEqual({
      weddingDateIso: "2027-06-19T16:00:00-03:00",
      weddingLocationLabel: "Minas Gerais, Brasil",
    });
  });

  it("returns the stored content when a row exists", async () => {
    const repository = new InMemorySiteContentRepository();
    await repository.upsert("settings", {
      weddingDateIso: "2028-01-01T12:00:00-03:00",
      weddingLocationLabel: "São Paulo, Brasil",
    });
    const useCase = new GetSiteContentUseCase(repository);

    const result = await useCase.execute("settings");

    expect(result.weddingDateIso).toBe("2028-01-01T12:00:00-03:00");
    expect(result.weddingLocationLabel).toBe("São Paulo, Brasil");
  });
});
