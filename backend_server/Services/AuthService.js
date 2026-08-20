/*=========================================================
    DEPENDENCIES
=========================================================*/
const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const Password = require("../utils/Password");
const Otp = require("../utils/Otp");
const crypto = require("crypto");

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
const validateRegister = (data) => {
    const { username, full_name, phone, email, password } = data;

    if (!username?.trim()) throw { statusCode: 400, field: "username", message: "Tên đăng nhập không được để trống" };
    if (username.trim().length < 4) throw { statusCode: 400, field: "username", message: "Tên đăng nhập phải từ 4 ký tự" };
    if (!USERNAME_REGEX.test(username)) throw { statusCode: 400, field: "username", message: "Tên đăng nhập chỉ được chứa chữ, số, dấu gạch dưới và dấu chấm" };

    if (!full_name?.trim()) throw { statusCode: 400, field: "full_name", message: "Họ tên không được để trống" };
    if (full_name.trim().length < 6) throw { statusCode: 400, field: "full_name", message: "Họ tên phải từ 6 ký tự" };

    if (!email?.trim()) throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };

    if (!phone?.trim()) throw { statusCode: 400, field: "phone", message: "Số điện thoại không được để trống" };
    if (!PHONE_REGEX.test(phone)) throw { statusCode: 400, field: "phone", message: "Số điện thoại không hợp lệ (10 số)" };

    if (!password?.trim()) throw { statusCode: 400, field: "password", message: "Mật khẩu không được để trống" };
    if (!Password.isStrong(password)) {
        throw { statusCode: 400, field: "password", message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt" };
    }
};

const validateLogin = (email, password) => {
    if (!email?.trim()) throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    if (!password?.trim()) throw { statusCode: 400, field: "password", message: "Mật khẩu không được để trống" };
};

const generateAndSetTokens = async (user, req, res, rememberMe = false) => {
    const accessToken = Jwt.generateAccessToken(user);
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.headers?.["user-agent"] || "Unknown";
    const deviceName = req?.headers?.["device-name"] || "Unknown";
    
    await RefreshTokenRepository.create({
        user_id: user.user_id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ip_address: ipAddress,
        user_agent: userAgent,
        device_name: deviceName
    });
    
    if (user.role === "admin") {
        Cookie.setAdminAccessToken(res, accessToken, rememberMe);
    } else {
        Cookie.setUserAccessToken(res, accessToken, rememberMe);
    }
    Cookie.setRefreshToken(res, refreshToken, rememberMe);
    
    return { accessToken, refreshToken };
};

/*=========================================================
    PUBLIC METHODS
=========================================================*/
exports.register = async (userData) => {
    validateRegister(userData);
    const { username, full_name, phone, address, email, password } = userData;

    const existed = await UserRepository.exists(username, email, phone);
    if (existed) {
        if (existed.username === username) throw { statusCode: 400, field: "username", message: "Tên đăng nhập đã tồn tại" };
        if (existed.email === email) throw { statusCode: 400, field: "email", message: "Email đã tồn tại" };
        if (existed.phone === phone) throw { statusCode: 400, field: "phone", message: "Số điện thoại đã tồn tại" };
    }

    const hashedPassword = await Password.hash(password);
    const userId = await UserRepository.create({
        username, full_name, phone, address: address || "", email,
        password: hashedPassword, role: "customer"
    });

    await OtpRepository.create({ email, purpose: "register", ip_address: null, user_agent: null });

    try {
        const verifyToken = Jwt.generateEmailVerifyToken({ user_id: userId, email: email });
        await MailService.sendEmailVerification(email, verifyToken, full_name);
    } catch (error) {
        console.error("Không thể gửi email xác thực:", error.message);
    }

    return { success: true, message: "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.", userId };
};

