const authJwt = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/repertoire.controller");
const noteController = require("../controllers/piece-note.controller");
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

router.use(authJwt.verifyToken);

router.get("/", wrap(controller.findMyRepertoire));
router.put("/status", role.requireNonDemo, wrap(controller.updateStatus));
router.put("/notes", role.requireNonDemo, wrap(controller.updateNotes));
router.put("/rating", role.requireNonDemo, role.requireDirectorOrHigher, wrap(controller.updateRating));
router.post("/add-piece", role.requireNonDemo, wrap(controller.addPieceToRepertoire));
router.get("/lookup", wrap(controller.lookup));
router.get("/:id", wrap(controller.findOne));
router.get("/:id/notes", wrap(noteController.findForPiece));
router.post("/:id/notes", role.requireNonDemo, wrap(noteController.createForPiece));
router.put("/notes/:noteId", role.requireNonDemo, wrap(noteController.update));
router.delete("/notes/:noteId", role.requireNonDemo, wrap(noteController.remove));

module.exports = router;