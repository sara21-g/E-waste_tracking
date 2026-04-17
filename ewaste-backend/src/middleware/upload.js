const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createUploadDir = (dir) => {
  const fullPath = path.join(__dirname, '../../uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'general';
    if (file.fieldname === 'profileImage') folder = 'profiles';
    else if (file.fieldname === 'wasteImages') folder = 'waste';
    else if (file.fieldname === 'documents') folder = 'documents';
    else if (file.fieldname === 'logo') folder = 'logos';
    const uploadPath = createUploadDir(folder);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedDocTypes = /pdf|doc|docx/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (file.fieldname === 'documents') {
    if (allowedDocTypes.test(ext) || allowedImageTypes.test(ext)) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed for documents'), false);
  }

  if (allowedImageTypes.test(ext)) {
    return cb(null, true);
  }
  cb(new Error('Only JPG, PNG, WEBP image files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 }
});

module.exports = upload;
