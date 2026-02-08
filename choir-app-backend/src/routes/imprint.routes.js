const router = require("express").Router();
const imprintSettingsService = require('../services/imprint-settings.service');
const logger = require("../config/logger");

// Öffentlicher Zugriff auf Impressum-Daten (keine Authentifizierung erforderlich)
router.get('/', async (req, res) => {
    try {
        const settings = await imprintSettingsService.getImprintSettings();
        res.status(200).send(settings);
    } catch (err) {
        logger.error('Error getting public imprint', { error: err.message });
        res.status(500).send({ message: 'Error loading imprint data' });
    }
});

module.exports = router;
