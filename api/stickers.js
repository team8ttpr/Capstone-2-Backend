const express = require('express');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { authenticateJWT } = require('../auth');
const { Sticker } = require('../database');
const sharp = require('sharp');

const router = express.Router();
// multer for uploads, accepts any field name
const createUploadMiddleware = () => {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10mb max
    },
    fileFilter: (req, file, cb) => {
      console.log('File upload details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        fieldname: file.fieldname
      });
      // allow common image types
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/x-icon',
        'image/vnd.microsoft.icon'
      ];
      if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error(`File type not supported: ${file.mimetype}. please upload an image file.`), false);
      }
    },
  }).any();
};

// get preset stickers from cloudinary preset folder
router.get('/presets', async (req, res) => {
  try {
    const cloudinaryResult = await cloudinary.search
      .expression('folder:"TTP-Capstone 2/Preset"/*')
      .max_results(100)
      .execute();
    const presetStickers = cloudinaryResult.resources.map(resource => {
      return {
        id: resource.public_id,
        name: resource.display_name || resource.public_id.split('/').pop(),
        url: resource.secure_url,
        type: 'preset',
        width: resource.width,
        height: resource.height,
        format: resource.format,
        sizeBytes: resource.bytes,
        cloudinaryPublicId: resource.public_id,
        createdAt: resource.created_at
      };
    });
    res.json(presetStickers);
  } catch (error) {
    console.error('Error fetching preset stickers from Cloudinary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch preset stickers',
      details: error.message 
    });
  }
});

// get user's custom stickers from db
router.get('/custom', authenticateJWT, async (req, res) => {
  try {
    const userStickers = await Sticker.findAll({
      where: {
        type: 'custom',
        uploadedBy: req.user.id
      },
      order: [['createdAt', 'DESC']]
    });
    const customStickers = userStickers.map(sticker => ({
      id: sticker.cloudinaryPublicId,
      name: sticker.name,
      url: sticker.url,
      type: sticker.type,
      width: sticker.width,
      height: sticker.height,
      format: sticker.format,
      sizeBytes: sticker.sizeBytes,
      cloudinaryPublicId: sticker.cloudinaryPublicId,
      createdAt: sticker.createdAt,
      uploadedBy: sticker.uploadedBy
    }));
    res.json(customStickers);
  } catch (error) {
    console.error('Error fetching user custom stickers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch custom stickers',
      details: error.message 
    });
  }
});

// upload custom sticker
router.post('/upload', authenticateJWT, (req, res, next) => {
  const uploadMiddleware = createUploadMiddleware();
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ 
        error: 'File upload error', 
        details: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const imageFile = req.files && req.files.length > 0 ? req.files[0] : null;
    if (!imageFile) {
      return res.status(400).json({ 
        error: 'No image file provided',
        debug: {
          files: req.files,
          fileCount: req.files ? req.files.length : 0
        }
      });
    }
    if (!process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ 
        error: 'Server configuration error: Cloudinary credentials not set' 
      });
    }
    const timestamp = Date.now();
    const publicId = `custom_sticker_${req.user.id}_${timestamp}`;
    const cloudinaryResult = await cloudinary.uploader.upload(
      `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`,
      {
        folder: 'TTP-Capstone 2/Custom',
        public_id: publicId,
        resource_type: 'image',
        format: 'png',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      }
    );
    const sticker = await Sticker.create({
      name: req.body.name || `Custom Sticker ${timestamp}`,
      url: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      type: 'custom',
      category: req.body.category || 'general',
      uploadedBy: req.user.id,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      sizeBytes: cloudinaryResult.bytes
    });
    res.status(201).json({
      message: 'Sticker uploaded successfully',
      sticker: {
        id: sticker.id,
        name: sticker.name,
        url: sticker.url,
        type: sticker.type,
        width: sticker.width,
        height: sticker.height,
        format: sticker.format,
        cloudinaryPublicId: sticker.cloudinaryPublicId,
        createdAt: sticker.createdAt
      }
    });
  } catch (error) {
    console.error('Error uploading sticker:', error);
    res.status(500).json({ 
      error: 'Failed to upload sticker',
      details: error.message 
    });
  }
});

