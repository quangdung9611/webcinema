/*=========================================================
    DEPENDENCIES
=========================================================*/

const AuthService = require("../Services/AuthService");
const Cookie = require("../utils/Cookie"); // 👈 Thêm để set cookie

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
        // AuthService.login trả về { user, accessToken }
        const result = await AuthService.login(email, password);

        // Phân biệt role để set cookie
        if (result.user.role === 'admin') {
            Cookie.setAdminAccessToken(res, result.accessToken, rememberMe);
        } else {
            Cookie.setUserAccessToken(res, result.accessToken, rememberMe);
        }

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data: {
                user: result.user,
                accessToken: result.accessToken // Có thể trả về token nếu cần
            }
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
        const result = await AuthService.login(email, password);

        // Kiểm tra role phải là admin
        if (result.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Tài khoản không có quyền quản trị."
            });
        }

        // Set admin_token
        Cookie.setAdminAccessToken(res, result.accessToken, rememberMe);

        return res.status(200).json({
            success: true,
            message: "Đăng nhập admin thành công",
            data: {
                user: result.user,
                accessToken: result.accessToken
            }
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
        const result = await AuthService.refreshToken(req, res); // Service trả về { user, accessToken }

        // Set cookie mới theo role
        if (result.user.role === 'admin') {
            Cookie.setAdminAccessToken(res, result.accessToken, false);
        } else {
            Cookie.setUserAccessToken(res, result.accessToken, false);
        }

        return res.status(200).json({
            success: true,
            data: { accessToken: result.accessToken }
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
        // Xóa cookie dựa trên role của user hiện tại
        if (req.user.role === 'admin') {
            Cookie.clearAdminCookies(res);
        } else {
            Cookie.clearUserCookies(res);
        }

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
        // Xóa cookie tương ứng
        if (req.user.role === 'admin') {
            Cookie.clearAdminCookies(res);
        } else {
            Cookie.clearUserCookies(res);
        }
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