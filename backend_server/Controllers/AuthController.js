// Controllers/AuthController.js
const AuthService = require("../Services/AuthService");

/*=========================================================
    🆕 ĐĂNG KÝ BƯỚC 1 (CHỈ VALIDATE, KHÔNG LƯU CSDL)
=========================================================*/
exports.registerStep1 = async (req, res) => {
    try {
        const result = await AuthService.registerStep1(req.body);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Register Step 1 Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🆕 HOÀN TẤT ĐĂNG KÝ (LƯU CSDL + GỬI EMAIL)
=========================================================*/
exports.completeRegistration = async (req, res) => {
    try {
        const result = await AuthService.completeRegistration(req.body, req, res);
        return res.status(201).json(result);
    } catch (error) {
        console.error("Complete Registration Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🆕 GỬI LẠI EMAIL XÁC THỰC
=========================================================*/
exports.resendVerification = async (req, res) => {
    try {
        const result = await AuthService.resendVerificationAfterLogin(req.user.user_id);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Resend Verification Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    REGISTER
=========================================================*/
exports.register = async (req, res) => {
    try {
        const result = await AuthService.register(req.body);
        return res.status(201).json(result);
    } catch (error) {
        console.error("Register Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🔥 CHECK LOCK STATUS (KIỂM TRA TRẠNG THÁI KHÓA KHI F5)
=========================================================*/
exports.checkLockStatus = async (req, res) => {
    try {
        const { email } = req.query;
        const result = await AuthService.checkLockStatus(email);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Check Lock Status Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    LOGIN (CHUNG - DÙNG CHO CẢ CUSTOMER VÀ ADMIN)
=========================================================*/
exports.login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        const result = await AuthService.login(email, password, rememberMe, req, res);
        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            user: result.user
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            code: error.code || null,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    LOGIN ADMIN (RIÊNG)
=========================================================*/
exports.adminLogin = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        const result = await AuthService.login(email, password, rememberMe, req, res);
        if (result.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Tài khoản không có quyền quản trị." });
        }
        return res.status(200).json({ success: true, message: "Đăng nhập admin thành công", user: result.user });
    } catch (error) {
        console.error("Admin Login Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            code: error.code || null,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🔥 GET ME
=========================================================*/
exports.getMe = async (req, res) => {
    try {
        const result = await AuthService.getMe(req.user.user_id);
        return res.status(200).json(result);
    } catch (error) {
        console.error("GetMe Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    REFRESH TOKEN
=========================================================*/
exports.refreshToken = async (req, res) => {
    try {
        return res.status(501).json({
            success: false,
            message: "Chức năng refresh token đang phát triển"
        });
    } catch (error) {
        console.error("Refresh Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    LOGOUT
=========================================================*/
exports.logout = async (req, res) => {
    try {
        const result = await AuthService.logout(req, res);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    LOGOUT ALL DEVICES
=========================================================*/
exports.logoutAllDevices = async (req, res) => {
    try {
        const result = await AuthService.logoutAllDevices(req.user.user_id, res);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Logout All Devices Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    CHANGE PASSWORD
=========================================================*/
exports.changePassword = async (req, res) => {
    try {
        const result = await AuthService.changePassword(req.user.user_id, req.body);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Change Password Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

// AuthController.js - forgotPassword
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await AuthService.forgotPassword(email, req);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Forgot Password Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};
/*=========================================================
    SUBMIT NEW PASSWORD
=========================================================*/
exports.submitNewPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const result = await AuthService.submitNewPassword(token, newPassword);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Submit New Password Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🆕 XÁC THỰC OTP VÀ ĐỔI MẬT KHẨU (GIỐNG VERIFY OTP CHANGE PIN)
=========================================================*/
exports.verifyOtpAndReset = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const result = await AuthService.verifyOtpAndReset(email, otp, newPassword);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Verify OTP And Reset Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};
/*=========================================================
    VERIFY RESET OTP
=========================================================*/
exports.verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await AuthService.verifyResetOTP(email, otp);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Verify Reset OTP Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    RESET PASSWORD
=========================================================*/
exports.resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        const result = await AuthService.resetPassword(resetToken, newPassword);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Reset Password Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    SEND VERIFICATION EMAIL
=========================================================*/
exports.sendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await AuthService.sendVerificationEmail(email);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Send Verification Email Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    VERIFY EMAIL
=========================================================*/
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token xác thực không hợp lệ"
            });
        }
        const result = await AuthService.verifyEmail(token);
        return res.status(200).json({
            success: true,
            message: "Xác thực email thành công!",
            data: result
        });
    } catch (error) {
        console.error("Verify Email Error:", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Token không hợp lệ hoặc đã hết hạn"
        });
    }
};

/*=========================================================
    GET DEVICES
=========================================================*/
exports.getDevices = async (req, res) => {
    try {
        const result = await AuthService.getActiveDevices(req.user.user_id);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Get Devices Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    REVOKE DEVICE
=========================================================*/
exports.revokeDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const result = await AuthService.revokeDeviceById(req.user.user_id, deviceId);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Revoke Device Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🆕 QUÊN MÃ PIN - GỬI OTP VỀ EMAIL
=========================================================*/
exports.forgotPin = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await AuthService.forgotPin(email);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Forgot PIN Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🆕 XÁC THỰC OTP VÀ ĐỔI MÃ PIN MỚI
=========================================================*/
exports.verifyOtpAndChangePin = async (req, res) => {
    try {
        const { email, otp, newPin } = req.body;
        const result = await AuthService.verifyOtpAndChangePin(email, otp, newPin);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Verify OTP And Change PIN Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🆕 KIỂM TRA TTL OTP
=========================================================*/
exports.checkOtpTTL = async (req, res) => {
    try {
        const { email, purpose } = req.query;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Thiếu email"
            });
        }
        if (!purpose) {
            return res.status(400).json({
                success: false,
                message: "Thiếu purpose"
            });
        }

        const result = await AuthService.checkOtpTTL(email, purpose);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Check OTP TTL Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};

/*=========================================================
    🆕 GỬI LẠI OTP
=========================================================*/
exports.resendOtp = async (req, res) => {
    try {
        const { email, purpose } = req.body;
        const result = await AuthService.resendOtp(email, purpose);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Resend OTP Error:", error);
        if (error.statusCode === 429) {
            return res.status(429).json({
                success: false,
                message: error.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                data: error.data || null
            });
        }
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ",
            data: error.data || null
        });
    }
};