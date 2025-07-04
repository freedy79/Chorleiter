const auth = require("../middleware/auth.middleware");
const controller = require("../controllers/planEntry.controller");
const router = require("express").Router();

router.use(auth.verifyToken);

router.post("/", auth.isChoirAdminOrAdmin, controller.create);
router.put("/:id", auth.isChoirAdminOrAdmin, controller.update);
router.delete("/:id", auth.isChoirAdminOrAdmin, controller.delete);

module.exports = router;
