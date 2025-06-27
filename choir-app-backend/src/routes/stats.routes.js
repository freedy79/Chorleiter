const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/stats.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get('/', controller.overview);

module.exports = router;
