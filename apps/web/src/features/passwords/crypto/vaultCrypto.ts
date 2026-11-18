import type { VaultKeyMaterial, VaultSecret } from "@noctis/types";

/** A random vault key, wrapped by a key derived from the master password. A password change re-wraps it; a wrong password fails the authenticated unwrap. */

const KDF_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

/** Thrown when the master password does not unwrap the stored vault key. */
export class WrongMasterPasswordError extends Error {
  constructor() {
    super("Wrong master password");
    this.name = "WrongMasterPasswordError";
  }
}

/** Master password + salt → the wrapping key. Never used on item data. */
async function deriveMasterKey(
  masterPassword: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

/** Wraps `vaultKey` under a key derived from `masterPassword`, with a fresh salt and IV. */
async function wrapVaultKey(
  masterPassword: string,
  vaultKey: CryptoKey,
): Promise<VaultKeyMaterial> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const wrapIv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const masterKey = await deriveMasterKey(masterPassword, salt, KDF_ITERATIONS);

  const wrapped = await crypto.subtle.wrapKey("raw", vaultKey, masterKey, {
    name: "AES-GCM",
    iv: wrapIv as BufferSource,
  });

  return {
    salt: toBase64(salt),
    iterations: KDF_ITERATIONS,
    wrappedKey: toBase64(new Uint8Array(wrapped)),
    wrapIv: toBase64(wrapIv),
  };
}

/** First-run setup: a new vault key plus the material the server stores. Extractable only so it can be wrapped. */
export async function createVault(
  masterPassword: string,
): Promise<{ vaultKey: CryptoKey; material: VaultKeyMaterial }> {
  const vaultKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);

  return { vaultKey, material: await wrapVaultKey(masterPassword, vaultKey) };
}

/** Unwraps the stored vault key. Throws `WrongMasterPasswordError` if the password is wrong. */
export async function unlockVault(
  masterPassword: string,
  material: VaultKeyMaterial,
): Promise<CryptoKey> {
  const masterKey = await deriveMasterKey(
    masterPassword,
    fromBase64(material.salt),
    material.iterations,
  );

  try {
    return await crypto.subtle.unwrapKey(
      "raw",
      fromBase64(material.wrappedKey) as BufferSource,
      masterKey,
      { name: "AES-GCM", iv: fromBase64(material.wrapIv) as BufferSource },
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    throw new WrongMasterPasswordError();
  }
}

/** Re-wraps the same vault key under a new password; items are untouched. Re-unwraps from `material` for an extractable key. */
export async function rotateMasterPassword(
  currentPassword: string,
  newPassword: string,
  material: VaultKeyMaterial,
): Promise<VaultKeyMaterial> {
  const masterKey = await deriveMasterKey(
    currentPassword,
    fromBase64(material.salt),
    material.iterations,
  );

  let extractableVaultKey: CryptoKey;
  try {
    extractableVaultKey = await crypto.subtle.unwrapKey(
      "raw",
      fromBase64(material.wrappedKey) as BufferSource,
      masterKey,
      { name: "AES-GCM", iv: fromBase64(material.wrapIv) as BufferSource },
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  } catch {
    throw new WrongMasterPasswordError();
  }

  return wrapVaultKey(newPassword, extractableVaultKey);
}

export async function encryptSecret(
  vaultKey: CryptoKey,
  secret: VaultSecret,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded = new TextEncoder().encode(JSON.stringify(secret));
  const buffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    vaultKey,
    encoded,
  );

  return { ciphertext: toBase64(new Uint8Array(buffer)), iv: toBase64(iv) };
}

export async function decryptSecret(
  vaultKey: CryptoKey,
  ciphertext: string,
  iv: string,
): Promise<VaultSecret> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) as BufferSource },
    vaultKey,
    fromBase64(ciphertext) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as VaultSecret;
}
