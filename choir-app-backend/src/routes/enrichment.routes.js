/**
 * Data Enrichment Admin Routes
 */

const express = require('express');
const router = express.Router();
const enrichmentController = require('../../controllers/enrichment.controller');
const { verifyToken, requireAdmin } = require('../../middleware/auth.middleware');

/**
 * All routes require authentication and admin role
 */
router.use(verifyToken);
router.use(requireAdmin);

/**
 * Settings Management
 */
router.get('/settings', enrichmentController.getSettings);
router.post('/settings', enrichmentController.updateSetting);
router.post('/api-keys', enrichmentController.setApiKey);

/**
 * Provider Management
 */
router.get('/providers', enrichmentController.getProviders);

/**
 * Job Management
 */
router.post('/jobs', enrichmentController.createJob);
router.get('/jobs/:jobId', enrichmentController.getJob);

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
