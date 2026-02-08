const db = require('../models');

const IMPRINT_NAME_KEY = 'imprint_name';
const IMPRINT_STREET_KEY = 'imprint_street';
const IMPRINT_POSTAL_CODE_KEY = 'imprint_postal_code';
const IMPRINT_CITY_KEY = 'imprint_city';
const IMPRINT_COUNTRY_KEY = 'imprint_country';
const IMPRINT_PHONE_KEY = 'imprint_phone';
const IMPRINT_EMAIL_KEY = 'imprint_email';
const IMPRINT_RESPONSIBLE_NAME_KEY = 'imprint_responsible_name';

/**
 * Speichert den Anbieter-Namen
 * @param {string} name - Der Name des Anbieters
 * @returns {Promise}
 */
async function saveName(name) {
    await db.system_setting.upsert({
        key: IMPRINT_NAME_KEY,
        value: name || ''
    });
}

/**
 * Ruft den Anbieter-Namen ab
 * @returns {Promise<string>}
 */
async function getName() {
    const setting = await db.system_setting.findByPk(IMPRINT_NAME_KEY);
    return setting?.value || '';
}

/**
 * Speichert die Straße
 * @param {string} street - Die Straße
 * @returns {Promise}
 */
async function saveStreet(street) {
    await db.system_setting.upsert({
        key: IMPRINT_STREET_KEY,
        value: street || ''
    });
}

/**
 * Ruft die Straße ab
 * @returns {Promise<string>}
 */
async function getStreet() {
    const setting = await db.system_setting.findByPk(IMPRINT_STREET_KEY);
    return setting?.value || '';
}

/**
 * Speichert die Postleitzahl
 * @param {string} postalCode - Die Postleitzahl
 * @returns {Promise}
 */
async function savePostalCode(postalCode) {
    await db.system_setting.upsert({
        key: IMPRINT_POSTAL_CODE_KEY,
        value: postalCode || ''
    });
}

/**
 * Ruft die Postleitzahl ab
 * @returns {Promise<string>}
 */
async function getPostalCode() {
    const setting = await db.system_setting.findByPk(IMPRINT_POSTAL_CODE_KEY);
    return setting?.value || '';
}

/**
 * Speichert die Stadt
 * @param {string} city - Die Stadt
 * @returns {Promise}
 */
async function saveCity(city) {
    await db.system_setting.upsert({
        key: IMPRINT_CITY_KEY,
        value: city || ''
    });
}

/**
 * Ruft die Stadt ab
 * @returns {Promise<string>}
 */
async function getCity() {
    const setting = await db.system_setting.findByPk(IMPRINT_CITY_KEY);
    return setting?.value || '';
}

/**
 * Speichert das Land
 * @param {string} country - Das Land
 * @returns {Promise}
 */
async function saveCountry(country) {
    await db.system_setting.upsert({
        key: IMPRINT_COUNTRY_KEY,
        value: country || ''
    });
}

/**
 * Ruft das Land ab
 * @returns {Promise<string>}
 */
async function getCountry() {
    const setting = await db.system_setting.findByPk(IMPRINT_COUNTRY_KEY);
    return setting?.value || '';
}

/**
 * Speichert die Telefonnummer
 * @param {string} phone - Die Telefonnummer
 * @returns {Promise}
 */
async function savePhone(phone) {
    await db.system_setting.upsert({
        key: IMPRINT_PHONE_KEY,
        value: phone || ''
    });
}

/**
 * Ruft die Telefonnummer ab
 * @returns {Promise<string>}
 */
async function getPhone() {
    const setting = await db.system_setting.findByPk(IMPRINT_PHONE_KEY);
    return setting?.value || '';
}

/**
 * Speichert die E-Mail-Adresse
 * @param {string} email - Die E-Mail-Adresse
 * @returns {Promise}
 */
async function saveEmail(email) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email address');
    }

    await db.system_setting.upsert({
        key: IMPRINT_EMAIL_KEY,
        value: email || ''
    });
}

/**
 * Ruft die E-Mail-Adresse ab
 * @returns {Promise<string>}
 */
async function getEmail() {
    const setting = await db.system_setting.findByPk(IMPRINT_EMAIL_KEY);
    return setting?.value || '';
}

/**
 * Speichert den Namen der verantwortlichen Person
 * @param {string} responsibleName - Der Name der verantwortlichen Person
 * @returns {Promise}
 */
async function saveResponsibleName(responsibleName) {
    await db.system_setting.upsert({
        key: IMPRINT_RESPONSIBLE_NAME_KEY,
        value: responsibleName || ''
    });
}

/**
 * Ruft den Namen der verantwortlichen Person ab
 * @returns {Promise<string>}
 */
async function getResponsibleName() {
    const setting = await db.system_setting.findByPk(IMPRINT_RESPONSIBLE_NAME_KEY);
    return setting?.value || '';
}

/**
 * Prüft, ob alle Pflichtfelder ausgefüllt sind
 * @returns {Promise<boolean>}
 */
async function isImprintComplete() {
    const name = await getName();
    const street = await getStreet();
    const postalCode = await getPostalCode();
    const city = await getCity();
    const email = await getEmail();

    return !!(name && street && postalCode && city && email);
}

/**
 * Ruft alle Impressum-Einstellungen ab
 * @returns {Promise<{name: string, street: string, postalCode: string, city: string, country: string, phone: string, email: string, responsibleName: string, isComplete: boolean}>}
 */
async function getImprintSettings() {
    const name = await getName();
    const street = await getStreet();
    const postalCode = await getPostalCode();
    const city = await getCity();
    const country = await getCountry();
    const phone = await getPhone();
    const email = await getEmail();
    const responsibleName = await getResponsibleName();
    const isComplete = await isImprintComplete();

    return {
        name,
        street,
        postalCode,
        city,
        country,
        phone,
        email,
        responsibleName,
        isComplete
    };
}

/**
 * Speichert alle Impressum-Einstellungen
 * @param {Object} data - Die Impressum-Daten
 * @returns {Promise}
 */
async function saveImprintSettings(data) {
    if (data.name !== undefined) await saveName(data.name);
    if (data.street !== undefined) await saveStreet(data.street);
    if (data.postalCode !== undefined) await savePostalCode(data.postalCode);
    if (data.city !== undefined) await saveCity(data.city);
    if (data.country !== undefined) await saveCountry(data.country);
    if (data.phone !== undefined) await savePhone(data.phone);
    if (data.email !== undefined) await saveEmail(data.email);
    if (data.responsibleName !== undefined) await saveResponsibleName(data.responsibleName);
}

module.exports = {
    getImprintSettings,
    saveImprintSettings,
    isImprintComplete
};
