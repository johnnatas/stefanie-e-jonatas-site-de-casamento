import { describe, expect, it } from "vitest";
import { hashSecretKey, verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";

describe("secretKeyHashing", () => {
  it("verifies a correct candidate against its own hash", () => {
    const { hash, salt } = hashSecretKey("minha-chave-secreta");

    expect(verifySecretKeyHash("minha-chave-secreta", hash, salt)).toBe(true);
  });

  it("rejects an incorrect candidate", () => {
    const { hash, salt } = hashSecretKey("minha-chave-secreta");

    expect(verifySecretKeyHash("chave-errada", hash, salt)).toBe(false);
  });

  it("produces a different hash each time due to a random salt", () => {
    const first = hashSecretKey("mesma-chave");
    const second = hashSecretKey("mesma-chave");

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it("never stores the plaintext key in the hash or salt", () => {
    const { hash, salt } = hashSecretKey("segredo-visivel");

    expect(hash).not.toContain("segredo-visivel");
    expect(salt).not.toContain("segredo-visivel");
  });
});
