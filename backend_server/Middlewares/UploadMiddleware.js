const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = 'uploads/posters/'; // Mặc định

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
        // --- THÊM PHẦN NÀY CHO HÌNH NGANG ---
        else if (file.fieldname === 'backdrop_image') { 
            dir = 'uploads/backdrop_poster/';
        }

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Tùy chỉnh tên file để tránh trùng lặp và chuyên nghiệp hơn
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext);

        // Nếu là backdrop thì thêm chữ -backdrop vào tên file cho dễ quản lý
        if (file.fieldname === 'backdrop_image') {
            cb(null, `${baseName}-backdrop-${uniqueSuffix}${ext}`);
        } else {
            cb(null, `${baseName}-${uniqueSuffix}${ext}`);
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
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