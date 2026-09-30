const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

/* =========================================================
   CLOUDINARY CONFIG
========================================================== */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/* =========================================================
   UPLOAD TO CLOUDINARY — GIỮ NGUYÊN ẢNH GỐC
   ----------------------------------------------------------
   ✅ KHÔNG ép size khi upload
   ✅ KHÔNG eager transformation
   ✅ KHÔNG fetch_format / quality khi upload
   → Ảnh upload lên bao nhiêu px giữ nguyên bấy nhiêu
   → Frontend crop bằng CSS (aspect-ratio + object-fit)
========================================================== */
const uploadToCloudinary = async (file, folder = 'cinema_shop', options = {}) => {
    try {
        /* ---------- Lấy tên gốc (không extension) ---------- */
        const originalName = path.basename(
            file.originalname,
            path.extname(file.originalname)
        );

        /* ---------- Làm sạch tên ---------- */
        const cleanName = originalName
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const publicId = cleanName;

        /* ---------- Upload KHÔNG transformation ---------- */
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folder,
            public_id: publicId,
            use_filename: false,
            unique_filename: false,
            overwrite: true,
            resource_type: 'image',

            /* ⚠️ KHÔNG có: transformation, eager, fetch_format, quality */

            ...options
        });

        /* ---------- Xóa file tạm ---------- */
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        return {
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format
        };
    } catch (error) {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        throw error;
    }
};

/* =========================================================
   DELETE FROM CLOUDINARY
========================================================== */
const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw error;
    }
};

/* =========================================================
   HELPER: BUILD URL VỚI SIZE ĐỘNG (cho frontend)
   ----------------------------------------------------------
   Dùng khi cần serve ảnh ở size khác ảnh gốc.
   Ví dụ: ảnh gốc 3000×4000 → cần hiển thị 500×750:
   
   buildOptimizedUrl('cinema_shop/poster-abc', {
       width: 500,
       height: 750,
       crop: 'fill'
   })
========================================================== */
const buildOptimizedUrl = (publicId, options = {}) => {
    if (!publicId) return null;

    const {
        width = null,
        height = null,
        crop = 'fill',
        quality = 'auto',
        format = 'auto'
    } = options;

    const transformation = [
        width ? `w_${width}` : null,
        height ? `h_${height}` : null,
        (width || height) ? `c_${crop}` : null,
        `q_${quality}`,
        `f_${format}`
    ].filter(Boolean).join(',');

    return cloudinary.url(publicId, {
        transformation,
        secure: true
    });
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    buildOptimizedUrl
};