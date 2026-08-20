/*=========================================================
    DEPENDENCIES
=========================================================*/

const AuthService = require("../Services/AuthService");

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
    ✅ SỬA: GỌI SERVICE VỚI ĐẦY ĐỦ THAM SỐ, KHÔNG SET COOKIE THỦ CÔNG
=========================================================*/

exports.login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        // Service tự động set cookie user_token hoặc admin_token
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
    ✅ SỬA: DÙNG CHUNG SERVICE, KIỂM TRA ROLE SAU KHI LOGIN
=========================================================*/

exports.adminLogin = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        // Service tự động set cookie admin_token
        const result = await AuthService.login(email, password, rememberMe, req, res);

        // Kiểm tra role (dự phòng, service đã check, nhưng vẫn giữ)
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
    ⚠️ Tạm thời giữ nguyên (cần implement service refreshToken sau)
=========================================================*/

exports.refreshToken = async (req, res) => {
    try {
        // TODO: Implement AuthService.refreshToken(req, res)
        // Hiện tại trả về lỗi 501 (Not Implemented)
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
    ✅ SỬA: GỌI SERVICE XỬ LÝ XÓA COOKIE
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
    ✅ SỬA: GỌI SERVICE XỬ LÝ XÓA COOKIE
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
    VERIFY EMAIL
=========================================================*/

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        const result = await AuthService.verifyEmail(token);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Verify Email Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi máy chủ"
        });
    }
};