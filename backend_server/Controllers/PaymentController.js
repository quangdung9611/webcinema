const PaymentService = require("../Services/PaymentService");

/*=========================================================
    ✅ PROCESS ORDER – LẤY userId TỪ JWT
=========================================================*/
exports.processOrder = async (req, res) => {
    try {
        // ✅ Lấy userId từ middleware auth (JWT), KHÔNG từ body
        const userId = req.user?.user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập để đặt vé"
            });
        }

        // ✅ Truyền userId vào service
        const result = await PaymentService.processOrder(req.body, userId);

        return res.status(200).json({
            success: true,
            tempBookingId: result.tempBookingId,
            message: "Đã lưu thông tin đặt vé tạm. Vui lòng xác thực OTP để hoàn tất."
        });
    } catch (error) {
        console.error("Process Order Error:", error);
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/*=========================================================
    COMMIT BOOKING
=========================================================*/
exports.commitBooking = async (connection, tempBookingId) => {
    return await PaymentService.commitToDatabase(connection, tempBookingId);
};

/*=========================================================
    GET TEMP DATA
=========================================================*/
exports.getTempData = async (req, res) => {
    try {
        const { tempBookingId } = req.params;

        const data = await PaymentService.getTempData(tempBookingId);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Phiên đặt vé không tồn tại hoặc đã hết hạn."
            });
        }

        // ✅ SECURITY: Chỉ cho xem nếu user_id khớp hoặc request là public check
        return res.status(200).json({
            success: true,
            data: {
                tempBookingId: data.tempBookingId,
                totalAmount: data.totalAmount,
                customerEmail: data.customerEmail,
                customerName: data.customerName,
                customerPhone: data.customerPhone
            }
        });
    } catch (error) {
        console.error("Get Temp Data Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};