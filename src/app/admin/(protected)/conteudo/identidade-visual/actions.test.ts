import { describe, expect, it, vi } from "vitest";
import { updateIdentidadeVisualAction } from "./actions";

const executeMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/infrastructure/composition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/infrastructure/composition")>();
  return {
    ...actual,
    createUpdateSiteContentUseCase: () => ({ execute: executeMock }),
  };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("updateIdentidadeVisualAction", () => {
  it("saves null for both logos when nothing was ever uploaded", async () => {
    const formData = new FormData();

    await updateIdentidadeVisualAction({ status: "idle" }, formData);

    expect(executeMock).toHaveBeenCalledWith("identidade-visual", { logoDark: null, logoLight: null });
  });

  it("keeps the current logo URLs when no new file is uploaded and nothing is marked for removal", async () => {
    const formData = new FormData();
    formData.set("logoDarkCurrentUrl", "https://storage.example.com/logo-dark.png");
    formData.set("logoLightCurrentUrl", "https://storage.example.com/logo-light.png");

    await updateIdentidadeVisualAction({ status: "idle" }, formData);

    expect(executeMock).toHaveBeenCalledWith("identidade-visual", {
      logoDark: "https://storage.example.com/logo-dark.png",
      logoLight: "https://storage.example.com/logo-light.png",
    });
  });

  it("clears a logo when its remove checkbox is checked", async () => {
    const formData = new FormData();
    formData.set("logoDarkCurrentUrl", "https://storage.example.com/logo-dark.png");
    formData.set("logoDarkRemove", "on");

    await updateIdentidadeVisualAction({ status: "idle" }, formData);

    expect(executeMock).toHaveBeenCalledWith("identidade-visual", { logoDark: null, logoLight: null });
  });
});
