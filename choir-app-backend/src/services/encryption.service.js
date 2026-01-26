const crypto = require('crypto');

/**
 * Service für verschlüsselte Speicherung von sensiblen Daten
 * wie PayPal PDT Token
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-insecure-key-please-change';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Verschlüsselt einen Text
 * @param {string} text - Text zum Verschlüsseln
 * @returns {string} Verschlüsselter Text (hex-kodiert mit IV)
 */
function encrypt(text) {
    if (!text) return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Kombiniere IV und verschlüsselten Text
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Entschlüsselt einen Text
 * @param {string} text - Verschlüsselter Text (hex-kodiert mit IV)
 * @returns {string} Entschlüsselter Text
 */
function decrypt(text) {
    if (!text) return null;

    const parts = text.split(':');
    if (parts.length !== 2) return null;

    try {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        console.error('Decryption error:', err);
        return null;
    }
}

module.exports = {
    encrypt,
    decrypt
};
