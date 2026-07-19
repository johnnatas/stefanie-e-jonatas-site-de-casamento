import { describe, expect, it } from "vitest";
import { UpdateSiteContentUseCase } from "@/application/use-cases/content/UpdateSiteContentUseCase";
import { GetSiteContentUseCase } from "@/application/use-cases/content/GetSiteContentUseCase";
import { InMemorySiteContentRepository } from "@/application/testing/InMemorySiteContentRepository";

describe("UpdateSiteContentUseCase", () => {
  it("persists content that can be read back through GetSiteContentUseCase", async () => {
    const repository = new InMemorySiteContentRepository();
    const updateUseCase = new UpdateSiteContentUseCase(repository);
    const getUseCase = new GetSiteContentUseCase(repository);

    await updateUseCase.execute("settings", {
      weddingDateIso: "2028-01-01T12:00:00-03:00",
      weddingLocationLabel: "São Paulo, Brasil",
    });
    const result = await getUseCase.execute("settings");

    expect(result.weddingDateIso).toBe("2028-01-01T12:00:00-03:00");
    expect(result.weddingLocationLabel).toBe("São Paulo, Brasil");
  });

  it("rejects content that fails the slug's schema", async () => {
    const updateUseCase = new UpdateSiteContentUseCase(new InMemorySiteContentRepository());

    await expect(
      updateUseCase.execute("settings", { weddingDateIso: "", weddingLocationLabel: "" })
    ).rejects.toThrow();
  });
});
