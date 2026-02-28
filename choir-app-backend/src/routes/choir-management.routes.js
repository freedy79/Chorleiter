const { verifyToken } = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const controller = require("../controllers/choir-management.controller");
const lendingController = require("../controllers/choir-lending.controller");
const choirDigitalLicenseController = require("../controllers/choir-digital-license.controller");
const publicPageController = require('../controllers/public-page.controller');
const { diskUpload, createFileFilter, PDF_FILE_SIZE } = require('../utils/upload');
const router = require("express").Router();
const { handler: wrap } = require("../utils/async");

const digitalLicenseDocumentUpload = diskUpload('choir-digital-license-files', {
	limits: { fileSize: PDF_FILE_SIZE },
	fileFilter: createFileFilter(/pdf/, /application\/pdf/)
});

const publicPageImageUpload = diskUpload('choir-public-pages');

// Zuerst stellen wir sicher, dass der Benutzer authentifiziert ist
router.use(verifyToken);

// Chor-Informationen können von allen Mitgliedern gelesen werden
router.get("/", wrap(controller.getMyChoirDetails));
router.get("/dashboard-contact", wrap(controller.getDashboardContacts));

// Ab hier: Member-Management und Einstellungen nur für Choir-Admins
router.put("/", role.requireChoirAdmin, role.requireNonDemo, wrap(controller.updateMyChoir));
router.get("/members/count", wrap(controller.getChoirMemberCount));
router.get("/members", role.requireDirectorOrHigher, wrap(controller.getChoirMembers));
router.post("/members", role.requireChoirAdmin, role.requireNonDemo, wrap(controller.inviteUserToChoir));
router.put("/members/:userId", role.requireChoirAdmin, role.requireNonDemo, wrap(controller.updateMember));
router.delete("/members", role.requireChoirAdmin, role.requireNonDemo, wrap(controller.removeUserFromChoir));
router.get("/logs", role.requireChoirAdmin, wrap(controller.getChoirLogs));
router.get("/participation/pdf", role.requireChoirAdmin, wrap(controller.downloadParticipationPdf));
router.get('/public-page', role.requireDirectorOrHigher, wrap(publicPageController.getMyPublicPage));
router.get('/public-page/slug-availability', role.requireChoirAdmin, wrap(publicPageController.checkSlugAvailability));
router.put('/public-page', role.requireChoirAdmin, role.requireNonDemo, wrap(publicPageController.updateMyPublicPage));
router.post('/public-page/assets', role.requireChoirAdmin, role.requireNonDemo, publicPageImageUpload.single('file'), wrap(publicPageController.uploadMyPublicAsset));
router.delete('/public-page/assets/:assetId', role.requireChoirAdmin, role.requireNonDemo, wrap(publicPageController.deleteMyPublicAsset));
// Sammlungen können von allen Mitgliedern eingesehen werden
router.get("/collections", wrap(controller.getChoirCollections));
router.get("/borrowings", wrap(lendingController.listForUser));
router.get("/collections/copy-ids", role.requireChoirAdminOrNotenwart, wrap(lendingController.listCopyIds));
router.delete("/collections/:id", role.requireNonDemo, role.requireChoirAdminOrNotenwart, wrap(controller.removeCollectionFromChoir));
router.get("/collections/:id/copies", role.requireChoirAdminOrNotenwart, wrap(lendingController.list));
router.get("/collections/:id/copies/pdf", role.requireChoirAdminOrNotenwart, wrap(lendingController.downloadPdf));
router.get("/collections/:id/digital-licenses/viewable", wrap(choirDigitalLicenseController.listViewableForCollection));
router.post("/collections/:id/copies", role.requireChoirAdminOrNotenwart, role.requireNonDemo, wrap(lendingController.init));
router.put("/collections/:id/copies", role.requireChoirAdminOrNotenwart, role.requireNonDemo, wrap(lendingController.setCount));
router.put("/collections/copies/:id", role.requireChoirAdminOrNotenwart, role.requireNonDemo, wrap(lendingController.update));
router.get("/collections/:id/digital-licenses", role.requireChoirAdminOrNotenwart, wrap(choirDigitalLicenseController.list));
router.post("/collections/:id/digital-licenses", role.requireChoirAdminOrNotenwart, role.requireNonDemo, wrap(choirDigitalLicenseController.create));
router.put("/collections/digital-licenses/:licenseId", role.requireChoirAdminOrNotenwart, role.requireNonDemo, wrap(choirDigitalLicenseController.update));
router.delete("/collections/digital-licenses/:licenseId", role.requireChoirAdminOrNotenwart, role.requireNonDemo, wrap(choirDigitalLicenseController.remove));
router.post("/collections/digital-licenses/:licenseId/document", role.requireChoirAdminOrNotenwart, role.requireNonDemo, digitalLicenseDocumentUpload.single('file'), wrap(choirDigitalLicenseController.uploadDocument));
router.get("/collections/digital-licenses/:licenseId/document", role.requireChoirAdminOrNotenwart, wrap(choirDigitalLicenseController.downloadDocument));
router.get("/collections/digital-licenses/:licenseId/document/view", wrap(choirDigitalLicenseController.streamDocumentInline));

module.exports = router;
