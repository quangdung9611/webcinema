const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = 'uploads/posters/';

        // ---- Xử lý avatar ----
        if (file.fieldname === 'avatar') {
            const url = req.originalUrl || '';
            // Nếu URL chứa /users/ hoặc /user/ -> avatar của người dùng
            if (url.includes('/users/') || url.includes('/user/')) {
                dir = 'uploads/avatars/';
            } else {
                // Ngược lại là avatar của diễn viên
                dir = 'uploads/actors/';
            }
        }
        // ---- Các loại khác ----
        else if (file.fieldname === 'backdrop_url') {
            dir = 'uploads/backdrops/';
        }
        else if (file.fieldname === 'image_url') {
            if (req.originalUrl.includes('promotion')) {
                dir = 'uploads/promotions/';
            } else {
                dir = 'uploads/foods/';
            }
        }
        else if (file.fieldname === 'image') {
            if (req.originalUrl.includes('blog-cinema')) {
                dir = 'uploads/blog_cinema/';
            } else {
                dir = 'uploads/news/';
            }
        }
        // Mặc định: posters
        // (có thể thêm poster_url nếu cần, nhưng hiện tại else đã là posters)

        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        cb(null, dir);
    },

    filename: (req, file, cb) => {
        // ✅ GIỮ NGUYÊN TÊN GỐC CHO TẤT CẢ CÁC LOẠI FILE
        cb(null, file.originalname);
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