import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

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
    return new Promise((resolve, reject) => {
      const uploadStream = client.uploader.upload_stream(
        {
          folder: `propmind/${organizationId}/${folder}`,
          resource_type: 'auto',
          public_id: `${Date.now()}-${filename}`,
          context: {
            organizationId: organizationId.toString()
          }
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              bytes: result.bytes,
              resourceType: result.resource_type
            });
          }
        }
      );

      // Convert buffer to stream and pipe to Cloudinary
      const readableStream = Readable.from(buffer);
      readableStream.pipe(uploadStream);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file');
  }
};

// Delete file
export const deleteFile = async (publicId) => {
  try {
    const client = configureCloudinary();
    const result = await client.uploader.destroy(publicId);
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
    return new Promise((resolve, reject) => {
      const uploadStream = client.uploader.upload_stream(
        {
          folder: `propmind/${organizationId}/${folder}`,
          resource_type: 'image',
          public_id: `${Date.now()}-${filename}`,
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ],
          context: {
            organizationId: organizationId.toString()
          }
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              bytes: result.bytes,
              width: result.width,
              height: result.height
            });
          }
        }
      );

      const readableStream = Readable.from(buffer);
      readableStream.pipe(uploadStream);
    });
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
