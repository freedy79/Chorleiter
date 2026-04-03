const router = require('express').Router();
const RateLimit = require('express-rate-limit');

const authJwt = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const validate = require('../validators/validate');
const controller = require('../controllers/chat.controller');
const { handler: wrap } = require('../utils/async');
const {
  createRoomValidation,
  roomDetailValidation,
  updateRoomValidation,
  messageListValidation,
  createMessageValidation,
  updateMessageValidation,
  deleteMessageValidation,
  messageDetailValidation,
  markReadValidation,
  messageStreamValidation
} = require('../validators/chat.validation');
const {
  diskUpload,
  createFileFilter,
  ALLOWED_ATTACHMENT_EXT,
  ALLOWED_ATTACHMENT_MIME
} = require('../utils/upload');

const messageLimiter = RateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Zu viele Nachrichten in kurzer Zeit. Bitte kurz warten.'
});

const attachmentUpload = diskUpload('chat-attachments', {
  fileFilter: createFileFilter(ALLOWED_ATTACHMENT_EXT, ALLOWED_ATTACHMENT_MIME)
});

router.use(authJwt.verifyToken);

router.get('/rooms', wrap(controller.getRooms));
router.post('/rooms', role.requireNonDemo, role.requireDirector, createRoomValidation, validate, wrap(controller.createRoom));
router.get('/rooms/:roomId', role.requireDirector, roomDetailValidation, validate, wrap(controller.getRoomDetail));
router.put('/rooms/:roomId', role.requireNonDemo, role.requireDirector, updateRoomValidation, validate, wrap(controller.updateRoom));
router.get('/rooms/:roomId/messages', messageListValidation, validate, wrap(controller.getRoomMessages));
router.post('/rooms/:roomId/messages', role.requireNonDemo, messageLimiter, attachmentUpload.single('attachment'), createMessageValidation, validate, wrap(controller.createMessage));
router.get('/rooms/:roomId/stream', messageStreamValidation, validate, wrap(controller.streamRoomEvents));
router.post('/rooms/:roomId/read', markReadValidation, validate, wrap(controller.markRoomRead));
router.get('/unread-summary', wrap(controller.getUnreadSummary));
router.get('/unread-overview', wrap(controller.getGlobalUnreadOverview));
router.get('/messages/:id', messageDetailValidation, validate, wrap(controller.getMessageById));
router.put('/messages/:id', role.requireNonDemo, updateMessageValidation, validate, wrap(controller.updateMessage));
router.delete('/messages/:id', role.requireNonDemo, deleteMessageValidation, validate, wrap(controller.deleteMessage));
router.get('/messages/:id/attachment', deleteMessageValidation, validate, wrap(controller.downloadAttachment));

module.exports = router;
