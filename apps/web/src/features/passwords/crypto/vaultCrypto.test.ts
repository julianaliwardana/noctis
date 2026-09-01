// Run: node --experimental-strip-types --test apps/web/src/features/passwords/crypto/vaultCrypto.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  createVault,
  decryptSecret,
  encryptSecret,
  rotateMasterPassword,
  unlockVault,
  WrongMasterPasswordError,
} from "./vaultCrypto.ts";

const secret = {
  name: "GitHub",
  url: "https://github.com",
  username: "julian",
  password: "hunter2",
  notes: "recovery codes in the drawer",
};

test("round-trips a secret through setup, unlock and decrypt", async () => {
  const { vaultKey, material } = await createVault("correct horse");
  const { ciphertext, iv } = await encryptSecret(vaultKey, secret);

  const unlocked = await unlockVault("correct horse", material);
  assert.deepEqual(await decryptSecret(unlocked, ciphertext, iv), secret);
});

test("rejects the wrong master password instead of silently unlocking", async () => {
  const { material } = await createVault("correct horse");
  await assert.rejects(() => unlockVault("wrong horse", material), WrongMasterPasswordError);
});

test("gives the same vault key on a second device — no per-device salt", async () => {
  const { vaultKey, material } = await createVault("correct horse");
  const { ciphertext, iv } = await encryptSecret(vaultKey, secret);

  // A different browser holding nothing but the master password and the server's material.
  const onPhone = await unlockVault("correct horse", material);
  assert.equal((await decryptSecret(onPhone, ciphertext, iv)).password, "hunter2");
});

test("rotating the master password leaves existing items decryptable", async () => {
  const { vaultKey, material } = await createVault("old pass");
  const { ciphertext, iv } = await encryptSecret(vaultKey, secret);

  const rotated = await rotateMasterPassword("old pass", "new pass", material);

  assert.deepEqual(await decryptSecret(await unlockVault("new pass", rotated), ciphertext, iv), secret);
  await assert.rejects(() => unlockVault("old pass", rotated), WrongMasterPasswordError);
  assert.notEqual(rotated.salt, material.salt);
});

test("rotation refuses a wrong current password", async () => {
  const { material } = await createVault("old pass");
  await assert.rejects(
    () => rotateMasterPassword("guessing", "new pass", material),
    WrongMasterPasswordError,
  );
});

test("the unlocked key cannot be exported back out of the session", async () => {
  const { material } = await createVault("correct horse");
  const unlocked = await unlockVault("correct horse", material);
  assert.equal(unlocked.extractable, false);
});

test("two vaults with the same password get different salts and keys", async () => {
  const a = await createVault("same password");
  const b = await createVault("same password");
  assert.notEqual(a.material.salt, b.material.salt);

  const { ciphertext, iv } = await encryptSecret(a.vaultKey, secret);
  await assert.rejects(() => decryptSecret(b.vaultKey, ciphertext, iv));
});
