const BankAppService = require("../Services/BankAppService");
const OtpService = require("../Services/OtpService");
const { PURPOSE } = require("../Services/OtpService");
const PaymentService = require("../Services/PaymentService");
const db = require("../Config/db");

exports.sendOTP = async (req, res) => {
    try {
        const { email, tempBookingId } = req.body;
        if (!email || !tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu email hoặc tempBookingId"
            });
        }

        const result = await BankAppService.sendPaymentOTP(email, tempBookingId);

        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ sendOTP error:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

exports.verifyOTP = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { email, otp, tempBookingId } = req.body;

        // Xác thực OTP
        const verifyResult = await OtpService.verifyOTP(
            email,
            otp,
            PURPOSE.PAYMENT
        );

        if (!verifyResult.success) {
            // 🔥 Trả về lỗi với thông tin attempts và lock
            const errorResponse = {
                success: false,
                message: verifyResult.message,
                code: verifyResult.code
            };
            
            // Nếu có thông tin attempts từ verifyResult
            if (verifyResult.data) {
                errorResponse.data = verifyResult.data;
            }
            
            return res.status(400).json(errorResponse);
        }

        // Transaction
        await connection.beginTransaction();

        const result = await PaymentService.commitToDatabase(
            connection,
            tempBookingId
        );

        await connection.commit();

        // Gửi email vé sau khi commit thành công
        try {
            await BankAppService.sendTicketEmail(
                connection,
                result.bookingId
            );
        } catch (err) {
            console.error("❌ Send Ticket Email Error:", err);
        }

        return res.status(200).json({
            success: true,
            data: {
                bookingId: result.bookingId
            }
        });

    } catch (error) {

        try {
            await connection.rollback();
        } catch (_) {}

        console.error("❌ verifyOTP error:", error);

        // 🔥 Xử lý lỗi lock từ OtpService
        if (error.code === 'OTP_LOCKED' || error.message?.includes('khóa')) {
            return res.status(429).json({
                success: false,
                message: error.message || "OTP bị khóa do nhập sai quá nhiều lần",
                code: 'OTP_LOCKED',
                data: error.data || {
                    lockDuration: 300,
                    remainingSeconds: 300
                }
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });

    } finally {
        connection.release();
    }
};

exports.cancelBookingTimeout = async (req, res) => {
    try {
        const { tempBookingId } = req.body;
        if (!tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tempBookingId"
            });
        }

        const deleted = await PaymentService.deleteTempData(tempBookingId);

        return res.status(200).json({
            success: true,
            message: deleted ? "Đã hủy phiên đặt vé." : "Không tìm thấy phiên đặt vé."
        });
    } catch (error) {
        console.error("❌ cancelBookingTimeout error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });
    }
};

// ============================================================
// 🆕 CHECK TTL - GIỐNG AUTH CONTROLLER
// ============================================================
exports.checkTTL = async (req, res) => {
    try {
        const { tempBookingId } = req.params;
        
        if (!tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tempBookingId"
            });
        }

        const result = await BankAppService.checkTTL(tempBookingId);

        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ checkTTL error:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

// ============================================================
// 🆕 RESEND OTP PAYMENT - GIỐNG AUTH CONTROLLER
// ============================================================
exports.resendOtpPayment = async (req, res) => {
    try {
        const { email, tempBookingId } = req.body;

        if (!email || !tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu email hoặc tempBookingId"
            });
        }

        const result = await BankAppService.resendOtpPayment(email, tempBookingId);

        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ resendOtpPayment error:", error);
        
        const statusCode = error.statusCode || 500;
        const response = {
            success: false,
            message: error.message || "Lỗi máy chủ"
        };
        
        // 🔥 Thêm data nếu có (ví dụ: remainingSeconds, maxAttempts)
        if (error.data) {
            response.data = error.data;
        }
        
        return res.status(statusCode).json(response);
    }
};