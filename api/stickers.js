const express = require('express');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { authenticateJWT } = require('../auth');
const { User, Sticker, UserProfileSticker } = require('../database');
const sharp = require('sharp');
const { Op } = require('sequelize');

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

// get user's custom stickers from db, only return those that exist in cloudinary folder listing, and also include cloudinary-only stickers
router.get('/custom', authenticateJWT, async (req, res) => {
  try {
    // fetch all custom stickers from cloudinary folder
    const cloudinaryResult = await cloudinary.search
      .expression('folder:"TTP-Capstone 2/Custom"')
      .max_results(100)
      .execute();
    const cloudinaryPublicIds = new Set(cloudinaryResult.resources.map(r => r.public_id));
    // fetch all db stickers for user
    const userStickers = await Sticker.findAll({
      where: {
        type: 'custom',
        uploadedBy: req.user.id
      },
      order: [['createdAt', 'DESC']]
    });
    // keep only db stickers that exist in cloudinary folder
    const stickersWithCloudinary = [];
    const stickersToDelete = [];
    for (const sticker of userStickers) {
      if (cloudinaryPublicIds.has(sticker.cloudinaryPublicId)) {
        stickersWithCloudinary.push({
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
          uploadedBy: sticker.uploadedBy,
          missingInDb: false
        });
      } else {
        stickersToDelete.push(sticker.id);
      }
    }
    // delete db records for stickers missing from cloudinary
    if (stickersToDelete.length > 0) {
      await Sticker.destroy({ where: { id: stickersToDelete } });
    }
    // add cloudinary-only stickers
    const dbPublicIds = new Set(userStickers.map(s => s.cloudinaryPublicId));
    const cloudinaryOnly = cloudinaryResult.resources
      .filter(resource => !dbPublicIds.has(resource.public_id))
      .map(resource => ({
        id: resource.public_id,
        name: resource.display_name || resource.public_id.split('/').pop(),
        url: resource.secure_url,
        type: 'custom',
        width: resource.width,
        height: resource.height,
        format: resource.format,
        sizeBytes: resource.bytes,
        cloudinaryPublicId: resource.public_id,
        createdAt: resource.created_at,
        uploadedBy: req.user.id,
        missingInDb: true
      }));
    // combine both lists
    res.json([...stickersWithCloudinary, ...cloudinaryOnly]);
  } catch (error) {
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

// new: delete custom sticker via POST -- i couldnt get the DELETE method to work with cloudinary
router.post('/custom/delete', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'id is required in request body' });
    }
    const userId = req.user.id;
    const decodedId = decodeURIComponent(id);
    const filenameOnly = decodedId.split('/').pop();
    const allUserStickers = await Sticker.findAll({
      where: { uploadedBy: userId, type: 'custom' },
      attributes: ['cloudinaryPublicId', 'url', 'name', 'id']
    });
    const allIds = allUserStickers.map(s => s.cloudinaryPublicId);
    const allFilenames = allUserStickers.map(s => s.cloudinaryPublicId.split('/').pop());
    const allUrls = allUserStickers.map(s => s.url);
    // try to match by full path, filename, or url
    const { Op } = require('sequelize');
    const sticker = await Sticker.findOne({
      where: {
        [Op.and]: [
          { uploadedBy: userId },
          { type: 'custom' },
          {
            [Op.or]: [
              { cloudinaryPublicId: decodedId },
              { cloudinaryPublicId: filenameOnly },
              { url: decodedId },
              { url: filenameOnly }
            ]
          }
        ]
      }
    });
    if (!sticker) {
      return res.status(404).json({
        error: 'sticker not found',
        debug: {
          searchedId: id,
          decodedId,
          filenameOnly,
          allCloudinaryPublicIds: allIds,
          allFilenames,
          allUrls
        }
      });
    }
    try {
      await cloudinary.uploader.destroy(sticker.cloudinaryPublicId);
      await sticker.destroy();
      res.json({
        message: 'sticker deleted successfully',
        deletedSticker: {
          id: sticker.cloudinaryPublicId,
          name: sticker.name
        }
      });
    } catch (deleteError) {
      res.status(500).json({
        error: 'failed to delete sticker in cloudinary or db',
        details: deleteError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'failed to delete sticker',
      details: error.message
    });
  }
});

