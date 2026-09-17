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
        ✅ GỬI EMAIL VÉ SAU KHI THANH TOÁN THÀNH CÔNG
        🔥 FIX: Truyền 1 object thay vì 2 tham số
    =========================================================*/

    async sendTicketEmail(connection, bookingId) {
        try {
            // 1. Lấy thông tin booking
            const order = await BookingService.getBookingDetail(
                connection,
                bookingId
            );

            if (!order) {
                throw new Error("Không tìm thấy đơn hàng");
            }

            // 2. Lấy food detail
            const foods = await BookingService.getFoodDetail(
                connection,
                bookingId
            );

            const foodString = foods.length
                ? foods
                    .map(f => `${f.item_name} (x${f.quantity})`)
                    .join(", ")
                : "Không có";

            // 3. Tính điểm
            const points = await PointsService.calculateBookingPoints(
                connection,
                bookingId
            );

            // 4. Lấy danh sách tickets
            const tickets = await TicketService.getTicketsByBooking(
                connection,
                bookingId
            );

            // ✅ Lấy ticket_code đầu tiên để tạo QR
            const firstTicketCode = tickets?.[0]?.ticket_code || null;

            // ✅ Build QR URL (dùng cho QR code)
            const qrUrl = firstTicketCode
                ? `https://admin.quangdungcinema.id.vn/check-in/${firstTicketCode}`
                : null;

            // 5. Build ticketData
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
                ticketPIN: firstTicketCode || order.pin || (order.memo ? order.memo.slice(-6) : ""),
                ticketCode: firstTicketCode,
                qrUrl: qrUrl,
            };

            console.log(`📧 [BankApp] Sending ticket email for booking ${bookingId}:`, {
                email: order.email,
                customerName: order.full_name,
                movieTitle: order.movie_name,
                ticketCode: firstTicketCode,
                qrUrl,
            });

            // ✅ FIX: Truyền 1 OBJECT thay vì 2 tham số
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
        CHECK TTL
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
        GỬI LẠI OTP PAYMENT
    =========================================================*/

    async resendOtpPayment(email, tempBookingId) {
        if (!email?.trim()) {
            throw { statusCode: 400, field: "email", message: "Email không được để trống" };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);
        if (!tempData) {
            throw { statusCode: 404, message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." };
        }

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

        const updatedData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();

        await CacheService.set(key, updatedData, 300);

        await MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
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
        GỬI OTP THANH TOÁN
    =========================================================*/

    async sendPaymentOTP(email, tempBookingId) {
        if (!email?.trim()) {
            throw { statusCode: 400, field: "email", message: "Email không được để trống" };
        }

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);
        if (!tempData) {
            throw { statusCode: 404, message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." };
        }

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

        const updatedData = typeof tempData === 'string' ? JSON.parse(tempData) : tempData;
        updatedData.otp = otpResult.otp;
        updatedData.otpCreatedAt = Date.now();

        await CacheService.set(key, updatedData, 300);

        await MailService.sendPaymentOTP(email, otpResult.otp, updatedData.customerName, updatedData.totalAmount)
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