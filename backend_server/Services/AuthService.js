/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const Password = require("../utils/Password");
const Otp = require("../utils/Otp");

const UserRepository = require("../Repositories/UserRepository");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");
const OtpRepository = require("../Repositories/OtpRepository");

const MailService = require("./MailServiceTicket");
const RedisService = require("./RedisService");

/*=========================================================
    REGEX
=========================================================*/

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{4,20}$/;

/*=========================================================
    PRIVATE METHODS
=========================================================*/

/*=========================================================
    VALIDATE REGISTER
=========================================================*/

const validateRegister = (data) => {
    const { username, full_name, phone, email, password } = data;

    if (!username?.trim()) {
        throw { statusCode: 400, field: "username", message: "Tên đăng nhập không được để trống" };
    }
    if (username.trim().length < 4) {
        throw { statusCode: 400, field: "username", message: "Tên đăng nhập phải từ 4 ký tự" };
    }
    if (!USERNAME_REGEX.test(username)) {
        throw { statusCode: 400, field: "username", message: "Tên đăng nhập chỉ được chứa chữ, số, dấu gạch dưới và dấu chấm" };
    }

    if (!full_name?.trim()) {
        throw { statusCode: 400, field: "full_name", message: "Họ tên không được để trống" };
    }
    if (full_name.trim().length < 6) {
        throw { statusCode: 400, field: "full_name", message: "Họ tên phải từ 6 ký tự" };
    }

    if (!email?.trim()) {
        throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    }
    if (!EMAIL_REGEX.test(email)) {
        throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    }

    if (!phone?.trim()) {
        throw { statusCode: 400, field: "phone", message: "Số điện thoại không được để trống" };
    }
    if (!PHONE_REGEX.test(phone)) {
        throw { statusCode: 400, field: "phone", message: "Số điện thoại không hợp lệ (10 số)" };
    }

    if (!password?.trim()) {
        throw { statusCode: 400, field: "password", message: "Mật khẩu không được để trống" };
    }
    if (!Password.isStrong(password)) {
        throw {
            statusCode: 400,
            field: "password",
            message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
        };
    }
};

/*=========================================================
    VALIDATE LOGIN
=========================================================*/

const validateLogin = (email, password) => {
    if (!email?.trim()) {
        throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    }
    if (!EMAIL_REGEX.test(email)) {
        throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    }
    if (!password?.trim()) {
        throw { statusCode: 400, field: "password", message: "Mật khẩu không được để trống" };
    }
};

/*=========================================================
    GENERATE REFRESH EXPIRES
=========================================================*/

const generateRefreshExpires = () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + Number(process.env.REFRESH_TOKEN_DAYS || 7));
    return expires;
};

/*=========================================================
    PUBLIC METHODS
=========================================================*/

/*=========================================================
    REGISTER
=========================================================*/

exports.register = async (userData) => {
    validateRegister(userData);

    const { username, full_name, phone, address, email, password } = userData;

    // Check exists
    const existed = await UserRepository.exists(username, email, phone);
    if (existed) {
        if (existed.username === username) {
            throw { statusCode: 400, field: "username", message: "Tên đăng nhập đã tồn tại" };
        }
        if (existed.email === email) {
            throw { statusCode: 400, field: "email", message: "Email đã tồn tại" };
        }
        if (existed.phone === phone) {
            throw { statusCode: 400, field: "phone", message: "Số điện thoại đã tồn tại" };
        }
    }

    const hashedPassword = await Password.hash(password);

    const userId = await UserRepository.create({
        username,
        full_name,
        phone,
        address: address || "",
        email,
        password: hashedPassword,
        role: "customer"
    });

    // Log OTP
    await OtpRepository.create({
        email,
        purpose: "register",
        ip_address: null,
        user_agent: null
    });

    return {
        success: true,
        message: "Đăng ký thành công",
        userId
    };
};

/*=========================================================
    LOGIN
=========================================================*/

