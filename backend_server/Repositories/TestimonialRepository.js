const db = require('../Config/db');

class TestimonialRepository {

    // Lấy danh sách có phân trang (kèm thông tin user)
    async findAll(page = 1, limit = 20, search = '') {
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 20;
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === 'string' ? search.trim() : '';

        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(u.full_name LIKE ? OR u.username LIKE ? OR t.content LIKE ?)');
            const keyword = `%${search}%`;
            params.push(keyword, keyword, keyword);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                t.testimonial_id,
                t.user_id,
                u.full_name AS customer_name,
                u.user_avatar AS customer_avatar,
                t.content,
                t.rating,
                t.is_active,
                DATE_FORMAT(t.created_at, '%d/%m/%Y %H:%i') AS created_at
            FROM testimonials t
            INNER JOIN users u ON t.user_id = u.user_id
            ${whereClause}
            ORDER BY t.testimonial_id DESC
            LIMIT ? OFFSET ?
            `,
            [...params, limit, offset]
        );

        const [countRows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM testimonials t
            INNER JOIN users u ON t.user_id = u.user_id
            ${whereClause}
            `,
            params
        );

        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    // Lấy danh sách active (hiển thị trên web)
    async findActive(limit = 4) {
        limit = parseInt(limit) || 4;
        const [rows] = await db.query(
            `
            SELECT
                t.testimonial_id,
                t.user_id,
                u.full_name AS customer_name,
                u.user_avatar AS customer_avatar,
                t.content,
                t.rating,
                DATE_FORMAT(t.created_at, '%d/%m/%Y') AS created_at
            FROM testimonials t
            INNER JOIN users u ON t.user_id = u.user_id
            WHERE t.is_active = 1
            ORDER BY t.created_at DESC
            LIMIT ?
            `,
            [limit]
        );
        return rows;
    }

    // Lấy chi tiết theo id
    async findById(id) {
        const [rows] = await db.query(
            `
            SELECT
                t.testimonial_id,
                t.user_id,
                u.full_name AS customer_name,
                u.user_avatar AS customer_avatar,
                t.content,
                t.rating,
                t.is_active,
                t.created_at
            FROM testimonials t
            INNER JOIN users u ON t.user_id = u.user_id
            WHERE t.testimonial_id = ?
            LIMIT 1
            `,
            [id]
        );
        return rows[0] || null;
    }

    // Tạo mới
    async create(data) {
        const { user_id, content, rating, is_active = 1 } = data;

        const [result] = await db.query(
            `
            INSERT INTO testimonials (user_id, content, rating, is_active)
            VALUES (?, ?, ?, ?)
            `,
            [user_id, content.trim(), rating, is_active]
        );
        return result.insertId;
    }

    // Cập nhật
    async update(id, data) {
        const { content, rating, is_active } = data;

        const [result] = await db.query(
            `
            UPDATE testimonials
            SET
                content = ?,
                rating = ?,
                is_active = ?
            WHERE testimonial_id = ?
            `,
            [content.trim(), rating, is_active, id]
        );
        return result.affectedRows;
    }

    // Xóa
    async delete(id) {
        const [result] = await db.query(
            `DELETE FROM testimonials WHERE testimonial_id = ?`,
            [id]
        );
        return result.affectedRows;
    }

    // Thay đổi trạng thái active
    async toggleActive(id, isActive) {
        const [result] = await db.query(
            `UPDATE testimonials SET is_active = ? WHERE testimonial_id = ?`,
            [isActive, id]
        );
        return result.affectedRows;
    }
}

module.exports = new TestimonialRepository();