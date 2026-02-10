const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DEFAULT_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CSV_FILE_SIZE = 2 * 1024 * 1024; // 2MB for CSV
const IMAGE_FILE_SIZE = 2 * 1024 * 1024; // 2MB for images
const PDF_FILE_SIZE = 5 * 1024 * 1024; // 5MB for PDFs
const BACKUP_FILE_SIZE = 50 * 1024 * 1024; // 50MB for backups

const ALLOWED_IMAGE_EXT = /jpeg|jpg|png|gif|webp/;
const ALLOWED_IMAGE_MIME = /image\/(jpeg|png|gif|webp)/;

const ALLOWED_DATA_EXT = /csv|json/;
const ALLOWED_DATA_MIME = /text\/csv|application\/csv|application\/json|text\/plain|text\/x-csv|application\/x-csv/;

// Dangerous MIME types that should never be allowed
const DANGEROUS_MIME = /application\/(x-msdownload|x-executable|x-dosexec|x-msdos-program|x-sh|x-bat|x-perl|x-python-code|x-ruby|x-shellscript)/;

const ALLOWED_PIECE_FILE_EXT = /midi|mid|mp3|pdf|jpe?g|png|webp|cap|capx|musicxml|mxl/;
const ALLOWED_PIECE_FILE_MIME = /audio\/(midi|mpeg|mp3)|application\/(pdf|octet-stream|xml|vnd\.recordare\.musicxml(\+xml)?)|image\/(jpeg|png|webp)|text\/xml/;

function createFileFilter(allowedExt, allowedMime) {
  return (req, file, cb) => {
    // Block dangerous MIME types immediately
    if (DANGEROUS_MIME.test(file.mimetype)) {
      return cb(new Error('Dangerous file type detected'), false);
    }

    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

    // Sanitize extension to prevent path traversal
    const sanitizedExt = ext.replace(/[^a-z0-9]/g, '');
    if (sanitizedExt.length === 0 || sanitizedExt.length > 10) {
      return cb(new Error('Invalid file extension'), false);
    }

    // CSV files: Check extension AND MIME type (be lenient but not permissive)
    if (sanitizedExt === 'csv') {
      // Accept common CSV MIME types but reject suspicious ones
      const csvMimes = /^(text\/(csv|plain|x-csv)|application\/(csv|x-csv|vnd\.ms-excel))$/;
      if (!csvMimes.test(file.mimetype)) {
        return cb(new Error('Invalid MIME type for CSV file'), false);
      }
      return cb(null, true);
    }

    // For other files: Check both extension and MIME type
    if (allowedExt.test(sanitizedExt) && allowedMime.test(file.mimetype)) {
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
      // Sanitize extension to prevent path traversal
      const ext = path.extname(file.originalname).toLowerCase();
      const sanitizedExt = ext.replace(/[^a-z0-9.]/g, '').slice(0, 10);
      cb(null, unique + sanitizedExt);
    }
  });
  const limits = { fileSize: DEFAULT_FILE_SIZE, ...options.limits };
  const fileFilter = options.fileFilter || createFileFilter(ALLOWED_IMAGE_EXT, ALLOWED_IMAGE_MIME);
  return multer({ storage, limits, fileFilter });
}

const ALLOWED_ATTACHMENT_EXT = /pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|mp3|zip/;
const ALLOWED_ATTACHMENT_MIME = /application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-(excel|powerpoint)|zip|x-zip-compressed)|image\/(jpeg|png|gif|webp)|audio\/(mpeg|mp3)/;

module.exports = {
  memoryUpload,
  diskUpload,
  createFileFilter,
  ALLOWED_IMAGE_EXT,
  ALLOWED_IMAGE_MIME,
  ALLOWED_PIECE_FILE_EXT,
  ALLOWED_PIECE_FILE_MIME,
  ALLOWED_ATTACHMENT_EXT,
  ALLOWED_ATTACHMENT_MIME,
  CSV_FILE_SIZE,
  IMAGE_FILE_SIZE,
  PDF_FILE_SIZE,
  BACKUP_FILE_SIZE,
  DEFAULT_FILE_SIZE
};
