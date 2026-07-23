const db = require('../Config/db');
const fs = require('fs');
const path = require('path');

/* =========================================================
 * 1. HELPERS & VALIDATION
 * =========================================================
 */

/**
 * Tạo slug từ tiêu đề khuyến mãi
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
 * Validate dữ liệu Promotion
 */
const validatePromotionData = (data, file, isUpdate = false) => {
    const { title, likes } = data;

    // Validate title
    if (!title || title.trim() === '') {
        return 'Vui lòng nhập tiêu đề khuyến mãi.';
    }
    if (title.trim().length < 5) {
        return 'Tiêu đề khuyến mãi phải từ 5 ký tự trở lên.';
    }

    // Validate likes
    if (likes !== undefined && likes !== null && likes !== '') {
        const parsedLikes = parseInt(likes, 10);
        if (isNaN(parsedLikes) || parsedLikes < 0) {
            return 'Số lượt thích phải là số nguyên hợp lệ.';
        }
    }

    // Validate image (field promotion_image)
    if (!isUpdate && !file) {
        return 'Vui lòng upload hình ảnh khuyến mãi.';
    }

    return null;
};

/**
 * Xóa file vật lý (thư mục promotions)
 */
const deleteFile = (fileName) => {
    if (!fileName) return;
    const pureFileName = path.basename(fileName);
    const filePath = path.join(__dirname, '..', 'uploads', 'promotions', pureFileName);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Đã xóa file: ${pureFileName}`);
        }
    } catch (err) {
        console.error('❌ Lỗi xóa file promotion:', err.message);
    }
};

/* =========================================================
 * 2. GET ALL PROMOTIONS (USER)
 * =========================================================
 */
exports.getAllPromotions = async (req, res) => {
    try {
        const sql = `
            SELECT
                promotion_id,
                title,
                slug,
                description,
                promotion_image,
                views,
                likes,
                DATE_FORMAT(created_at, '%d/%m/%Y') AS date
            FROM promotions
            WHERE is_active = 1
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(sql);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Get All Promotions Error:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ khi lấy khuyến mãi' });
    }
};

/* =========================================================
 * 3. GET ALL PROMOTIONS (ADMIN)
 * =========================================================
 */
exports.getAllPromotionsAdmin = async (req, res) => {
    try {
        const sql = `
            SELECT
                *,
                DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') AS full_date
            FROM promotions
            ORDER BY created_at DESC
        `;
        const [rows] = await db.query(sql);
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Get Promotions Admin Error:', error);
        return res.status(500).json({ message: 'Lỗi máy chủ admin' });
    }
};

/* =========================================================
 * 4. GET PROMOTION BY ID
 * =========================================================
 */
exports.getPromotionById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT * FROM promotions WHERE promotion_id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
        }
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi lấy chi tiết khuyến mãi' });
    }
};

/* =========================================================
 * 5. CREATE PROMOTION
 * =========================================================
 */
exports.createPromotion = async (req, res) => {
    const { title, description, likes } = req.body;
    const file = req.file;

    try {
        const errorMsg = validatePromotionData(req.body, file);
        if (errorMsg) {
            if (file) deleteFile(file.filename);
            return res.status(400).json({ message: errorMsg });
        }

        const slug = createSlug(title);
        const promotion_image = file ? file.filename : null;

        // Check duplicate
        const [duplicate] = await db.query(
            `SELECT promotion_id FROM promotions WHERE title = ? OR slug = ?`,
            [title.trim(), slug]
        );
        if (duplicate.length > 0) {
            if (file) deleteFile(file.filename);
            return res.status(400).json({ message: 'Tiêu đề hoặc slug đã tồn tại' });
        }

        await db.query(
            `INSERT INTO promotions (
                title, slug, description, promotion_image,
                likes, views, is_active
            ) VALUES (?, ?, ?, ?, ?, 0, 1)`,
            [
                title.trim(),
                slug,
                description || '',
                promotion_image,
                parseInt(likes, 10) || 0
            ]
        );

        return res.status(201).json({ success: true, message: 'Tạo khuyến mãi thành công' });
    } catch (error) {
        if (file) deleteFile(file.filename);
        return res.status(500).json({ message: 'Lỗi khi tạo khuyến mãi' });
    }
};

/* =========================================================
 * 6. UPDATE PROMOTION
 * =========================================================
 */