// Get all stickers (presets + custom) for the logged-in user
router.get('/profile/stickers/my', authenticateJWT, async (req, res) => {
  try {
    // Preset stickers from Cloudinary
    const presetResult = await cloudinary.search
      .expression('folder:"TTP-Capstone 2/Preset"/*')
      .max_results(100)
      .execute();
    const presetStickers = presetResult.resources.map(resource => ({
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
    }));
    // Custom stickers from DB for user
    const customStickers = await Sticker.findAll({
      where: { type: 'custom', uploadedBy: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    const customStickerObjs = customStickers.map(sticker => ({
      id: sticker.cloudinaryPublicId,
      name: sticker.name,
      url: sticker.url,
      type: sticker.type,
      width: sticker.width,
      height: sticker.height,
      format: sticker.format,
      sizeBytes: sticker.sizeBytes,
      cloudinaryPublicId: sticker.cloudinaryPublicId,
      createdAt: sticker.createdAt
    }));
    res.json([...presetStickers, ...customStickerObjs]);
  } catch (error) {
    console.error('Error fetching my stickers:', error);
    res.status(500).json({ error: 'Failed to fetch stickers' });
  }
});

// Save user's sticker layout
router.post('/profile/me/stickers', authenticateJWT, async (req, res) => {
  // Log authenticated user
  console.log('Authenticated user:', req.user);
  // Log received payload
  console.log('Received sticker placements payload:', JSON.stringify(req.body, null, 2));
  try {
    // Fetch user record by username
    const userRecord = await User.findOne({ where: { username: req.user.username } });
    if (!userRecord) {
      return res.status(400).json({ error: 'User not found for sticker placement' });
    }
    const userId = userRecord.id;
    const placements = req.body;
    if (!Array.isArray(placements)) {
      return res.status(400).json({ error: 'Body must be an array of sticker placements' });
    }
    // Remove all previous placements for this user before saving new ones
    await UserProfileSticker.destroy({ where: { userId } });
    // Insert new layout
    const created = [];
    let invalidCount = 0;
    for (const placement of placements) {
      // Log each placement
      console.log('Processing placement:', placement);
      // Try both preset and custom sticker paths
      const presetPath = `TTP-Capstone 2/Preset/${placement.stickerId}`;
      const customPath = `TTP-Capstone 2/Custom/${placement.stickerId}`;
      let stickerRecord = await Sticker.findOne({ where: { cloudinaryPublicId: presetPath } });
      if (!stickerRecord) {
        stickerRecord = await Sticker.findOne({ where: { cloudinaryPublicId: customPath } });
      }
      if (!stickerRecord) {
        // Try direct match (in case stickerId is already a full path)
        stickerRecord = await Sticker.findOne({ where: { cloudinaryPublicId: placement.stickerId } });
      }
      if (!stickerRecord) {
        // Try partial match (for legacy or fallback)
        stickerRecord = await Sticker.findOne({ where: { cloudinaryPublicId: { [Op.like]: `%${placement.stickerId}` } } });
      }
      if (!userId || !stickerRecord || !stickerRecord.id) {
        console.error('Missing userId or stickerId:', { userId, stickerId: placement.stickerId, placement });
        invalidCount++;
        continue; // skip invalid placement
      }
      // Validate positionX and positionY
      if (typeof placement.x !== 'number' || typeof placement.y !== 'number') {
        console.error('Invalid positionX or positionY:', { x: placement.x, y: placement.y });
        invalidCount++;
        continue;
      }
      // Validate scale, rotation, zIndex
      if (typeof placement.scale !== 'number' || typeof placement.rotation !== 'number' || typeof placement.zIndex !== 'number') {
        console.error('Invalid scale/rotation/zIndex:', { scale: placement.scale, rotation: placement.rotation, zIndex: placement.zIndex });
        invalidCount++;
        continue;
      }
      // Save sticker placement (no deduplication)
      try {
        const newSticker = await UserProfileSticker.create({
          userId: userId,
          stickerId: stickerRecord.id,
          positionX: placement.x,
          positionY: placement.y,
          rotation: placement.rotation,
          scale: placement.scale,
          zIndex: placement.zIndex
        });
        created.push(newSticker);
      } catch (err) {
        console.error('Error creating sticker placement:', err);
        invalidCount++;
      }
    }
    // Log number of placements created
    console.log(`Sticker placements created: ${created.length}, invalid: ${invalidCount}`);
    if (created.length === 0) {
      return res.status(400).json({ error: 'No valid sticker placements to save', invalidCount });
    }
    res.json({ message: 'Sticker layout saved', count: created.length, invalidCount });
  } catch (error) {
    console.error('Error saving sticker layout:', error);
    res.status(500).json({ error: 'Failed to save sticker layout' });
  }
});

// Get public user's sticker layout
router.get('/profile/:username/stickers', async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.params.username } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const placements = await UserProfileSticker.findAll({
      where: { userId: user.id },
      include: [{ model: Sticker, as: 'sticker' }],
      order: [['zIndex', 'ASC']]
    });
    const result = placements.map(p => ({
      stickerId: p.stickerId,
      x: p.positionX,
      y: p.positionY,
      rotation: p.rotation,
      scale: p.scale,
      zIndex: p.zIndex,
      imageUrl: p.sticker ? p.sticker.url : null,
      name: p.sticker ? p.sticker.name : null,
      type: p.sticker ? p.sticker.type : null
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching public sticker layout:', error);
    res.status(500).json({ error: 'Failed to fetch sticker layout' });
  }
});

// Sync all preset stickers from Cloudinary into the stickers table
router.post('/sync-presets', async (req, res) => {
  try {
    const cloudinaryResult = await cloudinary.search
      .expression('folder:"TTP-Capstone 2/Preset"/*')
      .max_results(100)
      .execute();
    const presetStickers = cloudinaryResult.resources;
    let created = 0;
    let skipped = 0;
    for (const resource of presetStickers) {
      // Check if sticker already exists in DB
      const existing = await Sticker.findOne({ where: { cloudinaryPublicId: resource.public_id } });
      if (existing) {
        skipped++;
        continue;
      }
      // Insert new sticker
      await Sticker.create({
        name: resource.display_name || resource.public_id.split('/').pop(),
        url: resource.secure_url,
        cloudinaryPublicId: resource.public_id,
        type: 'preset',
        category: 'general',
        width: resource.width,
        height: resource.height,
        format: resource.format,
        sizeBytes: resource.bytes
      });
      created++;
    }
    res.json({ message: 'Preset stickers synced', created, skipped });
  } catch (error) {
    console.error('Error syncing preset stickers:', error);
    res.status(500).json({ error: 'Failed to sync preset stickers', details: error.message });
  }
});

// new: get my sticker placements
router.get('/profile/me/stickers', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.user.username } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const placements = await UserProfileSticker.findAll({
      where: { userId: user.id },
      include: [{ model: Sticker, as: 'sticker' }],
      order: [['zIndex', 'ASC']]
    });
    const result = placements.map(p => ({
      stickerId: p.stickerId,
      x: p.positionX,
      y: p.positionY,
      rotation: p.rotation,
      scale: p.scale,
      zIndex: p.zIndex,
      imageUrl: p.sticker ? p.sticker.url : null,
      name: p.sticker ? p.sticker.name : null,
      type: p.sticker ? p.sticker.type : null
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching my sticker placements:', error);
    res.status(500).json({ error: 'Failed to fetch sticker placements' });
  }
});

module.exports = router;