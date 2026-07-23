const cloudinary = require('../Config/cloudinary');
const fs = require('fs');
const path = require('path');

const uploadToCloudinary = async (file, folder = 'cinema_shop') => {
    try {
        // Lấy tên gốc (không extension)
        const originalName = path.basename(file.originalname, path.extname(file.originalname));
        
        // Làm sạch tên: bỏ dấu, ký tự đặc biệt, thay khoảng trắng bằng dấu gạch ngang
        const cleanName = originalName
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // ✅ KHÔNG thêm timestamp, dùng đúng tên gốc
        const publicId = cleanName;

        const result = await cloudinary.uploader.upload(file.path, {
            folder: folder,
            public_id: publicId,
            use_filename: false,      // Không dùng tên file gốc làm public_id
            unique_filename: false    // Không thêm chuỗi ngẫu nhiên
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