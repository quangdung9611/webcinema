const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

// ==========================================================
// IMPORT CLOUDINARY HELPERS
// ==========================================================
const { uploadToCloudinary, deleteFromCloudinary } = require('../Middlewares/UploadCloudinary');

/* ==========================================================
    1. HELPERS & VALIDATION UTILS
========================================================== */

/**
 * Tạo slug từ tiêu đề
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
 * Validate dữ liệu Blog Cinema
 */
const validateBlogData = (data, file, isUpdate = false) => {
    const { title, description, likes } = data;

    // TITLE
    if (!title || title.trim() === '') {
        return 'Vui lòng nhập tiêu đề blog.';
    }
    if (title.trim().length < 5) {
        return 'Tiêu đề blog phải từ 5 ký tự trở lên.';
    }

    // DESCRIPTION
    if (!description || description.trim() === '') {
        return 'Vui lòng nhập mô tả blog.';
    }
    if (description.trim().length < 10) {
        return 'Mô tả blog quá ngắn.';
    }

    // LIKES
    if (likes !== undefined && likes !== null && likes !== '') {
        const parsedLikes = parseInt(likes, 10);
        if (isNaN(parsedLikes) || parsedLikes < 0) {
            return 'Likes phải là số nguyên hợp lệ.';
        }
    }

    // IMAGE (field blog_image)
    if (!isUpdate && !file) {
        return 'Vui lòng upload ảnh blog.';
    }

    return null;
};

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

/* ==========================================================
    2. USER APIs
========================================================== */

/**
 * GET ALL BLOGS
 */
exports.getAllBlogs = async (req, res) => {
    try {
        const sql = `
            SELECT
                blog_id,
                title,
                slug,
                description,
                blog_image,
                views,
                likes,
                DATE_FORMAT(created_at, '%d/%m/%Y') AS date
            FROM blog_cinema
            WHERE is_active = 1
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(sql);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Get Blog Error:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi lấy blog' });
    }
};

/**
 * GET BLOG BY SLUG
 */
exports.getBlogBySlug = async (req, res) => {
    const { slug } = req.params;
    try {
        const [rows] = await db.query(
            `
            SELECT
                *,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS formatted_date
            FROM blog_cinema
            WHERE slug = ? AND is_active = 1
            LIMIT 1
            `,
            [slug]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy blog' });
        }

        // Tăng view
        await db.query(
            `UPDATE blog_cinema SET views = views + 1 WHERE blog_id = ?`,
            [rows[0].blog_id]
        );

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Get Blog Detail Error:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy chi tiết blog' });
    }
};

/**
 * INCREASE LIKE
 */
exports.increaseLike = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT likes FROM blog_cinema WHERE blog_id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy blog' });
        }
        await db.query(`UPDATE blog_cinema SET likes = likes + 1 WHERE blog_id = ?`, [id]);
        return res.status(200).json({ success: true, message: 'Like +1 thành công' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi tăng like' });
    }
};

/* ==========================================================
    3. ADMIN APIs
========================================================== */

/**
 * GET ALL BLOGS ADMIN
 */
exports.getAllBlogsAdmin = async (req, res) => {
    try {
        const sql = `
            SELECT
                *,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM blog_cinema
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(sql);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Get Blog Admin Error:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ admin' });
    }
};

/**
 * GET BLOG BY ID
 */
exports.getBlogById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `
            SELECT
                *,
                DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i') AS created_at_edit
            FROM blog_cinema
            WHERE blog_id = ?
            LIMIT 1
            `,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy blog' });
        }
        return res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Get Blog By Id Error:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy blog' });
    }
};

/**
 * CREATE BLOG - CLOUDINARY
 */
