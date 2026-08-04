const db = require("../Config/db");

class RoomRepository {
    // ==========================================================
    // LẤY DANH SÁCH PHÒNG - PAGINATION + SEARCH (JOIN với cinemas)
    // ==========================================================
    async findAll(page = 1, limit = 20, search = "") {
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
                WHERE r.room_name LIKE ? 
                OR c.cinema_name LIKE ? 
                OR c.city LIKE ? 
                OR r.room_type LIKE ?
            `;
            const keyword = `%${search}%`;
            queryParams.push(keyword, keyword, keyword, keyword);
        }

        const offset = (page - 1) * limit;

        const sql = `
            SELECT
                r.room_id,
                r.room_name,
                r.room_type,
                r.total_seats,
                DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') AS formatted_date,
                c.cinema_id,
                c.cinema_name,
                c.city
            FROM rooms r
            JOIN cinemas c ON r.cinema_id = c.cinema_id
            ${whereClause}
            ORDER BY r.room_id DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.query(sql, [...queryParams, limit, offset]);

        const countSql = `
            SELECT COUNT(*) AS total
            FROM rooms r
            JOIN cinemas c ON r.cinema_id = c.cinema_id
            ${whereClause}
        `;
        const [countRows] = await db.query(countSql, queryParams);

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

    // ==========================================================
    // LẤY PHÒNG THEO ID
    // ==========================================================
    async findById(roomId) {
        const [rows] = await db.query(
            `SELECT * FROM rooms WHERE room_id = ? LIMIT 1`,
            [roomId]
        );
        return rows[0] || null;
    }

    // ==========================================================
    // LẤY PHÒNG THEO RẠP
    // ==========================================================
    async findByCinema(cinemaId) {
        const [rows] = await db.query(
            `
            SELECT room_id, room_name, room_type, total_seats
            FROM rooms
            WHERE cinema_id = ?
            ORDER BY room_name ASC
            `,
            [cinemaId]
        );
        return rows;
    }

    // ==========================================================
    // KIỂM TRA TÊN PHÒNG TRONG RẠP
    // ==========================================================
    async findByNameInCinema(roomName, cinemaId, excludeRoomId = null) {
        let sql = `SELECT room_id FROM rooms WHERE room_name = ? AND cinema_id = ?`;
        const params = [roomName.trim(), cinemaId];
        if (excludeRoomId) {
            sql += ` AND room_id != ?`;
            params.push(excludeRoomId);
        }
        const [rows] = await db.query(sql, params);
        return rows[0] || null;
    }

    // ==========================================================
    // TẠO PHÒNG
    // ==========================================================
    async create(data) {
        const { room_name, cinema_id, room_type } = data;
        const [result] = await db.query(
            `INSERT INTO rooms (room_name, cinema_id, room_type) VALUES (?, ?, ?)`,
            [room_name.trim(), cinema_id, room_type]
        );
        return result.insertId;
    }

    // ==========================================================
    // CẬP NHẬT PHÒNG
    // ==========================================================
    async update(roomId, data) {
        const { room_name, cinema_id, room_type } = data;
        const [result] = await db.query(
            `UPDATE rooms SET room_name = ?, cinema_id = ?, room_type = ? WHERE room_id = ?`,
            [room_name.trim(), cinema_id, room_type, roomId]
        );
        return result.affectedRows;
    }

    // ==========================================================
    // XÓA PHÒNG
    // ==========================================================
    async delete(roomId) {
        const [result] = await db.query(
            `DELETE FROM rooms WHERE room_id = ?`,
            [roomId]
        );
        return result.affectedRows;
    }
}

module.exports = new RoomRepository();