const PaymentService = require("../Services/PaymentService");

/*=========================================================
    PROCESS ORDER – LƯU TẠM, TRẢ VỀ tempBookingId
=========================================================*/
exports.processOrder = async (req, res) => {
    try {
        const result = await PaymentService.processOrder(req.body);
        return res.status(200).json({
            success: true,
            tempBookingId: result.tempBookingId,
            message: "Đã lưu thông tin đặt vé tạm. Vui lòng xác thực OTP để hoàn tất."
        });
    } catch (error) {
        console.error("Process Order Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/*=========================================================
    COMMIT BOOKING (gọi từ BankAppController)
=========================================================*/
exports.commitBooking = async (connection, tempBookingId) => {
    return await PaymentService.commitToDatabase(connection, tempBookingId);
};

/*=========================================================
    GET TEMP DATA (kiểm tra session)
=========================================================*/
exports.getTempData = async (req, res) => {
    try {
        const { tempBookingId } = req.params;
        // Sửa: gọi async và await
        const data = await PaymentService.getTempData(tempBookingId);
        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Phiên đặt vé không tồn tại hoặc đã hết hạn."
            });
        }
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