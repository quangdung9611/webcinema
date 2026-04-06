const db = require('../Config/db');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nguyenphamquangdung9611@gmail.com',
        pass: 'gezt gsvc gpdn rqfc' // Khuyên Dũng nên đưa cái này vào file .env nhé!
    }
});

let otpStorage = {};

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
        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStorage[email] = { otp, bookingId, expires: Date.now() + 5 * 60 * 1000 };

        try {
            await transporter.sendMail({
                from: '"Dũng Cinema 🍿" <nguyenphamquangdung9611@gmail.com>',
                to: email,
                subject: `[${otp}] Mã xác thực thanh toán Cinema Star`,
                html: `<h2 style="text-align:center">Mã OTP của ông là: <span style="color:red">${otp}</span></h2>
                       <p style="text-align:center">Mã này có hiệu lực trong 5 phút cho đơn hàng #${bookingId}</p>`
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
            return res.status(400).json({ success: false, message: "Mã OTP không đúng hoặc đã hết hạn!" });
        }

        const connection = await db.getConnection();
        try {
            const [checkStatus] = await connection.query("SELECT status, user_id FROM bookings WHERE booking_id = ?", [bookingId]);
            if (checkStatus[0] && checkStatus[0].status === 'Completed') {
                return res.status(400).json({ success: false, message: "Giao dịch này đã được thanh toán hoàn tất!" });
            }

            await connection.beginTransaction();
            
            // Lấy giờ Việt Nam hiện tại dưới dạng chuỗi YYYY-MM-DD HH:mm:ss
            const nowVN = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

            // 1. Cập nhật trạng thái đơn hàng
            await connection.execute("UPDATE bookings SET status = 'Completed' WHERE booking_id = ?", [bookingId]);

            // 2. Cập nhật trạng thái vé và mã vé (Sử dụng chuỗi nowVN để tránh lệch múi giờ)
            await connection.execute(
                `UPDATE tickets 
                 SET seat_status = 'Booked', 
                     ticket_code = REPLACE(ticket_code, 'WAIT-', 'TIC-'),
                     updated_at = ?
                 WHERE booking_id = ? AND seat_status = 'Reserved'`, 
                [nowVN, bookingId]
            );

            // 3. Lấy thông tin đầy đủ (Sử dụng DATE_FORMAT để lấy chuỗi giờ chuẩn từ DB)
            const [orderRows] = await connection.query(`
                SELECT 
                    b.booking_id, b.user_id,
                    u.full_name, u.email,
                    m.title AS movieTitle, 
                    m.poster_url AS moviePoster, 
                    c.cinema_name AS cinemaName,
                    r.room_name AS roomName,
                    DATE_FORMAT(s.start_time, '%Y-%m-%d %H:%i:%s') as start_time_raw,
                    GROUP_CONCAT(DISTINCT bd.item_name SEPARATOR ', ') AS seatLabel
                FROM bookings b
                LEFT JOIN users u ON b.user_id = u.user_id
                LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
                LEFT JOIN movies m ON s.movie_id = m.movie_id
                LEFT JOIN cinemas c ON s.cinema_id = c.cinema_id 
                LEFT JOIN rooms r ON s.room_id = r.room_id
                LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
                WHERE b.booking_id = ?
                GROUP BY b.booking_id
            `, [bookingId]);

            const order = orderRows[0];
            if (!order) throw new Error("Không tìm thấy dữ liệu đơn hàng!");

            // 4. LOGIC CỘNG ĐIỂM THƯỞNG
            const [details] = await connection.execute(
                `SELECT bd.price, bd.quantity, s.seat_type 
                 FROM booking_details bd
                 LEFT JOIN seats s ON bd.seat_id = s.seat_id
                 WHERE bd.booking_id = ?`,
                [bookingId]
            );

            let totalEarnedPoints = 0;
            details.forEach(item => {
                const itemTotal = Number(item.price) * Number(item.quantity);
                if (item.seat_type) {
                    const type = String(item.seat_type).toUpperCase();
                    let rate = (type === 'VIP') ? 0.10 : (type === 'DOUBLE' || type === 'SWEETBOX' || type === 'COUPLE') ? 0.07 : 0.05;
                    totalEarnedPoints += Math.floor(itemTotal * rate);
                } else {
                    totalEarnedPoints += Math.floor(itemTotal * 0.03);
                }
            });

            if (totalEarnedPoints > 0) {
                await connection.execute(
                    `UPDATE users SET points = points + ? WHERE user_id = ?`,
                    [totalEarnedPoints, order.user_id]
                );
                console.log(`✨ [DŨNG] Thanh toán OTP thành công: Cộng ${totalEarnedPoints} điểm cho User #${order.user_id}`);
            }

            // 5. Xử lý thời gian hiển thị Email bằng cách cắt chuỗi (An toàn nhất)
            // Chuỗi có dạng: "2026-04-06 20:00:00"
            const [datePart, timePart] = order.start_time_raw.split(' ');
            const [y, m, d] = datePart.split('-');
            const [hh, mm] = timePart.split(':');

            const formattedTime = `${hh}:${mm}`;
            const formattedDate = `${d}/${m}/${y}`;

            // 6. Gửi vé Email
            const [foodRows] = await connection.query(
                "SELECT item_name, quantity FROM booking_details WHERE booking_id = ? AND seat_id IS NULL", 
                [bookingId]
            );
            const foodString = foodRows.map(f => `${f.item_name} (x${f.quantity})`).join(', ') || 'Không có';

            await sendTicketEmail(email, {
                bookingId: order.booking_id,
                customerName: order.full_name,
                movieTitle: order.movieTitle,
                moviePoster: order.moviePoster,
                cinemaName: order.cinemaName,
                startTime: formattedTime,
                selectedDate: formattedDate,
                seatLabel: order.seatLabel,
                selectedFoods: foodString
            });

            await connection.commit();
            delete otpStorage[email];
            
            res.json({ 
                success: true, 
                message: "Thanh toán thành công!",
                data: { orderId: order.booking_id }
            });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error("❌ [DŨNG] Lỗi Verify OTP:", error);
            res.status(500).json({ success: false, message: error.message });
        } finally {
            if (connection) connection.release();
        }
    }
};

module.exports = { ...BankAppController, sendTicketEmail };