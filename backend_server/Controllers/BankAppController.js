const BankAppService = require("../Services/BankAppService");
const OtpService = require("../Services/OtpService");
const { PURPOSE } = require("../Services/OtpService");
const MailServiceTicket = require("../Services/MailServiceTicket");
const db = require("../Config/db");
const PaymentController = require("./PaymentController");

/*=========================================================
    SEND OTP – dùng tempBookingId
=========================================================*/
exports.sendOTP = async (req, res) => {
    try {
        const { email, tempBookingId } = req.body;
        if (!email || !tempBookingId) {
            return res.status(400).json({ 
                success: false, 
                message: "Thiếu email hoặc tempBookingId" 
            });
        }

        // Kiểm tra temp booking tồn tại
        const tempData = await PaymentController.getTempData({ params: { tempBookingId } });
        // Cách check đơn giản: gọi trực tiếp service
        const PaymentService = require("../Services/PaymentService");
        const tempBooking = PaymentService.getTempData(tempBookingId);
        if (!tempBooking) {
            return res.status(400).json({ 
                success: false, 
                message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại." 
            });
        }

        const result = await OtpService.createOTP(email, PURPOSE.PAYMENT);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.message });
        }

        MailServiceTicket.sendOTP(email, result.otp, tempBookingId).catch(console.error);

        return res.json({ 
            success: true, 
            message: "Mã OTP đang được gửi!" 
        });
    } catch (error) {
        console.error("❌ sendOTP error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/*=========================================================
    VERIFY OTP – COMMIT VÀO DB KHI OTP ĐÚNG
=========================================================*/
exports.verifyOTP = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { email, otp, tempBookingId } = req.body;

        // 1. Xác thực OTP
        const verifyResult = await OtpService.verifyOTP(email, otp, PURPOSE.PAYMENT);
        if (!verifyResult.success) {
            return res.status(400).json(verifyResult);
        }

        await connection.beginTransaction();

        // 2. Commit vào database
        const result = await PaymentController.commitBooking(connection, tempBookingId);

        await connection.commit();

        return res.json({
            success: true,
            message: "Thanh toán thành công!",
            data: { bookingId: result.bookingId },
        });
    } catch (error) {
        await connection.rollback();
        console.error("❌ verifyOTP error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    } finally {
        connection.release();
    }
};

/*=========================================================
    CANCEL TIMEOUT – XÓA SESSION
=========================================================*/
exports.cancelBookingTimeout = async (req, res) => {
    try {
        const { tempBookingId } = req.body;
        if (!tempBookingId) {
            return res.status(400).json({ 
                success: false, 
                message: "Thiếu tempBookingId" 
            });
        }

        const PaymentService = require("../Services/PaymentService");
        const deleted = PaymentService.deleteTempData(tempBookingId);

        return res.json({
            success: true,
            message: deleted ? "Đã hủy phiên đặt vé." : "Không tìm thấy phiên đặt vé.",
        });
    } catch (error) {
        console.error("❌ cancelBookingTimeout error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};