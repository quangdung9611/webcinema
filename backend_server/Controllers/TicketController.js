const db = require('../Config/db');
const QRCode = require('qrcode');

/**
 * --- HÀM 1: TẠO VÉ ---
 * Chạy sau khi thanh toán thành công.
 * Đã cập nhật: Thêm room_id, cinema_id và thời gian chuẩn VN.
 */
const createTickets = async (bookingId) => {
    try {
        const [bookingInfo] = await db.query(
            `SELECT b.showtime_id, s.room_id, s.cinema_id 
             FROM bookings b
             JOIN showtimes s ON b.showtime_id = s.showtime_id
             WHERE b.booking_id = ?`, 
            [bookingId]
        );

        if (bookingInfo.length === 0) return { success: false };
        
        const { showtime_id, room_id, cinema_id } = bookingInfo[0];

        const [details] = await db.query(
            "SELECT seat_id, price FROM booking_details WHERE booking_id = ? AND seat_id IS NOT NULL", 
            [bookingId]
        );

        // FIX GIỜ: Lấy giờ hiện tại từ Node.js (Render đã set TZ)
        const now = new Date();

        const ticketsData = details.map((item) => [
            bookingId, 
            showtime_id, 
            room_id,
            cinema_id,
            item.seat_id, 
            `TIC${bookingId}${item.seat_id}${Math.floor(Math.random() * 100)}`, 
            item.price, 
            'Booked', 
            'Valid',
            now, // Thêm created_at
            now  // Thêm updated_at
        ]);

        if (ticketsData.length > 0) {
            const sql = `
                INSERT INTO tickets 
                (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status, created_at, updated_at) 
                VALUES ?
            `;
            await db.query(sql, [ticketsData]);
        }

        return { success: true };
    } catch (err) {
        console.error("Lỗi tạo vé (Quang Dũng):", err.message);
        throw err;
    }
};

/**
 * --- HÀM 2: LẤY MÃ QR ---
 */
