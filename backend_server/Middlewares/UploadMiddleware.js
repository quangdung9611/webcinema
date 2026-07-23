const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==============================================
// XÁC ĐỊNH THƯ MỤC DỰA TRÊN FIELDNAME & URL
// ==============================================
const getDestination = (req, file) => {
    const field = file.fieldname;
    const url = req.originalUrl || '';

    console.log('🔍 Upload Debug:');
    console.log('  fieldname:', field);
    console.log('  originalUrl:', url);

    // ---- AVATAR USER ----
    if (field === 'avatar' && (url.includes('/users/') || url.includes('/user/'))) {
        console.log('  ✅ Lưu vào: uploads/avatars/');
        return 'uploads/avatars/';
    }

    // ---- AVATAR ACTOR ----
    if (field === 'avatar') {
        console.log('  ✅ Lưu vào: uploads/actors/');
        return 'uploads/actors/';
    }

    // ---- BACKDROP ----
    if (field === 'backdrop_url') {
        console.log('  ✅ Lưu vào: uploads/backdrops/');
        return 'uploads/backdrops/';
    }

    // ---- IMAGE_URL (Foods / Promotions) ----
    if (field === 'image_url') {
        if (url.includes('promotion')) {
            console.log('  ✅ Lưu vào: uploads/promotions/');
            return 'uploads/promotions/';
        }
        console.log('  ✅ Lưu vào: uploads/foods/');
        return 'uploads/foods/';
    }

    // ---- IMAGE (News / Blog Cinema) ----
    if (field === 'image') {
        if (url.includes('blog-cinema')) {
            console.log('  ✅ Lưu vào: uploads/blog_cinema/');
            return 'uploads/blog_cinema/';
        }
        console.log('  ✅ Lưu vào: uploads/news/');
        return 'uploads/news/';
    }

    // ---- MẶC ĐỊNH: POSTERS ----
    console.log('  ✅ Lưu vào: uploads/posters/ (mặc định)');
    return 'uploads/posters/';
};

// ==============================================
// CẤU HÌNH STORAGE
// ==============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const dir = getDestination(req, file);

            // Tạo thư mục nếu chưa tồn tại
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Đã tạo thư mục: ${dir}`);
            }

            cb(null, dir);
        } catch (error) {
            console.error('❌ Lỗi khi tạo thư mục:', error);
            cb(error, 'uploads/posters/'); // fallback
        }
    },

    filename: (req, file, cb) => {
        const url = req.originalUrl || '';
        const isUserAvatar = file.fieldname === 'avatar' &&
            (url.includes('/users/') || url.includes('/user/'));

        // Lấy tên file gốc và đuôi
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');

        // ---- AVATAR USER: TÊN DUY NHẤT ----
        if (isUserAvatar) {
            const userId = req.user?.user_id || Date.now();
            const timestamp = Date.now();
            const uniqueName = `avatar-${userId}-${timestamp}${ext}`;
            console.log(`  📸 Tên file avatar: ${uniqueName}`);
            return cb(null, uniqueName);
        }

        // ---- CÁC LOẠI KHÁC: GIỮ TÊN GỐC (NHƯNG THÊM TIMESTAMP ĐỂ TRÁNH TRÙNG) ----
        const timestamp = Date.now();
        const uniqueName = `${baseName}-${timestamp}${ext}`;
        console.log(`  📄 Tên file: ${uniqueName}`);
        cb(null, uniqueName);
    }
});

// ==============================================
// CẤU HÌNH MULTER
// ==============================================
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Chỉ cho phép tải lên định dạng hình ảnh (jpg, png, webp)!'));
    }
});

module.exports = upload;