exports.login = async (email, password, req, res) => {
    validateLogin(email, password);

    // Find user
    const user = await UserRepository.findByEmail(email);
    if (!user) {
        throw { statusCode: 401, field: "email", message: "Email không tồn tại" };
    }

    // Check status
    if (user.status === "banned") {
        throw { statusCode: 403, message: "Tài khoản đã bị khóa" };
    }

    // Check password
    const matched = await Password.compare(password, user.password);
    if (!matched) {
        throw { statusCode: 401, field: "password", message: "Mật khẩu không đúng" };
    }

    // Generate tokens
    const accessToken = Jwt.generateAccessToken(user);
    const refreshToken = Jwt.generateRefreshToken(user);

    // Hash refresh token
    const tokenHash = Jwt.hashRefreshToken(refreshToken);
    const expiresAt = generateRefreshExpires();

    // Save refresh token to DB
    await RefreshTokenRepository.create({
        user_id: user.user_id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        ip_address: req?.ip || req?.connection?.remoteAddress || null,
        user_agent: req?.headers?.["user-agent"] || null,
        device_name: req?.headers?.["sec-ch-ua-platform"] || "Unknown Device"
    });

    // Update last login
    await UserRepository.updateLastLogin(
        user.user_id,
        req?.ip || req?.connection?.remoteAddress || null
    );

    // Set cookies
    Cookie.setAccessToken(res, accessToken);
    Cookie.setRefreshToken(res, refreshToken);

   return {
    success: true,
    message: "Đăng nhập thành công",
    user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        points: user.points,
        email_verified: user.email_verified || 0  // ✅ XỬ LÝ NULL
    },
    accessToken,
    refreshToken
};
};

/*=========================================================
    GET CURRENT USER
=========================================================*/

exports.getMe = async (userId) => {
    if (!userId) {
        throw { statusCode: 401, message: "Chưa đăng nhập" };
    }

    const user = await UserRepository.findProfile(userId);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    return {
        success: true,
        user
    };
};

/*=========================================================
    LOGOUT
=========================================================*/

exports.logout = async (req, res) => {
    const refreshToken = Cookie.getRefreshToken(req);

    if (refreshToken) {
        const tokenHash = Jwt.hashRefreshToken(refreshToken);
        await RefreshTokenRepository.revoke(tokenHash, "Logout");
    }

    Cookie.clearAuthCookies(res);

    return {
        success: true,
        message: "Đăng xuất thành công"
    };
};

/*=========================================================
    LOGOUT ALL DEVICES
=========================================================*/

exports.logoutAllDevices = async (userId, res) => {
    await RefreshTokenRepository.revokeByUser(userId, "Logout All Devices");
    Cookie.clearAuthCookies(res);

    return {
        success: true,
        message: "Đã đăng xuất tất cả thiết bị"
    };
};

/*=========================================================
    REFRESH TOKEN
=========================================================*/

