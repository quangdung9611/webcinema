const db = require('../Config/db');
const QRCode = require('qrcode');

/**
 * --- HÀM 1: TẠO VÉ ---
 * Chạy sau khi thanh toán thành công.
 * Đã sửa: TicketCode duy nhất và logic Bulk Insert chuẩn.
 */
const createTickets = async (bookingId) => {
    try {
        // 1. Lấy showtime_id từ đơn hàng
        const [bookingInfo] = await db.query(
            "SELECT showtime_id FROM bookings WHERE booking_id = ?", 
            [bookingId]
        );

        if (bookingInfo.length === 0) return { success: false };
        const showtimeId = bookingInfo[0].showtime_id;

        // 2. Lấy danh sách ghế từ chi tiết đơn hàng
        const [details] = await db.query(
            "SELECT seat_id, price FROM booking_details WHERE booking_id = ? AND seat_id IS NOT NULL", 
            [bookingId]
        );

        // 3. Chuẩn bị dữ liệu để insert hàng loạt
        const ticketsData = details.map((item, index) => [
            bookingId, 
            showtimeId, 
            item.seat_id, 
            // Mã vé: TIC + ID đơn hàng + ID ghế + số ngẫu nhiên để không bao giờ trùng
            `TIC${bookingId}${item.seat_id}${Math.floor(Math.random() * 100)}`, 
            item.price, 
            'Booked', // Trạng thái ghế
            'Valid'   // Trạng thái vé
        ]);

        // 4. Thực hiện chèn vào database
        if (ticketsData.length > 0) {
            const sql = `
                INSERT INTO tickets 
                (booking_id, showtime_id, seat_id, ticket_code, price, seat_status, ticket_status) 
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
 * Đã sửa: Cập nhật trạng thái 'Used' đồng bộ
 */
const checkInTicket = async (req, res) => {
    const { ticketCode } = req.body;

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

        // Cập nhật trạng thái vé sang đã sử dụng
        await db.query(
            "UPDATE tickets SET ticket_status = 'Used', seat_status = 'Used' WHERE ticket_id = ?", 
            [ticket.ticket_id]
        );

        return res.status(200).json({ 
            success: true, 
            message: "Soát vé thành công! Mời khách vào phòng.", 
            info: {
                movie: ticket.movie_title,
                seat: `${ticket.seat_row}${ticket.seat_number}`,
                time: ticket.start_time
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
    // Chỉ lấy roomId từ giao diện gửi lên
    const { roomId } = req.query;

    try {
        // 1. Câu SQL lấy toàn bộ, không có điều kiện thời gian (WHERE 1=1 để nối chuỗi cho dễ)
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

        // 2. Chỉ giữ lại lọc theo roomId (nếu ông chọn phòng)
        if (roomId && roomId !== 'null' && roomId !== 'undefined') {
            sql += ` AND st.room_id = ? `;
            params.push(roomId);
        }

        // 3. Sắp xếp: Tui để DESC (mới nhất lên đầu) để ông đỡ phải cuộn chuột tìm phim mới
        // Nếu ông thích phim cũ lên đầu thì sửa lại thành ASC
        sql += ` ORDER BY st.start_time DESC `;

        // 4. Thực thi
        const [results] = await db.query(sql, params);

        // 5. Trả kết quả về cho FE
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