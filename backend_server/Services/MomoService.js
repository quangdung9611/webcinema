// Services/MomoService.js

const crypto = require("crypto");
const axios = require("axios");
const CacheService = require("./CacheService");
const OtpService = require("./OtpService");
const { PURPOSE } = require("./OtpService");
const MailService = require("./MailService");
const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const db = require("../Config/db");

const TEMP_BOOKING_TTL = 300; // 5 phút
const MOMO_CONFIG = {
    partnerCode: "MOMOBKUN20180810",
    accessKey: "klm05ndA99cl4UXT",
    secretKey: "f06nd13v6u1234567890abcdefghijk",
    redirectUrl: "https://quangdungcinema.id.vn/confirm-success",
    ipnUrl: "https://api.quangdungcinema.id.vn/api/momo/callback",
    endpoint: "https://test-payment.momo.vn/v2/gateway/api/create"
};

class MomoService {

    /*=========================================================
        1. PROCESS ORDER - TẠO TEMP BOOKING + QR MOMO
    =========================================================*/
    async processOrder(data) {
        const {
            userId,
            showtimeId,
            totalAmount,
            couponId,
            selectedSeats,
            selectedFoods,
            customerEmail,
            customerName,
            customerPhone,
            movieTitle,
            cinemaName,
            startTime
        } = data;

        const [rows] = await db.execute(
            `SELECT sh.room_id, sh.cinema_id, r.room_name 
             FROM showtimes sh 
             LEFT JOIN rooms r ON sh.room_id = r.room_id 
             WHERE sh.showtime_id = ?`,
            [showtimeId]
        );

        if (!rows.length) {
            throw new Error("Không tìm thấy suất chiếu");
        }

        const room_id = rows[0].room_id;
        const cinema_id = rows[0].cinema_id;
        const roomName = rows[0].room_name;

        for (const seat of selectedSeats) {
            const [existing] = await db.execute(
                `SELECT t.ticket_id 
                 FROM tickets t 
                 JOIN bookings b ON t.booking_id = b.booking_id 
                 WHERE t.showtime_id = ? AND t.cinema_id = ? 
                   AND t.room_id = ? AND t.seat_id = ? 
                   AND b.status = 'Completed'`,
                [showtimeId, cinema_id, room_id, seat.seat_id]
            );

            if (existing.length > 0) {
                throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đã được đặt.`);
            }
        }

        const tempBookingId = crypto.randomBytes(8).toString("hex").toUpperCase();
        const momoResult = await this.createMomoQR(totalAmount, tempBookingId);

        const tempData = {
            tempBookingId,
            userId,
            showtimeId,
            room_id,
            roomName,
            cinema_id,
            totalAmount,
            couponId: couponId || null,
            selectedSeats,
            selectedFoods,
            customerEmail,
            customerName,
            customerPhone,
            movieTitle,
            cinemaName,
            startTime,
            momo: {
                orderId: momoResult.orderId,
                requestId: momoResult.requestId,
                payUrl: momoResult.payUrl,
                qrCodeUrl: momoResult.qrCodeUrl
            },
            status: "pending",
            createdAt: Date.now()
        };

        await CacheService.set(`temp:${tempBookingId}`, tempData, TEMP_BOOKING_TTL);

        return {
            tempBookingId,
            momoQR: momoResult.payUrl,
            qrCodeUrl: momoResult.qrCodeUrl,
            expiresIn: TEMP_BOOKING_TTL
        };
    }

    /*=========================================================
        2. CREATE MOMO QR
    =========================================================*/
    async createMomoQR(amount, tempBookingId) {
        const { partnerCode, accessKey, secretKey, redirectUrl, ipnUrl, endpoint } = MOMO_CONFIG;
        const requestId = partnerCode + Date.now();
        const orderId = `TEMP-${tempBookingId}`;
        const orderInfo = `Thanh toán vé Cinema Star #${tempBookingId}`;
        const requestType = "payWithMethod";
        const extraData = "";

        const rawSignature = 
            `accessKey=${accessKey}` +
            `&amount=${amount}` +
            `&extraData=${extraData}` +
            `&ipnUrl=${ipnUrl}` +
            `&orderId=${orderId}` +
            `&orderInfo=${orderInfo}` +
            `&partnerCode=${partnerCode}` +
            `&redirectUrl=${redirectUrl}` +
            `&requestId=${requestId}` +
            `&requestType=${requestType}`;

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(rawSignature)
            .digest("hex");

        const response = await axios.post(endpoint, {
            partnerCode,
            accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            extraData,
            requestType,
            signature,
            lang: "vi"
        });

        return response.data;
    }

    /*=========================================================
        3. SEND OTP PAYMENT
    =========================================================*/
    async sendPaymentOTP(email, tempBookingId) {
        if (!email?.trim()) {
            throw { statusCode: 400, message: "Email không được để trống" };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);
        if (!tempData) {
            throw { statusCode: 404, message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." };
        }

        const rateLimit = await CacheService.checkRateLimit(email, "momo-send", 1, 60);
        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: `Bạn đã gửi OTP quá nhanh. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 60} giây.`,
                data: { remainingSeconds: rateLimit.remainingSeconds || 60 }
            };
        }

        await CacheService.markOTPAsUsed(email, PURPOSE.PAYMENT);
        const otpResult = await OtpService.createOTP(email, PURPOSE.PAYMENT);
        const serverTime = Date.now();

        const updatedData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();
        await CacheService.set(key, updatedData, 300);

        await MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
            .then(() => console.log(`✅ MoMo OTP email sent to ${email}`))
            .catch(err => console.error(`❌ MoMo OTP email failed: ${err.message}`));

        const otpKey = `otp:${email}:${PURPOSE.PAYMENT}`;
        const ttl = await CacheService.getTTL(otpKey);

        return {
            success: true,
            message: "Mã OTP đã được gửi tới email.",
            data: {
                expiresIn: ttl > 0 ? ttl : 300,
                serverTime: serverTime
            }
        };
    }

    /*=========================================================
        4. VERIFY OTP + COMMIT TO DATABASE
        ✅ FIX: Truyền posterPath để gửi kèm hình poster
    =========================================================*/
    async verifyOTPAndCommit(email, otp, tempBookingId) {
        const verifyResult = await OtpService.verifyOTP(email, otp, PURPOSE.PAYMENT, true);
        if (!verifyResult.success) {
            throw {
                statusCode: 400,
                message: verifyResult.message,
                code: verifyResult.code,
                data: verifyResult.data
            };
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const key = `temp:${tempBookingId}`;
            let tempData = await CacheService.get(key);
            if (!tempData) {
                throw new Error("Phiên đặt vé đã hết hạn. Vui lòng đặt lại.");
            }
            tempData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;

            const {
                userId,
                showtimeId,
                room_id,
                cinema_id,
                totalAmount,
                couponId,
                selectedSeats,
                selectedFoods,
                customerEmail,
                customerName,
                customerPhone,
                movieTitle,
                cinemaName,
                startTime
            } = tempData;

            for (const seat of selectedSeats) {
                const [existing] = await connection.execute(
                    `SELECT t.ticket_id 
                     FROM tickets t 
                     JOIN bookings b ON t.booking_id = b.booking_id 
                     WHERE t.showtime_id = ? AND t.cinema_id = ? 
                       AND t.room_id = ? AND t.seat_id = ? 
                       AND b.status = 'Completed'`,
                    [showtimeId, cinema_id, room_id, seat.seat_id]
                );

                if (existing.length > 0) {
                    throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đã được đặt.`);
                }
            }

            const memo = `MOMO${Date.now()}`;
            const [bookingResult] = await connection.execute(
                `INSERT INTO bookings (user_id, showtime_id, total_amount, coupon_id, status, booking_date, memo, email)
                 VALUES (?, ?, ?, ?, 'Completed', NOW(), ?, ?)`,
                [userId, showtimeId, totalAmount, couponId || null, memo, customerEmail]
            );
            const bookingId = bookingResult.insertId;

            // ✅ Lưu ticket codes để dùng cho QR
            const insertedTicketCodes = [];

            for (const seat of selectedSeats) {
                await connection.execute(
                    `INSERT INTO booking_details (booking_id, seat_id, price, item_name, quantity)
                     VALUES (?, ?, ?, ?, 1)`,
                    [bookingId, seat.seat_id, seat.price, `Ghế ${seat.seat_row}${seat.seat_number}`]
                );

                const ticketCode = `TIC-${bookingId}-${seat.seat_id}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
                insertedTicketCodes.push(ticketCode);

                await connection.execute(
                    `INSERT INTO tickets (booking_id, showtime_id, room_id, cinema_id, seat_id, ticket_code, price, seat_status, ticket_status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'Booked', 'Valid', NOW())`,
                    [bookingId, showtimeId, room_id, cinema_id, seat.seat_id, ticketCode, seat.price]
                );
            }

            if (selectedFoods && selectedFoods.length > 0) {
                for (const food of selectedFoods) {
                    await connection.execute(
                        `INSERT INTO booking_details (booking_id, product_id, item_name, quantity, price)
                         VALUES (?, ?, ?, ?, ?)`,
                        [bookingId, food.product_id, food.product_name, food.quantity, food.price]
                    );
                }
            }

            let earnedPoints = 0;
            if (userId) {
                const points = Math.floor(totalAmount * 0.05);
                if (points > 0) {
                    await connection.execute(
                        `UPDATE users SET points = points + ? WHERE user_id = ?`,
                        [points, userId]
                    );
                    earnedPoints = points;
                }
            }

            await CacheService.delete(key);

            await connection.commit();

            // =====================================================
            // ✅ GỬI EMAIL VÉ (sau khi commit thành công)
            // =====================================================

            setImmediate(async () => {
                try {
                    // Lấy thông tin booking sau khi commit
                    const order = await BookingService.getBookingDetail(connection, bookingId);
                    const foods = await BookingService.getFoodDetail(connection, bookingId);

                    const foodString = foods.length
                        ? foods.map(f => `${f.item_name} (x${f.quantity})`).join(", ")
                        : "Không có";

                    // ✅ Lấy ticket_code đầu tiên
                    const firstTicketCode = insertedTicketCodes[0] || null;

                    // ✅ Build QR URL
                    const qrUrl = firstTicketCode
                        ? `https://admin.quangdungcinema.id.vn/check-in/${firstTicketCode}`
                        : null;

                    // ✅ Build ticketData
                    const ticketData = {
                        bookingId: bookingId,
                        customerName: order.full_name || customerName,
                        movieTitle: order.movie_name || movieTitle,
                        moviePoster: order.movie_poster,
                        posterPath: order.movie_poster,  // ✅ THÊM DÒNG NÀY
                        cinemaName: order.cinema_name || cinemaName,
                        roomName: order.room_name || tempData.roomName || "---",
                        startTime: order.start_time
                            ? order.start_time.split(" ")[1]?.substring(0, 5)
                            : startTime || "---",
                        selectedDate: order.start_time
                            ? order.start_time.split(" ")[0].split("-").reverse().join("/")
                            : "---",
                        seatLabel: order.seat_label || selectedSeats.map(s => `${s.seat_row}${s.seat_number}`).join(", "),
                        selectedFoods: foodString,
                        earnedPoints: earnedPoints,
                        ticketPIN: firstTicketCode || order.pin || (order.memo ? order.memo.slice(-6) : ""),
                        ticketCode: firstTicketCode,
                        qrUrl: qrUrl,
                    };

                    console.log(`📧 [MoMo] Sending ticket email for booking ${bookingId}:`, {
                        email: customerEmail,
                        ticketCode: firstTicketCode,
                        posterPath: order.movie_poster,  // ✅ LOG để debug
                        qrUrl,
                    });

                    // ✅ Truyền 1 object
                    await MailService.sendTicketEmail({
                        email: customerEmail,
                        ...ticketData,
                    });

                    console.log(`✅ [MoMo] Ticket email sent for booking ${bookingId}`);
                } catch (err) {
                    console.error(`❌ [MoMo] Send ticket email failed: ${err.message}`);
                    console.error(err.stack);
                }
            });

            return {
                success: true,
                bookingId: bookingId,
                message: "Thanh toán thành công!"
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /*=========================================================
        5. RESEND OTP
    =========================================================*/
    async resendOtpPayment(email, tempBookingId) {
        if (!email?.trim()) {
            throw { statusCode: 400, message: "Email không được để trống" };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);
        if (!tempData) {
            throw { statusCode: 404, message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." };
        }

        const rateLimit = await CacheService.checkRateLimit(email, "momo-resend", 3, 300);
        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: `Bạn chỉ được gửi tối đa 3 lần trong 5 phút. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
                data: { remainingSeconds: rateLimit.remainingSeconds || 300, maxAttempts: 3 }
            };
        }

        await CacheService.markOTPAsUsed(email, PURPOSE.PAYMENT);
        const otpResult = await OtpService.createOTP(email, PURPOSE.PAYMENT);
        const serverTime = Date.now();

        const updatedData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();
        await CacheService.set(key, updatedData, 300);

        await MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
            .then(() => console.log(`✅ MoMo OTP resent to ${email}`))
            .catch(err => console.error(`❌ MoMo OTP resend failed: ${err.message}`));

        const otpKey = `otp:${email}:${PURPOSE.PAYMENT}`;
        const ttl = await CacheService.getTTL(otpKey);

        return {
            success: true,
            message: "Mã OTP đã được gửi lại tới email.",
            data: {
                expiresIn: ttl > 0 ? ttl : 300,
                maxAttempts: 3,
                remainingAttempts: 3,
                serverTime: serverTime
            }
        };
    }

    /*=========================================================
        6. CHECK TTL
    =========================================================*/
    async checkTTL(tempBookingId) {
        if (!tempBookingId) {
            throw { statusCode: 400, message: "Thiếu tempBookingId" };
        }

        const key = `temp:${tempBookingId}`;
        const ttl = await CacheService.getTTL(key);
        const data = await CacheService.get(key);

        return {
            success: true,
            data: {
                exists: !!data,
                expiresIn: ttl > 0 ? ttl : 0,
                purpose: 'PAYMENT'
            }
        };
    }

    /*=========================================================
        7. CANCEL BOOKING
    =========================================================*/
    async cancelBooking(tempBookingId) {
        if (!tempBookingId) {
            throw { statusCode: 400, message: "Thiếu tempBookingId" };
        }

        const key = `temp:${tempBookingId}`;
        const deleted = await CacheService.delete(key);

        return {
            success: true,
            message: deleted ? "Đã hủy phiên đặt vé." : "Không tìm thấy phiên đặt vé."
        };
    }

    /*=========================================================
        8. MOMO CALLBACK
    =========================================================*/
    async handleCallback(reqBody) {
        const { orderId, resultCode } = reqBody;

        if (resultCode !== 0) {
            console.log(`❌ MoMo callback failed: orderId=${orderId}, resultCode=${resultCode}`);
            return false;
        }

        const tempBookingId = orderId.replace('TEMP-', '');
        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);

        if (!tempData) {
            console.log(`❌ Temp booking ${tempBookingId} not found in Cache`);
            return false;
        }

        const data = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        data.momo.status = 'paid';
        data.momo.paidAt = new Date().toISOString();
        await CacheService.set(key, data, 300);

        console.log(`✅ MoMo payment successful for temp booking ${tempBookingId}`);
        return true;
    }
}

module.exports = new MomoService();