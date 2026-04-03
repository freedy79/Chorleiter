const crypto = require('crypto');

/**
 * Service für verschlüsselte Speicherung von sensiblen Daten
 * - AES-256-CBC für bestehende Daten (PayPal PDT Token, etc.)
 * - AES-256-GCM für neue API-Keys (with authentication tag)
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY === 'default-insecure-key-please-change') {
    throw new Error(
        'ENCRYPTION_KEY is not set or uses the insecure default. ' +
        'Please set a strong ENCRYPTION_KEY in your .env file (32 hex characters = 16 bytes, or longer).'
    );
}

// Für CBC (legacy): Key wird aus ENCRYPTION_KEY hergeleitet
const ALGORITHM_CBC = 'aes-256-cbc';
const IV_LENGTH = 16;

// Für GCM (neu): ENCRYPTION_KEY direkt nutzen (sollte bereits 32 bytes sein)
const ALGORITHM_GCM = 'aes-256-gcm';
const GCM_IV_LENGTH = 12; // 96-bit IV für GCM optimal
const GCM_AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Verschlüsselt einen Text mit AES-256-CBC (legacy support)
 * @param {string} text - Text zum Verschlüsseln
 * @returns {string} Verschlüsselter Text (hex-kodiert mit IV)
 */
function encrypt(text) {
    if (!text) return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const cipher = crypto.createCipheriv(ALGORITHM_CBC, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Kombiniere IV und verschlüsselten Text
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Entschlüsselt einen Text mit AES-256-CBC (legacy support)
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
        const decipher = crypto.createDecipheriv(ALGORITHM_CBC, key, iv);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        console.error('Decryption error: failed to decrypt value');
        return null;
    }
}

/**
 * Verschlüsselt einen Text mit AES-256-GCM (API-Keys, etc.)
 * @param {string} text - Text zum Verschlüsseln
 * @returns {string} Format: "iv:ciphertext:authTag" (alle hex-kodiert)
 */
function encryptGCM(text) {
    if (!text) return null;

    try {
        const iv = crypto.randomBytes(GCM_IV_LENGTH);
        // ENCRYPTION_KEY sollte bereits 32 bytes sein (gilt für hex-kodierte Keys nicht!)
        let key = ENCRYPTION_KEY;
        if (typeof key === 'string' && key.length > 32) {
            // Falls ENCRYPTION_KEY ein langer hex-String ist, entsprechend konvertieren
            key = Buffer.from(key.slice(0, 64), 'hex');
        } else if (typeof key === 'string') {
            key = Buffer.from(key);
        }
        // Stelle sicher dass Key exactly 32 bytes lang ist
        if (key.length < 32) {
            key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
        }

        const cipher = crypto.createCipheriv(ALGORITHM_GCM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        // Format: iv:ciphertext:authTag (alle hex)
        return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
    } catch (err) {
        console.error('GCM Encryption error:', err);
        return null;
    }
}

/**
 * Entschlüsselt einen Text mit AES-256-GCM (API-Keys, etc.)
 * @param {string} text - Format: "iv:ciphertext:authTag" (alle hex-kodiert)
 * @returns {string} Entschlüsselter Text
 */
function decryptGCM(text) {
    if (!text) return null;

    try {
        const parts = text.split(':');
        if (parts.length !== 3) {
            console.error('Invalid GCM format: expected 3 parts (iv:ciphertext:authTag)');
            return null;
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const authTag = Buffer.from(parts[2], 'hex');

        let key = ENCRYPTION_KEY;
        if (typeof key === 'string' && key.length > 32) {
            key = Buffer.from(key.slice(0, 64), 'hex');
        } else if (typeof key === 'string') {
            key = Buffer.from(key);
        }
        if (key.length < 32) {
            key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
        }

        const decipher = crypto.createDecipheriv(ALGORITHM_GCM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        console.error('GCM Decryption error:', err.message);
        return null;
    }
}

module.exports = {
    // Legacy CBC methods
    encrypt,
    decrypt,
    // New GCM methods for API keys
    encryptGCM,
    decryptGCM
};
