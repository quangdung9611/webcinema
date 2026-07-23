const cloudinary = require('../Config/cloudinary');
const fs = require('fs');

const uploadToCloudinary = async (file, folder = 'cinema_shop') => {
    try {
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folder,
            use_filename: true,
            unique_filename: true
        });

        // Xóa file tạm sau khi upload
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        return {
            url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        throw error;
    }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return;
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw error;
    }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };