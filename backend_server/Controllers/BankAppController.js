const BankAppService = require("../Services/BankAppService");
const OtpService = require("../Services/OtpService");
const { PURPOSE } = require("../Services/OtpService");
const MailServiceTicket = require("../Services/MailServiceTicket");
const db = require("../Config/db");

// 🚨 BẬT BYPASS = true để test thanh toán không cần OTP
const BYPASS_OTP = false; // 👈 đổi thành true khi test

exports.sendOTP = async (req, res) => {
    try {
        let { email, bookingId } = req.body;
        if (!email || !bookingId) {
            return res.status(400).json({ success: false, message: "Thiếu email hoặc bookingId" });
        }
        email = email.trim();

        const result = await OtpService.createOTP(email, PURPOSE.PAYMENT);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        // Gửi mail OTP
        MailServiceTicket.sendOTP(email, result.otp, bookingId).catch(console.error);

        return res.json({ success: true, message: "Mã OTP đang được gửi!" });
    } catch (error) {
        console.error("❌ sendOTP error:", error);
        const status = error.statusCode || 500;
        return res.status(status).json({ success: false, message: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    const connection = await db.getConnection();
    try {
        let { email, otp, bookingId } = req.body;
        email = email.trim();

        // 🟢 BYPASS OTP
        if (BYPASS_OTP) {
            console.log(`⚠️ BYPASS OTP: Thanh toán ngay cho booking ${bookingId}`);
            await connection.beginTransaction();
            await BankAppService.completeBankPayment(connection, bookingId);
            await connection.commit();
            return res.json({
                success: true,
                message: "Thanh toán thành công! (Bypass OTP)",
                data: { orderId: bookingId },
            });
        }

        // Verify OTP bình thường
        const verifyResult = await OtpService.verifyOTP(email, otp, PURPOSE.PAYMENT);
        if (!verifyResult.success) {
            return res.status(400).json(verifyResult);
        }

        await connection.beginTransaction();
        await BankAppService.completeBankPayment(connection, bookingId);
        await connection.commit();

        return res.json({
            success: true,
            message: "Thanh toán thành công!",
            data: { orderId: bookingId },
        });
    } catch (error) {
        await connection.rollback();
        console.error("❌ verifyOTP error:", error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

exports.cancelBookingTimeout = async (req, res) => {
    const connection = await db.getConnection();
    try {
        let { bookingId, email } = req.body;
        email = email && email.trim();

        await connection.beginTransaction();
        await BankAppService.cancelBookingTimeout(connection, bookingId, email);
        await connection.commit();
        return res.json({
            success: true,
            message: "Hết thời gian thanh toán, ghế đã được giải phóng.",
        });
    } catch (error) {
        await connection.rollback();
        console.error("❌ cancelBookingTimeout error:", error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};