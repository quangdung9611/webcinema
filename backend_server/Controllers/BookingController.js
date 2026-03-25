const db = require('../Config/db');

const bookingController = {
    // 1. Lấy danh sách tất cả các đơn hàng (Trang quản lý Admin)
    getAllBookings: async (req, res) => {
        try {
            const query = `
                SELECT 
                    b.booking_id, 
                    DATE_FORMAT(b.booking_date, '%d/%m/%Y %H:%i') AS booking_date, 
                    b.total_amount, 
                    b.status, 
                    b.memo,
                    u.full_name AS customer_name,
                    u.email AS customer_email,
                    m.title AS movie_title
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.user_id
                LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
                LEFT JOIN movies m ON s.movie_id = m.movie_id
                ORDER BY b.booking_id DESC
            `;
            const [rows] = await db.execute(query);
            res.status(200).json({ success: true, data: rows });
        } catch (error) {
            console.error("Error getAllBookings:", error);
            res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách đơn hàng" });
        }
    },

    // 2. Xem CHI TIẾT một đơn hàng (Dành cho Modal xem Ghế & Bắp nước)
    getBookingDetails: async (req, res) => {
        const { id } = req.params;
        try {
            // Lấy thông tin chung (Header hóa đơn)
            const [bookingInfo] = await db.execute(`
                SELECT 
                    b.*, 
                    DATE_FORMAT(b.booking_date, '%d/%m/%Y %H:%i') AS formatted_date,
                    u.full_name, u.phone, u.email,
                    m.title AS movie_name, 
                    c.cinema_name, 
                    r.room_name,
                    DATE_FORMAT(s.start_time, '%H:%i - %d/%m/%Y') AS show_time
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                JOIN showtimes s ON b.showtime_id = s.showtime_id
                JOIN movies m ON s.movie_id = m.movie_id
                JOIN cinemas c ON s.cinema_id = c.cinema_id
                JOIN rooms r ON s.room_id = r.room_id
                WHERE b.booking_id = ?
            `, [id]);

            if (bookingInfo.length === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy hóa đơn này" });
            }

            // Lấy chi tiết các món trong hóa đơn (Line Items)
            const [items] = await db.execute(`
                SELECT 
                    bd.booking_detail_id,
                    bd.item_name,
                    bd.quantity,
                    bd.price,
                    (bd.price * bd.quantity) AS subtotal,
                    se.seat_row,
                    se.seat_number,
                    se.seat_type
                FROM booking_details bd
                LEFT JOIN seats se ON bd.seat_id = se.seat_id
                WHERE bd.booking_id = ?
            `, [id]);

            res.status(200).json({
                success: true,
                booking: bookingInfo[0],
                details: items
            });
        } catch (error) {
            console.error("Error getBookingDetails:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // 3. Cập nhật trạng thái (Duyệt đơn / Hủy đơn)
    updateBookingStatus: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body; // 'Pending', 'Completed', 'Cancelled'
        
        try {
            // 1. Cập nhật trạng thái chính trong bảng bookings
            await db.execute(
                `UPDATE bookings SET status = ? WHERE booking_id = ?`,
                [status, id]
            );

            // 2. LOGIC CẬP NHẬT CHI TIẾT VÉ (Bảng tickets)
            const upperStatus = status.toUpperCase();

            if (upperStatus === 'COMPLETED') {
                // Khi thanh toán xong -> Đổi Reserved thành Booked để KHÓA GHẾ
                await db.execute(
                    `UPDATE tickets SET status = 'Booked' WHERE booking_id = ?`,
                    [id]
                );
                console.log(`Đã khóa ghế thành công cho đơn hàng #${id}`);
                
            } else if (upperStatus === 'CANCELLED') {
                // Khi hủy đơn -> Giải phóng ghế
                await db.execute(
                    `UPDATE tickets SET status = 'Cancelled' WHERE booking_id = ?`,
                    [id]
                );
            }

            res.status(200).json({ 
                success: true, 
                message: `Hệ thống đã cập nhật đơn hàng #${id} sang ${status}` 
            });
        } catch (error) {
            console.error("Lỗi updateBookingStatus:", error);
            res.status(500).json({ success: false, message: "Lỗi cập nhật trạng thái" });
        }
    },
    // 4. Xóa vĩnh viễn đơn hàng
    deleteBooking: async (req, res) => {
        const { id } = req.params;
        try {
            // Nhờ ON DELETE CASCADE trong SQL của Dũng, nó sẽ tự xóa booking_details và tickets
            const [result] = await db.execute(`DELETE FROM bookings WHERE booking_id = ?`, [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng để xóa" });
            }

            res.status(200).json({ success: true, message: "Đã xóa hóa đơn vĩnh viễn khỏi hệ thống" });
        } catch (error) {
            res.status(500).json({ success: false, message: "Lỗi khi thực hiện lệnh xóa" });
        }
    }
};

module.exports = bookingController;