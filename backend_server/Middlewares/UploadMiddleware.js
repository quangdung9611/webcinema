const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ======================================================
// UPLOAD ROOT DIRECTORY
// ======================================================

const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ======================================================
// FIELDNAME -> FOLDER MAP
// ======================================================

const uploadFolders = {
    // USERS
    user_avatar: 'avatars',

    // ACTORS
    actor_avatar: 'actors',

    // MOVIES
    movie_poster: 'posters',
    movie_backdrop: 'backdrops',

    // FOODS
    food_image: 'foods',

    // PROMOTIONS
    promotion_image: 'promotions',

    // NEWS
    news_image: 'news',

    // BLOG CINEMA
    blog_image: 'blog_cinema'
};

// ======================================================
// GENERATE UNIQUE FILE NAME
// ======================================================

const generateUniqueName = (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const baseName = path
        .basename(file.originalname, ext)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

    const timestamp = Date.now();

    switch (file.fieldname) {

        case 'user_avatar':
            return `user-avatar-${timestamp}${ext}`;

        case 'actor_avatar':
            return `actor-avatar-${timestamp}${ext}`;

        case 'movie_poster':
            return `movie-poster-${timestamp}${ext}`;

        case 'movie_backdrop':
            return `movie-backdrop-${timestamp}${ext}`;

        case 'food_image':
            return `food-${timestamp}${ext}`;

        case 'promotion_image':
            return `promotion-${timestamp}${ext}`;

        case 'news_image':
            return `news-${timestamp}${ext}`;

        case 'blog_image':
            return `blog-${timestamp}${ext}`;

        default:
            return `${baseName}-${timestamp}${ext}`;
    }
};

// ======================================================
// GET DESTINATION DIRECTORY
// ======================================================

const getDestination = (req, file) => {

    const field = file.fieldname;

    console.log('\n==============================');
    console.log('📤 FILE UPLOAD');
    console.log('Field:', field);
    console.log('File:', file.originalname);

    const subDir = uploadFolders[field] || 'others';

    const fullPath = path.join(
        UPLOAD_DIR,
        subDir
    );

    console.log('Folder:', subDir);
    console.log('Path:', fullPath);

    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, {
            recursive: true
        });

        console.log(
            `📁 Created folder: ${fullPath}`
        );
    }

    console.log('==============================\n');

    return fullPath;
};

// ======================================================
// STORAGE CONFIG
// ======================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        try {

            const dir = getDestination(
                req,
                file
            );

            req.uploadDir = dir;

            cb(null, dir);

        } catch (error) {

            console.error(
                '❌ Destination Error:',
                error
            );

            cb(error);
        }
    },

    filename: (req, file, cb) => {
        try {

            const fileName =
                generateUniqueName(
                    req,
                    file
                );

            console.log(
                '📄 File Name:',
                fileName
            );

            cb(null, fileName);

        } catch (error) {

            console.error(
                '❌ Filename Error:',
                error
            );

            cb(error);
        }
    }
});

// ======================================================
// MULTER CONFIG
// ======================================================

const upload = multer({

    storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes =
            /jpeg|jpg|png|webp/;

        const mimetype =
            allowedTypes.test(
                file.mimetype
            );

        const extname =
            allowedTypes.test(
                path
                    .extname(
                        file.originalname
                    )
                    .toLowerCase()
            );

        if (
            mimetype &&
            extname
        ) {
            return cb(null, true);
        }

        cb(
            new Error(
                'Chỉ cho phép tải lên ảnh jpg, jpeg, png, webp'
            )
        );
    }
});

// ======================================================
// EXPORT
// ======================================================

module.exports = upload;