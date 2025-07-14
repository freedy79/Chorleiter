const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/monthlyPlan.controller");
const router = require("express").Router();

router.use(auth.verifyToken);

// Specific ID-based routes must be defined before the year/month route to
// avoid conflicts like GET /1/pdf being handled as year=1, month='pdf'.
router.get("/:id/pdf", controller.downloadPdf);
router.post("/:id/email", role.requireChoirAdmin, controller.emailPdf);
router.get("/:year/:month", controller.findByMonth);
router.post("/", role.requireChoirAdmin, controller.create);
router.put("/:id/finalize", role.requireChoirAdmin, controller.finalize);
router.put("/:id/reopen", role.requireChoirAdmin, controller.reopen);

module.exports = router;
