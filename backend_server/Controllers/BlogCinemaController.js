
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

    if (!title) {

        return '';

    }

    return title
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .replace(
            /[đĐ]/g,
            'd'
        )
        .replace(
            /[^\w\s-]/g,
            ''
        )
        .replace(
            /[\s_-]+/g,
            '-'
        )
        .replace(
            /^-+|-+$/g,
            ''
        );

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

    /* ==========================
       TITLE
    ========================== */

    if (
        !title ||
        title.trim() === ''
    ) {

        return 'Vui lòng nhập tiêu đề blog.';

    }

    if (
        title.trim().length < 5
    ) {

        return 'Tiêu đề blog phải từ 5 ký tự trở lên.';

    }

    /* ==========================
       DESCRIPTION
    ========================== */

    if (
        !description ||
        description.trim() === ''
    ) {

        return 'Vui lòng nhập mô tả blog.';

    }

    if (
        description.trim().length < 10
    ) {

        return 'Mô tả blog quá ngắn.';

    }

    /* ==========================
       CONTENT
    ========================== */

    if (
        !content ||
        content.trim() === ''
    ) {

        return 'Vui lòng nhập nội dung blog.';

    }

    if (
        content.trim().length < 10
    ) {

        return 'Nội dung blog quá ngắn.';

    }

    /* ==========================
       CATEGORY
    ========================== */

    if (
        !category ||
        category.trim() === ''
    ) {

        return 'Vui lòng nhập danh mục blog.';

    }

    /* ==========================
       LIKES
    ========================== */

    if (
        likes !== undefined &&
        likes !== null &&
        likes !== ''
    ) {

        const parsedLikes =
            parseInt(
                likes,
                10
            );

        if (
            isNaN(
                parsedLikes
            ) ||
            parsedLikes < 0
        ) {

            return 'Likes phải là số nguyên hợp lệ.';

        }

    }

    /* ==========================
       IMAGE
    ========================== */

    if (
        !isUpdate &&
        !file
    ) {

        return 'Vui lòng upload ảnh blog.';

    }

    return null;

};

/**
 * Xóa file vật lý
 */

const deleteFile = (
    fileName
) => {

    if (!fileName) {

        return;

    }

    const pureFileName =
        path.basename(
            fileName
        );

    const filePath =
        path.join(
            __dirname,
            '..',
            'uploads',
            'blog_cinema',
            pureFileName
        );

    try {

        if (
            fs.existsSync(
                filePath
            )
        ) {

            fs.unlinkSync(
                filePath
            );

            console.log(
                `✅ Đã xóa file blog: ${pureFileName}`
            );

        }

    } catch (err) {

        console.error(
            '❌ Lỗi xóa file blog:',
            err.message
        );

    }

};

/* ==========================================================
    2. USER APIs
========================================================== */

/**
 * GET ALL BLOGS
 */

exports.getAllBlogs =
    async (
        req,
        res
    ) => {

    try {

        const sql = `
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

            ORDER BY
                created_at DESC
        `;

        const [rows] =
            await db.query(
                sql
            );

        return res
            .status(200)
            .json(rows);

    } catch (error) {

        console.error(
            'Get Blog Error:',
            error
        );

        return res
            .status(500)
            .json({

                message:
                    'Lỗi máy chủ khi lấy blog'

            });

    }

};

/**
 * GET BLOG BY SLUG
 */

