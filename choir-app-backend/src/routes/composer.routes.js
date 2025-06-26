const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/composer.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.post("/", controller.create);
router.get("/", controller.findAll);

module.exports = router;