const db = require('../Config/db');

const paymentService =
    require('../Services/PaymentService');

/* =========================================================
    PROCESS ORDER
========================================================= */

exports.processOrder = async (
    req,
    res
) => {

    const connection =
        await db.getConnection();

    try {

        await connection.beginTransaction();

        const result =
            await paymentService.processOrder(
                connection,
                req.body
            );

        await connection.commit();

        return res.status(200).json({

            success: true,

            bookingId:
                result.bookingId,

            memo:
                result.memo

        });

    } catch (error) {

        await connection.rollback();

        console.error(
            'Process Order Error:',
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    } finally {

        connection.release();

    }

};

/* =========================================================
    COMPLETE PAYMENT
    (BANK APP)
========================================================= */

exports.completePayment =
async (req, res) => {

    const connection =
        await db.getConnection();

    try {

        const {
            bookingId
        } = req.body;

        await connection.beginTransaction();

        await paymentService
            .completeBankPayment(
                connection,
                bookingId
            );

        await connection.commit();

        return res.json({

            success: true,

            message:
                'Thanh toán thành công'

        });

    } catch (error) {

        await connection.rollback();

        console.error(
            'Complete Payment Error:',
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message

        });

    } finally {

        connection.release();

    }

};

/* =========================================================
    MOMO CALLBACK (IPN)
========================================================= */

exports.momoCallback =
async (req, res) => {

    const {
        orderId,
        resultCode
    } = req.body;

    if (resultCode === 0) {

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            await paymentService
                .completeMomoPayment(
                    connection,
                    orderId
                );

            await connection.commit();

        } catch (error) {

            await connection.rollback();

            console.error(
                'MoMo Callback Error:',
                error
            );

        } finally {

            connection.release();

        }

    }

    return res
        .status(204)
        .send();

};