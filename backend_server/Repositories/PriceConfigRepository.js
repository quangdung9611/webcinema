const db = require("../Config/db");

class PriceConfigRepository {
    // ==========================================================
    // LẤY TẤT CẢ CẤU HÌNH GIÁ - KHÔNG PHÂN TRANG
    // ==========================================================

    async findAll() {
        const [rows] = await db.query(
            `SELECT * FROM price_config ORDER BY room_type, time_slot, day_type, seat_type`
        );
        return rows;
    }

    // ==========================================================
    // LẤY TẤT CẢ CẤU HÌNH GIÁ - CÓ PHÂN TRANG
    // ==========================================================

    async findAllWithPagination(page = 1, limit = 20, search = "") {
        page = Number.parseInt(page, 10);
        limit = Number.parseInt(limit, 10);

        if (page < 1) page = 1;
        if (limit < 1) limit = 20;
        if (limit > 100) limit = 100;

        search = typeof search === "string" ? search.trim() : "";

        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = `
                WHERE
                    room_type LIKE ?
                    OR time_slot LIKE ?
                    OR day_type LIKE ?
                    OR seat_type LIKE ?
                    OR CAST(price AS CHAR) LIKE ?
            `;

            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword, keyword, keyword);
        }

        const offset = (page - 1) * limit;

        const [rows] = await db.query(
            `
            SELECT
                price_config_id,
                room_type,
                time_slot,
                day_type,
                seat_type,
                price,
                status,
                created_at,
                updated_at
            FROM price_config
            ${whereClause}
            ORDER BY room_type, time_slot, day_type, seat_type
            LIMIT ? OFFSET ?
            `,
            [...queryParams, limit, offset]
        );

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM price_config ${whereClause}`,
            queryParams
        );

        const total = Number(countRows[0]?.total || 0);
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: totalPages > 0 ? totalPages : 1,
                hasPreviousPage: page > 1,
                hasNextPage: page < totalPages
            }
        };
    }

    // ==========================================================
    // LẤY CẤU HÌNH GIÁ THEO ID
    // ==========================================================

    async findById(id) {
        const [rows] = await db.query(
            `SELECT * FROM price_config WHERE price_config_id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    // ==========================================================
    // LẤY CẤU HÌNH GIÁ THEO ROOM_TYPE + TIME_SLOT + DAY_TYPE + SEAT_TYPE
    // ==========================================================

    async findByRoomTimeDaySeat(roomType, timeSlot, dayType, seatType) {
        const [rows] = await db.query(
            `SELECT * FROM price_config 
             WHERE room_type = ? AND time_slot = ? AND day_type = ? AND seat_type = ? AND status = 1
             ORDER BY priority DESC LIMIT 1`,
            [roomType, timeSlot, dayType, seatType]
        );
        return rows[0] || null;
    }

    // ==========================================================
    // LẤY CẤU HÌNH GIÁ THEO ROOM_TYPE + TIME_SLOT + DAY_TYPE (TRẢ VỀ TẤT CẢ SEAT_TYPE)
    // ==========================================================

    async findAllByRoomTimeDay(roomType, timeSlot, dayType) {
        const [rows] = await db.query(
            `SELECT * FROM price_config 
             WHERE room_type = ? AND time_slot = ? AND day_type = ? AND status = 1
             ORDER BY seat_type`,
            [roomType, timeSlot, dayType]
        );
        return rows;
    }

    // ==========================================================
    // LẤY TẤT CẢ CẤU HÌNH GIÁ THEO ROOM_TYPE (CŨ)
    // ==========================================================

    async findByRoomType(roomType) {
        const [rows] = await db.query(
            `SELECT * FROM price_config 
             WHERE room_type = ? AND status = 1 
             ORDER BY time_slot, day_type, seat_type`,
            [roomType]
        );
        return rows;
    }

    // ==========================================================
    // LẤY TẤT CẢ CẤU HÌNH GIÁ ĐANG ACTIVE
    // ==========================================================

    async findAllActive() {
        const [rows] = await db.query(
            `SELECT * FROM price_config WHERE status = 1 ORDER BY room_type, time_slot, day_type, seat_type`
        );
        return rows;
    }

    // ==========================================================
    // LẤY DANH SÁCH ROOM_TYPE PHÂN BIỆT
    // ==========================================================

    async getDistinctRoomTypes() {
        const [rows] = await db.query(
            `SELECT DISTINCT room_type FROM price_config ORDER BY room_type`
        );
        return rows.map(row => row.room_type);
    }

    // ==========================================================
    // LẤY DANH SÁCH SEAT_TYPE PHÂN BIỆT
    // ==========================================================

    async getDistinctSeatTypes() {
        const [rows] = await db.query(
            `SELECT DISTINCT seat_type FROM price_config ORDER BY seat_type`
        );
        return rows.map(row => row.seat_type);
    }

    // ==========================================================
    // TẠO MỚI CẤU HÌNH GIÁ
    // ==========================================================

    async create(data) {
        const { room_type, time_slot, day_type, seat_type, price, status } = data;
        const [result] = await db.query(
            `INSERT INTO price_config (room_type, time_slot, day_type, seat_type, price, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [room_type, time_slot, day_type, seat_type || 'STANDARD', price, status || 1]
        );
        return this.findById(result.insertId);
    }

    // ==========================================================
    // CẬP NHẬT CẤU HÌNH GIÁ
    // ==========================================================

    async update(id, data) {
        const { room_type, time_slot, day_type, seat_type, price, status } = data;
        const [result] = await db.query(
            `UPDATE price_config 
             SET room_type = ?, time_slot = ?, day_type = ?, seat_type = ?, price = ?, status = ?
             WHERE price_config_id = ?`,
            [room_type, time_slot, day_type, seat_type, price, status, id]
        );
        return result.affectedRows > 0 ? this.findById(id) : null;
    }

    // ==========================================================
    // CẬP NHẬT STATUS
    // ==========================================================

    async updateStatus(id, status) {
        const [result] = await db.query(
            `UPDATE price_config SET status = ? WHERE price_config_id = ?`,
            [status, id]
        );
        return result.affectedRows > 0;
    }

    // ==========================================================
    // XÓA CẤU HÌNH GIÁ
    // ==========================================================

    async delete(id) {
        const [result] = await db.query(
            `DELETE FROM price_config WHERE price_config_id = ?`,
            [id]
        );
        return result.affectedRows > 0;
    }

    // ==========================================================
    // BULK INSERT (DÙNG CHO SEED)
    // ==========================================================

    async bulkInsert(dataArray) {
        if (!dataArray || dataArray.length === 0) return 0;

        const values = dataArray.map(item => [
            item.room_type,
            item.time_slot,
            item.day_type,
            item.seat_type || 'STANDARD',
            item.price,
            item.status || 1
        ]);

        const [result] = await db.query(
            `INSERT INTO price_config (room_type, time_slot, day_type, seat_type, price, status) VALUES ?`,
            [values]
        );

        return result.affectedRows;
    }

    // ==========================================================
    // KIỂM TRA TRÙNG LẶP (CÓ SEAT_TYPE)
    // ==========================================================

    async checkDuplicate(roomType, timeSlot, dayType, seatType) {
        const [rows] = await db.query(
            `SELECT * FROM price_config 
             WHERE room_type = ? AND time_slot = ? AND day_type = ? AND seat_type = ?`,
            [roomType, timeSlot, dayType, seatType]
        );
        return rows.length > 0;
    }
}

module.exports = new PriceConfigRepository();