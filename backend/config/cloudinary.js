import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                              !process.env.CLOUDINARY_CLOUD_NAME.includes('your_');

let storage;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'dating-app', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4'] }
  });
} else {
  console.log('Cloudinary not configured, using local storage fallback...');
  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
  
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  });
}

export const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
export { cloudinary };
