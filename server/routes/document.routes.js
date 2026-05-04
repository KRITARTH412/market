import express from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  getVectorizationStatus
} from '../controllers/document.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { checkDocumentLimit, checkStorageLimit } from '../middleware/usageCheck.middleware.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 52428800 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'image/png', 
      'image/jpeg', 
      'audio/mpeg', 
      'audio/wav',
      'text/plain' // Added support for .txt files
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOCX, PNG, JPG, MP3, WAV, TXT'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Upload document
router.post(
  '/upload',
  authorize('upload'),
  uploadRateLimiter,
  checkDocumentLimit,
  upload.single('file'),
  checkStorageLimit,
  uploadDocument
);

// Get all documents
router.get('/', getDocuments);

// Get single document
router.get('/:id', getDocument);

// Delete document
router.delete('/:id', authorize('upload'), deleteDocument);

// Get vectorization status
router.get('/:id/vectorization', getVectorizationStatus);

export default router;
