const router = require("express").Router();
const privacySettingsService = require('../services/privacy-settings.service');
const logger = require("../config/logger");

// Öffentlicher Zugriff auf Datenschutzerklärung (keine Authentifizierung erforderlich)
router.get('/', async (req, res) => {
    try {
        const html = await privacySettingsService.getPrivacyPolicyHtml();
        res.status(200).send({ html });
    } catch (err) {
        logger.error('Error getting public privacy policy', { error: err.message });
        res.status(500).send({ message: 'Error loading privacy policy' });
    }
});

module.exports = router;
