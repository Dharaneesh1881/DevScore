import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

function assertCloudinaryConfig() {
  const required = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary env vars: ${missing.join(', ')}`);
  }
}

export function uploadBufferToCloudinary(buffer, options = {}) {
  assertCloudinaryConfig();

  const {
    folder = 'uploads',
    resourceType = 'auto',
    publicId,
    transformation,
    format,
    overwrite = true
  } = options;

  const uploadOptions = {
    folder,
    resource_type: resourceType,
    overwrite
  };
  if (publicId) uploadOptions.public_id = publicId;
  if (transformation) uploadOptions.transformation = transformation;
  if (format) uploadOptions.format = format;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err) return reject(err);
      return resolve(result);
    });
    stream.end(buffer);
  });
}

export async function uploadScreenshot(buffer, folder, publicId) {
  const result = await uploadBufferToCloudinary(buffer, {
    folder,
    publicId,
    resourceType: 'image',
    format: 'png',
    overwrite: true
  });
  return result.secure_url;
}

export async function downloadImageAsBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadRawText(text, folder, publicId) {
  assertCloudinaryConfig();
  const buffer = Buffer.from(text, 'utf8');
  const result = await uploadBufferToCloudinary(buffer, {
    folder,
    publicId,
    resourceType: 'raw',
    overwrite: true
  });
  return result.secure_url;
}

export { cloudinary };
