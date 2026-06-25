import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import unzipper from 'unzipper';
import { requireAuth } from '../middleware/auth.js';
import { uploadBufferToCloudinary } from '../utils/cloudinary.js';
import { validateAndNormalizeFiles, ProjectFilesError } from '../utils/projectFiles.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const projectZipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

function runSingleUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

function runProjectZipUpload(req, res) {
  return new Promise((resolve, reject) => {
    projectZipUpload.single('zip')(req, res, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

async function extractProjectFilesFromZip(buffer) {
  const archive = await unzipper.Open.buffer(buffer);
  const extracted = [];

  for (const entry of archive.files) {
    if (entry.type !== 'File') continue;
    if (entry.path.startsWith('__MACOSX/')) continue;

    const name = path.basename(entry.path);
    if (!name || name.startsWith('.')) continue;

    const content = (await entry.buffer()).toString('utf8');
    extracted.push({ name, content });
  }

  return validateAndNormalizeFiles(extracted);
}

router.post('/project-files/zip', requireAuth, async (req, res) => {
  try {
    await runProjectZipUpload(req, res);

    if (!req.file) {
      return res.status(400).json({ error: 'zip file is required' });
    }

    const normalized = await extractProjectFilesFromZip(req.file.buffer);
    return res.json({
      files: normalized.files,
      warnings: normalized.warnings
    });
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'ZIP file exceeds 5MB limit' });
    }

    if (error instanceof ProjectFilesError) {
      return res.status(error.status).json({ error: error.message, details: error.details || [] });
    }

    console.error('Project ZIP upload failed:', error);
    return res.status(500).json({ error: error.message || 'ZIP upload failed' });
  }
});

router.post('/uploads', requireAuth, async (req, res) => {
  try {
    await runSingleUpload(req, res);

    const title = typeof req.body.title === 'string' ? req.body.title : '';
    const description = typeof req.body.description === 'string' ? req.body.description : '';
    const tag = typeof req.body.tag === 'string' ? req.body.tag : '';

    if (!req.file && !title.trim() && !description.trim()) {
      return res.status(400).json({
        error: 'Post must have a title, description, or an attachment'
      });
    }

    let uploadResult = null;
    let fileType = 'text';

    if (req.file) {
      const isVideo = (req.file.mimetype || '').startsWith('video/');
      fileType = isVideo ? 'video' : 'image';

      uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
        resourceType: 'auto',
        folder: isVideo ? 'videos' : 'images',
        transformation: isVideo ? undefined : [
          { width: 500, crop: 'scale' },
          { quality: 'auto:best' },
          { fetch_format: 'auto' }
        ]
      });
    }

    return res.status(201).json({
      message: uploadResult ? 'File uploaded successfully' : 'Post created successfully',
      post: {
        userId: req.user.id,
        title,
        description,
        tags: tag,
        url: uploadResult?.secure_url ?? null,
        type: uploadResult?.resource_type ?? 'text',
        time: uploadResult?.created_at ?? new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File exceeds 50MB limit' });
    }

    if (error?.http_code) {
      console.error('Cloudinary upload failed:', error);
      return res.status(500).json({ error: `Cloudinary upload failed: ${error.message}` });
    }

    console.error('Upload route error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

export default router;
