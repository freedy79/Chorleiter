/**
 * Data Enrichment Admin Routes
 */

const express = require('express');
const router = express.Router();
const enrichmentController = require('../controllers/enrichment.controller');
const authJwt = require('../middleware/auth.middleware');

/**
 * All routes require authentication and admin role
 */
router.use(authJwt.verifyToken);
router.use(authJwt.isAdmin);

/**
 * Settings Management
 */
router.get('/settings', enrichmentController.getSettings);
router.post('/settings', enrichmentController.updateSetting);
router.get('/api-keys/status', enrichmentController.getApiKeyStatus);
router.post('/api-keys', enrichmentController.setApiKey);
router.delete('/api-keys/:provider', enrichmentController.deleteApiKey);

/**
 * Provider Management
 */
router.get('/providers', enrichmentController.getProviders);

/**
 * Job Management
 */
router.get('/jobs', enrichmentController.listJobs);
router.post('/jobs', enrichmentController.createJob);
router.get('/jobs/:jobId', enrichmentController.getJob);
router.post('/jobs/:jobId/cancel', enrichmentController.cancelJob);
router.delete('/jobs/:jobId', enrichmentController.deleteJob);

/**
 * Suggestion Management
 */
router.get('/suggestions', enrichmentController.getSuggestions);
router.post('/suggestions/:suggestionId/review', enrichmentController.reviewSuggestion);
router.post('/suggestions/:suggestionId/apply', enrichmentController.applySuggestion);

/**
 * Statistics
 */
router.get('/statistics', enrichmentController.getStatistics);

module.exports = router;
