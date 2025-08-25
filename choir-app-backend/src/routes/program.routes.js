const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const validate = require('../validators/validate');
const { programValidation } = require('../validators/program.validation');
const controller = require('../controllers/program.controller');
const { handler: wrap } = require('../utils/async');
const router = require('express').Router();

router.use(authJwt.verifyToken);

router.post('/', role.requireDirector, programValidation, validate, wrap(controller.create));

module.exports = router;
