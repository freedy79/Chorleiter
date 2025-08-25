const router = require('express').Router();
const controller = require('../controllers/user.controller');
const { handler: wrap } = require('../utils/async');

router.get('/confirm/:token', wrap(controller.confirmEmailChange));

module.exports = router;