exports.getBlogBySlug =
    async (
        req,
        res
    ) => {

    const {
        slug
    } =
        req.params;

    try {

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
                AND is_active = 1

                LIMIT 1
                `,
                [slug]
            );

        if (
            rows.length === 0
        ) {

            return res
                .status(404)
                .json({

                    message:
                        'Không tìm thấy blog'

                });

        }

        /* ======================
           INCREASE VIEW
        ====================== */

        await db.query(
            `
            UPDATE blog_cinema
            SET views =
                views + 1
            WHERE blog_id = ?
            `,
            [
                rows[0]
                    .blog_id
            ]
        );

        return res
            .status(200)
            .json(
                rows[0]
            );

    } catch (error) {

        console.error(
            'Get Blog Detail Error:',
            error
        );

        return res
            .status(500)
            .json({

                message:
                    'Lỗi server khi lấy chi tiết blog'

            });

    }

};

/**
 * INCREASE LIKE
 */

exports.increaseLike =
    async (
        req,
        res
    ) => {

    const {
        id
    } =
        req.params;

    try {

        const [rows] =
            await db.query(
                `
                SELECT likes
                FROM blog_cinema
                WHERE blog_id = ?
                `,
                [id]
            );

        if (
            rows.length === 0
        ) {

            return res
                .status(404)
                .json({

                    message:
                        'Không tìm thấy blog'

                });

        }

        await db.query(
            `
            UPDATE blog_cinema
            SET likes =
                likes + 1
            WHERE blog_id = ?
            `,
            [id]
        );

        return res
            .status(200)
            .json({

                success:
                    true,

                message:
                    'Like +1 thành công'

            });

    } catch (error) {

        return res
            .status(500)
            .json({

                message:
                    'Lỗi khi tăng like'

            });

    }

};

/* ==========================================================
    3. ADMIN APIs
========================================================== */

/**
 * GET ALL BLOGS ADMIN
 */

exports.getAllBlogsAdmin =
    async (
        req,
        res
    ) => {

    try {

        const sql = `
            SELECT
                *,

                DATE_FORMAT(
                    created_at,
                    '%d/%m/%Y %H:%i'
                ) AS full_date

            FROM blog_cinema

            ORDER BY
                created_at DESC
        `;

        const [rows] =
            await db.query(
                sql
            );

        return res
            .status(200)
            .json(rows);

    } catch (error) {

        console.error(
            'Get Blog Admin Error:',
            error
        );

        return res
            .status(500)
            .json({

                message:
                    'Lỗi máy chủ admin'

            });

    }

};

/**
 * GET BLOG BY ID
 */

exports.getBlogById =
    async (
        req,
        res
    ) => {

    const {
        id
    } =
        req.params;

    try {

        const [rows] =
            await db.query(
                `
                SELECT
                    *,

                    DATE_FORMAT(
                        created_at,
                        '%Y-%m-%dT%H:%i'
                    ) AS created_at_edit

                FROM blog_cinema

                WHERE blog_id = ?

                LIMIT 1
                `,
                [id]
            );

        if (
            rows.length === 0
        ) {

            return res
                .status(404)
                .json({

                    message:
                        'Không tìm thấy blog'

                });

        }

        return res
            .status(200)
            .json(
                rows[0]
            );

    } catch (error) {

        return res
            .status(500)
            .json({

                message:
                    'Lỗi server khi lấy blog'

            });

    }

};
exports.createBlog = async (req, res) => {
    // 1. Lấy dữ liệu từ req.body và req.file
    const { title, description, content, category, likes } = req.body;
    
    // 2. Validate dữ liệu (dùng hàm validateBlogData có sẵn của bạn)
    const errorMsg = validateBlogData(req.body, req.file, false);
    if (errorMsg) {
        if (req.file) deleteFile(req.file.filename);
        return res.status(400).json({ message: errorMsg });
    }

    try {
        const slug = createSlug(title);
        const imageUrl = req.file ? req.file.filename : null;

        const sql = `INSERT INTO blog_cinema (title, slug, description, content, category, image_url, likes) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        await db.query(sql, [title, slug, description, content, category, imageUrl, likes || 0]);

        return res.status(201).json({ success: true, message: 'Tạo blog thành công!' });
    } catch (error) {
        if (req.file) deleteFile(req.file.filename);
        return res.status(500).json({ message: 'Lỗi server khi tạo blog' });
    }
};
/* ==========================================================
    UPDATE BLOG
========================================================== */

