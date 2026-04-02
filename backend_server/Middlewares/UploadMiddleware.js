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
        // Folder cho hình nền ngang (Backdrop)
        else if (file.fieldname === 'backdrop_image') { 
            dir = 'uploads/backdrops/'; // Tui sửa lại tên folder cho ngắn gọn nhé
        }

        // Tạo folder nếu chưa tồn tại
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Tạo chuỗi duy nhất để tránh trùng tên file
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        
        // Làm sạch tên file gốc (xóa khoảng trắng, ký tự đặc biệt)
        const baseName = path.basename(file.originalname, ext)
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');

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
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB cho mỗi file
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