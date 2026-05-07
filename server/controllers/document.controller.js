import Document from '../models/Document.model.js';
import Organization from '../models/Organization.model.js';
import { uploadFile, deleteFile } from '../services/cloudinary.service.js';
import { parseDocument, vectorizeDocument } from '../services/documentProcessor.service.js';
import { createAuditLog } from '../middleware/auditLog.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendEmail, emailTemplates } from '../utils/email.utils.js';

// Upload document
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { projectId, category, tags } = req.body;

  // Verify the buffer is a valid PDF
  if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
    const header = req.file.buffer.slice(0, 4).toString('utf-8');
    console.log('📄 PDF header check:', header, '(should be %PDF)');
    if (!header.startsWith('%PDF')) {
      return res.status(400).json({ error: 'Invalid PDF file - file may be corrupted' });
    }
  }

  // Upload to Cloudinary
  const uploadResult = await uploadFile(
    req.file.buffer,
    req.file.originalname,
    req.organizationId,
    'documents'
  );

  console.log('📤 Upload result:', {
    filename: req.file.originalname,
    bufferSize: req.file.buffer.length,
    uploadedSize: uploadResult.bytes,
    url: uploadResult.url
  });

  // Parse document
  const fileType = req.file.originalname.split('.').pop().toLowerCase();
  let parsedData;
  
  try {
    parsedData = await parseDocument(req.file.buffer, fileType, req.file.originalname);
  } catch (error) {
    // If parsing fails, still save the document but mark it
    parsedData = { text: '', pageCount: 0, metadata: {} };
  }

  // Create document record
  const document = new Document({
    organizationId: req.organizationId,
    projectId: projectId || null,
    fileName: req.file.originalname,
    fileType,
    fileSize: req.file.size,
    cloudinaryUrl: uploadResult.url,
    cloudinaryPublicId: uploadResult.publicId,
    pageCount: parsedData.pageCount,
    uploadedBy: req.userId,
    category: category || 'other',
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    metadata: {
      extractedText: parsedData.text,
      ...parsedData.metadata
    }
  });

  await document.save();

  // Increment document count and storage
  await req.organization.incrementUsage('documentCount');
  await req.organization.incrementUsage('storageBytes', req.file.size);

  await createAuditLog('document.upload', req, { fileName: document.fileName }, 'document', document._id);

  // Start vectorization in background
  vectorizeDocument(document._id, req.organizationId, projectId)
    .then(() => {
      console.log(`✓ Document ${document.fileName} vectorized successfully`);
    })
    .catch(async (error) => {
      console.error('Vectorization failed:', error.message);
      // Don't send email for connection errors - likely temporary
      if (!error.message.includes('ECONNRESET') && !error.message.includes('network')) {
        const emailContent = emailTemplates.documentProcessingFailed(document.fileName, error.message);
        await sendEmail(req.user.email, emailContent.subject, emailContent.html);
      }
    });

  res.status(201).json({
    message: 'Document uploaded successfully',
    document: {
      id: document._id,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      url: document.cloudinaryUrl,
      vectorizationStatus: document.vectorizationStatus,
      createdAt: document.createdAt
    }
  });
});

// Get all documents
export const getDocuments = asyncHandler(async (req, res) => {
  const { projectId, category, vectorized } = req.query;

  const filter = {
    organizationId: req.organizationId,
    isDeleted: false
  };

  if (projectId) filter.projectId = projectId;
  if (category) filter.category = category;
  if (vectorized !== undefined) filter.vectorized = vectorized === 'true';

  const documents = await Document.find(filter)
    .populate('uploadedBy', 'name email')
    .populate('projectId', 'name')
    .sort({ createdAt: -1 });

  res.json({ documents });
});

// Get single document
export const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  })
    .populate('uploadedBy', 'name email')
    .populate('projectId', 'name');

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json({ document });
});

// Delete document
export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Delete from Cloudinary
  await deleteFile(document.cloudinaryPublicId);

  // Delete vectors from MongoDB
  if (document.vectorized) {
    const { deleteVectorsByDocument } = await import('../services/vector.service.js');
    await deleteVectorsByDocument(req.organizationId, document._id);
  }

  // Soft delete
  document.isDeleted = true;
  await document.save();

  // Decrement counts
  const organization = await Organization.findById(req.organizationId);
  if (organization.usage.documentCount > 0) {
    organization.usage.documentCount--;
  }
  if (organization.usage.storageBytes >= document.fileSize) {
    organization.usage.storageBytes -= document.fileSize;
  }
  await organization.save();

  await createAuditLog('document.delete', req, { fileName: document.fileName }, 'document', document._id);

  res.json({ message: 'Document deleted successfully' });
});

// Get vectorization status
export const getVectorizationStatus = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json({
    status: document.vectorizationStatus,
    vectorized: document.vectorized,
    chunkCount: document.chunkCount,
    error: document.vectorizationError
  });
});

// Download document
export const downloadDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    organizationId: req.organizationId,
    isDeleted: false
  });

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Redirect to Cloudinary URL for direct download
  res.redirect(document.cloudinaryUrl);
});
