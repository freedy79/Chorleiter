const router = require('express').Router();
const publicPageController = require('../controllers/public-page.controller');
const postController = require('../controllers/post.controller');
const formController = require('../controllers/form.controller');
const validate = require('../validators/validate');
const { submitFormValidation } = require('../validators/form.validation');
const { handler: wrap } = require('../utils/async');

router.get('/choirs/:slug', wrap(publicPageController.getPublicPageBySlug));
router.post('/poll-vote/:token', wrap(postController.consumeReminderVote));

// Public form access (via GUID)
router.get('/forms/:guid', wrap(formController.getPublicForm));
router.post('/forms/:guid/submit', submitFormValidation, validate, wrap(formController.submitPublicForm));

module.exports = router;
