import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEY_LENGTH = 64;

function decodeHash(passwordHash: string) {
  const [salt, derivedKey] = passwordHash.split(":");

  if (!salt || !derivedKey) {
    throw new Error("Stored password hash is invalid.");
  }

  return {
    salt,
    derivedKey,
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");

  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const { salt, derivedKey } = decodeHash(passwordHash);
  const expectedBuffer = Buffer.from(derivedKey, "hex");
  const suppliedBuffer = scryptSync(password, salt, SCRYPT_KEY_LENGTH);

  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}
