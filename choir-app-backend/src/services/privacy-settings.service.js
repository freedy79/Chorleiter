const db = require('../models');

const PRIVACY_POLICY_HTML_KEY = 'privacy_policy_html';

async function getPrivacyPolicyHtml() {
    const setting = await db.system_setting.findByPk(PRIVACY_POLICY_HTML_KEY);
    return setting?.value || '';
}

async function savePrivacyPolicyHtml(html) {
    await db.system_setting.upsert({
        key: PRIVACY_POLICY_HTML_KEY,
        value: html || ''
    });
}

module.exports = {
    getPrivacyPolicyHtml,
    savePrivacyPolicyHtml
};
