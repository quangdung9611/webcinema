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
   UPLOAD TO CLOUDINARY — CÓ TỐI ƯU ẢNH
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

        /* ---------- Detect loại ảnh → chọn size phù hợp ---------- */
        const imageType = detectImageType(folder);

        const transformation = buildTransformation(imageType);

        /* ---------- Upload với transformation ---------- */
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folder,
            public_id: publicId,
            use_filename: false,
            unique_filename: false,
            overwrite: true,
            resource_type: 'image',

            /* ✅ TỰ ĐỘNG TỐI ƯU ẢNH */
            transformation: transformation,

            /* ✅ TỰ ĐỘNG CHỌN FORMAT + QUALITY */
            fetch_format: 'auto',       // WebP/AVIF cho mobile
            quality: 'auto:good',       // Nén 70-80%
            flags: 'progressive',       // Progressive JPEG

            /* ✅ Strip metadata để giảm size */
            strip_metadata: true,

            /* ✅ Eager transformations (tạo sẵn nhiều size) */
            eager: [
                { width: 200, height: 300, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
                { width: 400, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
                { width: 800, height: 1200, crop: 'fill', quality: 'auto', fetch_format: 'auto' }
            ],
            eager_async: true,

            /* Override options nếu có */
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
   DETECT IMAGE TYPE THEO FOLDER
========================================================== */
const detectImageType = (folder) => {
    if (folder.includes('posters')) return 'poster';
    if (folder.includes('backdrops')) return 'backdrop';
    if (folder.includes('banners')) return 'banner';
    if (folder.includes('avatars')) return 'avatar';
    if (folder.includes('blogs')) return 'blog';
    if (folder.includes('news')) return 'news';
    if (folder.includes('promotions')) return 'promotion';
    if (folder.includes('actors')) return 'actor';

    return 'default';
};

/* =========================================================
   BUILD TRANSFORMATION THEO TYPE
========================================================== */
const buildTransformation = (imageType) => {
    const config = {
        poster: {
            width: 600,
            height: 900,
            crop: 'fill',
            gravity: 'auto'
        },
        backdrop: {
            width: 1200,
            height: 675,
            crop: 'fill',
            gravity: 'auto'
        },
        banner: {
            width: 1920,
            height: 800,
            crop: 'fill',
            gravity: 'auto'
        },
        avatar: {
            width: 300,
            height: 300,
            crop: 'fill',
            gravity: 'face'
        },
        blog: {
            width: 1200,
            height: 675,
            crop: 'fill',
            gravity: 'auto'
        },
        news: {
            width: 1200,
            height: 675,
            crop: 'fill',
            gravity: 'auto'
        },
        promotion: {
            width: 800,
            height: 800,
            crop: 'fill',
            gravity: 'auto'
        },
        actor: {
            width: 400,
            height: 500,
            crop: 'fill',
            gravity: 'face'
        },
        default: {
            width: 800,
            crop: 'limit'
        }
    };

    const c = config[imageType] || config.default;

    return [
        {
            width: c.width,
            height: c.height,
            crop: c.crop,
            gravity: c.gravity,
            quality: 'auto:good',
            fetch_format: 'auto'
        }
    ];
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
========================================================== */
const buildOptimizedUrl = (publicId, options = {}) => {
    if (!publicId) return null;

    const {
        width = 400,
        height = null,
        crop = 'fill',
        quality = 'auto:good',
        format = 'auto'
    } = options;

    const transformation = [
        width ? `w_${width}` : null,
        height ? `h_${height}` : null,
        `c_${crop}`,
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