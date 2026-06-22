const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const createStorage = (folder) => {
  const uploadPath = path.join(__dirname, '..', 'uploads', folder);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
  });
};

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, webp, gif) are allowed'), false);
  }
};

const pdfFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase() === '.pdf';
  const mimetype = file.mimetype === 'application/pdf';
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const imagesStorage = useCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: { folder: 'portfolio/projects', allowed_formats: ['jpeg', 'jpg', 'png', 'webp', 'gif'], transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }] }
    })
  : createStorage('projects');

const certificateStorage = useCloudinary
  ? new CloudinaryStorage({
      cloudinary,
      params: { folder: 'portfolio/certificates', allowed_formats: ['jpeg', 'jpg', 'png', 'webp', 'gif'], transformation: [{ width: 800, quality: 'auto' }] }
    })
  : createStorage('certificates');

const uploadProjectImages = multer({ storage: imagesStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }).array('images', 5);

const uploadCertificateImage = multer({ storage: certificateStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single('image');

const uploadResume = multer({ storage: createStorage('resume'), fileFilter: pdfFilter, limits: { fileSize: 10 * 1024 * 1024 } }).single('resume');

module.exports = { uploadProjectImages, uploadCertificateImage, uploadResume };
