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
    VERIFY EMAIL - 🔴 ĐÃ SỬA: TRẢ VỀ HTML THAY VÌ JSON
=========================================================*/

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        const result = await AuthService.verifyEmail(token);
        
        // 🔴 TRẢ VỀ HTML THÀNH CÔNG
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Xác thực email thành công</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        padding: 50px 40px;
                        border-radius: 16px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        text-align: center;
                        max-width: 500px;
                        width: 100%;
                        animation: fadeIn 0.5s ease;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .icon { font-size: 72px; margin-bottom: 20px; }
                    h1 { color: #28a745; margin-bottom: 10px; font-size: 28px; }
                    p { color: #555; line-height: 1.8; margin-bottom: 20px; font-size: 16px; }
                    .btn {
                        display: inline-block;
                        padding: 14px 48px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }
                    .countdown {
                        font-size: 14px;
                        color: #999;
                        margin-top: 20px;
                    }
                    .countdown span {
                        color: #667eea;
                        font-weight: 700;
                        font-size: 18px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">✅</div>
                    <h1>Xác thực thành công!</h1>
                    <p>Email của bạn đã được xác thực thành công.<br>Bạn có thể đăng nhập ngay bây giờ.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="btn">Đăng nhập ngay</a>
                    <p class="countdown">Tự động chuyển đến trang đăng nhập sau <span id="countdown">5</span> giây...</p>
                </div>
                <script>
                    let seconds = 5;
                    const countdownEl = document.getElementById('countdown');
                    const interval = setInterval(() => {
                        seconds--;
                        if (seconds <= 0) {
                            clearInterval(interval);
                            window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:3000'}/login';
                        } else {
                            countdownEl.textContent = seconds;
                        }
                    }, 1000);
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error("Verify Email Error:", error);
        
        // 🔴 TRẢ VỀ HTML LỖI
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Xác thực thất bại</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        padding: 50px 40px;
                        border-radius: 16px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        text-align: center;
                        max-width: 500px;
                        width: 100%;
                        animation: fadeIn 0.5s ease;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .icon { font-size: 72px; margin-bottom: 20px; }
                    h1 { color: #dc3545; margin-bottom: 10px; font-size: 28px; }
                    p { color: #555; line-height: 1.8; margin-bottom: 20px; font-size: 16px; }
                    .btn-group { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
                    .btn {
                        display: inline-block;
                        padding: 14px 32px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 15px;
                        transition: transform 0.2s;
                    }
                    .btn-primary {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .btn-primary:hover { transform: translateY(-2px); }
                    .btn-danger {
                        background: #dc3545;
                        color: white;
                    }
                    .btn-danger:hover { transform: translateY(-2px); }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">❌</div>
                    <h1>Xác thực thất bại</h1>
                    <p>${error.message || 'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực.'}</p>
                    <div class="btn-group">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/resend-verification" class="btn btn-primary">Gửi lại email</a>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="btn btn-danger">Quay lại đăng nhập</a>
                    </div>
                </div>
            </body>
            </html>
        `);
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