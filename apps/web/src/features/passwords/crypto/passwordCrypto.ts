import { deriveKey } from "@noctis/utils";

// ponytail: salt lives in localStorage, not a server-managed key-wrapping scheme.
// Fine for a single-user personal vault; upgrade to server-issued per-user salt if this ever becomes multi-device/multi-user.
const SALT_KEY = "noctis_vault_salt";

function getOrCreateSalt(): Uint8Array {
  const stored = window.localStorage.getItem(SALT_KEY);
  if (stored) return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  window.localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
  return salt;
}

export async function unlockVault(masterPassword: string): Promise<CryptoKey> {
  const salt = getOrCreateSalt();
  return deriveKey(masterPassword, salt);
}

export async function encryptSecret(
  key: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const buffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(buffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptSecret(key: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const cipherBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes as BufferSource },
    key,
    cipherBytes as BufferSource,
  );
  return new TextDecoder().decode(decrypted);
}
