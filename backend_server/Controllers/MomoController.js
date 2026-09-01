const MomoService = require("../Services/MomoService");
const { PURPOSE } = require("../Services/OtpService");

/*=========================================================
    PROCESS ORDER - TẠO TEMP BOOKING + QR MOMO
=========================================================*/
exports.processOrder = async (req, res) => {
    try {
        const result = await MomoService.processOrder(req.body);
        return res.status(200).json({
            success: true,
            tempBookingId: result.tempBookingId,
            momoQR: result.momoQR,
            qrCodeUrl: result.qrCodeUrl,
            expiresIn: result.expiresIn,
            message: "Đã tạo phiên đặt vé và QR MoMo. Vui lòng xác thực OTP để hoàn tất."
        });
    } catch (error) {
        console.error("❌ processOrder error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    SEND OTP
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

        const result = await MomoService.sendPaymentOTP(email, tempBookingId);
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

/*=========================================================
    VERIFY OTP + COMMIT
=========================================================*/
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp, tempBookingId } = req.body;

        if (!email || !otp || !tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu email, otp hoặc tempBookingId"
            });
        }

        const result = await MomoService.verifyOTPAndCommit(email, otp, tempBookingId);
        return res.status(200).json(result);

    } catch (error) {
        console.error("❌ verifyOTP error:", error);

        // Xử lý lỗi OTP lock
        if (error.code === 'OTP_LOCKED' || error.message?.includes('khóa')) {
            return res.status(429).json({
                success: false,
                message: error.message || "OTP bị khóa do nhập sai quá nhiều lần",
                code: 'OTP_LOCKED',
                data: error.data || { lockDuration: 300, remainingSeconds: 300 }
            });
        }

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    RESEND OTP
=========================================================*/
exports.resendOtp = async (req, res) => {
    try {
        const { email, tempBookingId } = req.body;

        if (!email || !tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu email hoặc tempBookingId"
            });
        }

        const result = await MomoService.resendOtpPayment(email, tempBookingId);
        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ resendOtp error:", error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    CHECK TTL
=========================================================*/
exports.checkTTL = async (req, res) => {
    try {
        const { tempBookingId } = req.params;
        if (!tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tempBookingId"
            });
        }

        const result = await MomoService.checkTTL(tempBookingId);
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

/*=========================================================
    CANCEL BOOKING
=========================================================*/
exports.cancelBooking = async (req, res) => {
    try {
        const { tempBookingId } = req.body;
        if (!tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tempBookingId"
            });
        }

        const result = await MomoService.cancelBooking(tempBookingId);
        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ cancelBooking error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    MOMO CALLBACK (TỪ MOMO)
=========================================================*/
exports.callback = async (req, res) => {
    try {
        const handled = await MomoService.handleCallback(req.body);
        if (handled) {
            console.log("✅ MoMo callback processed successfully");
        }
        // Luôn trả về 204 cho MoMo
        return res.status(204).send();
    } catch (error) {
        console.error("❌ MoMo callback error:", error);
        return res.status(204).send();
    }
};