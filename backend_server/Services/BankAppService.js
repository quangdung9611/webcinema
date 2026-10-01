// Services/BankAppService.js

const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const PointsService = require("./PointsService");
const OtpService = require("./OtpService");
const { PURPOSE } = require("./OtpService");
const MailService = require("./MailService");
const CacheService = require("./CacheService");


class BankAppService {

    /*=========================================================
        ✅ HELPER: VERIFY OWNER + EMAIL KHỚP TEMP BOOKING
    =========================================================*/
    _verifyOwner(tempData, userId, email) {
        if (!tempData) {
            const err = new Error("Phiên đặt vé đã hết hạn. Vui lòng đặt lại.");
            err.statusCode = 404;
            throw err;
        }

        const data = typeof tempData === "string" ? JSON.parse(tempData) : tempData;

        // ✅ Check userId khớp
        if (userId && Number(data.userId) !== Number(userId)) {
            const err = new Error("Bạn không có quyền truy cập phiên đặt vé này");
            err.statusCode = 403;
            throw err;
        }

        // ✅ Check email khớp
        if (email && data.customerEmail &&
            email.toLowerCase().trim() !== data.customerEmail.toLowerCase().trim()) {
            const err = new Error("Email không khớp với phiên đặt vé");
            err.statusCode = 403;
            throw err;
        }

        return data;
    }


    /*=========================================================
        ✅ GỬI EMAIL VÉ SAU KHI THANH TOÁN THÀNH CÔNG
    =========================================================*/
    async sendTicketEmail(connection, bookingId) {
        try {
            const order = await BookingService.getBookingDetail(connection, bookingId);

            if (!order) {
                throw new Error("Không tìm thấy đơn hàng");
            }

            const foods = await BookingService.getFoodDetail(connection, bookingId);

            const foodString = foods.length
                ? foods.map(f => `${f.item_name} (x${f.quantity})`).join(", ")
                : "Không có";

            const points = await PointsService.calculateBookingPoints(connection, bookingId);

            const tickets = await TicketService.getTicketsByBooking(connection, bookingId);

            const firstTicketCode = tickets?.[0]?.ticket_code || null;

            const qrUrl = firstTicketCode
                ? `https://admin.quangdungcinema.id.vn/check-in/${firstTicketCode}`
                : null;

            const ticketData = {
                bookingId: order.booking_id,
                customerName: order.full_name,
                customerEmail: order.email,
                movieTitle: order.movie_name,
                moviePoster: order.movie_poster,
                posterPath: order.movie_poster,
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
                ticketPIN: firstTicketCode || order.pin || (order.memo ? order.memo.slice(-6) : ""),
                ticketCode: firstTicketCode,
                qrUrl: qrUrl,
            };

            console.log(`📧 [BankApp] Sending ticket email for booking ${bookingId}`);

            await MailService.sendTicketEmail({
                email: order.email,
                ...ticketData,
            });

            console.log(`✅ [BankApp] Email ticket sent for booking ${bookingId}`);

        } catch (err) {
            console.error(`❌ [BankApp] Failed to send ticket email:`, err.message);
            console.error(err.stack);
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
        CHECK TTL — ✅ CHECK OWNER
    =========================================================*/
    async checkTTL(tempBookingId, userId = null) {
        if (!tempBookingId) {
            throw { statusCode: 400, message: "Thiếu tempBookingId" };
        }

        const key = `temp:${tempBookingId}`;
        const ttl = await CacheService.getTTL(key);
        const data = await CacheService.get(key);

        // ✅ Nếu có data → check owner
        if (data && userId) {
            const parsed = typeof data === "string" ? JSON.parse(data) : data;
            if (Number(parsed.userId) !== Number(userId)) {
                throw { statusCode: 403, message: "Bạn không có quyền truy cập phiên đặt vé này" };
            }
        }

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
        ✅ GỬI LẠI OTP PAYMENT — FIX OWNER + EMAIL CHECK
    =========================================================*/
    async resendOtpPayment(email, tempBookingId, userId = null) {
        if (!email?.trim()) {
            throw { statusCode: 400, field: "email", message: "Email không được để trống" };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);

        // ✅ FIX: Check owner + email khớp
        const data = this._verifyOwner(tempData, userId, email);

        const rateLimit = await CacheService.checkRateLimit(email, "payment-resend", 3, 300);
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

        await CacheService.markOTPAsUsed(email, PURPOSE.PAYMENT);
        const otpResult = await OtpService.createOTP(email, PURPOSE.PAYMENT);
        const serverTime = Date.now();

        data.otp = otpResult.otp;
        data.otpCreatedAt = Date.now();

        await CacheService.set(key, data, 300);

        await MailService.sendPaymentOTP(email, otpResult.otp, data.customerName, data.totalAmount)
            .then(() => console.log(`✅ Payment OTP email sent to ${email}`))
            .catch(err => console.error(`❌ Payment OTP email failed: ${err.message}`));

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
        ✅ GỬI OTP THANH TOÁN — FIX OWNER + EMAIL CHECK
        ⚠️ ĐÂY LÀ METHOD ĐANG BỊ LỖI "is not a function"
    =========================================================*/
    async sendPaymentOTP(email, tempBookingId, userId = null) {
        if (!email?.trim()) {
            throw { statusCode: 400, field: "email", message: "Email không được để trống" };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);

        // ✅ FIX: Check owner + email khớp
        const data = this._verifyOwner(tempData, userId, email);

        const rateLimit = await CacheService.checkRateLimit(email, "payment-send", 1, 60);
        if (!rateLimit.allowed) {
            throw {
                statusCode: 429,
                message: `Bạn đã gửi OTP quá nhanh. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 60} giây.`,
                data: {
                    remainingSeconds: rateLimit.remainingSeconds || 60
                }
            };
        }

        await CacheService.markOTPAsUsed(email, PURPOSE.PAYMENT);
        const otpResult = await OtpService.createOTP(email, PURPOSE.PAYMENT);
        const serverTime = Date.now();

        data.otp = otpResult.otp;
        data.otpCreatedAt = Date.now();

        await CacheService.set(key, data, 300);

        await MailService.sendPaymentOTP(email, otpResult.otp, data.customerName, data.totalAmount)
            .then(() => console.log(`✅ Payment OTP email sent to ${email}`))
            .catch(err => console.error(`❌ Payment OTP email failed: ${err.message}`));

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

}

module.exports = new BankAppService();