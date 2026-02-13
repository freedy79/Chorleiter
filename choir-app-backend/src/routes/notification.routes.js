const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/notification.controller');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

router.get('/vapid-public-key', wrap(controller.getVapidPublicKey));

router.use(authJwt.verifyToken);

router.post('/subscribe', wrap(controller.subscribe));
router.delete('/unsubscribe', wrap(controller.unsubscribe));

module.exports = router;
