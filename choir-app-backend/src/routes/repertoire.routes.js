const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/repertoire.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/", controller.findMyRepertoire);
router.put("/status", controller.updateStatus);
router.get("/lookup", controller.lookup);

module.exports = router;