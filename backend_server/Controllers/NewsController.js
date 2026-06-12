const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

/* =========================================================
 * 1. HELPERS & VALIDATION
 * =========================================================
 */

/**
 * Tạo slug từ tiêu đề bài viết
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
 * Validate dữ liệu News
 */

const validateNewsData = (
    data,
    file,
    isUpdate = false
) => {

    const {
        title,
        content,
        likes
    } = data;

    /**
     * Validate title
     */

    if (
        !title ||
        title.trim() === ''
    ) {

        return
            'Vui lòng nhập tiêu đề bài viết.';

    }

    if (
        title.trim().length < 5
    ) {

        return
            'Tiêu đề bài viết phải từ 5 ký tự trở lên.';

    }

    /**
     * Validate content
     */

    if (
        !content ||
        content.trim() === ''
    ) {

        return
            'Vui lòng nhập nội dung bài viết.';

    }

    if (
        content.trim().length < 10
    ) {

        return
            'Nội dung bài viết quá ngắn (phải từ 10 ký tự trở lên).';

    }

    /**
     * Validate likes
     */

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
            isNaN(parsedLikes) ||
            parsedLikes < 0
        ) {

            return
                'Số lượt thích phải là số nguyên hợp lệ.';

        }

    }

    /**
     * Validate image
     */

    if (
        !isUpdate &&
        !file
    ) {

        return
            'Vui lòng upload hình ảnh đại diện cho bài viết.';

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
            'news',
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
                `✅ Đã xóa file: ${pureFileName}`
            );

        }

    } catch (err) {

        console.error(
            '❌ Lỗi xóa file news:',
            err.message
        );

    }

};

/* =========================================================
 * 2. GET ALL NEWS (USER)
 * =========================================================
 */

exports.getAllNews =
    async (
        req,
        res
    ) => {

    try {

        const sql = `
            SELECT
                news_id,
                title,
                slug,
                image_url,
                views,
                likes,

                DATE_FORMAT(
                    created_at,
                    '%d/%m/%Y'
                ) AS date,

                IF(
                    LENGTH(content) > 150,
                    CONCAT(
                        LEFT(content, 150),
                        '...'
                    ),
                    content
                ) AS short_content

            FROM news

            ORDER BY
                created_at DESC
        `;

        const [rows] =
            await db.query(sql);

        return res.status(200)
            .json(rows);

    } catch (error) {

        console.error(
            'Get All News Error:',
            error
        );

        return res.status(500)
            .json({

                message:
                    'Lỗi máy chủ khi lấy tin tức'

            });

    }

};

/* =========================================================
 * 3. GET ALL NEWS (ADMIN)
 * =========================================================
 */

exports.getAllNewsAdmin =
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

            FROM news

            ORDER BY
                created_at DESC
        `;

        const [rows] =
            await db.query(sql);

        return res.status(200)
            .json(rows);

    } catch (error) {

        console.error(
            'Get News Admin Error:',
            error
        );

        return res.status(500)
            .json({

                message:
                    'Lỗi máy chủ admin'

            });

    }

};
/**
 * ==========================================================
 * 6. UPDATE NEWS
 * ==========================================================
 */

exports.updateNews = async (req, res) => {

    const { news_id } = req.params;

    const {
        title,
        content,
        likes
    } = req.body;

    const errorMsg =
        validateNewsData(
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

        return res.status(400).json({
            message: errorMsg
        });

    }

    const connection =
        await db.getConnection();

    try {

        await connection.beginTransaction();

        /* CHECK NEWS EXISTS */

        const [oldNews] =
            await connection.query(
                `
                SELECT image_url
                FROM news
                WHERE news_id = ?
                `,
                [news_id]
            );

        if (oldNews.length === 0) {

            if (req.file) {
                deleteFile(
                    req.file.filename
                );
            }

            await connection.rollback();

            return res.status(404).json({
                message:
                    'Bài viết không tồn tại'
            });

        }

        /* CHECK DUPLICATE */

        const slug =
            createSlug(title);

        const [duplicate] =
            await connection.query(
                `
                SELECT news_id
                FROM news
                WHERE
                    (
                        title = ?
                        OR slug = ?
                    )
                AND news_id != ?
                `,
                [
                    title.trim(),
                    slug,
                    news_id
                ]
            );

        if (duplicate.length > 0) {

            if (req.file) {
                deleteFile(
                    req.file.filename
                );
            }

            await connection.rollback();

            return res.status(400).json({
                message:
                    'Tiêu đề hoặc slug đã tồn tại'
            });

        }

        /* IMAGE HANDLE */

        let imageUrl =
            oldNews[0].image_url;

        if (req.file) {

            imageUrl =
                req.file.filename;

            if (
                oldNews[0].image_url &&
                oldNews[0].image_url !==
                imageUrl
            ) {

                deleteFile(
                    oldNews[0]
                        .image_url
                );

            }

        }

        /* UPDATE NEWS */

        const sql = `
            UPDATE news
            SET
                title = ?,
                slug = ?,
                content = ?,
                image_url = ?,
                likes = ?
            WHERE news_id = ?
        `;

        await connection.query(
            sql,
            [
                title.trim(),
                slug,
                content.trim(),
                imageUrl,
                parseInt(likes, 10) || 0,
                news_id
            ]
        );

        await connection.commit();

        return res.status(200).json({

            success: true,

            message:
                'Cập nhật bài viết thành công!'

        });

    } catch (error) {

        await connection.rollback();

        if (req.file) {

            deleteFile(
                req.file.filename
            );

        }

        return res.status(500).json({

            message:
                'Lỗi cập nhật bài viết: ' +
                error.message

        });

    } finally {

        connection.release();

    }

};

/**
 * ==========================================================
 * 7. DELETE NEWS
 * ==========================================================
 */

exports.deleteNews = async (req, res) => {

    const { id } =
        req.params;

    const { token } =
        req.body;

    const connection =
        await db.getConnection();

    try {

        if (!token) {

            return res.status(401).json({

                message:
                    'Thiếu usertoken!'

            });

        }

        await connection.beginTransaction();

        /* GET IMAGE */

        const [news] =
            await connection.query(
                `
                SELECT image_url
                FROM news
                WHERE news_id = ?
                `,
                [id]
            );

        if (news.length > 0) {

            deleteFile(
                news[0].image_url
            );

        }

        /* DELETE NEWS */

        await connection.query(
            `
            DELETE FROM news
            WHERE news_id = ?
            `,
            [id]
        );

        await connection.commit();

        return res.status(200).json({

            success: true,

            message:
                'Đã xóa bài viết thành công.'

        });

    } catch (error) {

        await connection.rollback();

        return res.status(500).json({

            message:
                'Lỗi khi xóa bài viết.'

        });

    } finally {

        connection.release();

    }

};