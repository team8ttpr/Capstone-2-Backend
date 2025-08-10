const { v2: cloudinary } = require('cloudinary');

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'di9wb90kg',
  api_key: process.env.CLOUDINARY_API_KEY || '466125859777561',
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// upload sticker to Cloudinary
const uploadSticker = async (file, options = {}) => {
  try {
    // Default options for sticker uploads
    const uploadOptions = {
      folder: 'TTP-Capstone 2/Custom', 
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      max_file_size: 5000000, // 5MB
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }, 
        { width: 500, height: 500, crop: 'limit' } // 500x500 max
      ],
      ...options
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to delete sticker from Cloudinary
const deleteSticker = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// get sticker details
const getStickerDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      success: true,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('Cloudinary get details error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

//  generate optimized URLs for stickers
const getOptimizedStickerUrl = (publicId, options = {}) => {
  const defaultOptions = {
    fetch_format: 'auto',
    quality: 'auto',
    width: 200,
    height: 200,
    crop: 'fit'
  };
  
  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

module.exports = {
  cloudinary,
  uploadSticker,
  deleteSticker,
  getStickerDetails,
  getOptimizedStickerUrl
};