const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đường dẫn tuyệt đối tới thư mục gốc uploads (dựa vào vị trí file hiện tại)
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

// Tạo thư mục uploads gốc nếu chưa có
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ==============================================
// HÀM TẠO TÊN FILE DUY NHẤT
// ==============================================
const generateUniqueName = (req, file, subDir) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
    const timestamp = Date.now();

    // Với avatar user: thêm userId để dễ quản lý
    if (file.fieldname === 'avatar' && subDir === 'avatars') {
        const userId = req.user?.user_id || 'unknown';
        return `avatar-${userId}-${timestamp}${ext}`;
    }

    // Các file khác: thêm timestamp để tránh trùng
    return `${baseName}-${timestamp}${ext}`;
};

// ==============================================
// XÁC ĐỊNH THƯ MỤC ĐÍCH (TRẢ VỀ ĐƯỜNG DẪN TUYỆT ĐỐI)
// ==============================================
const getDestination = (req, file) => {
    const field = file.fieldname;
    const url = req.originalUrl || '';

    console.log('🔍 Upload Debug:');
    console.log('  fieldname:', field);
    console.log('  originalUrl:', url);

    let subDir = 'posters'; // mặc định

    // ---- AVATAR USER ----
    if (field === 'avatar' && (url.includes('/users/') || url.includes('/user/'))) {
        subDir = 'avatars';
        console.log('  ✅ AVATAR USER -> uploads/avatars/');
    }
    // ---- AVATAR ACTOR ----
    else if (field === 'avatar') {
        subDir = 'actors';
        console.log('  ✅ AVATAR ACTOR -> uploads/actors/');
    }
    // ---- BACKDROP ----
    else if (field === 'backdrop_url') {
        subDir = 'backdrops';
        console.log('  ✅ BACKDROP -> uploads/backdrops/');
    }
    // ---- IMAGE_URL (Foods / Promotions) ----
    else if (field === 'image_url') {
        subDir = url.includes('promotion') ? 'promotions' : 'foods';
        console.log(`  ✅ IMAGE_URL -> uploads/${subDir}/`);
    }
    // ---- IMAGE (News / Blog Cinema) ----
    else if (field === 'image') {
        subDir = url.includes('blog-cinema') ? 'blog_cinema' : 'news';
        console.log(`  ✅ IMAGE -> uploads/${subDir}/`);
    }
    // ---- MẶC ĐỊNH ----
    else {
        console.log('  ✅ MẶC ĐỊNH -> uploads/posters/');
    }

    const fullPath = path.join(UPLOAD_DIR, subDir);
    console.log(`  📁 Đường dẫn tuyệt đối: ${fullPath}`);

    // Tạo thư mục nếu chưa tồn tại (có thể gọi ở đây để đảm bảo)
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  📁 Đã tạo thư mục: ${fullPath}`);
    }

    return fullPath;
};

// ==============================================
// CẤU HÌNH STORAGE
// ==============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const dir = getDestination(req, file);
            cb(null, dir);
        } catch (error) {
            console.error('❌ Lỗi khi xác định thư mục:', error);
            // Fallback an toàn
            const fallbackDir = path.join(UPLOAD_DIR, 'posters');
            if (!fs.existsSync(fallbackDir)) {
                fs.mkdirSync(fallbackDir, { recursive: true });
            }
            cb(null, fallbackDir);
        }
    },

    filename: (req, file, cb) => {
        try {
            // Xác định thư mục con để biết cách đặt tên
            const dir = getDestination(req, file);
            const subDir = path.basename(dir);
            const uniqueName = generateUniqueName(req, file, subDir);
            console.log(`  📄 Tên file: ${uniqueName}`);
            cb(null, uniqueName);
        } catch (error) {
            console.error('❌ Lỗi khi tạo tên file:', error);
            // Fallback: dùng timestamp + tên gốc
            const fallbackName = `${Date.now()}-${file.originalname}`;
            cb(null, fallbackName);
        }
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