import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hashPassword,
  verifyPassword,
} from '../src/shared/security/password-hasher.js';

test('hashPassword creates a salted bcrypt hash and verifyPassword validates it', async () => {
  const password = 'StrongPassword123';
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, password);
  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword('wrong-password', firstHash), false);
});
