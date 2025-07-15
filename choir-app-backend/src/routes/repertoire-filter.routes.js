const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/repertoire-filter.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.get("/", wrap(controller.list));
router.post("/", wrap(controller.save));
router.delete("/:id", wrap(controller.delete));

module.exports = router;
