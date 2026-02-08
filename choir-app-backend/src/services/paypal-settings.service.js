const db = require('../models');
const { encrypt, decrypt } = require('./encryption.service');

const PAYPAL_PDT_TOKEN_KEY = 'paypal_pdt_token';
const PAYPAL_MODE_KEY = 'paypal_mode';
const PAYPAL_DONATION_EMAIL_KEY = 'paypal_donation_email';

/**
 * Speichert den PayPal PDT Token verschlüsselt
 * @param {string} token - Der PayPal PDT Token
 * @returns {Promise}
 */
async function savePDTToken(token) {
    if (!token) {
        throw new Error('PDT Token cannot be empty');
    }

    const encrypted = encrypt(token);

    await db.system_setting.upsert({
        key: PAYPAL_PDT_TOKEN_KEY,
        value: encrypted
    });
}

/**
 * Ruft den PayPal PDT Token ab (entschlüsselt)
 * @returns {Promise<string|null>}
 */
async function getPDTToken() {
    const setting = await db.system_setting.findByPk(PAYPAL_PDT_TOKEN_KEY);
    if (!setting || !setting.value) {
        return null;
    }
    return decrypt(setting.value);
}

/**
 * Speichert den PayPal Modus (sandbox oder live)
 * @param {string} mode - 'sandbox' oder 'live'
 * @returns {Promise}
 */
async function savePayPalMode(mode) {
    if (!['sandbox', 'live'].includes(mode)) {
        throw new Error('PayPal mode must be "sandbox" or "live"');
    }

    await db.system_setting.upsert({
        key: PAYPAL_MODE_KEY,
        value: mode
    });
}

/**
 * Ruft den PayPal Modus ab
 * @returns {Promise<string>}
 */
async function getPayPalMode() {
    const setting = await db.system_setting.findByPk(PAYPAL_MODE_KEY);
    return setting?.value || process.env.PAYPAL_MODE || 'sandbox';
}

/**
 * Speichert die PayPal Spendenmail-Adresse
 * @param {string} email - Die Spendenmail-Adresse
 * @returns {Promise}
 */
async function saveDonationEmail(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email address');
    }

    await db.system_setting.upsert({
        key: PAYPAL_DONATION_EMAIL_KEY,
        value: email
    });
}

/**
 * Ruft die PayPal Spendenmail-Adresse ab
 * @returns {Promise<string|null>}
 */
async function getDonationEmail() {
    const setting = await db.system_setting.findByPk(PAYPAL_DONATION_EMAIL_KEY);
    return setting?.value || null;
}

/**
 * Ruft alle PayPal-Einstellungen ab (Token ist nicht entschlüsselt!)
 * @returns {Promise<{pdtConfigured: boolean, mode: string, donationEmail: string|null}>}
 */
async function getPayPalSettings() {
    const token = await getPDTToken();
    const mode = await getPayPalMode();
    const donationEmail = await getDonationEmail();

    return {
        pdtConfigured: !!token,
        mode: mode,
        donationEmail: donationEmail
    };
}

module.exports = {
    savePDTToken,
    getPDTToken,
    savePayPalMode,
    getPayPalMode,
    saveDonationEmail,
    getDonationEmail,
    getPayPalSettings
};