exports.updatePromotion = async (req, res) => {
    const { promotion_id } = req.params;
    const { title, description, likes, is_active } = req.body;
    const file = req.file;

    const errorMsg = validatePromotionData(req.body, file, true);
    if (errorMsg) {
        if (file) deleteFile(file.filename);
        return res.status(400).json({ message: errorMsg });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // CHECK EXISTS
        const [oldPromotion] = await connection.query(
            `SELECT promotion_image FROM promotions WHERE promotion_id = ?`,
            [promotion_id]
        );
        if (oldPromotion.length === 0) {
            if (file) deleteFile(file.filename);
            await connection.rollback();
            return res.status(404).json({ message: 'Khuyến mãi không tồn tại' });
        }

        // CHECK DUPLICATE
        const slug = createSlug(title);
        const [duplicate] = await connection.query(
            `SELECT promotion_id FROM promotions
             WHERE (title = ? OR slug = ?) AND promotion_id != ?`,
            [title.trim(), slug, promotion_id]
        );
        if (duplicate.length > 0) {
            if (file) deleteFile(file.filename);
            await connection.rollback();
            return res.status(400).json({ message: 'Tiêu đề hoặc slug đã tồn tại' });
        }

        // IMAGE HANDLE
        let promotion_image = oldPromotion[0].promotion_image;
        if (file) {
            const newFileName = file.filename;
            // Xóa ảnh cũ nếu khác tên
            if (oldPromotion[0].promotion_image && oldPromotion[0].promotion_image !== newFileName) {
                deleteFile(oldPromotion[0].promotion_image);
            }
            promotion_image = newFileName;
        }

        // UPDATE
        const sql = `
            UPDATE promotions
            SET
                title = ?,
                slug = ?,
                description = ?,
                promotion_image = ?,
                likes = ?,
                is_active = ?
            WHERE promotion_id = ?
        `;
        await connection.query(sql, [
            title.trim(),
            slug,
            description || '',
            promotion_image,
            parseInt(likes, 10) || 0,
            parseInt(is_active, 10) || 0,
            promotion_id
        ]);

        await connection.commit();
        return res.status(200).json({ success: true, message: 'Cập nhật khuyến mãi thành công!' });
    } catch (error) {
        await connection.rollback();
        if (file) deleteFile(file.filename);
        return res.status(500).json({ message: 'Lỗi cập nhật khuyến mãi: ' + error.message });
    } finally {
        connection.release();
    }
};

/* =========================================================
 * 7. DELETE PROMOTION
 * =========================================================
 */
exports.deletePromotion = async (req, res) => {
    const { id } = req.params;
    const { token } = req.body;

    const connection = await db.getConnection();
    try {
        if (!token) {
            return res.status(401).json({ message: 'Thiếu usertoken!' });
        }

        await connection.beginTransaction();

        // GET IMAGE
        const [promotion] = await connection.query(
            `SELECT promotion_image FROM promotions WHERE promotion_id = ?`,
            [id]
        );
        if (promotion.length > 0) {
            deleteFile(promotion[0].promotion_image);
        }

        // DELETE
        await connection.query(`DELETE FROM promotions WHERE promotion_id = ?`, [id]);
        await connection.commit();
        return res.status(200).json({ success: true, message: 'Đã xóa khuyến mãi thành công.' });
    } catch (error) {
        await connection.rollback();
        return res.status(500).json({ message: 'Lỗi khi xóa khuyến mãi.' });
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
            `SELECT likes FROM promotions WHERE promotion_id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
        }
        await db.query(`UPDATE promotions SET likes = likes + 1 WHERE promotion_id = ?`, [id]);
        return res.status(200).json({ success: true, message: 'Like +1 thành công' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi khi tăng like' });
    }
};

/* =========================================================
 * 9. GET PROMOTION BY SLUG
 * =========================================================
 */
exports.getPromotionBySlug = async (req, res) => {
    const { slug } = req.params;
    try {
        const [rows] = await db.query(`SELECT * FROM promotions WHERE slug = ?`, [slug]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
        }
        // TĂNG VIEW
        await db.query(`UPDATE promotions SET views = views + 1 WHERE slug = ?`, [slug]);
        return res.status(200).json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server khi lấy chi tiết khuyến mãi' });
    }
};

/* =========================================================
 * 10. TOGGLE STATUS
 * =========================================================
 */
exports.togglePromotionStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT is_active FROM promotions WHERE promotion_id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
        }
        const newStatus = rows[0].is_active ? 0 : 1;
        await db.query(`UPDATE promotions SET is_active = ? WHERE promotion_id = ?`, [newStatus, id]);
        return res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi cập nhật trạng thái' });
    }
};