const express = require('express');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

// GET /api/stickers/presets -  from "TTP-Capstone 2/Preset" folder
router.get('/presets', async (req, res) => {
  try {
    // search "Preset" folder
    const cloudinaryResult = await cloudinary.search
      .expression('folder:"TTP-Capstone 2/Preset"/*')
      .max_results(100)
      .execute();

    // transform the sticker object resources to more readable sticker format
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

module.exports = router;