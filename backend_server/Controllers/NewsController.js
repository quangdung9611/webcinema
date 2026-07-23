const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

// ==========================================================
// IMPORT CLOUDINARY HELPERS
// ==========================================================
const { uploadToCloudinary, deleteFromCloudinary } = require('../Middlewares/UploadCloudinary');

/**
 * Trích xuất public_id từ URL Cloudinary
 */
const extractPublicId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const publicId = parts.slice(uploadIndex + 1).join('/').split('.')[0];
    return publicId;
};

/* =========================================================
 * 1. HELPERS & VALIDATION
 * =========================================================
 */

/**
 * Tạo slug từ tiêu đề bài viết
 */
const createSlug = (title) => {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Validate dữ liệu News
 */
const validateNewsData = (data, file, isUpdate = false) => {
    const { title, content, likes } = data;

    // Validate title
    if (!title || title.trim() === '') {
        return 'Vui lòng nhập tiêu đề bài viết.';
    }
    if (title.trim().length < 5) {
        return 'Tiêu đề bài viết phải từ 5 ký tự trở lên.';
    }

    // Validate content
    if (!content || content.trim() === '') {
        return 'Vui lòng nhập nội dung bài viết.';
    }
    if (content.trim().length < 10) {
        return 'Nội dung bài viết quá ngắn (phải từ 10 ký tự trở lên).';
    }

    // Validate likes
    if (likes !== undefined && likes !== null && likes !== '') {
        const parsedLikes = parseInt(likes, 10);
        if (isNaN(parsedLikes) || parsedLikes < 0) {
            return 'Số lượt thích phải là số nguyên hợp lệ.';
        }
    }

    // Validate image (field news_image)
    if (!isUpdate && !file) {
        return 'Vui lòng upload hình ảnh đại diện cho bài viết.';
    }

    return null;
};

/* =========================================================
 * 2. GET ALL NEWS (USER)
 * =========================================================
 */
exports.getAllNews = async (req, res) => {
    try {
        const sql = `
            SELECT
                news_id,
                title,
                slug,
                news_image,
                views,
                likes,
                DATE_FORMAT(created_at, '%d/%m/%Y') AS date,
                IF(LENGTH(content) > 150,
                    CONCAT(LEFT(content, 150), '...'),
                    content
                ) AS short_content
            FROM news
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(sql);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Get All News Error:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi lấy tin tức' });
    }
};

/* =========================================================
 * 3. GET ALL NEWS (ADMIN)
 * =========================================================
 */
exports.getAllNewsAdmin = async (req, res) => {
    try {
        const sql = `
            SELECT
                *,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM news
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(sql);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Get News Admin Error:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ admin' });
    }
};

/* =========================================================
 * 4. GET NEWS BY ID
 * =========================================================
 */
exports.getNewsById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT * FROM news WHERE news_id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy bài viết' });
        }
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi lấy chi tiết bài viết' });
    }
};

/* =========================================================
 * 5. CREATE NEWS (CLOUDINARY)
 * =========================================================
 */
exports.createNews = async (req, res) => {
    const { title, content, likes } = req.body;
    const file = req.file;

    try {
        // Validate nhanh
        if (!title || !content) {
            return res.status(400).json({ message: 'Thiếu dữ liệu bài viết' });
        }

        const slug = createSlug(title);

        // Check duplicate
        const [duplicate] = await db.query(
            `SELECT news_id FROM news WHERE title = ? OR slug = ?`,
            [title.trim(), slug]
        );
        if (duplicate.length > 0) {
            return res.status(400).json({ message: 'Tiêu đề đã tồn tại' });
        }

        // Upload ảnh lên Cloudinary
        let news_image = null;
        if (file) {
            const result = await uploadToCloudinary(file, 'cinema_shop/news');
            news_image = result.url;
        }

        await db.query(
            `INSERT INTO news (title, slug, content, news_image, likes, views)
             VALUES (?, ?, ?, ?, ?, 0)`,
            [
                title.trim(),
                slug,
                content.trim(),
                news_image,
                parseInt(likes, 10) || 0
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Tạo bài viết thành công'
        });
    } catch (error) {
        console.error('❌ Create news error:', error);
        return res.status(500).json({ message: 'Lỗi khi tạo bài viết' });
    }
};

