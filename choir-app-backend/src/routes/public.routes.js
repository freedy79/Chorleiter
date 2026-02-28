const router = require('express').Router();
const publicPageController = require('../controllers/public-page.controller');
const postController = require('../controllers/post.controller');
const { handler: wrap } = require('../utils/async');

router.get('/choirs/:slug', wrap(publicPageController.getPublicPageBySlug));
router.post('/poll-vote/:token', wrap(postController.consumeReminderVote));

module.exports = router;
