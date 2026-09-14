const ENC_PREFIX = 'enc:';
const PII_FIELDS = ['phone', 'street', 'postalCode', 'city', 'congregation', 'district'];

// Loaded lazily: encryption.service throws at load time when ENCRYPTION_KEY is missing,
// which would otherwise break requiring the models.
function crypto() {
    return require('../services/encryption.service');
}

function encryptPiiField(val) {
    if (!val || val.startsWith(ENC_PREFIX)) return val;
    const ciphertext = crypto().encryptGCM(val);
    return ciphertext ? ENC_PREFIX + ciphertext : val;
}

function decryptPiiField(val) {
    if (!val || !val.startsWith(ENC_PREFIX)) return val;
    return crypto().decryptGCM(val.slice(ENC_PREFIX.length)) ?? val;
}

// Kept free of any `../models` import so the user model can use it without a require cycle.
module.exports = { ENC_PREFIX, PII_FIELDS, encryptPiiField, decryptPiiField };
