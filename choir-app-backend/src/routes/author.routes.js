const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/author.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.post("/", wrap(controller.create));
router.get("/", wrap(controller.findAll));
router.put("/:id", wrap(controller.update));
router.delete("/:id", wrap(controller.delete));
router.post("/:id/enrich", wrap(controller.enrich));

module.exports = router;
