const cloudinary = require('cloudinary').v2;
const fs = require("fs");
const path = require("path");

const requiredEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary with optional public_id
 * @param {string} localPath - Local file path
 * @param {string} [publicId] - Optional public ID for Cloudinary
 * @returns {Promise<object|null>} Cloudinary response or null
 */
const uploadCloudnary = async (localPath, publicId = null) => {
  try {
    const absolutePath = path.resolve(localPath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`File does not exist at path: ${absolutePath}`);
      return null;
    }

    const options = {
      resource_type: 'auto',
    };

    if (publicId) {
      options.public_id = publicId;
      options.overwrite = true; // optional: overwrite if ID already exists
    }

    const response = await cloudinary.uploader.upload(absolutePath, options);
    console.log("File uploaded to Cloudinary:", response.url);

    // Delete file locally after upload
    try {
      fs.unlinkSync(absolutePath);
    } catch (unlinkError) {
      console.error(`Error deleting file ${absolutePath}:`, unlinkError.message);
    }

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);

    const absolutePath = path.resolve(localPath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (unlinkError) {
        console.error(`Error deleting file ${absolutePath}:`, unlinkError.message);
      }
    }

    return null;
  }
};

module.exports = { uploadCloudnary };
