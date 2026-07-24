const PaymentService = require("../Services/PaymentService");

exports.processOrder = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await PaymentService.processOrder(connection, req.body);
    await connection.commit();
    return res.status(200).json({
      success: true,
      bookingId: result.bookingId,
      memo: result.memo,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Process Order Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.completePayment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { bookingId } = req.body;
    await connection.beginTransaction();
    await PaymentService.executeBankCompletion(bookingId, connection);
    await connection.commit();
    return res.json({
      success: true,
      message: "Thanh toán thành công",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Complete Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.momoCallback = async (req, res) => {
  const { orderId, resultCode } = req.body;

  if (resultCode === 0) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await PaymentService.executeMomoCompletion(orderId, connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("MoMo Callback Error:", error);
    } finally {
      connection.release();
    }
  }

  return res.status(204).send();
};