exports.createBlog = async (req, res) => {
    const { title, description, likes } = req.body;
    const file = req.file;

    const errorMsg = validateBlogData(req.body, file, false);
    if (errorMsg) {
        return res.status(400).json({ message: errorMsg });
    }

    try {
        const slug = createSlug(title);

        // Check duplicate
        const [duplicate] = await db.query(
            `SELECT blog_id FROM blog_cinema WHERE title = ? OR slug = ?`,
            [title.trim(), slug]
        );
        if (duplicate.length > 0) {
            return res.status(400).json({ message: 'Tiêu đề hoặc slug đã tồn tại' });
        }

        // Upload ảnh lên Cloudinary
        let blog_image = null;
        if (file) {
            const result = await uploadToCloudinary(file, 'cinema_shop/blog_cinema');
            blog_image = result.url;
        }

        await db.query(
            `INSERT INTO blog_cinema (title, slug, description, blog_image, likes, views, is_active)
             VALUES (?, ?, ?, ?, ?, 0, 1)`,
            [
                title.trim(),
                slug,
                description.trim(),
                blog_image,
                parseInt(likes, 10) || 0
            ]
        );

        return res.status(201).json({ success: true, message: 'Tạo blog thành công!' });
    } catch (error) {
        console.error('❌ Create blog error:', error);
        return res.status(500).json({ message: 'Lỗi server khi tạo blog' });
    }
};

/**
 * UPDATE BLOG - CLOUDINARY
 */
exports.updateBlog = async (req, res) => {
    const { id } = req.params;
    const { title, description, likes, is_active } = req.body;
    const file = req.file;

    const errorMsg = validateBlogData(req.body, file, true);
    if (errorMsg) {
        return res.status(400).json({ message: errorMsg });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check exists
        const [oldBlog] = await connection.query(
            `SELECT blog_image FROM blog_cinema WHERE blog_id = ?`,
            [id]
        );
        if (oldBlog.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Blog không tồn tại' });
        }

        // Check duplicate
        const slug = createSlug(title);
        const [duplicate] = await connection.query(
            `SELECT blog_id FROM blog_cinema WHERE (title = ? OR slug = ?) AND blog_id != ?`,
            [title.trim(), slug, id]
        );
        if (duplicate.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Tiêu đề hoặc slug đã tồn tại' });
        }

        // Xử lý ảnh với Cloudinary
        let blog_image = oldBlog[0].blog_image;
        if (file) {
            // Xóa ảnh cũ
            if (oldBlog[0].blog_image) {
                const publicId = extractPublicId(oldBlog[0].blog_image);
                await deleteFromCloudinary(publicId);
            }
            // Upload ảnh mới
            const result = await uploadToCloudinary(file, 'cinema_shop/blog_cinema');
            blog_image = result.url;
        }

        // Update
        await connection.query(
            `UPDATE blog_cinema
             SET title = ?, slug = ?, description = ?, blog_image = ?, likes = ?, is_active = ?
             WHERE blog_id = ?`,
            [
                title.trim(),
                slug,
                description.trim(),
                blog_image,
                parseInt(likes, 10) || 0,
                parseInt(is_active, 10) || 0,
                id
            ]
        );

        await connection.commit();
        return res.status(200).json({ success: true, message: 'Cập nhật blog thành công!' });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Update blog error:', error);
        return res.status(500).json({ message: 'Lỗi cập nhật blog: ' + error.message });
    } finally {
        connection.release();
    }
};

/**
 * DELETE BLOG - CLOUDINARY
 */
exports.deleteBlog = async (req, res) => {
    const { id } = req.params;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [blog] = await connection.query(
            `SELECT blog_image FROM blog_cinema WHERE blog_id = ?`,
            [id]
        );
        if (blog.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Không tìm thấy blog' });
        }

        // Xóa ảnh trên Cloudinary
        if (blog[0].blog_image) {
            const publicId = extractPublicId(blog[0].blog_image);
            await deleteFromCloudinary(publicId);
        }

        await connection.query(`DELETE FROM blog_cinema WHERE blog_id = ?`, [id]);
        await connection.commit();
        return res.status(200).json({ success: true, message: 'Đã xóa blog thành công.' });
    } catch (error) {
        await connection.rollback();
        console.error('❌ Delete blog error:', error);
        return res.status(500).json({ message: 'Lỗi khi xóa blog.' });
    } finally {
        connection.release();
    }
};