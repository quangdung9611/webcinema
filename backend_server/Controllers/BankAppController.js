const BankAppService = require("../Services/BankAppService");
const OtpService = require("../Services/OtpService");   // instance
const MailServiceTicket = require("../Services/MailServiceTicket");
const db = require("../Config/db");

exports.sendOTP = async (req, res) => {
  try {
    const { email, bookingId } = req.body;
    if (!email || !bookingId) {
      return res.status(400).json({ success: false, message: "Thiếu email hoặc bookingId" });
    }

    // ✅ Gọi instance method
    const result = await OtpService.createPaymentOTP(email, "PAYMENT");
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

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
    const { email, otp, bookingId } = req.body;

    const verifyResult = await OtpService.verifyPaymentOTP(email, otp, "PAYMENT");
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
    const { bookingId, email } = req.body;
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