const db = require('../Config/db');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// 1. Cấu hình gửi Email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nguyenphamquangdung9611@gmail.com',
        pass: 'gezt gsvc gpdn rqfc' 
    }
});

let otpStorage = {}; 

/**
 * Hàm hỗ trợ gửi vé điện tử kèm ảnh Poster nhúng trực tiếp (CID)
 */
const sendTicketEmail = async (customerEmail, ticketData) => {
    const { 
        bookingId, customerName, seatLabel, 
        movieTitle, cinemaName, startTime, 
        selectedDate, selectedFoods, moviePoster 
    } = ticketData;

    const fileName = moviePoster ? path.basename(moviePoster) : null;
    const absolutePath = fileName 
        ? path.join(__dirname, '..', 'uploads', 'posters', fileName) 
        : null;

    const fileExists = absolutePath && fs.existsSync(absolutePath);
    
    const mailOptions = {
        from: '"Dũng Cinema 🍿" <nguyenphamquangdung9611@gmail.com>',
        to: customerEmail,
        subject: `[VÉ ĐIỆN TỬ] ${movieTitle?.toUpperCase()} - MÃ ĐƠN #${bookingId}`,
        html: `
            <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="background: #e74c3c; padding: 25px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">THANH TOÁN THÀNH CÔNG!</h1>
                        <p style="margin-top: 5px; opacity: 0.9;">Cảm ơn bạn đã lựa chọn Dũng Cinema</p>
                    </div>
                    <div style="padding: 30px;">
                        <p>Chào <b>${customerName}</b>, đơn hàng của bạn đã được xác nhận:</p>
                        <div style="border: 2px dashed #eee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                            <h3 style="color: #e74c3c; margin: 0 0 15px 0; font-size: 20px;">${movieTitle}</h3>
                            <p style="margin: 5px 0;"><b>📍 Rạp:</b> ${cinemaName}</p>
                            <p style="margin: 5px 0;"><b>⏰ Suất chiếu:</b> ${startTime} | ${selectedDate}</p>
                            <p style="margin: 5px 0;"><b>💺 Ghế:</b> <span style="font-size: 18px; color: #e74c3c; font-weight:bold;">${seatLabel}</span></p>
                            <p style="margin: 5px 0;"><b>🍿 Combo:</b> ${selectedFoods || 'Không có'}</p>
                        </div>
                        ${fileExists ? `<div style="text-align: center; margin: 20px 0;"><img src="cid:poster_img_email" style="max-width: 220px; border-radius: 10px; border: 1px solid #eee;" /></div>` : ''}
                        <div style="text-align: center; padding: 15px; background: #fff9f9; border-radius: 8px;">
                            <p style="font-size: 12px; color: #888; margin-bottom: 5px; text-transform: uppercase;">Mã số nhận vé</p>
                            <h2 style="margin: 0; color: #27ae60; font-size: 28px; letter-spacing: 2px;">#${bookingId}</h2>
                        </div>
                    </div>
                </div>
            </div>`,
        attachments: fileExists ? [{ filename: fileName, path: absolutePath, cid: 'poster_img_email' }] : []
    };
    return transporter.sendMail(mailOptions);
};