// upload sticker with ai background removal
router.post('/upload-with-bg-removal', authenticateJWT, (req, res, next) => {
  const uploadMiddleware = createUploadMiddleware();
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Upload error (BG Removal):', err);
      return res.status(400).json({ 
        error: 'File upload error', 
        details: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const imageFile = req.files && req.files.length > 0 ? req.files[0] : null;
    if (!imageFile) {
      return res.status(400).json({ 
        error: 'No image file provided',
        debug: {
          files: req.files,
          fileCount: req.files ? req.files.length : 0
        }
      });
    }
    if (!process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ 
        error: 'Server configuration error: Cloudinary credentials not set' 
      });
    }
    const timestamp = Date.now();
    const publicId = `bg_removed_sticker_${req.user.id}_${timestamp}`;
    let uploadBuffer = imageFile.buffer;
    let uploadMimetype = imageFile.mimetype;
    // if gif, convert to png
    if (imageFile.mimetype === 'image/gif') {
      try {
        const pngBuffer = await sharp(imageFile.buffer, { animated: false })
          .png()
          .toBuffer();
        uploadBuffer = pngBuffer;
        uploadMimetype = 'image/png';
      } catch (sharpError) {
        console.error('Error converting GIF to PNG:', sharpError);
        return res.status(500).json({
          error: 'Failed to convert GIF to PNG for background removal',
          details: sharpError.message
        });
      }
    }
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(
        `data:${uploadMimetype};base64,${uploadBuffer.toString('base64')}`,
        {
          folder: 'TTP-Capstone 2/Custom',
          public_id: publicId,
          resource_type: 'image',
          format: 'png',
          background_removal: 'cloudinary_ai',
          transformation: [
            { quality: 'auto' },
            { effect: 'outline:2' }
          ]
        }
      );
      console.log('Cloudinary upload result:', cloudinaryResult);
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      return res.status(500).json({
        error: 'Cloudinary upload failed',
        details: cloudinaryError.message || cloudinaryError
      });
    }
    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      return res.status(500).json({
        error: 'Cloudinary did not return a valid result',
        details: cloudinaryResult
      });
    }
    // save to db so /custom returns it
    let sticker;
    try {
      sticker = await Sticker.create({
        name: req.body.name || `BG Removed Sticker ${timestamp}`,
        url: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        type: 'custom',
        category: req.body.category || 'background-removed',
        uploadedBy: req.user.id,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        sizeBytes: cloudinaryResult.bytes
      });
    } catch (dbError) {
      console.error('Error saving sticker to database:', dbError);
      return res.status(500).json({
        error: 'Failed to save sticker to database',
        details: dbError.message,
        cloudinaryResult
      });
    }
    res.status(201).json({
      message: 'Sticker uploaded with background removal successfully',
      sticker: {
        id: sticker.id,
        name: sticker.name,
        url: sticker.url,
        type: sticker.type,
        width: sticker.width,
        height: sticker.height,
        format: sticker.format,
        cloudinaryPublicId: sticker.cloudinaryPublicId,
        createdAt: sticker.createdAt
      },
      cloudinaryResult // for debug
    });
  } catch (error) {
    console.error('Error uploading sticker with background removal:', error);
    res.status(500).json({ 
      error: 'Failed to upload sticker with background removal',
      details: error.message 
    });
  }
});

// delete a custom sticker
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    // decode and extract filename
    const decodedId = decodeURIComponent(id);
    const filenameOnly = decodedId.split('/').pop();
    // find sticker by filename only
    const sticker = await Sticker.findOne({
      where: {
        cloudinaryPublicId: filenameOnly,
        uploadedBy: userId,
        type: 'custom'
      }
    });
    if (!sticker) {
      return res.status(404).json({
        error: 'Sticker not found',
        debug: {
          searchedId: id,
          decodedId: decodedId,
          filenameOnly: filenameOnly
        }
      });
    }
    // delete from cloudinary
    try {
      await cloudinary.uploader.destroy(sticker.cloudinaryPublicId);
    } catch (cloudinaryError) {
      // ignore cloudinary errors
    }
    // delete from db
    await sticker.destroy();
    res.json({
      message: 'Sticker deleted successfully',
      deletedSticker: {
        id: sticker.cloudinaryPublicId,
        name: sticker.name
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete sticker',
      details: error.message
    });
  }
});

module.exports = router;