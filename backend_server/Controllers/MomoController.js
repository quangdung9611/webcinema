const MomoService = require("../Services/MomoService");
const db = require("../Config/db");

exports.createPayment = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    const result = await MomoService.createPayment(bookingId, amount);
    return res.json(result);
  } catch (error) {
    console.error("❌ createPayment error:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo giao dịch MoMo" });
  }
};

exports.confirmMomoFast = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { bookingId } = req.body;
    await connection.beginTransaction();
    await MomoService.confirmMomoFast(connection, bookingId);
    await connection.commit();
    return res.json({ success: true, message: "Thanh toán thành công" });
  } catch (error) {
    await connection.rollback();
    console.error("❌ confirmMomoFast error:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

exports.callback = async (req, res) => {
  const { orderId, resultCode } = req.body;

  if (resultCode !== 0) {
    return res.status(204).send();
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await MomoService.completeMomoPayment(connection, orderId);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("❌ MOMO CALLBACK ERROR:", error);
  } finally {
    connection.release();
  }

  return res.status(204).send();
};