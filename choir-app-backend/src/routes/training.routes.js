const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/training.controller');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

// All routes require authentication
router.use(authJwt.verifyToken);

// User training endpoints
router.get('/profile', wrap(controller.getProfile));
router.put('/profile', role.requireNonDemo, wrap(controller.updateProfile));
router.get('/exercises', wrap(controller.getExercises));
router.get('/exercises/:id', wrap(controller.getExercise));
router.post('/exercises/:id/attempt', role.requireNonDemo, wrap(controller.submitAttempt));
router.get('/history', wrap(controller.getHistory));
router.get('/badges', wrap(controller.getBadges));
router.get('/stats', wrap(controller.getStats));

// Admin endpoints for exercise management
router.post('/admin/exercises', role.requireNonDemo, role.requireAdmin, wrap(controller.createExercise));
router.put('/admin/exercises/:id', role.requireNonDemo, role.requireAdmin, wrap(controller.updateExercise));
router.delete('/admin/exercises/:id', role.requireNonDemo, role.requireAdmin, wrap(controller.deleteExercise));
router.post('/admin/reseed', role.requireNonDemo, role.requireAdmin, wrap(controller.reseedExercises));

module.exports = router;
