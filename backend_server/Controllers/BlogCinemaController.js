
const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

/* ==========================================================
    1. HELPERS & VALIDATION UTILS
========================================================== */

/**
 * Tạo slug từ tiêu đề
 */
const createSlug = (title) => {
    if (!title) return "";

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
const validateBlogData = (
    data,
    file,
    isUpdate = false
) => {

    const {
        title,
        description,
        content,
        category,
        likes
    } = data;

    // TITLE
    if (!title || title.trim() === "") {
        return "Vui lòng nhập tiêu đề blog.";
    }

    if (title.trim().length < 5) {
        return "Tiêu đề blog phải từ 5 ký tự trở lên.";
    }

    // DESCRIPTION
    if (!description || description.trim() === "") {
        return "Vui lòng nhập mô tả blog.";
    }

    if (description.trim().length < 10) {
        return "Mô tả blog quá ngắn.";
    }

    // CONTENT
    if (!content || content.trim() === "") {
        return "Vui lòng nhập nội dung blog.";
    }

    if (content.trim().length < 10) {
        return "Nội dung blog quá ngắn.";
    }

    // CATEGORY
    if (!category || category.trim() === "") {
        return "Vui lòng nhập danh mục blog.";
    }

    // LIKES
    if (
        likes !== undefined &&
        likes !== null &&
        likes !== ""
    ) {
        const parsedLikes = parseInt(likes, 10);

        if (
            isNaN(parsedLikes) ||
            parsedLikes < 0
        ) {
            return "Likes phải là số nguyên dương hợp lệ.";
        }
    }

    // IMAGE
    if (!isUpdate && !file) {
        return "Vui lòng upload ảnh blog.";
    }

    return null;
};

/**
 * Xóa file vật lý uploads/blog_cinema
 */
const deleteFile = (fileName) => {

    if (!fileName) return;

    const pureFileName =
        path.basename(fileName);

    const filePath = path.join(
        __dirname,
        '..',
        'uploads',
        'blog_cinema',
        pureFileName
    );

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);

            console.log(
                `✅ [DŨNG] Đã xóa file blog: ${pureFileName}`
            );
        }
    } catch (err) {
        console.error(
            "❌ [DŨNG] Lỗi xóa file blog:",
            err.message
        );
    }
};

/* ==========================================================
    2. CONTROLLER FUNCTIONS
========================================================== */

const BlogCinemaController = {

    /* ======================================================
        USER
    ====================================================== */

    getAllBlogs: async (req, res) => {
        try {

            const query = `
                SELECT
                    blog_id,
                    title,
                    slug,
                    description,
                    category,
                    image_url,
                    views,
                    likes,
                    DATE_FORMAT(
                        created_at,
                        '%d/%m/%Y'
                    ) AS date
                FROM blog_cinema
                WHERE is_active = 1
                ORDER BY created_at DESC
            `;

            const [rows] =
                await db.query(query);

            res.status(200).json(rows);

        } catch (error) {

            console.error(
                "❌ [DŨNG] Lỗi lấy blog:",
                error
            );

            res.status(500).json({
                message:
                    "Lỗi máy chủ khi lấy blog"
            });
        }
    },

    getBlogBySlug: async (req, res) => {

        const { slug } = req.params;

        try {

            await db.query(
                `
                UPDATE blog_cinema
                SET views = views + 1
                WHERE slug = ?
                `,
                [slug]
            );

            const [rows] =
                await db.query(
                    `
                    SELECT
                        *,
                        DATE_FORMAT(
                            created_at,
                            '%d/%m/%Y %H:%i'
                        ) AS formatted_date
                    FROM blog_cinema
                    WHERE slug = ?
                    `,
                    [slug]
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Không tìm thấy blog"
                });
            }

            res.status(200).json(
                rows[0]
            );

        } catch (error) {

            console.error(
                "❌ [DŨNG] Lỗi chi tiết blog:",
                error
            );

            res.status(500).json({
                message: "Lỗi máy chủ"
            });
        }
    },

    increaseLike: async (
        req,
        res
    ) => {

        const { id } =
            req.params;

        try {

            await db.query(
                `
                UPDATE blog_cinema
                SET likes = likes + 1
                WHERE blog_id = ?
                `,
                [id]
            );

            res.status(200).json({
                success: true,
                message:
                    "Đã thích blog thành công"
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Lỗi cập nhật likes"
            });
        }
    },

    /* ======================================================
        ADMIN
    ====================================================== */

    getAllBlogsAdmin: async (
        req,
        res
    ) => {

        try {

            const query = `
                SELECT
                    *,
                    DATE_FORMAT(
                        created_at,
                        '%d/%m/%Y %H:%i'
                    ) AS full_date
                FROM blog_cinema
                ORDER BY created_at DESC
            `;

            const [rows] =
                await db.query(query);

            res.status(200).json(rows);

        } catch (error) {

            console.error(
                "❌ [DŨNG] Admin Blog:",
                error
            );

            res.status(500).json({
                message:
                    "Lỗi máy chủ admin"
            });
        }
    },

    getBlogById: async (
        req,
        res
    ) => {

        try {

            const [rows] =
                await db.query(
                    `
                    SELECT *,
                    DATE_FORMAT(
                        created_at,
                        '%Y-%m-%dT%H:%i'
                    ) AS created_at_edit
                    FROM blog_cinema
                    WHERE blog_id = ?
                    `,
                    [req.params.id]
                );

            if (rows.length === 0) {
                return res.status(404)
                    .json({
                        message:
                            "Không tìm thấy blog"
                    });
            }

            res.status(200)
                .json(rows[0]);

        } catch (error) {

            res.status(500).json({
                message:
                    "Lỗi máy chủ"
            });
        }
    },

    createBlog: async (
        req,
        res
    ) => {

        const {
            title,
            description,
            content,
            category,
            likes,
            is_active
        } = req.body;

        const errorMsg =
            validateBlogData(
                req.body,
                req.file,
                false
            );

        if (errorMsg) {

            if (req.file) {
                deleteFile(
                    req.file.filename
                );
            }

            return res.status(400)
                .json({
                    message:
                        errorMsg
                });
        }

        const connection =
            await db.getConnection();

        try {

            await connection
                .beginTransaction();

            const image_url =
                req.file.filename;

            const slug =
                createSlug(title);

            const nowVN =
                new Date()
                .toLocaleString(
                    "sv-SE",
                    {
                        timeZone:
                            "Asia/Ho_Chi_Minh"
                    }
                );

            const sql = `
                INSERT INTO blog_cinema (
                    title,
                    slug,
                    description,
                    content,
                    category,
                    image_url,
                    views,
                    likes,
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
            `;

            await connection.query(
                sql,
                [
                    title.trim(),
                    slug,
                    description.trim(),
                    content.trim(),
                    category.trim(),
                    image_url,
                    parseInt(
                        likes,
                        10
                    ) || 0,
                    is_active ?? 1,
                    nowVN,
                    nowVN
                ]
            );

            await connection
                .commit();

            res.status(201)
                .json({
                    success: true,
                    message:
                        "Tạo blog thành công!"
                });

        } catch (error) {

            await connection
                .rollback();

            if (req.file) {
                deleteFile(
                    req.file.filename
                );
            }

            res.status(500)
                .json({
                    message:
                        "Lỗi tạo blog: "
                        + error.message
                });

        } finally {
            connection.release();
        }
    }
};

module.exports = BlogCinemaController;

