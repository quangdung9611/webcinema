// =========================================================
// IMPORTS
// =========================================================

const bcrypt = require('bcryptjs');

const db =
    require('../Config/db');

const mailService =
    require(
        '../Services/MailServiceTicket'
    );

// =========================================================
// OTP STORAGE (RAM)
// =========================================================

let otpStorage = {};

// =========================================================
// FORGOT PASSWORD
// SEND OTP
// =========================================================

exports.forgotPassword =
    async (req, res) => {

        try {

            const { email } =
                req.body;

            // ===============================
            // VALIDATE
            // ===============================

            if (!email) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            'Vui lòng nhập email'

                    });

            }

            // ===============================
            // CHECK USER
            // ===============================

            const [users] =
                await db.query(

                    `
                    SELECT *
                    FROM users
                    WHERE email = ?
                    `,

                    [email]

                );

            if (
                users.length === 0
            ) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            'Email không tồn tại'

                    });

            }

            // ===============================
            // CHỐNG SPAM OTP
            // 30 GIÂY
            // ===============================

            if (
                otpStorage[email]
            ) {

                const lastSent =

                    otpStorage[email]
                        .expires -

                    (
                        5 *
                        60 *
                        1000
                    );

                if (

                    Date.now()
                    - lastSent

                    < 30000

                ) {

                    return res
                        .json({

                            success:
                                true,

                            message:
                                'Mã OTP đã được gửi, vui lòng kiểm tra email'

                        });

                }

            }

            // ===============================
            // GENERATE OTP
            // ===============================

            const otp =
                Math.floor(

                    100000 +

                    Math.random()
                    * 900000

                ).toString();

            // ===============================
            // SAVE OTP TO RAM
            // ===============================

            otpStorage[email] = {

                otp,

                expires:

                    Date.now()

                    +

                    5 *
                    60 *
                    1000

            };

            console.log(
                `📨 Gửi OTP reset password tới ${email}: ${otp}`
            );

            // ===============================
            // RESPONSE TRƯỚC
            // ===============================

            res.json({

                success: true,

                message:
                    'OTP đang được gửi'

            });

            // ===============================
            // SEND MAIL NGẦM
            // ===============================

            mailService
                .sendResetPasswordOTP(

                    email,
                    otp

                )
                .catch(err => {

                    console.log(
                        '❌ SEND RESET OTP ERROR'
                    );

                    console.log(err);

                });

        }

        catch (error) {

            console.log(
                '❌ FORGOT PASSWORD ERROR'
            );

            console.log(error);

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        'Lỗi server'

                });

        }

    };

// =========================================================
// VERIFY OTP
// =========================================================

exports.verifyOtp =
    async (req, res) => {

        try {

            const {

                email,
                otp

            } = req.body;

            // ===============================
            // VALIDATE
            // ===============================

            if (

                !email ||
                !otp

            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            'Thiếu thông tin'

                    });

            }

            // ===============================
            // CHECK OTP
            // ===============================

            const record =

                otpStorage[email];

            if (

                !record ||

                record.otp
                !== otp ||

                record.expires
                < Date.now()

            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            'OTP không đúng hoặc đã hết hạn'

                    });

            }

            return res
                .status(200)
                .json({

                    success: true,

                    message:
                        'OTP hợp lệ'

                });

        }

        catch (error) {

            console.log(
                '❌ VERIFY OTP ERROR'
            );

            console.log(error);

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        'Lỗi server'

                });

        }

    };

// =========================================================
// RESET PASSWORD
// =========================================================

exports.resetPassword =
    async (req, res) => {

        try {

            const {

                email,
                newPassword

            } = req.body;

            // ===============================
            // VALIDATE
            // ===============================

            if (

                !email ||
                !newPassword

            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            'Thiếu thông tin'

                    });

            }

            // ===============================
            // CHECK OTP VERIFIED
            // ===============================

            if (
                !otpStorage[email]
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            'OTP chưa xác thực hoặc đã hết hạn'

                    });

            }

            // ===============================
            // HASH PASSWORD
            // ===============================

            const hashedPassword =

                await bcrypt.hash(

                    newPassword,
                    10

                );

            // ===============================
            // UPDATE PASSWORD
            // ===============================

            await db.query(

                `
                UPDATE users
                SET password = ?
                WHERE email = ?
                `,

                [

                    hashedPassword,
                    email

                ]

            );

            // ===============================
            // DELETE OTP
            // ===============================

            delete
                otpStorage[email];

            return res
                .status(200)
                .json({

                    success: true,

                    message:
                        'Đổi mật khẩu thành công'

                });

        }

        catch (error) {

            console.log(
                '❌ RESET PASSWORD ERROR'
            );

            console.log(error);

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        'Lỗi server'

                });

        }

    };