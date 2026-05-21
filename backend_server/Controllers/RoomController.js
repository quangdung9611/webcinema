const db = require('../Config/db');

/**
 * =========================================================
 * VALIDATE ROOM DATA
 * =========================================================
 */

const validateRoomData = (data) => {

    const {
        room_name,
        cinema_id,
        room_type
    } = data;

    if (
        !room_name ||
        !cinema_id ||
        !room_type
    ) {

        return {
            error:
                'Vui lòng nhập tên phòng, chọn cụm rạp và loại phòng'
        };

    }

    if (
        room_name.trim().length < 2
    ) {

        return {
            field: 'room_name',
            error: 'Tên phòng quá ngắn'
        };

    }

    return null;

};

/**
 * =========================================================
 * 1. GET ALL ROOMS
 * =========================================================
 */

exports.getAllRooms = async (req, res) => {

    try {

        const sql = `
            SELECT 
                r.room_id,
                r.room_name,
                r.room_type,

                DATE_FORMAT(
                    r.created_at,
                    '%d/%m/%Y %H:%i'
                ) AS formatted_date,

                c.cinema_name,
                c.city

            FROM rooms r

            JOIN cinemas c
            ON r.cinema_id = c.cinema_id

            ORDER BY r.room_id DESC
        `;

        const [rows] =
            await db.query(sql);

        res.status(200).json(rows);

    } catch (error) {

        console.error(
            '❌ [ROOM]',
            error
        );

        res.status(500).json({
            error:
                'Lỗi khi lấy danh sách phòng từ database'
        });

    }

};

/**
 * =========================================================
 * 2. GET ROOM BY ID
 * =========================================================
 */

exports.getRoomById = async (req, res) => {

    const { id } = req.params;

    try {

        const [rows] = await db.query(
            'SELECT * FROM rooms WHERE room_id = ?',
            [id]
        );

        if (rows.length === 0) {

            return res.status(404).json({
                error: 'Không tìm thấy phòng'
            });

        }

        res.status(200).json(rows[0]);

    } catch (error) {

        res.status(500).json({
            error: 'Lỗi lấy chi tiết phòng'
        });

    }

};

/**
 * =========================================================
 * 3. GET ROOMS BY CINEMA
 * =========================================================
 */

exports.getRoomsByCinema = async (req, res) => {

    const { cinema_id } = req.params;

    try {

        const [rows] = await db.query(
            'SELECT * FROM rooms WHERE cinema_id = ?',
            [cinema_id]
        );

        res.status(200).json(rows);

    } catch (error) {

        res.status(500).json({
            error: 'Lỗi lọc phòng theo rạp'
        });

    }

};

/**
 * =========================================================
 * 4. CREATE ROOM
 * =========================================================
 */

exports.createRoom = async (req, res) => {

    try {

        const {
            room_name,
            cinema_id,
            room_type
        } = req.body;

        /* VALIDATE */

        const validationError =
            validateRoomData(req.body);

        if (validationError) {

            return res
                .status(400)
                .json(validationError);

        }

        /* CLEAN DATA */

        const cleanRoomName =
            room_name.trim();

        /* CHECK DUPLICATE */

        const [existing] = await db.query(
            `
            SELECT * FROM rooms
            WHERE room_name = ?
            AND cinema_id = ?
            `,
            [
                cleanRoomName,
                cinema_id
            ]
        );

        if (existing.length > 0) {

            return res.status(400).json({
                field: 'room_name',
                error:
                    'Tên phòng này đã tồn tại trong rạp này rồi'
            });

        }

        /* VIETNAM TIME */

        const nowVN =
            new Date().toLocaleString(
                'sv-SE',
                {
                    timeZone:
                        'Asia/Ho_Chi_Minh'
                }
            );

        /* INSERT */

        const [result] = await db.query(
            `
            INSERT INTO rooms
            (
                room_name,
                cinema_id,
                room_type,
                created_at
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                cleanRoomName,
                cinema_id,
                room_type,
                nowVN
            ]
        );

        res.status(201).json({

            success: true,

            message:
                'Thêm phòng thành công',

            room_id:
                result.insertId

        });

    } catch (err) {

        res.status(500).json({
            error:
                'Lỗi hệ thống khi tạo phòng: ' +
                err.message
        });

    }

};

/**
 * =========================================================
 * 5. UPDATE ROOM
 * =========================================================
 */

exports.updateRoom = async (req, res) => {

    const { id } = req.params;

    try {

        const {
            room_name,
            cinema_id,
            room_type
        } = req.body;

        /* VALIDATE */

        const validationError =
            validateRoomData(req.body);

        if (validationError) {

            return res
                .status(400)
                .json(validationError);

        }

        /* CLEAN DATA */

        const cleanRoomName =
            room_name.trim();

        /* CHECK DUPLICATE */

        const [existing] = await db.query(
            `
            SELECT * FROM rooms
            WHERE room_name = ?
            AND cinema_id = ?
            AND room_id != ?
            `,
            [
                cleanRoomName,
                cinema_id,
                id
            ]
        );

        if (existing.length > 0) {

            return res.status(400).json({

                field: 'room_name',

                error:
                    'Tên phòng này đã tồn tại trong rạp này rồi'

            });

        }

        /* UPDATE */

        const [result] = await db.query(
            `
            UPDATE rooms
            SET
                room_name = ?,
                cinema_id = ?,
                room_type = ?
            WHERE room_id = ?
            `,
            [
                cleanRoomName,
                cinema_id,
                room_type,
                id
            ]
        );

        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({
                error:
                    'Không tìm thấy phòng'
            });

        }

        res.status(200).json({

            success: true,

            message:
                'Cập nhật phòng thành công'

        });

    } catch (err) {

        res.status(500).json({
            error:
                'Lỗi cập nhật phòng: ' +
                err.message
        });

    }

};

/**
 * =========================================================
 * 6. DELETE ROOM
 * =========================================================
 */

exports.deleteRoom = async (req, res) => {

    const { id } = req.params;

    try {

        await db.query(
            'DELETE FROM rooms WHERE room_id = ?',
            [id]
        );

        res.status(200).json({
            message:
                'Đã xóa phòng thành công'
        });

    } catch (err) {

        res.status(500).json({
            error:
                'Không thể xóa (Phòng có dữ liệu ghế hoặc suất chiếu)'
        });

    }

};