exports.updateBlog = async (
    req,
    res
) => {

    const { id } =
        req.params;

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
            true
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

        /* ======================
           CHECK BLOG EXISTS
        ====================== */

        const [oldBlog] =
            await connection.query(
                `
                SELECT image_url
                FROM blog_cinema
                WHERE blog_id = ?
                `,
                [id]
            );

        if (
            oldBlog.length === 0
        ) {

            if (req.file) {
                deleteFile(
                    req.file.filename
                );
            }

            await connection
                .rollback();

            return res.status(404)
                .json({
                    message:
                        'Blog không tồn tại'
                });

        }

        /* ======================
           CHECK DUPLICATE
        ====================== */

        const slug =
            createSlug(title);

        const [duplicate] =
            await connection.query(
                `
                SELECT blog_id
                FROM blog_cinema
                WHERE
                    (
                        title = ?
                        OR slug = ?
                    )
                AND blog_id != ?
                `,
                [
                    title.trim(),
                    slug,
                    id
                ]
            );

        if (
            duplicate.length > 0
        ) {

            if (req.file) {
                deleteFile(
                    req.file.filename
                );
            }

            await connection
                .rollback();

            return res.status(400)
                .json({
                    message:
                        'Tiêu đề hoặc slug đã tồn tại'
                });

        }

        /* ======================
           HANDLE IMAGE
        ====================== */

        let imageUrl =
            oldBlog[0]
                .image_url;

        if (req.file) {

            imageUrl =
                req.file.filename;

            if (
                oldBlog[0]
                    .image_url &&
                oldBlog[0]
                    .image_url !==
                imageUrl
            ) {

                deleteFile(
                    oldBlog[0]
                        .image_url
                );

            }
        }

        /* ======================
           UPDATE BLOG
        ====================== */

        const sql = `
            UPDATE blog_cinema
            SET
                title = ?,
                slug = ?,
                description = ?,
                content = ?,
                category = ?,
                image_url = ?,
                likes = ?,
                is_active = ?
            WHERE blog_id = ?
        `;

        await connection.query(
            sql,
            [
                title.trim(),
                slug,
                description.trim(),
                content.trim(),
                category.trim(),
                imageUrl,
                parseInt(
                    likes,
                    10
                ) || 0,
                is_active ?? 1,
                id
            ]
        );

        await connection
            .commit();

        return res.status(200)
            .json({

                success: true,

                message:
                    'Cập nhật blog thành công!'

            });

    } catch (error) {

        await connection
            .rollback();

        if (req.file) {

            deleteFile(
                req.file.filename
            );

        }

        return res.status(500)
            .json({

                message:
                    'Lỗi cập nhật blog: ' +
                    error.message

            });

    } finally {

        connection.release();

    }

};

/* ==========================================================
    DELETE BLOG
========================================================== */

exports.deleteBlog = async (
    req,
    res
) => {

    const { id } =
        req.params;

    const connection =
        await db.getConnection();

    try {

        await connection
            .beginTransaction();

        /* ======================
           GET IMAGE
        ====================== */

        const [blog] =
            await connection.query(
                `
                SELECT image_url
                FROM blog_cinema
                WHERE blog_id = ?
                `,
                [id]
            );

        if (
            blog.length === 0
        ) {

            await connection
                .rollback();

            return res.status(404)
                .json({

                    message:
                        'Không tìm thấy blog'

                });

        }

        /* ======================
           DELETE FILE
        ====================== */

        if (
            blog[0]
                .image_url
        ) {

            deleteFile(
                blog[0]
                    .image_url
            );

        }

        /* ======================
           DELETE BLOG
        ====================== */

        await connection.query(
            `
            DELETE FROM blog_cinema
            WHERE blog_id = ?
            `,
            [id]
        );

        await connection
            .commit();

        return res.status(200)
            .json({

                success: true,

                message:
                    'Đã xóa blog thành công.'

            });

    } catch (error) {

        await connection
            .rollback();

        return res.status(500)
            .json({

                message:
                    'Lỗi khi xóa blog.'

            });

    } finally {

        connection.release();

    }

};