const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DEFAULT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_EXT = /jpeg|jpg|png|gif|webp/;
const ALLOWED_IMAGE_MIME = /image\/(jpeg|png|gif|webp)/;

const ALLOWED_DATA_EXT = /csv|json/;
const ALLOWED_DATA_MIME = /text\/csv|application\/json|text\/plain/;

const ALLOWED_PIECE_FILE_EXT = /midi|mid|mp3|pdf|jpe?g|png|webp|cap|capx|musicxml|mxl/;
const ALLOWED_PIECE_FILE_MIME = /audio\/(midi|mpeg|mp3)|application\/(pdf|octet-stream|xml|vnd\.recordare\.musicxml(\+xml)?)|image\/(jpeg|png|webp)|text\/xml/;

function createFileFilter(allowedExt, allowedMime) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowedExt.test(ext) && allowedMime.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed: ${allowedExt}`), false);
    }
  };
}

function memoryUpload(options = {}) {
  const limits = { fileSize: DEFAULT_FILE_SIZE, ...options.limits };
  const fileFilter = options.fileFilter || createFileFilter(ALLOWED_DATA_EXT, ALLOWED_DATA_MIME);
  return multer({ storage: multer.memoryStorage(), limits, fileFilter });
}

function diskUpload(subDir, options = {}) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../..', 'uploads', subDir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    }
  });
  const limits = { fileSize: DEFAULT_FILE_SIZE, ...options.limits };
  const fileFilter = options.fileFilter || createFileFilter(ALLOWED_IMAGE_EXT, ALLOWED_IMAGE_MIME);
  return multer({ storage, limits, fileFilter });
}

const ALLOWED_ATTACHMENT_EXT = /pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|mp3|zip/;
const ALLOWED_ATTACHMENT_MIME = /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-(excel|powerpoint)|zip|x-zip-compressed)|image\/(jpeg|png|gif|webp)|audio\/(mpeg|mp3)/;

module.exports = { memoryUpload, diskUpload, createFileFilter, ALLOWED_IMAGE_EXT, ALLOWED_IMAGE_MIME, ALLOWED_PIECE_FILE_EXT, ALLOWED_PIECE_FILE_MIME, ALLOWED_ATTACHMENT_EXT, ALLOWED_ATTACHMENT_MIME };