const getTicketQR = async (req, res) => {
    const { ticketCode } = req.params;
    try {
        const qrImage = await QRCode.toDataURL(ticketCode, { 
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });
        
        return res.status(200).json({ 
            success: true, 
            qrCodeUrl: qrImage 
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * --- HÀM 3: SOÁT VÉ (CHECK-IN) ---
 * Đã sửa: Cập nhật thời gian check-in chuẩn VN
 */
const checkInTicket = async (req, res) => {
    const { ticketCode } = req.body;
    const now = new Date(); // Lấy giờ lúc quét vé

    try {
        const sql = `
            SELECT t.*, s.seat_row, s.seat_number, m.title as movie_title, st.start_time
            FROM tickets t
            JOIN seats s ON t.seat_id = s.seat_id
            JOIN showtimes st ON t.showtime_id = st.showtime_id
            JOIN movies m ON st.movie_id = m.movie_id
            WHERE t.ticket_code = ?
        `;
        const [results] = await db.query(sql, [ticketCode]);

        if (results.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy mã vé này trong hệ thống!" });
        }

        const ticket = results[0];
        if (ticket.ticket_status === 'Used') {
            return res.status(400).json({ message: "Cảnh báo: Vé này đã được soát trước đó!" });
        }

        // FIX: Cập nhật thêm cột updated_at để biết khách vào rạp lúc nào
        await db.query(
            "UPDATE tickets SET ticket_status = 'Used', seat_status = 'Used', updated_at = ? WHERE ticket_id = ?", 
            [now, ticket.ticket_id]
        );

        return res.status(200).json({ 
            success: true, 
            message: "Soát vé thành công! Mời khách vào phòng.", 
            info: {
                movie: ticket.movie_title,
                seat: `${ticket.seat_row}${ticket.seat_number}`,
                time: ticket.start_time,
                checkInAt: now.toLocaleTimeString('vi-VN') // Trả thêm giờ soát vé cho FE
            }
        });
    } catch (err) {
        return res.status(500).json({ error: "Lỗi hệ thống soát vé: " + err.message });
    }
};

/**
 * --- HÀM 4: LẤY TẤT CẢ VÉ (CHO ADMIN) ---
 */
const getAllTickets = async (req, res) => {
    try {
        const sql = `
            SELECT 
                t.*, 
                u.full_name, 
                m.title as movie_title, 
                st.start_time, 
                r.room_name, 
                s.seat_row, 
                s.seat_number
            FROM tickets t
            JOIN bookings b ON t.booking_id = b.booking_id
            JOIN users u ON b.user_id = u.user_id
            JOIN showtimes st ON t.showtime_id = st.showtime_id
            JOIN movies m ON st.movie_id = m.movie_id
            JOIN rooms r ON st.room_id = r.room_id
            JOIN seats s ON t.seat_id = s.seat_id
            ORDER BY t.created_at DESC
        `;
        const [results] = await db.query(sql);
        return res.status(200).json(results);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * --- HÀM 5: LẤY VÉ THEO SUẤT CHIẾU (DÙNG CHO TABLE) ---
 */
const getTicketsByShowtime = async (req, res) => {
    const { showtimeId } = req.params;
    try {
        const sql = `
            SELECT 
                t.*, 
                u.full_name as customer_name, 
                s.seat_row, 
                s.seat_number
            FROM tickets t
            LEFT JOIN bookings b ON t.booking_id = b.booking_id
            LEFT JOIN users u ON b.user_id = u.user_id
            JOIN seats s ON t.seat_id = s.seat_id
            WHERE t.showtime_id = ?
        `;
        const [results] = await db.query(sql, [showtimeId]);
        return res.status(200).json(results);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * --- HÀM 6: LẤY SƠ ĐỒ SOÁT VÉ ---
 * Phục vụ vẽ sơ đồ ghế Visual Monitor của Quang Dũng
 */
const getTicketSeatMap = async (req, res) => {
    const { showtimeId } = req.params;
    try {
        const sql = `
            SELECT 
                s.seat_id, s.seat_row, s.seat_number, s.seat_type, s.is_active,
                t.ticket_code, t.ticket_status,
                u.full_name as customer_name
            FROM seats s
            JOIN showtimes st ON s.room_id = st.room_id
            LEFT JOIN tickets t ON s.seat_id = t.seat_id AND t.showtime_id = st.showtime_id
            LEFT JOIN bookings b ON t.booking_id = b.booking_id
            LEFT JOIN users u ON b.user_id = u.user_id
            WHERE st.showtime_id = ?
            ORDER BY s.seat_row, s.seat_number
        `;
        const [results] = await db.query(sql, [showtimeId]);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy sơ đồ soát vé: " + err.message });
    }
};

const getFilteredShowtimes = async (req, res) => {
    const { roomId } = req.query;

    try {
        let sql = `
            SELECT 
                st.showtime_id, 
                DATE_FORMAT(st.start_time, '%d/%m/%Y') as date_vn,
                TIME_FORMAT(st.start_time, '%H:%i') as time_vn,
                m.title as movie_title, 
                m.poster_url,
                r.room_name,
                st.start_time
            FROM showtimes st
            JOIN movies m ON st.movie_id = m.movie_id
            JOIN rooms r ON st.room_id = r.room_id
            WHERE 1=1
        `;

        const params = [];

        if (roomId && roomId !== 'null' && roomId !== 'undefined') {
            sql += ` AND st.room_id = ? `;
            params.push(roomId);
        }

        sql += ` ORDER BY st.start_time DESC `;

        const [results] = await db.query(sql, params);
        res.status(200).json(results);

    } catch (err) {
        console.error("Lỗi tại getFilteredShowtimes:", err.message);
        res.status(500).json({ 
            success: false, 
            error: "Lỗi server khi lấy toàn bộ suất chiếu" 
        });
    }
};

module.exports = { 
    createTickets, 
    getTicketQR, 
    checkInTicket, 
    getAllTickets, 
    getTicketsByShowtime,
    getTicketSeatMap,
    getFilteredShowtimes
};