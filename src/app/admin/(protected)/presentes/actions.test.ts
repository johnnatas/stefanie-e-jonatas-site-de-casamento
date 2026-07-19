import { describe, expect, it } from "vitest";
import { upsertGiftAction } from "./actions";

describe("upsertGiftAction", () => {
  it("returns an error state without saving when no photo is provided or already on file", async () => {
    const formData = new FormData();
    formData.set("name", "Jogo de panelas");
    formData.set("description", "Um belo jogo de panelas antiaderentes.");
    formData.set("price", "250");
    formData.set("category", "Cozinha");

    const result = await upsertGiftAction({ status: "idle" }, formData);

    expect(result).toEqual({ status: "error", message: "Selecione uma foto para o presente." });
  });
});
