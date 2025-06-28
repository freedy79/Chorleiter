const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/repertoire-filter.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/", controller.list);
router.post("/", controller.save);
router.delete("/:id", controller.delete);

module.exports = router;
