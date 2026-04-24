import express from 'express';
import { upload, cloudinary } from '../config/cloudinary.js';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Helper: get public URL from uploaded file
function getFileUrl(file, req) {
  // Cloudinary returns a full URL in file.path
  if (file.path && file.path.startsWith('http')) return file.path;
  // Local storage: build URL from filename
  const filename = file.filename || file.path?.split(/[\\/]/).pop();
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${filename}`;
}

// Upload single profile photo — POST /api/upload/photo
router.post('/photo', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = getFileUrl(req.file, req);
    console.log('[PHOTO UPLOAD] Single photo URL:', url);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { photos: { $each: [url], $position: 0 } } },
      { new: true }
    ).select('photos');
    res.json({ url, photos: user.photos });
  } catch (err) {
    console.error('[PHOTO UPLOAD] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Upload photos (up to 6) — POST /api/upload/photos
router.post('/photos', protect, upload.array('photos', 6), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: 'No files uploaded' });
    const urls = req.files.map(f => getFileUrl(f, req));
    console.log('[PHOTO UPLOAD] Multi URLs:', urls);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { photos: { $each: urls } } },
      { new: true }
    ).select('photos');
    res.json({ photos: user.photos });
  } catch (err) {
    console.error('[PHOTO UPLOAD] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Delete a photo
router.delete('/photos', protect, async (req, res) => {
  try {
    const { url } = req.body;
    const publicId = url.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`dating-app/${publicId}`);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { photos: url } },
      { new: true }
    ).select('photos');
    res.json({ photos: user.photos });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload video
router.post('/video', protect, upload.single('video'), async (req, res) => {
  try {
    const url = req.file.path;
    await User.findByIdAndUpdate(req.user._id, { video: url });
    res.json({ video: url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload verification selfie
router.post('/verify', protect, upload.single('selfie'), async (req, res) => {
  try {
    const url = req.file.path;
    await User.findByIdAndUpdate(req.user._id, { verified: true, verificationPhoto: url });
    res.json({ verified: true, url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
