const multer = require('multer');
const path = require('path');

const DEFAULT_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function memoryUpload(options = {}) {
  const limits = { fileSize: DEFAULT_FILE_SIZE, ...options.limits };
  return multer({ storage: multer.memoryStorage(), limits });
}

function diskUpload(subDir, options = {}) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../..', 'uploads', subDir));
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    }
  });
  const limits = { fileSize: DEFAULT_FILE_SIZE, ...options.limits };
  return multer({ storage, limits });
}

module.exports = { memoryUpload, diskUpload };
