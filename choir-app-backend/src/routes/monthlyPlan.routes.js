const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/monthlyPlan.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(auth.verifyToken);

// Specific ID-based routes must be defined before the year/month route to
// avoid conflicts like GET /1/pdf being handled as year=1, month='pdf'.
router.get("/:id/pdf", wrap(controller.downloadPdf));
router.post("/:id/email", role.requireNonDemo, role.requireDienstplanManager, wrap(controller.emailPdf));
router.post("/:id/request-availability", role.requireNonDemo, role.requireDienstplanManager, wrap(controller.requestAvailability));
router.get("/:year/:month", wrap(controller.findByMonth));
router.post("/", role.requireNonDemo, role.requireDienstplanManager, wrap(controller.create));
router.put("/:id/finalize", role.requireNonDemo, role.requireDienstplanManager, wrap(controller.finalize));
router.put("/:id/reopen", role.requireNonDemo, role.requireDienstplanManager, wrap(controller.reopen));

module.exports = router;
