const assert = require('assert');

// Set ENCRYPTION_KEY before requiring the service
process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

const { encrypt, decrypt, encryptGCM, decryptGCM } = require('../src/services/encryption.service');

(async () => {
  try {
    let passed = 0;

    // === CBC (legacy) encrypt/decrypt ===

    // 1. Encrypt and decrypt a simple string
    {
      const original = 'MySecretToken123';
      const encrypted = encrypt(original);
      assert.ok(encrypted, 'encrypted value exists');
      assert.notStrictEqual(encrypted, original, 'encrypted differs from original');
      const decrypted = decrypt(encrypted);
      assert.strictEqual(decrypted, original, 'CBC round-trip works');
      passed++;
    }

    // 2. Encrypt produces different ciphertexts (random IV)
    {
      const text = 'same-text';
      const enc1 = encrypt(text);
      const enc2 = encrypt(text);
      assert.notStrictEqual(enc1, enc2, 'different IVs produce different ciphertexts');
      // Both should decrypt to same value
      assert.strictEqual(decrypt(enc1), text);
      assert.strictEqual(decrypt(enc2), text);
      passed++;
    }

    // 3. Encrypt null/empty returns null
    {
      assert.strictEqual(encrypt(null), null, 'encrypt(null) → null');
      assert.strictEqual(encrypt(''), null, 'encrypt("") → null');
      assert.strictEqual(decrypt(null), null, 'decrypt(null) → null');
      assert.strictEqual(decrypt(''), null, 'decrypt("") → null');
      passed++;
    }

    // 4. Decrypt with invalid format returns null
    {
      assert.strictEqual(decrypt('no-colon-here'), null, 'invalid format → null');
      assert.strictEqual(decrypt('abc:def:ghi'), null, 'too many parts → null');
      passed++;
    }

    // 5. Decrypt with tampered data returns null
    {
      const encrypted = encrypt('secret');
      const parts = encrypted.split(':');
      // Tamper with ciphertext
      parts[1] = 'ff'.repeat(parts[1].length / 2);
      const tampered = parts.join(':');
      const result = decrypt(tampered);
      // Should return null (decryption fails gracefully)
      assert.strictEqual(result, null, 'tampered CBC data → null');
      passed++;
    }

    // 6. Handles special characters and unicode
    {
      const special = 'Ümläut ß © ® ™ 日本語 🎵';
      const enc = encrypt(special);
      assert.strictEqual(decrypt(enc), special, 'CBC handles unicode');
      passed++;
    }

    // 7. Handles long strings
    {
      const long = 'x'.repeat(10000);
      const enc = encrypt(long);
      assert.strictEqual(decrypt(enc), long, 'CBC handles long strings');
      passed++;
    }

    // === GCM (new) encrypt/decrypt ===

    // 8. GCM encrypt and decrypt round-trip
    {
      const original = 'MyAPIKey-abc123';
      const encrypted = encryptGCM(original);
      assert.ok(encrypted, 'GCM encrypted value exists');
      assert.notStrictEqual(encrypted, original);
      // GCM format: iv:ciphertext:authTag (3 parts)
      const parts = encrypted.split(':');
      assert.strictEqual(parts.length, 3, 'GCM format has 3 parts');
      const decrypted = decryptGCM(encrypted);
      assert.strictEqual(decrypted, original, 'GCM round-trip works');
      passed++;
    }

    // 9. GCM produces different ciphertexts (random IV)
    {
      const text = 'same-api-key';
      const enc1 = encryptGCM(text);
      const enc2 = encryptGCM(text);
      assert.notStrictEqual(enc1, enc2, 'GCM different IVs');
      assert.strictEqual(decryptGCM(enc1), text);
      assert.strictEqual(decryptGCM(enc2), text);
      passed++;
    }

    // 10. GCM null/empty returns null
    {
      assert.strictEqual(encryptGCM(null), null, 'encryptGCM(null) → null');
      assert.strictEqual(encryptGCM(''), null, 'encryptGCM("") → null');
      assert.strictEqual(decryptGCM(null), null, 'decryptGCM(null) → null');
      assert.strictEqual(decryptGCM(''), null, 'decryptGCM("") → null');
      passed++;
    }

    // 11. GCM tampered authTag fails (authentication)
    {
      const encrypted = encryptGCM('authenticated-data');
      const parts = encrypted.split(':');
      // Tamper with auth tag
      parts[2] = 'ff'.repeat(16);
      const tampered = parts.join(':');
      const result = decryptGCM(tampered);
      assert.strictEqual(result, null, 'GCM tampered authTag → null');
      passed++;
    }

    // 12. GCM tampered ciphertext fails
    {
      const encrypted = encryptGCM('authenticated-data');
      const parts = encrypted.split(':');
      parts[1] = 'aa'.repeat(parts[1].length / 2 || 8);
      const tampered = parts.join(':');
      const result = decryptGCM(tampered);
      assert.strictEqual(result, null, 'GCM tampered ciphertext → null');
      passed++;
    }

    // 13. GCM invalid format returns null
    {
      assert.strictEqual(decryptGCM('only-one-part'), null, 'GCM 1 part → null');
      assert.strictEqual(decryptGCM('two:parts'), null, 'GCM 2 parts → null');
      passed++;
    }

    // 14. GCM handles special characters
    {
      const special = 'sk-ant-api03-Ümläut-日本語-🔑';
      const enc = encryptGCM(special);
      assert.strictEqual(decryptGCM(enc), special, 'GCM handles unicode');
      passed++;
    }

    // 15. CBC and GCM are not interchangeable
    {
      const text = 'cross-test';
      const cbcEnc = encrypt(text);
      const gcmEnc = encryptGCM(text);
      // CBC decrypt on GCM data should fail
      assert.strictEqual(decrypt(gcmEnc), null, 'CBC cannot decrypt GCM');
      // GCM decrypt on CBC data should fail
      assert.strictEqual(decryptGCM(cbcEnc), null, 'GCM cannot decrypt CBC');
      passed++;
    }

    console.log(`\n✅ encryption.service.test: All ${passed} tests passed`);
  } catch (err) {
    console.error('❌ encryption.service.test FAILED:', err);
    process.exit(1);
  }
})();