exports.refreshToken = async (req, res) => {
    const refreshToken = Cookie.getRefreshToken(req);

    if (!refreshToken) {
        throw { statusCode: 401, message: "Refresh Token không tồn tại" };
    }

    // Verify JWT
    let payload;
    try {
        payload = Jwt.verifyRefreshToken(refreshToken);
    } catch (error) {
        Cookie.clearAuthCookies(res);
        throw { statusCode: 401, message: "Refresh Token đã hết hạn hoặc không hợp lệ" };
    }

    // Check token in database
    const tokenHash = Jwt.hashRefreshToken(refreshToken);
    const tokenData = await RefreshTokenRepository.findValidTokenHash(tokenHash);

    if (!tokenData) {
        Cookie.clearAuthCookies(res);
        throw { statusCode: 401, message: "Refresh Token không hợp lệ" };
    }

    // Find user
    const user = await UserRepository.findBasicById(payload.user_id);
    if (!user) {
        await RefreshTokenRepository.revoke(tokenHash, "User not found");
        Cookie.clearAuthCookies(res);
        throw { statusCode: 401, message: "Người dùng không tồn tại" };
    }

    // Check user status
    if (user.status === "banned") {
        await RefreshTokenRepository.revoke(tokenHash, "User banned");
        Cookie.clearAuthCookies(res);
        throw { statusCode: 403, message: "Tài khoản đã bị khóa" };
    }

    // Rotate tokens
    const newAccessToken = Jwt.generateAccessToken(user);
    const newRefreshToken = Jwt.generateRefreshToken(user);

    // Revoke old token
    await RefreshTokenRepository.revoke(tokenHash, "Rotated");

    // Save new token
    const newTokenHash = Jwt.hashRefreshToken(newRefreshToken);
    await RefreshTokenRepository.create({
        user_id: user.user_id,
        token_hash: newTokenHash,
        expires_at: generateRefreshExpires(),
        ip_address: req?.ip || req?.connection?.remoteAddress || null,
        user_agent: req?.headers?.["user-agent"] || null,
        device_name: req?.headers?.["sec-ch-ua-platform"] || "Unknown Device"
    });

    // Set new cookies
    Cookie.setAccessToken(res, newAccessToken);
    Cookie.setRefreshToken(res, newRefreshToken);

    return {
        success: true,
        message: "Refresh Token thành công",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};

/*=========================================================
    CHANGE PASSWORD
=========================================================*/

exports.changePassword = async (userId, passwordData) => {
    const { currentPassword, newPassword } = passwordData;

    if (!currentPassword?.trim()) {
        throw { statusCode: 400, field: "currentPassword", message: "Vui lòng nhập mật khẩu hiện tại" };
    }
    if (!newPassword?.trim()) {
        throw { statusCode: 400, field: "newPassword", message: "Vui lòng nhập mật khẩu mới" };
    }
    if (!Password.isStrong(newPassword)) {
        throw {
            statusCode: 400,
            field: "newPassword",
            message: "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt"
        };
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    const matched = await Password.compare(currentPassword, user.password);
    if (!matched) {
        throw { statusCode: 400, field: "currentPassword", message: "Mật khẩu hiện tại không đúng" };
    }

    const samePassword = await Password.compare(newPassword, user.password);
    if (samePassword) {
        throw { statusCode: 400, field: "newPassword", message: "Mật khẩu mới không được trùng mật khẩu cũ" };
    }

    const hashedPassword = await Password.hash(newPassword);
    await UserRepository.updatePassword(userId, hashedPassword);

    // Revoke all refresh tokens
    await RefreshTokenRepository.revokeByUser(userId, "Password changed");

    return {
        success: true,
        message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
    };
};

/*=========================================================
    FORGOT PASSWORD - SEND OTP (Dùng Redis)
=========================================================*/

exports.forgotPassword = async (email, req) => {
    if (!email?.trim()) {
        throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    }
    if (!EMAIL_REGEX.test(email)) {
        throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    }

    // Check user exists
    const user = await UserRepository.findByEmail(email);
    if (!user) {
        throw { statusCode: 404, field: "email", message: "Email không tồn tại" };
    }

    // Check rate limit (3 lần trong 1 phút)
    const rateLimit = await RedisService.checkRateLimit(email, "password-reset", 3, 60);
    if (!rateLimit.allowed) {
        throw { statusCode: 429, message: rateLimit.message };
    }

    // Check if OTP is locked (5 lần thử sai)
    const isLocked = await RedisService.isOTPLocked(email, "password-reset", 5);
    if (isLocked) {
        throw { statusCode: 429, message: "Tài khoản đã bị khóa do nhập sai OTP quá nhiều. Vui lòng thử lại sau 5 phút" };
    }

    // Generate OTP
    const otpCode = Otp.generate6();

    // Save OTP to Redis (TTL 5 phút)
    await RedisService.saveOTP(email, "password-reset", otpCode, 300);

    // Log to MySQL
    await OtpRepository.create({
        email,
        purpose: "password-reset",
        ip_address: req?.ip || req?.connection?.remoteAddress || null,
        user_agent: req?.headers?.["user-agent"] || null
    });

    // Send email
    await MailService.sendPasswordResetOTP(email, otpCode, user.full_name);

    return {
        success: true,
        message: "Mã OTP đã được gửi đến email của bạn",
        ...(process.env.NODE_ENV === "development" && { otp: otpCode })
    };
};

/*=========================================================
    VERIFY RESET OTP (Dùng Redis)
=========================================================*/

exports.verifyResetOTP = async (email, otp) => {
    if (!email?.trim()) {
        throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    }
    if (!EMAIL_REGEX.test(email)) {
        throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    }
    if (!Otp.isValidFormat(otp, 6)) {
        throw { statusCode: 400, field: "otp", message: "OTP phải là 6 chữ số" };
    }

    // Check if OTP is locked
    const isLocked = await RedisService.isOTPLocked(email, "password-reset", 5);
    if (isLocked) {
        throw { statusCode: 429, message: "Tài khoản đã bị khóa do nhập sai OTP quá nhiều. Vui lòng thử lại sau 5 phút" };
    }

    // Get OTP from Redis
    const savedOTP = await RedisService.getOTP(email, "password-reset");
    if (!savedOTP) {
        throw { statusCode: 404, message: "OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu lại" };
    }

    // Verify OTP
    if (savedOTP !== otp) {
        // Increment failed attempts
        const attempts = await RedisService.incrementOTPAttempts(email, "password-reset", 300);

        if (attempts >= 5) {
            throw { statusCode: 429, message: "Bạn đã nhập sai OTP quá 5 lần. Vui lòng thử lại sau 5 phút" };
        }

        throw { statusCode: 400, field: "otp", message: `OTP không chính xác. Còn ${5 - attempts} lần thử` };
    }

    // Delete OTP from Redis (dùng 1 lần)
    await RedisService.deleteOTP(email, "password-reset");

    // Find user
    const user = await UserRepository.findByEmail(email);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    // Generate reset token (JWT)
    const resetToken = Jwt.generateResetToken({
        user_id: user.user_id,
        email: email
    });

    return {
        success: true,
        message: "Xác thực OTP thành công",
        resetToken
    };
};

/*=========================================================
    RESET PASSWORD
=========================================================*/

exports.resetPassword = async (resetToken, newPassword) => {
    if (!resetToken) {
        throw { statusCode: 400, message: "Token không được để trống" };
    }
    if (!newPassword?.trim()) {
        throw { statusCode: 400, field: "newPassword", message: "Mật khẩu mới không được để trống" };
    }
    if (!Password.isStrong(newPassword)) {
        throw {
            statusCode: 400,
            field: "newPassword",
            message: "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt"
        };
    }

    // Verify reset token
    let payload;
    try {
        payload = Jwt.verifyResetToken(resetToken);
    } catch (error) {
        throw { statusCode: 401, message: "Token không hợp lệ hoặc đã hết hạn" };
    }

    // Find user
    const user = await UserRepository.findById(payload.user_id);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    // Check if new password same as old
    const samePassword = await Password.compare(newPassword, user.password);
    if (samePassword) {
        throw { statusCode: 400, field: "newPassword", message: "Mật khẩu mới không được trùng mật khẩu cũ" };
    }

    // Update password
    const hashedPassword = await Password.hash(newPassword);
    await UserRepository.updatePassword(user.user_id, hashedPassword);

    // Revoke all refresh tokens
    await RefreshTokenRepository.revokeByUser(user.user_id, "Password reset");

    // Log
    await OtpRepository.create({
        email: user.email,
        purpose: "password-reset-success",
        ip_address: null,
        user_agent: null
    });

    return {
        success: true,
        message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."
    };
};

/*=========================================================
    SEND VERIFICATION EMAIL
=========================================================*/

exports.sendVerificationEmail = async (email) => {
    if (!email?.trim()) {
        throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    }
    if (!EMAIL_REGEX.test(email)) {
        throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    if (user.email_verified) {
        throw { statusCode: 400, message: "Email đã được xác thực" };
    }

    // Generate verify token
    const verifyToken = Jwt.generateEmailVerifyToken({
        user_id: user.user_id,
        email: user.email
    });

    // Send email
    await MailService.sendEmailVerification(email, verifyToken, user.full_name);

    return {
        success: true,
        message: "Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư."
    };
};

/*=========================================================
    VERIFY EMAIL
=========================================================*/

exports.verifyEmail = async (verifyToken) => {
    if (!verifyToken) {
        throw { statusCode: 400, message: "Token không được để trống" };
    }

    let payload;
    try {
        payload = Jwt.verifyEmailVerifyToken(verifyToken);
    } catch (error) {
        throw { statusCode: 401, message: "Token không hợp lệ hoặc đã hết hạn" };
    }

    const user = await UserRepository.findById(payload.user_id);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    if (user.email_verified) {
        throw { statusCode: 400, message: "Email đã được xác thực" };
    }

    await UserRepository.updateEmailVerified(user.user_id, true);

    return {
        success: true,
        message: "Xác thực email thành công"
    };
};