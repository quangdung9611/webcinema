const db = require('../Config/db');

/**
 * ============================================================
 * 1. KHỞI TẠO SƠ ĐỒ GHẾ GỐC (ADMIN)
 * Dùng để tạo ra "bản vẽ" ghế cho một phòng mới
 * ============================================================
 */
exports.initRoomSeats = async (req, res) => {
    const { roomId, roomType, cinemaId } = req.body;
    let totalSeats = 0;
    const seatsPerRow = 10;
    let seatsData = [];

    switch (roomType) {
        case '2D': totalSeats = 120; break;
        case '3D': totalSeats = 80; break;
        case 'IMAX': totalSeats = 48; break;
        default: totalSeats = 60;
    }

    try {
        await db.query("DELETE FROM seats WHERE room_id = ?", [roomId]);
        const totalRows = Math.ceil(totalSeats / seatsPerRow);

        for (let i = 0; i < totalSeats; i++) {
            const rowIndex = Math.floor(i / seatsPerRow);
            const rowLetter = String.fromCharCode(65 + rowIndex);
            const seatNumber = (i % seatsPerRow) + 1;

            let type = 'Standard';
            let price = 0;

            // --- PHÂN LOẠI GHẾ ---
            if (roomType === '2D') {
                if (rowIndex === totalRows - 1) type = 'Couple';
                else type = 'Standard';
            } else if (roomType === 'IMAX') {
                if (rowIndex === totalRows - 1) type = 'Couple';
                else type = 'VIP';
            } else if (roomType === '3D') {
                if (rowIndex === totalRows - 1) type = 'Couple';
                else if (rowIndex >= 2 && rowIndex <= 5) type = 'VIP';
                else type = 'Standard';
            }

            // --- ÁP GIÁ ---
            if (roomType === 'IMAX') {
                price = (type === 'Couple') ? 350000 : 250000;
            } else if (roomType === '3D') {
                if (type === 'VIP') price = 150000;
                else if (type === 'Couple') price = 200000;
                else price = 120000;
            } else {
                price = (type === 'Couple') ? 150000 : 80000;
            }

            if (type === 'Couple') {
                const maxCoupleSeats = (roomType === 'IMAX') ? 8 : 10;
                if (seatNumber <= maxCoupleSeats && seatNumber % 2 !== 0) {
                    seatsData.push([roomId, cinemaId, rowLetter, seatNumber, type, price, 1]);
                }
            } else {
                seatsData.push([roomId, cinemaId, rowLetter, seatNumber, type, price, 1]);
            }
        }

        const sqlInsert = "INSERT INTO seats (room_id, cinema_id, seat_row, seat_number, seat_type, price, is_active) VALUES ?";
        await db.query(sqlInsert, [seatsData]);
        await db.query("UPDATE rooms SET total_seats = ? WHERE room_id = ?", [totalSeats, roomId]);

        res.status(200).json({ success: true, message: `Khởi tạo xong phòng ${roomType} chuẩn cấu hình!` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSeatMapByShowtime = async (req, res) => {
    const { showtimeId } = req.params;

    try {
        // 1. Tìm xem suất chiếu này thuộc phòng nào
        const [showtimeRows] = await db.query(
            "SELECT showtime_id, room_id FROM showtimes WHERE showtime_id = ?", 
            [showtimeId]
        );

        console.log("--- CHECK DATA ---");
        console.log("Dữ liệu showtime tìm được:", showtimeRows);

        if (showtimeRows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy suất chiếu ID: " + showtimeId });
        }

        const roomIdFromShowtime = showtimeRows[0].room_id;
        console.log("Suất chiếu này yêu cầu lấy ghế của Room ID:", roomIdFromShowtime);

        // 2. Truy vấn lấy ghế (Sửa lại CASE WHEN để nhận diện cả ghế đang giữ)
        const sql = `
            SELECT s.*, 
            CASE 
                WHEN s.is_active = 0 THEN 'Maintenance'
                -- Nếu đã có vé và đơn hàng đã hoàn tất -> Chắc chắn là Booked (Màu đỏ)
                WHEN t.ticket_id IS NOT NULL AND b.status = 'Completed' THEN 'Booked'
                -- Nếu đã có vé nhưng đơn hàng đang chờ thanh toán (Pending) -> Trạng thái Reserved (Màu vàng/xám giữ chỗ)
                WHEN t.ticket_id IS NOT NULL AND b.status = 'Pending' THEN 'Reserved'
                ELSE 'Available'
            END as seat_status
            FROM seats s
            -- Join với tickets để xem ghế đã được chọn chưa
            LEFT JOIN tickets t ON s.seat_id = t.seat_id AND t.showtime_id = ?
            -- Join với bookings để biết trạng thái thanh toán của vé đó
            LEFT JOIN bookings b ON t.booking_id = b.booking_id
            WHERE s.room_id = ? 
            -- Thêm GROUP BY để tránh lỗi 1 ghế hiện 2 lần nếu DB lỡ có dữ liệu rác
            GROUP BY s.seat_id
            ORDER BY s.seat_row ASC, s.seat_number ASC
        `;

        const [results] = await db.query(sql, [showtimeId, roomIdFromShowtime]);
        
        console.log("Số lượng ghế tìm thấy cho phòng này:", results.length);
        
        // Trả về dữ liệu cho Frontend
        res.status(200).json(results);

    } catch (err) {
        console.error("Lỗi Controller:", err);
        res.status(500).json({ error: "Lỗi hệ thống: " + err.message });
    }
};
/**
 * ============================================================
 * 3. CÁC HÀM QUẢN TRỊ (ADMIN)
 * Dùng để xem cấu trúc phòng tĩnh và chỉnh sửa ghế
 * ============================================================
 */

// Lấy danh sách ghế theo phòng (dành cho Admin xem layout gốc)
exports.getSeatsByRoom = async (req, res) => {
    const { roomId } = req.params;
    try {
        const [results] = await db.query(
            "SELECT *, 'Available' as seat_status FROM seats WHERE room_id = ? ORDER BY seat_row, seat_number", 
            [roomId]
        );
        res.status(200).json(results);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// Xóa sạch ghế của một phòng
exports.deleteSeatsByRoom = async (req, res) => {
    const { roomId } = req.params;
    try {
        await db.query("DELETE FROM seats WHERE room_id = ?", [roomId]);
        res.status(200).json({ message: "Đã xóa sạch cấu trúc phòng!" });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: "Không thể xóa vì phòng này đã có dữ liệu vé đặt!" });
        }
        res.status(500).json({ error: err.message });
    }
};

// Bật/Tắt trạng thái bảo trì của ghế
exports.toggleSeatActive = async (req, res) => {
    const { seatId, isActive } = req.body;
    try {
        await db.query("UPDATE seats SET is_active = ? WHERE seat_id = ?", [isActive, seatId]);
        res.status(200).json({ success: true, message: "Đã cập nhật trạng thái bảo trì!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// Cập nhật loại ghế và giá tiền
exports.updateSeatTypeAndPrice = async (req, res) => {
    const { seatId, seatType, price } = req.body;
    try {
        await db.query("UPDATE seats SET seat_type = ?, price = ? WHERE seat_id = ?", [seatType, price, seatId]);
        res.status(200).json({ success: true, message: "Cập nhật loại ghế/giá thành công!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};