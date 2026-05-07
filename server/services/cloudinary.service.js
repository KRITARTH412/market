import { v2 as cloudinary } from 'cloudinary';

// Lazy-load Cloudinary configuration
let isConfigured = false;

const configureCloudinary = () => {
  if (!isConfigured) {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary environment variables are not set');
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    isConfigured = true;
  }
  return cloudinary;
};

// Upload file from buffer
export const uploadFile = async (buffer, filename, organizationId, folder = 'documents') => {
  try {
    const client = configureCloudinary();

    const ext = filename.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const resourceType = imageExts.includes(ext) ? 'image' : 'raw';

    // For images, Cloudinary auto-appends the extension so strip it from public_id.
    // For raw files (PDF, DOCX, etc.), Cloudinary does NOT append the extension,
    // so we must keep it in public_id to get a usable URL.
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const publicId = resourceType === 'image'
      ? `${Date.now()}-${nameWithoutExt}`
      : `${Date.now()}-${nameWithoutExt}.${ext}`;

    // Convert buffer to data URL - most reliable for binary files
    const base64 = buffer.toString('base64');
    const dataUrl = `data:application/octet-stream;base64,${base64}`;

    const result = await client.uploader.upload(dataUrl, {
      folder: `propmind/${organizationId}/${folder}`,
      resource_type: resourceType,
      public_id: publicId,
      type: 'upload',
      context: {
        organizationId: organizationId.toString()
      }
    });

    // For raw files, generate a signed URL to avoid 401 errors
    let url = result.secure_url;
    if (resourceType === 'raw') {
      url = client.url(result.public_id, {
        resource_type: 'raw',
        type: 'upload',
        secure: true,
        sign_url: true
      });
    }

    return {
      url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file');
  }
};

// Delete file
export const deleteFile = async (publicId, resourceType = 'raw') => {
  try {
    const client = configureCloudinary();
    const result = await client.uploader.destroy(publicId, { resource_type: resourceType });
    return { success: result.result === 'ok' };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file');
  }
};

// Get file URL
export const getFileUrl = (publicId, transformation = {}) => {
  const client = configureCloudinary();
  return client.url(publicId, {
    secure: true,
    ...transformation
  });
};

// Upload image with transformations
export const uploadImage = async (buffer, filename, organizationId, folder = 'images') => {
  try {
    const client = configureCloudinary();
    
    // Convert buffer to base64 data URI
    const base64Data = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
    
    const result = await client.uploader.upload(base64Data, {
      folder: `propmind/${organizationId}/${folder}`,
      resource_type: 'image',
      public_id: `${Date.now()}-${filename.replace(/\.[^/.]+$/, '')}`,
      transformation: [
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ],
      context: {
        organizationId: organizationId.toString()
      }
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary image upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Generate thumbnail
export const generateThumbnail = (publicId, width = 200, height = 200) => {
  const client = configureCloudinary();
  return client.url(publicId, {
    secure: true,
    transformation: [
      { width, height, crop: 'fill' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
};

export default cloudinary;
