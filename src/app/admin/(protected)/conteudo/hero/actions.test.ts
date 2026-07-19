import { describe, expect, it } from "vitest";
import { updateHomeHeroAction } from "./actions";

describe("updateHomeHeroAction", () => {
  it("returns an error state without saving when no photos are provided", async () => {
    const formData = new FormData();
    formData.set("eyebrow", "Estamos nos casando");
    formData.set("tagline", "nas ditas linhas em que nos encontramos");

    const result = await updateHomeHeroAction({ status: "idle" }, formData);

    expect(result).toEqual({ status: "error", message: "Adicione pelo menos uma foto." });
  });

  it("returns an error state when a required field is missing", async () => {
    const formData = new FormData();
    formData.set("tagline", "nas ditas linhas em que nos encontramos");

    const result = await updateHomeHeroAction({ status: "idle" }, formData);

    expect(result).toEqual({ status: "error", message: "Verifique os campos do formulário." });
  });
});
