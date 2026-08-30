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

        // Sử dụng BankAppService
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
            return res.status(400).json({
                success: false,
                message: verifyResult.message,
                code: verifyResult.code
            });
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
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};