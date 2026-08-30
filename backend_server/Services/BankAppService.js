const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const OtpService = require("./OtpService");
const { PURPOSE } = require("./OtpService");
const MailService = require("./MailService");
const RedisService = require("./RedisService");


class BankAppService {


    /*=========================================================
        GỬI EMAIL VÉ SAU KHI THANH TOÁN THÀNH CÔNG
    =========================================================*/

    async sendTicketEmail(connection, bookingId) {

        try {

            const order =
                await BookingService.getBookingDetail(
                    connection,
                    bookingId
                );

            if (!order) {
                throw new Error("Không tìm thấy đơn hàng");
            }

            const foods =
                await BookingService.getFoodDetail(
                    connection,
                    bookingId
                );

            const foodString =
                foods.length
                    ? foods
                        .map(f => `${f.item_name} (x${f.quantity})`)
                        .join(", ")
                    : "Không có";

            const points =
                await PointsService.calculateBookingPoints(
                    connection,
                    bookingId
                );

            const ticketData = {
                bookingId: order.booking_id,
                customerName: order.full_name,
                movieTitle: order.movie_name,
                moviePoster: order.movie_poster,
                cinemaName: order.cinema_name,
                roomName: order.room_name || "---",
                startTime: order.start_time
                    ? order.start_time.split(" ")[1]?.substring(0, 5)
                    : "---",
                selectedDate: order.start_time
                    ? order.start_time.split(" ")[0].split("-").reverse().join("/")
                    : "---",
                seatLabel: order.seat_label || "---",
                selectedFoods: foodString,
                earnedPoints: points || 0,
                ticketPIN: order.pin || (order.memo ? order.memo.slice(-6) : "")
            };

            await MailService.sendTicketEmail(
                order.email,
                ticketData
            );

            console.log(`✅ Email ticket sent for booking ${bookingId}`);

        } catch (err) {
            console.error(`❌ Failed to send ticket email:`, err.message);
        }

    }


    /*=========================================================
        CỘNG ĐIỂM CHO USER
    =========================================================*/

    async addPoints(connection, bookingId, userId) {
        try {
            const points = await PointsService.calculateBookingPoints(connection, bookingId);
            if (points > 0) {
                await PointsService.addPointsToUser(connection, userId, points);
            }
        } catch (err) {
            console.error(`❌ Failed to add points:`, err.message);
        }
    }


    /*=========================================================
        🆕 CHECK TTL - GIỐNG AUTH SERVICE
    =========================================================*/

    async checkTTL(tempBookingId) {
        if (!tempBookingId) {
            throw { statusCode: 400, message: "Thiếu tempBookingId" };
        }

        // Kiểm tra temp booking trong Redis
        const key = `temp:${tempBookingId}`;
        const ttl = await RedisService.getTTL(key);
        const data = await RedisService.get(key);

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
        🆕 GỬI LẠI OTP PAYMENT - GIỐNG AUTH SERVICE
    =========================================================*/

    async resendOtpPayment(email, tempBookingId) {
        if (!email?.trim()) {
            throw { statusCode: 400, field: "email", message: "Email không được để trống" };
        }

        // Kiểm tra temp booking còn tồn tại không
        const key = `temp:${tempBookingId}`;
        const tempData = await RedisService.get(key);
        if (!tempData) {
            throw { statusCode: 404, message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." };
        }

        // Rate limit cho resend: 3 lần / 5 phút (giống AuthService)
        const rateLimit = await RedisService.checkRateLimit(email, "payment-resend", 3, 300);
        if (!rateLimit.allowed) {
            throw { 
                statusCode: 429, 
                message: `Bạn chỉ được gửi tối đa 3 lần trong 5 phút. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
                data: {
                    remainingSeconds: rateLimit.remainingSeconds || 300,
                    maxAttempts: 3
                }
            };
        }

        // Xóa OTP cũ
        await RedisService.deleteOTP(email, PURPOSE.PAYMENT);

        // Tạo OTP mới
        const otpResult = await OtpService.createOTP(email, PURPOSE.PAYMENT);

        // Cập nhật temp booking với OTP mới
        const updatedData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();

        await RedisService.set(key, updatedData, 300);

        // Gửi email (KHÔNG ĐỢI)
        setImmediate(() => {
            MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
                .then(() => console.log(`✅ Payment OTP email sent to ${email}`))
                .catch(err => console.error(`❌ Payment OTP email failed: ${err.message}`));
        });

        const otpKey = `otp:${email}:${PURPOSE.PAYMENT}`;
        const ttl = await RedisService.getTTL(otpKey);

        return {
            success: true,
            message: "Mã OTP đã được gửi lại tới email.",
            data: {
                expiresIn: ttl > 0 ? ttl : 300
            }
        };
    }


    /*=========================================================
        🆕 GỬI OTP THANH TOÁN - CÓ RATE LIMIT
    =========================================================*/

    async sendPaymentOTP(email, tempBookingId) {
        if (!email?.trim()) {
            throw { statusCode: 400, field: "email", message: "Email không được để trống" };
        }

        // Kiểm tra temp booking còn tồn tại không
        const key = `temp:${tempBookingId}`;
        const tempData = await RedisService.get(key);
        if (!tempData) {
            throw { statusCode: 404, message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." };
        }

        // Rate limit cho send OTP: 1 lần / 60 giây
        const rateLimit = await RedisService.checkRateLimit(email, "payment-send", 1, 60);
        if (!rateLimit.allowed) {
            throw { 
                statusCode: 429, 
                message: `Bạn đã gửi OTP quá nhanh. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 60} giây.`,
                data: {
                    remainingSeconds: rateLimit.remainingSeconds || 60
                }
            };
        }

        // Tạo OTP mới
        const otpResult = await OtpService.createOTP(email, PURPOSE.PAYMENT);

        // Cập nhật temp booking với OTP mới
        const updatedData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();

        await RedisService.set(key, updatedData, 300);

        // Gửi email (KHÔNG ĐỢI)
        setImmediate(() => {
            MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
                .then(() => console.log(`✅ Payment OTP email sent to ${email}`))
                .catch(err => console.error(`❌ Payment OTP email failed: ${err.message}`));
        });

        const otpKey = `otp:${email}:${PURPOSE.PAYMENT}`;
        const ttl = await RedisService.getTTL(otpKey);

        return {
            success: true,
            message: "Mã OTP đã được gửi tới email.",
            data: {
                expiresIn: ttl > 0 ? ttl : 300
            }
        };
    }

}

module.exports = new BankAppService();