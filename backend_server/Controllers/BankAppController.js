const BankAppService = require("../Services/BankAppService");
const OtpService = require("../Services/OtpService");
const { PURPOSE } = require("../Services/OtpService");
const PaymentService = require("../Services/PaymentService");
const CacheService = require("../Services/CacheService");
const db = require("../Config/db");

/*=========================================================
    ✅ PROCESS ORDER — TẠO TEMP BOOKING
    ----------------------------------------------------------
    ⚠️ ĐÂY LÀ HÀM BỊ THIẾU — PHẢI THÊM
    Dùng chung PaymentService.processOrder (tính giá server-side)
=========================================================*/
exports.processOrder = async (req, res) => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập để đặt vé"
            });
        }

        // ✅ Gọi PaymentService.processOrder với userId từ JWT
        const result = await PaymentService.processOrder(req.body, userId);

        return res.status(200).json({
            success: true,
            tempBookingId: result.tempBookingId,
            message: "Đã lưu thông tin đặt vé tạm. Vui lòng xác thực OTP để hoàn tất."
        });
    } catch (error) {
        console.error("❌ [BankApp] processOrder error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    ✅ SEND OTP — TRUYỀN userId ĐỂ CHECK OWNER
=========================================================*/
exports.sendOTP = async (req, res) => {
    try {
        const { email, tempBookingId } = req.body;
        const userId = req.user?.user_id;

        if (!email || !tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu email hoặc tempBookingId"
            });
        }

        // ✅ Truyền userId để service check owner
        const result = await BankAppService.sendPaymentOTP(email, tempBookingId, userId);

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
    ✅ VERIFY OTP — CHECK OWNER TRƯỚC KHI COMMIT
=========================================================*/
exports.verifyOTP = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { email, otp, tempBookingId } = req.body;
        const userId = req.user?.user_id;

        if (!userId) {
            connection.release();
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập"
            });
        }

        /*=====================================================
            ✅ CHECK OWNER TEMP BOOKING TRƯỚC
        =====================================================*/

        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);

        if (!tempData) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Phiên đặt vé đã hết hạn. Vui lòng đặt lại."
            });
        }

        const data = typeof tempData === "string" ? JSON.parse(tempData) : tempData;

        // Check user_id khớp
        if (Number(data.userId) !== Number(userId)) {
            connection.release();
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền xác thực phiên đặt vé này"
            });
        }

        // Check email khớp
        if (data.customerEmail && email.toLowerCase().trim() !== data.customerEmail.toLowerCase().trim()) {
            connection.release();
            return res.status(403).json({
                success: false,
                message: "Email không khớp với phiên đặt vé"
            });
        }

        /*=====================================================
            XÁC THỰC OTP
        =====================================================*/

        const verifyResult = await OtpService.verifyOTP(
            email,
            otp,
            PURPOSE.PAYMENT
        );

        if (!verifyResult.success) {
            connection.release();
            const errorResponse = {
                success: false,
                message: verifyResult.message,
                code: verifyResult.code
            };

            if (verifyResult.data) {
                errorResponse.data = verifyResult.data;
            }

            return res.status(400).json(errorResponse);
        }

        /*=====================================================
            COMMIT
        =====================================================*/

        await connection.beginTransaction();

        const result = await PaymentService.commitToDatabase(
            connection,
            tempBookingId
        );

        await connection.commit();

        // Gửi email vé
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

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });

    } finally {
        connection.release();
    }
};

/*=========================================================
    ✅ CANCEL TIMEOUT — CHECK OWNER
=========================================================*/
exports.cancelBookingTimeout = async (req, res) => {
    try {
        const { tempBookingId } = req.body;
        const userId = req.user?.user_id;

        if (!tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tempBookingId"
            });
        }

        // ✅ Check owner
        const key = `temp:${tempBookingId}`;
        const tempData = await CacheService.get(key);

        if (tempData) {
            const data = typeof tempData === "string" ? JSON.parse(tempData) : tempData;
            if (userId && Number(data.userId) !== Number(userId)) {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền hủy phiên đặt vé này"
                });
            }
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

/*=========================================================
    ✅ CHECK TTL — TRUYỀN userId
=========================================================*/
exports.checkTTL = async (req, res) => {
    try {
        const { tempBookingId } = req.params;
        const userId = req.user?.user_id;

        if (!tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu tempBookingId"
            });
        }

        const result = await BankAppService.checkTTL(tempBookingId, userId);

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
    ✅ RESEND OTP — TRUYỀN userId
=========================================================*/
exports.resendOtpPayment = async (req, res) => {
    try {
        const { email, tempBookingId } = req.body;
        const userId = req.user?.user_id;

        if (!email || !tempBookingId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu email hoặc tempBookingId"
            });
        }

        const result = await BankAppService.resendOtpPayment(email, tempBookingId, userId);

        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ resendOtpPayment error:", error);

        const statusCode = error.statusCode || 500;
        const response = {
            success: false,
            message: error.message || "Lỗi máy chủ"
        };

        if (error.data) {
            response.data = error.data;
        }

        return res.status(statusCode).json(response);
    }
};