/* =========================================================
 * 6. UPDATE NEWS (CLOUDINARY)
 * =========================================================
 */
exports.updateNews = async (req, res) => {
    const { news_id } = req.params;
    const { title, content, likes } = req.body;
    const file = req.file;

    const errorMsg = validateNewsData(req.body, file, true);
    if (errorMsg) {
        return res.status(400).json({ message: errorMsg });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // CHECK NEWS EXISTS
        const [oldNews] = await connection.query(
            `SELECT news_image FROM news WHERE news_id = ?`,
            [news_id]
        );
        if (oldNews.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Bài viết không tồn tại' });
        }

        // CHECK DUPLICATE
        const slug = createSlug(title);
        const [duplicate] = await connection.query(
            `SELECT news_id FROM news
             WHERE (title = ? OR slug = ?) AND news_id != ?`,
            [title.trim(), slug, news_id]
        );
        if (duplicate.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Tiêu đề hoặc slug đã tồn tại' });
        }

        // XỬ LÝ ẢNH VỚI CLOUDINARY
        let news_image = oldNews[0].news_image;

        if (file) {
            // Xóa ảnh cũ trên Cloudinary
            if (oldNews[0].news_image) {
                const publicId = extractPublicId(oldNews[0].news_image);
                await deleteFromCloudinary(publicId);
            }
            // Upload ảnh mới
            const result = await uploadToCloudinary(file, 'cinema_shop/news');
            news_image = result.url;
        }

        // UPDATE
        const sql = `
            UPDATE news
            SET
                title = ?,
                slug = ?,
                content = ?,
                news_image = ?,
                likes = ?
            WHERE news_id = ?
        `;
        await connection.query(sql, [
            title.trim(),
            slug,
            content.trim(),
            news_image,
            parseInt(likes, 10) || 0,
            news_id
        ]);

        await connection.commit();
        return res.status(200).json({
            success: true,
            message: 'Cập nhật bài viết thành công!'
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Update news error:', error);
        return res.status(500).json({
            message: 'Lỗi cập nhật bài viết: ' + error.message
        });
    } finally {
        connection.release();
    }
};

/* =========================================================
 * 7. DELETE NEWS (CLOUDINARY)
 * =========================================================
 */
exports.deleteNews = async (req, res) => {
    const { id } = req.params;
    const { token } = req.body;

    const connection = await db.getConnection();
    try {
        if (!token) {
            return res.status(401).json({ message: 'Thiếu usertoken!' });
        }

        await connection.beginTransaction();

        // GET IMAGE
        const [news] = await connection.query(
            `SELECT news_image FROM news WHERE news_id = ?`,
            [id]
        );
        if (news.length > 0 && news[0].news_image) {
            // Xóa ảnh trên Cloudinary
            const publicId = extractPublicId(news[0].news_image);
            await deleteFromCloudinary(publicId);
        }

        // DELETE
        await connection.query(`DELETE FROM news WHERE news_id = ?`, [id]);
        await connection.commit();
        return res.status(200).json({
            success: true,
            message: 'Đã xóa bài viết thành công.'
        });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Delete news error:', error);
        return res.status(500).json({ message: 'Lỗi khi xóa bài viết.' });
    } finally {
        connection.release();
    }
};

/* =========================================================
 * 8. INCREASE LIKE
 * =========================================================
 */
exports.increaseLike = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT likes FROM news WHERE news_id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy bài viết' });
        }
        await db.query(`UPDATE news SET likes = likes + 1 WHERE news_id = ?`, [id]);
        return res.status(200).json({ success: true, message: 'Like +1 thành công' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi tăng like' });
    }
};

/* =========================================================
 * 9. GET NEWS BY SLUG
 * =========================================================
 */
exports.getNewsBySlug = async (req, res) => {
    const { slug } = req.params;
    try {
        const [rows] = await db.query(`SELECT * FROM news WHERE slug = ?`, [slug]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy bài viết' });
        }
        // Tăng view
        await db.query(`UPDATE news SET views = views + 1 WHERE slug = ?`, [slug]);
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi lấy chi tiết bài viết' });
    }
};