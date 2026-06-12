const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {

    // 1. Mặc định ban đầu
    let dir =
        'uploads/posters/';

    // 2. Kiểm tra nhãn (fieldname)
    if (
        file.fieldname ===
        'backdrop_url'
    ) {

        // Movies backdrop
        dir =
            'uploads/backdrops/';

    }
    else if (
        file.fieldname ===
        'image_url'
    ) {

        // Foods
        dir =
            'uploads/foods/';

        // Promotions
        if (
            req.originalUrl.includes(
                'promotion'
            )
        ) {

            dir =
                'uploads/promotions/';

        }

    }
    else if (
        file.fieldname ===
        'image'
    ) {

        // News
        dir =
            'uploads/news/';

        // Blog Cinema
        if (
            req.originalUrl.includes(
                'blog-cinema'
            )
        ) {

            dir =
                'uploads/blog_cinema/';

        }

    }
    else if (
        file.fieldname ===
        'avatar'
    ) {

        // Actors
        dir =
            'uploads/actors/';

    }
    else {

        // poster_url movie
        dir =
            'uploads/posters/';

    }

    // 3. Auto create folder
    if (
        !fs.existsSync(dir)
    ) {

        fs.mkdirSync(
            dir,
            {
                recursive: true
            }
        );

    }

    cb(
        null,
        dir
    );

},
    filename: (req, file, cb) => {
        // Lấy đuôi file (.jpg, .png...)
        const ext = path.extname(file.originalname).toLowerCase();
        
        // Làm sạch tên file gốc (xóa dấu tiếng Việt, khoảng trắng)
        const baseName = path.basename(file.originalname, ext)
            .normalize('NFD') 
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/\s+/g, '-') 
            .replace(/[^\w-]/g, ''); 

        // Đặt tên theo yêu cầu của Dũng: đẹp và gọn
        if (file.fieldname === 'backdrop_url') {
            // Kết quả: tho-oi-backdrop.jpg
            cb(null, `${baseName}-backdrop${ext}`);
        } else {
            // Kết quả: tho-oi.jpg
            cb(null, `${baseName}${ext}`);
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