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
            console.error("❌ [DŨNG] Error getAllBookings:", error);
            res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách đơn hàng" });
        }
    },

    // 2. Xem CHI TIẾT một đơn hàng
    getBookingDetails: async (req, res) => {
        const { id } = req.params;
        try {
            const [bookingInfo] = await db.execute(`
                SELECT 
                    b.booking_id, b.user_id, b.showtime_id, b.total_amount, b.status, b.memo,
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
            console.error("❌ [DŨNG] Error getBookingDetails:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // 3. Cập nhật trạng thái (Duyệt đơn / Hủy đơn)
    updateBookingStatus: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body; 
        
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            const [currentBooking] = await connection.execute(
                `SELECT user_id, total_amount, status FROM bookings WHERE booking_id = ?`,
                [id]
            );

            if (currentBooking.length === 0) {
                throw new Error("Không tìm thấy đơn hàng");
            }

            const { user_id, status: oldStatus } = currentBooking[0];
            const updateTime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

            // 1. Cập nhật bảng bookings
            await connection.execute(
                `UPDATE bookings SET status = ? WHERE booking_id = ?`,
                [status, id]
            );

            const upperStatus = String(status || '').toUpperCase();
            const upperOldStatus = String(oldStatus || '').toUpperCase();

            if (upperStatus === 'COMPLETED') {
                // Duyệt thành công -> Cập nhật trạng thái vé
                await connection.execute(
                    `UPDATE tickets SET seat_status = 'Booked', updated_at = ? WHERE booking_id = ?`,
                    [updateTime, id]
                );

                // Chỉ cộng điểm nếu đơn hàng chưa từng ở trạng thái COMPLETED trước đó
                if (upperOldStatus !== 'COMPLETED') {
                    const [details] = await connection.execute(
                        `SELECT bd.price, bd.quantity, s.seat_type 
                        FROM booking_details bd
                        LEFT JOIN seats s ON bd.seat_id = s.seat_id
                        WHERE bd.booking_id = ?`,
                        [id]
                    );

                    let totalEarnedPoints = 0;
                    details.forEach(item => {
                        const itemTotal = Number(item.price) * Number(item.quantity);
                        // Nếu có seat_id hoặc seat_type thì tính theo tỉ lệ ghế, ngược lại tính bắp nước
                        if (item.seat_type) {
                            const type = String(item.seat_type).toUpperCase();
                            let rate = 0.05; 
                            if (type === 'VIP') rate = 0.10;
                            else if (['DOUBLE', 'SWEETBOX', 'COUPLE'].includes(type)) rate = 0.07;
                            totalEarnedPoints += Math.floor(itemTotal * rate);
                        } else {
                            totalEarnedPoints += Math.floor(itemTotal * 0.03);
                        }
                    });

                    if (totalEarnedPoints > 0) {
                        await connection.execute(
                            `UPDATE users SET points = points + ? WHERE user_id = ?`,
                            [totalEarnedPoints, user_id]
                        );
                        console.log(`✨ [DŨNG] Admin duyệt đơn: Cộng ${totalEarnedPoints} điểm cho User #${user_id}`);
                    }
                }
                
            } else if (upperStatus === 'CANCELLED') {
                // Hủy đơn -> Đổi trạng thái vé
                await connection.execute(
                    `UPDATE tickets SET seat_status = 'Cancelled', updated_at = ? WHERE booking_id = ?`,
                    [updateTime, id]
                );
            }

            await connection.commit();
            res.status(200).json({ 
                success: true, 
                message: `Hệ thống đã cập nhật đơn hàng #${id} thành ${status}` 
            });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error("❌ [DŨNG] Lỗi updateBookingStatus:", error);
            res.status(500).json({ success: false, message: "Lỗi cập nhật trạng thái" });
        } finally {
            if (connection) connection.release();
        }
    },

    // 4. Xóa đơn hàng
    deleteBooking: async (req, res) => {
        const { id } = req.params;
        try {
            const [result] = await db.execute(`DELETE FROM bookings WHERE booking_id = ?`, [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng để xóa" });
            }
            res.status(200).json({ success: true, message: "Đã xóa hóa đơn vĩnh viễn khỏi hệ thống" });
        } catch (error) {
            console.error("❌ [DŨNG] Lỗi deleteBooking:", error);
            res.status(500).json({ success: false, message: "Lỗi khi thực hiện lệnh xóa" });
        }
    }
};

module.exports = bookingController;