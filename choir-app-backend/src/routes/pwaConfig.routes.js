const express = require('express');
const router = express.Router();
const controller = require('../controllers/pwaConfig.controller');

// All routes require admin role (applied in app.js middleware)

// Get all PWA configurations
router.get('/', controller.getAllConfigs);

// Initialize default configurations
router.post('/initialize', controller.initializeDefaults);

// Get configs by category
router.get('/category/:category', controller.getConfigsByCategory);

// Get, update, delete specific config by key
router.get('/:key', controller.getConfigByKey);
router.put('/:key', controller.updateConfig);
router.delete('/:key', controller.deleteConfig);

// Create new config
router.post('/', controller.createConfig);

module.exports = router;