/*=========================================================
    LOGIN (CHÍNH - ĐÃ SỬA THEO YÊU CẦU)
=========================================================*/
exports.login = async (email, password, rememberMe = false, req, res) => {
    validateLogin(email, password);
    const user = await UserRepository.findByEmail(email);
    if (!user) throw { statusCode: 401, field: "email", message: "Email không tồn tại" };
    if (user.status === "banned") throw { statusCode: 403, message: "Tài khoản đã bị khóa" };

    const matched = await Password.compare(password, user.password);
    if (!matched) throw { statusCode: 401, field: "password", message: "Mật khẩu không đúng" };

    // ✅ QUAN TRỌNG: Kiểm tra xem có thiết bị nào đang đăng nhập không
    const activeTokens = await RefreshTokenRepository.getActiveByUser(user.user_id);
    if (activeTokens && activeTokens.length > 0) {
        throw { 
            statusCode: 409, // Conflict
            field: null,
            message: "Tài khoản của bạn đang đăng nhập trên thiết bị khác. Vui lòng đăng xuất thiết bị đó trước."
        };
    }

    // Nếu không có thiết bị nào đang online, mới tạo token mới
    await generateAndSetTokens(user, req, res, rememberMe);
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    await UserRepository.updateLastLogin(user.user_id, ipAddress);

    return {
        success: true, message: "Đăng nhập thành công",
        user: {
            user_id: user.user_id, username: user.username, full_name: user.full_name,
            email: user.email, phone: user.phone, role: user.role,
            points: user.points, email_verified: user.email_verified || 0
        }
    };
};

exports.getMe = async (userId) => {
    if (!userId) throw { statusCode: 401, message: "Chưa đăng nhập" };
    const user = await UserRepository.findProfile(userId);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    return { success: true, user };
};

exports.refreshToken = async (req, res) => {
    const refreshToken = Cookie.getRefreshToken(req);
    if (!refreshToken) throw { statusCode: 400, message: "Cần refresh token" };
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const tokenData = await RefreshTokenRepository.findValidTokenHash(tokenHash);
    if (!tokenData) throw { statusCode: 401, message: "Refresh token không hợp lệ hoặc đã hết hạn" };
    const user = await UserRepository.findById(tokenData.user_id);
    if (!user || user.status === "banned") throw { statusCode: 401, message: "User không tồn tại hoặc đã bị khóa" };
    const newAccessToken = Jwt.generateAccessToken({ user_id: user.user_id, email: user.email, role: user.role });
    await RefreshTokenRepository.updateUsage(tokenHash);
    if (user.role === "admin") {
        Cookie.setAdminAccessToken(res, newAccessToken, false);
    } else {
        Cookie.setUserAccessToken(res, newAccessToken, false);
    }
    return { success: true, message: "Refresh token thành công" };
};

exports.logout = async (req, res) => {
    const refreshToken = Cookie.getRefreshToken(req);
    if (refreshToken) {
        const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        await RefreshTokenRepository.revoke(tokenHash, "Logout");
    }
    Cookie.clearAllCookies(res);
    return { success: true, message: "Đăng xuất thành công" };
};

exports.logoutAllDevices = async (userId, res) => {
    await RefreshTokenRepository.revokeByUser(userId, "Logout All Devices");
    Cookie.clearAllCookies(res);
    return { success: true, message: "Đã đăng xuất tất cả thiết bị" };
};

