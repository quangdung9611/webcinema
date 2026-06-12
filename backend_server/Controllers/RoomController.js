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
            error:
                'Tên phòng quá ngắn'
        };
    }

    const validRoomTypes = [
        '2D',
        '3D',
        'IMAX'
    ];

    if (
        !validRoomTypes.includes(room_type)
    ) {
        return {
            field: 'room_type',
            error:
                'Loại phòng không hợp lệ'
        };
    }

    return null;
};

/**
 * =========================================================
 * 1. GET ALL ROOMS
 * =========================================================
 */

exports.getAllRooms = async (
    req,
    res
) => {

    try {

        const sql = `
            SELECT
                r.room_id,
                r.room_name,
                r.room_type,
                r.total_seats,

                DATE_FORMAT(
                    r.created_at,
                    '%d/%m/%Y %H:%i'
                ) AS formatted_date,

                c.cinema_id,
                c.cinema_name,
                c.city

            FROM rooms r

            JOIN cinemas c
                ON r.cinema_id = c.cinema_id

            ORDER BY r.room_id DESC
        `;

        const [rows] =
            await db.query(sql);

        return res.status(200).json(
            rows
        );

    } catch (error) {

        console.error(
            'Get All Rooms Error:',
            error
        );

        return res.status(500).json({
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

exports.getRoomById = async (
    req,
    res
) => {

    const { id } =
        req.params;

    try {

        const [rows] =
            await db.query(
                `
                SELECT
                    *
                FROM rooms
                WHERE room_id = ?
                `,
                [id]
            );

        if (
            rows.length === 0
        ) {
            return res.status(404).json({
                error:
                    'Không tìm thấy phòng'
            });
        }

        return res.status(200).json(
            rows[0]
        );

    } catch (error) {

        console.error(
            'Get Room Detail Error:',
            error
        );

        return res.status(500).json({
            error:
                'Lỗi lấy chi tiết phòng'
        });

    }

};

/**
 * =========================================================
 * 3. GET ROOMS BY CINEMA
 * =========================================================
 */

exports.getRoomsByCinema = async (
    req,
    res
) => {

    const {
        cinema_id
    } = req.params;

    try {

        const [rows] =
            await db.query(
                `
                SELECT
                    room_id,
                    room_name,
                    room_type,
                    total_seats
                FROM rooms
                WHERE cinema_id = ?
                ORDER BY room_name ASC
                `,
                [cinema_id]
            );

        return res.status(200).json(
            rows
        );

    } catch (error) {

        console.error(
            'Get Rooms By Cinema Error:',
            error
        );

        return res.status(500).json({
            error:
                'Lỗi lọc phòng theo rạp'
        });

    }

};

/**
 * =========================================================
 * 4. CREATE ROOM
 * =========================================================
 */

exports.createRoom = async (
    req,
    res
) => {

    try {

        const {
            room_name,
            cinema_id,
            room_type
        } = req.body;

        /* VALIDATE */

        const validationError =
            validateRoomData(
                req.body
            );

        if (
            validationError
        ) {
            return res
                .status(400)
                .json(
                    validationError
                );
        }

        /* CLEAN DATA */

        const cleanRoomName =
            room_name.trim();

        /* CHECK DUPLICATE */

        const [existing] =
            await db.query(
                `
                SELECT room_id
                FROM rooms
                WHERE room_name = ?
                AND cinema_id = ?
                `,
                [
                    cleanRoomName,
                    cinema_id
                ]
            );

        if (
            existing.length > 0
        ) {
            return res.status(400).json({
                field:
                    'room_name',

                error:
                    'Tên phòng này đã tồn tại trong rạp này rồi'
            });
        }
        
        /* INSERT ROOM
           created_at dùng DEFAULT CURRENT_TIMESTAMP
        */

        const [result] =
            await db.query(
                `
                INSERT INTO rooms
                (
                    room_name,
                    cinema_id,
                    room_type
                )
                VALUES (?, ?, ?)
                `,
                [
                    cleanRoomName,
                    cinema_id,
                    room_type
                ]
            );

        return res.status(201).json({

            success: true,

            message:
                'Thêm phòng thành công',

            room_id:
                result.insertId

        });

    } catch (err) {

        console.error(
            'Create Room Error:',
            err
        );

        return res.status(500).json({
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

exports.updateRoom = async (
    req,
    res
) => {

    const { id } =
        req.params;

    try {

        const {
            room_name,
            cinema_id,
            room_type
        } = req.body;

        /* VALIDATE */

        const validationError =
            validateRoomData(
                req.body
            );

        if (
            validationError
        ) {
            return res
                .status(400)
                .json(
                    validationError
                );
        }

        /* CLEAN DATA */

        const cleanRoomName =
            room_name.trim();

        /* CHECK DUPLICATE */

        const [existing] =
            await db.query(
                `
                SELECT room_id
                FROM rooms
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

        if (
            existing.length > 0
        ) {

            return res.status(400).json({

                field:
                    'room_name',

                error:
                    'Tên phòng này đã tồn tại trong rạp này rồi'

            });

        }

        /* UPDATE ROOM */

        const [result] =
            await db.query(
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

        return res.status(200).json({

            success: true,

            message:
                'Cập nhật phòng thành công'

        });

    } catch (err) {

        console.error(
            'Update Room Error:',
            err
        );

        return res.status(500).json({
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

exports.deleteRoom = async (
    req,
    res
) => {

    const { id } =
        req.params;

    try {

        /* CHECK ROOM EXISTS */

        const [room] =
            await db.query(
                `
                SELECT room_id
                FROM rooms
                WHERE room_id = ?
                `,
                [id]
            );

        if (
            room.length === 0
        ) {

            return res.status(404).json({
                error:
                    'Không tìm thấy phòng'
            });

        }

        /* DELETE ROOM */

        const [result] =
            await db.query(
                `
                DELETE FROM rooms
                WHERE room_id = ?
                `,
                [id]
            );

        if (
            result.affectedRows === 0
        ) {

            return res.status(400).json({
                error:
                    'Xóa phòng thất bại'
            });

        }

        return res.status(200).json({
            success: true,
            message:
                'Đã xóa phòng thành công'
        });

    } catch (err) {

        console.error(
            'Delete Room Error:',
            err
        );

        // Nếu bị khóa Foreign Key
        if (
            err.code ===
            'ER_ROW_IS_REFERENCED_2'
        ) {

            return res.status(400).json({
                error:
                    'Không thể xóa vì phòng đã có dữ liệu ghế hoặc suất chiếu'
            });

        }

        return res.status(500).json({
            error:
                'Lỗi hệ thống khi xóa phòng'
        });

    }

};