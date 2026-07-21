import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashSecretKey(secretKey: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secretKey, salt, KEY_LENGTH).toString("hex");
  return { hash, salt };
}

export function verifySecretKeyHash(candidate: string, hash: string, salt: string): boolean {
  const candidateHash = scryptSync(candidate, salt, KEY_LENGTH);
  const storedHash = Buffer.from(hash, "hex");

  if (candidateHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, storedHash);
}
