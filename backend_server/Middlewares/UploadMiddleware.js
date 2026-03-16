const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Khởi tạo biến dir
        let dir = 'uploads/posters/'; // Mặc định cho movie

        // logic phân loại dựa trên fieldname (tên key bạn append từ FormData)
        if (file.fieldname === 'food_image') {
            dir = 'uploads/foods/';
        } 
        else if (file.fieldname === 'newsImage') { 
            dir = 'uploads/news/';
        }
        else if (file.fieldname === 'actorImage') { // Thêm nếu bạn làm phần diễn viên
            dir = 'uploads/actors/';
        }

        // Kiểm tra và tạo thư mục nếu chưa có (recursive giúp tạo cả folder cha nếu thiếu)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Dùng tên gốc của file
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB để bảo vệ server
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