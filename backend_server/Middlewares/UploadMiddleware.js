const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = 'uploads/posters/'; // Mặc định cho posters

        // Logic phân loại folder dựa trên fieldname
        if (file.fieldname === 'food_image') {
            dir = 'uploads/foods/';
        } 
        else if (file.fieldname === 'newsImage') { 
            dir = 'uploads/news/';
        }
        else if (file.fieldname === 'actorImage') {
            dir = 'uploads/actors/';
        }
        // FIX: Đổi từ backdrop_image thành backdrop_url cho khớp với Frontend và Route
        else if (file.fieldname === 'backdrop_url') { 
            dir = 'uploads/backdrops/';
        }

        // Tạo folder nếu chưa tồn tại
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Lấy phần mở rộng (.jpg, .png...)
        const ext = path.extname(file.originalname).toLowerCase();
        
        // Lấy tên file gốc (ví dụ: "anh-conan")
        const baseName = path.basename(file.originalname, ext)
            .normalize('NFD') // Khử dấu tiếng Việt
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/\s+/g, '-') // Thay khoảng trắng bằng gạch nối
            .replace(/[^\w-]/g, ''); // Xóa ký tự đặc biệt

        // Tạo chuỗi ngắn gọn để tránh trùng (Dùng Date.now() là đủ)
        const uniqueSuffix = Date.now();

        // Trả về tên file: "ten-goc-1712345678.jpg"
        if (file.fieldname === 'backdrop_url') {
            cb(null, `${baseName}-backdrop-${uniqueSuffix}${ext}`);
        } else {
            cb(null, `${baseName}-${uniqueSuffix}${ext}`);
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Chỉ cho phép tải lên định dạng hình ảnh (jpg, png, webp)!"));
    }
});

module.exports = upload;