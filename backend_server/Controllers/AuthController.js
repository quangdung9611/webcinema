/*=========================================================
    DEPENDENCIES
=========================================================*/

const AuthService = require("../Services/AuthService");
const Cookie = require("../utils/Cookie"); // 🔥 THÊM: Để đọc cookie
const Jwt = require("../utils/Jwt"); // 🔥 THÊM: Để verify token
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository"); // 🔥 THÊM: Để check token trong DB
const UserRepository = require("../Repositories/UserRepository"); // 🔥 THÊM: Để check user

/*=========================================================
    REGISTER
=========================================================*/

exports.register = async (req, res) => {
    try {
        const result = await AuthService.register(req.body);
        return res.status(201).json(result);
    } catch (error) {
        console.error("Register Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ"
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
            field: error.field || null,
            message: error.message || "Lỗi máy chủ"
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
            return res.status(403).json({
                success: false,
                message: "Tài khoản không có quyền quản trị."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Đăng nhập admin thành công",
            user: result.user
        });
    } catch (error) {
        console.error("Admin Login Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    GET ME
=========================================================*/

exports.getMe = async (req, res) => {
    try {
        const result = await AuthService.getMe(req.user.user_id);
        return res.status(200).json(result);
    } catch (error) {
        console.error("GetMe Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    REFRESH TOKEN
=========================================================*/

exports.refreshToken = async (req, res) => {
    try {
        // TODO: Implement AuthService.refreshToken(req, res)
        return res.status(501).json({
            success: false,
            message: "Chức năng refresh token đang phát triển"
        });
    } catch (error) {
        console.error("Refresh Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
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
            message: error.message || "Lỗi máy chủ"
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
            message: error.message || "Lỗi máy chủ"
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
            message: error.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    FORGOT PASSWORD - SEND OTP
=========================================================*/

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await AuthService.forgotPassword(email, req);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Forgot Password Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ"
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
            message: error.message || "Lỗi máy chủ"
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
            message: error.message || "Lỗi máy chủ"
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
        return res.status(error.statusCode || 500).json({
            success: false,
            field: error.field || null,
            message: error.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    VERIFY EMAIL - ĐÃ SỬA: TRẢ VỀ JSON
=========================================================*/

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        
        // ✅ Kiểm tra token
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token xác thực không hợp lệ"
            });
        }
        
        const result = await AuthService.verifyEmail(token);
        
        // ✅ Trả về JSON để Frontend xử lý
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
    🟢 THÊM MỚI: CHECK SESSION NHANH (KHÔNG LOAD FULL USER)
=========================================================*/

exports.checkSession = async (req, res) => {
    try {
        // Lấy token từ cookie (ưu tiên user_token, sau đó admin_token)
        let token = Cookie.getUserAccessToken(req);
        
        if (!token) {
            token = Cookie.getAdminAccessToken(req);
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                valid: false,
                code: "NO_TOKEN",
                message: "Không tìm thấy phiên đăng nhập"
            });
        }

        // Verify token
        let payload;
        try {
            payload = Jwt.verifyAccessToken(token);
        } catch (error) {
            // Token hết hạn
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    valid: false,
                    code: "TOKEN_EXPIRED",
                    message: "Phiên đăng nhập đã hết hạn"
                });
            }
            // Token không hợp lệ
            return res.status(401).json({
                success: false,
                valid: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ"
            });
        }

        if (!payload) {
            return res.status(401).json({
                success: false,
                valid: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ"
            });
        }

        // Kiểm tra token trong DB (có bị revoke không)
        const tokenHash = Jwt.hashRefreshToken(token);
        const validToken = await RefreshTokenRepository.findValidTokenHash(tokenHash);

        if (!validToken) {
            return res.status(401).json({
                success: false,
                valid: false,
                code: "SESSION_EXPIRED",
                message: "Phiên đăng nhập đã bị vô hiệu hóa. Vui lòng đăng nhập lại."
            });
        }

        // Kiểm tra user có tồn tại và không bị ban
        const user = await UserRepository.findById(payload.user_id);
        if (!user) {
            return res.status(401).json({
                success: false,
                valid: false,
                code: "USER_NOT_FOUND",
                message: "Người dùng không tồn tại"
            });
        }

        if (user.status === "banned") {
            return res.status(403).json({
                success: false,
                valid: false,
                code: "ACCOUNT_BANNED",
                message: "Tài khoản đã bị khóa"
            });
        }

        // ✅ Session hợp lệ - Trả về minimal data
        return res.status(200).json({
            success: true,
            valid: true,
            user_id: payload.user_id,
            role: payload.role,
            email_verified: user.email_verified || 0,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Check session error:", error);
        return res.status(500).json({
            success: false,
            valid: false,
            code: "SERVER_ERROR",
            message: "Lỗi máy chủ. Vui lòng thử lại sau."
        });
    }
};

/*=========================================================
    🟢 THÊM MỚI: LẤY DANH SÁCH THIẾT BỊ ĐANG ĐĂNG NHẬP
=========================================================*/

exports.getDevices = async (req, res) => {
    try {
        const result = await AuthService.getActiveDevices(req.user.user_id);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Get Devices Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });
    }
};

/*=========================================================
    🟢 THÊM MỚI: REVOKE 1 THIẾT BỊ CỤ THỂ
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
            message: error.message || "Lỗi máy chủ"
        });
    }
};