
// =========================================================
// IMPORTS
// =========================================================

const bcrypt = require('bcryptjs');

const db =
    require('../Config/db');

const otpService =
    require('../Services/OtpService');

const mailService =
    require('../Services/MailServiceTicket');

// =========================================================
// FORGOT PASSWORD
// SEND OTP
// =========================================================

exports.forgotPassword =
    async (req, res) => {

        try {

            const { email } =
                req.body;

            if (!email) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            'Vui lòng nhập email'

                    });

            }

            const [users] =
                await db.execute(
                    `
                    SELECT
                        user_id,
                        email
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                    `,
                    [email]
                );

            if (!users.length) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            'Email không tồn tại'

                    });

            }

            const otp =
                await otpService.createOTP(
                    email,
                    'RESET_PASSWORD'
                );

            mailService
                .sendResetPasswordOTP(
                    email,
                    otp
                )
                .catch(error => {

                    console.error(
                        '❌ SEND RESET OTP ERROR:',
                        error
                    );

                });

            return res.json({

                success: true,

                message:
                    'OTP đang được gửi'

            });

        }

        catch (error) {

            console.error(
                '❌ FORGOT PASSWORD ERROR:',
                error
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        error.message

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

            const verifyResult =
                await otpService.verifyOTP(
                    email,
                    otp,
                    'RESET_PASSWORD'
                );

            if (
                !verifyResult.success
            ) {

                return res
                    .status(400)
                    .json(
                        verifyResult
                    );

            }

            await otpService.markUsed(
                verifyResult.data.otp_id
            );

            return res
                .status(200)
                .json({

                    success: true,

                    message:
                        'OTP hợp lệ'

                });

        }

        catch (error) {

            console.error(
                '❌ VERIFY OTP ERROR:',
                error
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        error.message

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

            const [users] =
                await db.execute(
                    `
                    SELECT
                        user_id
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                    `,
                    [email]
                );

            if (!users.length) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            'Không tìm thấy tài khoản'

                    });

            }

            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            await db.execute(
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

            await otpService.deleteOTP(
                email,
                'RESET_PASSWORD'
            );

            return res
                .status(200)
                .json({

                    success: true,

                    message:
                        'Đổi mật khẩu thành công'

                });

        }

        catch (error) {

            console.error(
                '❌ RESET PASSWORD ERROR:',
                error
            );

            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        error.message

                });

        }

    };