const BankAppController = {
    sendOTP: async (req, res) => {
        const { email, bookingId } = req.body;
        if (!email || !bookingId) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin!" });
        }

        const existing = otpStorage[email];
        if (existing && (Date.now() - (existing.expires - 5 * 60 * 1000) < 60000)) {
            return res.json({ success: true, message: "Mã OTP đã được gửi, vui lòng kiểm tra email!" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStorage[email] = { otp, bookingId, expires: Date.now() + 5 * 60 * 1000 };

        try {
            await transporter.sendMail({
                from: '"Dũng Cinema 🍿" <nguyenphamquangdung9611@gmail.com>',
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán`,
                html: `<h2 style="text-align:center">Mã OTP của ông là: <span style="color:red">${otp}</span></h2>`
            });
            res.json({ success: true, message: "Mã OTP đã gửi!" });
        } catch (error) {
            res.status(500).json({ success: false, message: "Lỗi gửi mail!" });
        }
    },

    verifyOTP: async (req, res) => {
    const { email, otp, bookingId } = req.body;
    const record = otpStorage[email];

    if (!record || record.otp != otp) {
        return res.status(400).json({ success: false, message: "Mã OTP không đúng!" });
    }

    const connection = await db.getConnection();
    try {
        const [checkStatus] = await connection.query("SELECT status FROM bookings WHERE booking_id = ?", [bookingId]);
        if (checkStatus[0] && checkStatus[0].status === 'Completed') {
            return res.status(400).json({ success: false, message: "Giao dịch này đã được thanh toán hoàn tất!" });
        }

        await connection.beginTransaction();

        // 1. Cập nhật trạng thái thanh toán
        await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);

        // 2. Cập nhật trạng thái vé
        await connection.execute(
            `UPDATE tickets 
             SET seat_status = 'Booked', 
                 ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
                 updated_at = NOW()
             WHERE booking_id = ? AND seat_status = 'Reserved'`, 
            [bookingId]
        );

        // 3. LẤY THÔNG TIN TỔNG HỢP (SQL này đã gộp ghế chuẩn)
        const [orderRows] = await connection.query(`
            SELECT 
                b.booking_id, 
                u.full_name, 
                u.email,
                m.title AS movieTitle, 
                m.poster_url AS moviePoster, 
                c.cinema_name AS cinemaName,
                r.room_name AS roomName,
                s.start_time,
                GROUP_CONCAT(DISTINCT bd.item_name SEPARATOR ', ') AS seatLabel
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN showtimes s ON b.showtime_id = s.showtime_id
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN cinemas c ON s.cinema_id = c.cinema_id 
            JOIN rooms r ON s.room_id = r.room_id
            JOIN booking_details bd ON b.booking_id = bd.booking_id
            WHERE b.booking_id = ?
            GROUP BY b.booking_id
        `, [bookingId]);

        const order = orderRows[0];

        // 4. Lấy chi tiết đồ ăn (để hiển thị danh sách ở Frontend)
        const [foodRows] = await connection.query(
            "SELECT item_name, quantity, product_id FROM booking_details WHERE booking_id = ? AND product_id IS NOT NULL", 
            [bookingId]
        );

        // Tạo chuỗi đồ ăn cho Email
        const foodLabelForEmail = foodRows
            .map(d => `${d.item_name} (x${d.quantity})`)
            .join(', ');

        const fullDate = new Date(order.start_time);
        const formattedTime = fullDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const formattedDate = fullDate.toLocaleDateString('vi-VN');

        // 5. GỬI VÉ QUA EMAIL
        await sendTicketEmail(email, {
            bookingId: order.booking_id,
            customerName: order.full_name,
            movieTitle: order.movieTitle,
            moviePoster: order.moviePoster,
            cinemaName: order.cinemaName,
            startTime: formattedTime,
            selectedDate: formattedDate,
            seatLabel: order.seatLabel, // Chuỗi B1, B2 từ GROUP_CONCAT
            selectedFoods: foodLabelForEmail || 'Không có'
        });

        await connection.commit();
        delete otpStorage[email];
        
        // 6. TRẢ DỮ LIỆU VỀ FRONTEND (Dùng đúng tên cột từ SQL)
        res.json({ 
            success: true, 
            message: "Thanh toán thành công!",
            data: {
                orderId: order.booking_id,
                customerName: order.full_name,
                customerEmail: email,
                movieTitle: order.movieTitle,
                moviePoster: order.moviePoster,
                cinemaName: order.cinemaName,   // Sẽ không còn bị "đang cập nhật"
                roomName: order.roomName,
                seatDisplay: order.seatLabel,   // Hiện chuỗi "B1, B2" chuẩn
                startTime: formattedTime,
                selectedDate: formattedDate,
                selectedFoods: foodRows,        // Array để Frontend map()
                ticketPIN: Math.floor(1000 + Math.random() * 9000)
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Lỗi Verify OTP:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
}
};

module.exports = {
    ...BankAppController,
    sendTicketEmail       
};