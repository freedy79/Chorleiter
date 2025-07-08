const authJwt = require("../middleware/auth.middleware");
const controller = require("../controllers/repertoire.controller");
const noteController = require("../controllers/piece-note.controller");
const router = require("express").Router();

router.use(authJwt.verifyToken);

router.get("/", controller.findMyRepertoire);
router.put("/status", controller.updateStatus);
router.put("/notes", controller.updateNotes);
router.post("/add-piece", controller.addPieceToRepertoire);
router.get("/lookup", controller.lookup);
router.get("/:id", controller.findOne);
router.get("/:id/notes", noteController.findForPiece);
router.post("/:id/notes", noteController.createForPiece);
router.put("/notes/:noteId", noteController.update);
router.delete("/notes/:noteId", noteController.remove);

module.exports = router;