exports.changePassword = async (userId, passwordData) => {
    const { currentPassword, newPassword } = passwordData;
    if (!currentPassword?.trim()) throw { statusCode: 400, field: "currentPassword", message: "Vui lòng nhập mật khẩu hiện tại" };
    if (!newPassword?.trim()) throw { statusCode: 400, field: "newPassword", message: "Vui lòng nhập mật khẩu mới" };
    if (!Password.isStrong(newPassword)) throw { statusCode: 400, field: "newPassword", message: "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt" };

    const user = await UserRepository.findById(userId);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    const matched = await Password.compare(currentPassword, user.password);
    if (!matched) throw { statusCode: 400, field: "currentPassword", message: "Mật khẩu hiện tại không đúng" };
    const samePassword = await Password.compare(newPassword, user.password);
    if (samePassword) throw { statusCode: 400, field: "newPassword", message: "Mật khẩu mới không được trùng mật khẩu cũ" };

    const hashedPassword = await Password.hash(newPassword);
    await UserRepository.updatePassword(userId, hashedPassword);
    await RefreshTokenRepository.revokeByUser(userId, "Đổi mật khẩu");

    return { success: true, message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." };
};

exports.forgotPassword = async (email, req) => {
    if (!email?.trim()) throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    const user = await UserRepository.findByEmail(email);
    if (!user) throw { statusCode: 404, field: "email", message: "Email không tồn tại" };

    const rateLimit = await RedisService.checkRateLimit(email, "password-reset", 3, 60);
    if (!rateLimit.allowed) throw { statusCode: 429, message: rateLimit.message };
    const isLocked = await RedisService.isOTPLocked(email, "password-reset", 5);
    if (isLocked) throw { statusCode: 429, message: "Tài khoản đã bị khóa do nhập sai OTP quá nhiều. Vui lòng thử lại sau 5 phút" };

    const otpCode = Otp.generate6();
    await RedisService.saveOTP(email, "password-reset", otpCode, 300);
    await OtpRepository.create({ email, purpose: "password-reset", ip_address: req?.ip || req?.connection?.remoteAddress || null, user_agent: req?.headers?.["user-agent"] || null });
    await MailService.sendPasswordResetOTP(email, otpCode, user.full_name);

    return { success: true, message: "Mã OTP đã được gửi đến email của bạn", ...(process.env.NODE_ENV === "development" && { otp: otpCode }) };
};

exports.verifyResetOTP = async (email, otp) => {
    if (!email?.trim()) throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    if (!Otp.isValidFormat(otp, 6)) throw { statusCode: 400, field: "otp", message: "OTP phải là 6 chữ số" };
    const isLocked = await RedisService.isOTPLocked(email, "password-reset", 5);
    if (isLocked) throw { statusCode: 429, message: "Tài khoản đã bị khóa do nhập sai OTP quá nhiều. Vui lòng thử lại sau 5 phút" };
    const savedOTP = await RedisService.getOTP(email, "password-reset");
    if (!savedOTP) throw { statusCode: 404, message: "OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu lại" };
    if (savedOTP !== otp) {
        const attempts = await RedisService.incrementOTPAttempts(email, "password-reset", 300);
        if (attempts >= 5) throw { statusCode: 429, message: "Bạn đã nhập sai OTP quá 5 lần. Vui lòng thử lại sau 5 phút" };
        throw { statusCode: 400, field: "otp", message: `OTP không chính xác. Còn ${5 - attempts} lần thử` };
    }
    await RedisService.deleteOTP(email, "password-reset");
    const user = await UserRepository.findByEmail(email);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    const resetToken = Jwt.generateResetToken({ user_id: user.user_id, email: email });
    return { success: true, message: "Xác thực OTP thành công", resetToken };
};

exports.resetPassword = async (resetToken, newPassword) => {
    if (!resetToken) throw { statusCode: 400, message: "Token không được để trống" };
    if (!newPassword?.trim()) throw { statusCode: 400, field: "newPassword", message: "Mật khẩu mới không được để trống" };
    if (!Password.isStrong(newPassword)) throw { statusCode: 400, field: "newPassword", message: "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt" };
    let payload;
    try { payload = Jwt.verifyResetToken(resetToken); } catch (error) { throw { statusCode: 401, message: "Token không hợp lệ hoặc đã hết hạn" }; }
    const user = await UserRepository.findById(payload.user_id);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    const samePassword = await Password.compare(newPassword, user.password);
    if (samePassword) throw { statusCode: 400, field: "newPassword", message: "Mật khẩu mới không được trùng mật khẩu cũ" };
    const hashedPassword = await Password.hash(newPassword);
    await UserRepository.updatePassword(user.user_id, hashedPassword);
    await RefreshTokenRepository.revokeByUser(user.user_id, "Reset mật khẩu");
    await OtpRepository.create({ email: user.email, purpose: "password-reset-success", ip_address: null, user_agent: null });
    return { success: true, message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." };
};

exports.sendVerificationEmail = async (email) => {
    if (!email?.trim()) throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };
    const user = await UserRepository.findByEmail(email);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    if (user.email_verified) throw { statusCode: 400, message: "Email đã được xác thực" };
    const verifyToken = Jwt.generateEmailVerifyToken({ user_id: user.user_id, email: user.email });
    await MailService.sendEmailVerification(email, verifyToken, user.full_name);
    return { success: true, message: "Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư." };
};

exports.verifyEmail = async (verifyToken) => {
    if (!verifyToken) throw { statusCode: 400, message: "Token không được để trống" };
    let payload;
    try { payload = Jwt.verifyEmailVerifyToken(verifyToken); } catch (error) { throw { statusCode: 401, message: "Token không hợp lệ hoặc đã hết hạn" }; }
    const user = await UserRepository.findById(payload.user_id);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    if (user.email_verified) throw { statusCode: 400, message: "Email đã được xác thực" };
    await UserRepository.updateEmailVerified(user.user_id, true);
    return { success: true, message: "Xác thực email thành công" };
};