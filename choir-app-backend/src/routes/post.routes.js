const authJwt = require('../middleware/auth.middleware');
const controller = require('../controllers/post.controller');
const validate = require('../validators/validate');
const { postValidation, pollVoteValidation, commentValidation, reactionValidation } = require('../validators/post.validation');
const role = require('../middleware/role.middleware');
const { handler: wrap } = require('../utils/async');
const { diskUpload, createFileFilter, ALLOWED_ATTACHMENT_EXT, ALLOWED_ATTACHMENT_MIME } = require('../utils/upload');
const router = require('express').Router();

const attachmentUpload = diskUpload('post-attachments', {
  fileFilter: createFileFilter(ALLOWED_ATTACHMENT_EXT, ALLOWED_ATTACHMENT_MIME)
});

router.use(authJwt.verifyToken);

router.get('/latest', wrap(controller.findLatest));
router.get('/', wrap(controller.findAll));
router.post('/', role.requireNonDemo, role.requireDirector, postValidation, validate, wrap(controller.create));
router.put('/:id', role.requireNonDemo, postValidation, validate, wrap(controller.update));
router.delete('/:id', role.requireNonDemo, wrap(controller.remove));
router.post('/:id/publish', role.requireNonDemo, wrap(controller.publish));
router.post('/:id/vote', role.requireNonDemo, pollVoteValidation, validate, wrap(controller.vote));
router.post('/:id/comments', role.requireNonDemo, commentValidation, validate, wrap(controller.addComment));
router.delete('/:id/comments/:commentId', role.requireNonDemo, wrap(controller.removeComment));
router.post('/:id/reactions', role.requireNonDemo, reactionValidation, validate, wrap(controller.reactOnPost));
router.post('/:id/comments/:commentId/reactions', role.requireNonDemo, reactionValidation, validate, wrap(controller.reactOnComment));
router.get('/:id/attachment', wrap(controller.downloadAttachment));
router.post('/:id/attachment', role.requireNonDemo, attachmentUpload.single('file'), wrap(controller.uploadAttachment));
router.delete('/:id/attachment', role.requireNonDemo, wrap(controller.removeAttachment));

module.exports = router;
