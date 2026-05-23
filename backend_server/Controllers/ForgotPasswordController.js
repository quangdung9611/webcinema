// =========================================================
// IMPORTS
// =========================================================

const bcrypt = require('bcryptjs');

const db = require('../config/db');

const transporter = require('../config/mailer');

const otpEmailTemplate =
    require('../Templates/OtpEmailTemplate');

// =========================================================
// FORGOT PASSWORD
// SEND OTP
// =========================================================

exports.forgotPassword = async (req, res) => {

    try {

        // =====================================================
        // GET EMAIL
        // =====================================================

        const { email } = req.body;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (!email) {

            return res.status(400).json({

                success: false,

                message: 'Vui lòng nhập email'

            });

        }

        // =====================================================
        // CHECK USER
        // =====================================================

        const [users] = await db.query(

            `
                SELECT *
                FROM users
                WHERE email = ?
            `,

            [email]

        );

        // =====================================================
        // USER NOT FOUND
        // =====================================================

        if (users.length === 0) {

            return res.status(404).json({

                success: false,

                message: 'Email không tồn tại'

            });

        }

        // =====================================================
        // GENERATE OTP
        // =====================================================

        const otp = Math.floor(

            100000 + Math.random() * 900000

        ).toString();

        // =====================================================
        // OTP EXPIRE
        // 60 SECONDS
        // =====================================================

        const otpExpire = Date.now() + 60 * 1000;

        // =====================================================
        // SAVE OTP
        // =====================================================

        await db.query(

            `
                UPDATE users
                SET
                    otp_code = ?,
                    otp_expire = ?
                WHERE email = ?
            `,

            [
                otp,
                otpExpire,
                email
            ]

        );

        // =====================================================
        // SEND EMAIL
        // =====================================================

        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to: email,

            subject: 'Mã OTP đặt lại mật khẩu',

            html: otpEmailTemplate(otp)

        });

        // =====================================================
        // SUCCESS
        // =====================================================

        return res.status(200).json({

            success: true,

            message: 'Đã gửi mã OTP'

        });

    }

    // =========================================================
    // ERROR
    // =========================================================

    catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,

            message: 'Lỗi server'

        });

    }

};

// =========================================================
// VERIFY OTP
// =========================================================

exports.verifyOtp = async (req, res) => {

    try {

        // =====================================================
        // GET DATA
        // =====================================================

        const {
            email,
            otp
        } = req.body;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (!email || !otp) {

            return res.status(400).json({

                success: false,

                message: 'Thiếu thông tin'

            });

        }

        // =====================================================
        // CHECK USER
        // =====================================================

        const [users] = await db.query(

            `
                SELECT *
                FROM users
                WHERE email = ?
            `,

            [email]

        );

        // =====================================================
        // USER NOT FOUND
        // =====================================================

        if (users.length === 0) {

            return res.status(404).json({

                success: false,

                message: 'Người dùng không tồn tại'

            });

        }

        // =====================================================
        // GET USER
        // =====================================================

        const user = users[0];

        // =====================================================
        // CHECK OTP
        // =====================================================

        if (user.otp_code !== otp) {

            return res.status(400).json({

                success: false,

                message: 'OTP không chính xác'

            });

        }

        // =====================================================
        // CHECK EXPIRE
        // =====================================================

        if (Date.now() > user.otp_expire) {

            return res.status(400).json({

                success: false,

                message: 'OTP đã hết hạn'

            });

        }

        // =====================================================
        // SUCCESS
        // =====================================================

        return res.status(200).json({

            success: true,

            message: 'OTP hợp lệ'

        });

    }

    // =========================================================
    // ERROR
    // =========================================================

    catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,

            message: 'Lỗi server'

        });

    }

};

// =========================================================
// RESET PASSWORD
// =========================================================

exports.resetPassword = async (req, res) => {

    try {

        // =====================================================
        // GET DATA
        // =====================================================

        const {
            email,
            newPassword
        } = req.body;

        // =====================================================
        // VALIDATE
        // =====================================================

        if (!email || !newPassword) {

            return res.status(400).json({

                success: false,

                message: 'Thiếu thông tin'

            });

        }

        // =====================================================
        // CHECK USER
        // =====================================================

        const [users] = await db.query(

            `
                SELECT *
                FROM users
                WHERE email = ?
            `,

            [email]

        );

        // =====================================================
        // USER NOT FOUND
        // =====================================================

        if (users.length === 0) {

            return res.status(404).json({

                success: false,

                message: 'Người dùng không tồn tại'

            });

        }

        // =====================================================
        // HASH PASSWORD
        // =====================================================

        const hashedPassword = await bcrypt.hash(

            newPassword,
            10

        );

        // =====================================================
        // UPDATE PASSWORD
        // =====================================================

        await db.query(

            `
                UPDATE users
                SET
                    password = ?,
                    otp_code = NULL,
                    otp_expire = NULL
                WHERE email = ?
            `,

            [
                hashedPassword,
                email
            ]

        );

        // =====================================================
        // SUCCESS
        // =====================================================

        return res.status(200).json({

            success: true,

            message: 'Đổi mật khẩu thành công'

        });

    }

    // =========================================================
    // ERROR
    // =========================================================

    catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,

            message: 'Lỗi server'

        });

    }

};