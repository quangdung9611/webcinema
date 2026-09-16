const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const Password = require("../utils/Password");
const UserRepository = require("../Repositories/UserRepository");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");
const MailService = require("./MailService");
const CacheService = require("./CacheService");
const OtpService = require("./OtpService");

// ============================================================
// SOCKET INSTANCE
// ============================================================
let ioInstance = null;

const setIO = (io) => {
    ioInstance = io;
    console.log('✅ [AUTH] Socket.IO instance set successfully');
};

// ============================================================
// CONSTANTS
// ============================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ✅ URL RIÊNG CHO TỪNG PHÍA
const USER_FRONTEND_URL  = process.env.USER_FRONTEND_URL  || 'https://quangdungcinema.id.vn';
const ADMIN_FRONTEND_URL = process.env.ADMIN_FRONTEND_URL || 'https://admin.quangdungcinema.id.vn';

// ✅ Helper chọn URL theo role
const getFrontendUrlByRole = (role) => {
    return role === 'admin' ? ADMIN_FRONTEND_URL : USER_FRONTEND_URL;
};

// ✅ SỐ THIẾT BỊ TỐI ĐA
const MAX_DEVICES_ADMIN = 1;
const MAX_DEVICES_CUSTOMER = 1;

// ============================================================
// VALIDATE LOGIN
// ============================================================
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

// ============================================================
// GENERATE ACCESS TOKEN
// ============================================================
const generateAndSetTokens = (user, res, rememberMe = false) => {
    const accessToken = Jwt.generateAccessToken(user);
    if (user.role === "admin") {
        Cookie.setAdminAccessToken(res, accessToken, rememberMe);
    } else {
        Cookie.setUserAccessToken(res, accessToken, rememberMe);
    }
    return accessToken;
};

// ============================================================
// CHECK LOCK STATUS
// ============================================================
exports.checkLockStatus = async (email) => {
    if (!email) throw { statusCode: 400, message: "Thiếu email" };
    const lockInfo = await CacheService.getLockoutInfo(email);
    if (lockInfo && lockInfo.isLocked) {
        return {
            success: true,
            isLocked: true,
            data: {
                level: lockInfo.level,
                remainingSeconds: lockInfo.remainingSeconds,
                lockDuration: lockInfo.lockDuration,
                lockDurationText: lockInfo.lockDurationText,
                maxAttempts: lockInfo.maxAttempts,
                lockedUntil: lockInfo.lockedUntil,
                message: `Tài khoản đã bị khóa ${lockInfo.lockDurationText}. Vui lòng thử lại sau.`
            }
        };
    }
    return { success: true, isLocked: false, data: null };
};

// ============================================================
// LOGIN — ✅ HỖ TRỢ expectedRole ĐỂ CHẶN SAI CỔNG
// ============================================================
/**
 * @param {string} email
 * @param {string} password
 * @param {boolean} rememberMe
 * @param {Request} req
 * @param {Response} res
 * @param {'admin'|'customer'|null} expectedRole - Nếu truyền vào, sẽ chặn login sai role
 */
exports.login = async (email, password, rememberMe = false, req, res, expectedRole = null) => {
    validateLogin(email, password);
    
    // CHECK RATE LIMIT
    const loginRateLimit = await CacheService.checkRateLimit(email, "login", 5, 60);
    if (!loginRateLimit.allowed) {
        throw {
            statusCode: 429,
            code: 'LOGIN_LIMIT',
            message: `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${loginRateLimit.remainingSeconds || 60} giây.`,
            data: { remainingSeconds: loginRateLimit.remainingSeconds || 60 }
        };
    }

    // CHECK LOCK
    const lockInfo = await CacheService.getLockoutInfo(email);
    if (lockInfo && lockInfo.isLocked) {
        throw {
            statusCode: 429,
            code: 'ACCOUNT_LOCKED',
            message: `Tài khoản đã bị khóa ${lockInfo.lockDurationText}. Vui lòng thử lại sau.`,
            data: {
                level: lockInfo.level,
                remainingSeconds: lockInfo.remainingSeconds,
                lockDuration: lockInfo.lockDuration,
                lockDurationText: lockInfo.lockDurationText,
                maxAttempts: lockInfo.maxAttempts,
                lockedUntil: lockInfo.lockedUntil
            }
        };
    }

    // FIND USER
    const user = await UserRepository.findByEmail(email);
    if (!user) {
        const attempts = await CacheService.incrementLoginAttempts(email);
        if (attempts >= 5) {
            const newLevel = await CacheService.incrementLockoutLevel(email);
            const { duration, text } = CacheService.getLockDuration(newLevel);
            throw {
                statusCode: 429,
                code: 'ACCOUNT_LOCKED',
                message: `Bạn đã nhập sai quá 5 lần. Tài khoản đã bị khóa ${text}.`,
                data: {
                    level: newLevel,
                    remainingSeconds: duration,
                    lockDuration: duration,
                    lockDurationText: text,
                    maxAttempts: 5,
                    lockedUntil: Date.now() + duration * 1000
                }
            };
        }
        throw {
            statusCode: 401,
            message: `Email hoặc mật khẩu không đúng. Bạn còn ${5 - attempts} lần thử.`
        };
    }

    // CHECK PASSWORD
    const matched = await Password.compare(password, user.password);
    if (!matched) {
        const attempts = await CacheService.incrementLoginAttempts(email);
        if (attempts >= 5) {
            const newLevel = await CacheService.incrementLockoutLevel(email);
            const { duration, text } = CacheService.getLockDuration(newLevel);
            throw {
                statusCode: 429,
                code: 'ACCOUNT_LOCKED',
                message: `Bạn đã nhập sai quá 5 lần. Tài khoản đã bị khóa ${text}.`,
                data: {
                    level: newLevel,
                    remainingSeconds: duration,
                    lockDuration: duration,
                    lockDurationText: text,
                    maxAttempts: 5,
                    lockedUntil: Date.now() + duration * 1000
                }
            };
        }
        throw {
            statusCode: 401,
            message: `Email hoặc mật khẩu không đúng. Bạn còn ${5 - attempts} lần thử.`
        };
    }

    // ✅ CHECK ROLE NGAY SAU KHI XÁC THỰC PASSWORD — TRƯỚC KHI TẠO TOKEN
    if (expectedRole && user.role !== expectedRole) {
        throw {
            statusCode: 403,
            code: 'WRONG_PORTAL',
            message: expectedRole === 'admin'
                ? "Tài khoản này không có quyền truy cập trang quản trị."
                : "Tài khoản quản trị vui lòng đăng nhập tại cổng admin."
        };
    }

    // CHECK EMAIL VERIFIED
    await CacheService.resetLoginAttempts(email);
    if (!user.email_verified) {
        throw {
            statusCode: 403,
            field: "email",
            message: "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn."
        };
    }

    // ========================================================
    // ✅ QUẢN LÝ THIẾT BỊ — PHÂN BIỆT ADMIN / USER
    // ========================================================
    const maxDevices = user.role === 'admin' 
        ? MAX_DEVICES_ADMIN 
        : MAX_DEVICES_CUSTOMER;

    const activeTokens = await RefreshTokenRepository.getActiveByUser(user.user_id);

    console.log(`📊 [LOGIN] Role: ${user.role} | Active devices: ${activeTokens.length}/${maxDevices}`);

    if (activeTokens.length >= maxDevices) {
        // ✅ FIX: Sort ổn định — tránh bug trùng created_at
        const sorted = [...activeTokens].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.token_id - b.token_id;
        });

        const oldestToken = sorted[0]; // ✅ Lấy cũ nhất (đầu mảng sau sort ASC)

        if (oldestToken) {
            const reason = user.role === 'admin'
                ? `Vượt quá ${maxDevices} thiết bị admin`
                : "Đăng nhập từ thiết bị khác";

            await RefreshTokenRepository.revoke(oldestToken.token_hash, reason);

            console.log(`🔄 [REVOKE] Revoke token cũ nhất | token_id=${oldestToken.token_id} | role=${user.role} | Lý do: ${reason}`);

            // ✅ FIX: Lấy socket_id CŨ và emit CHỈ CHO SOCKET ĐÓ
            const oldSocketId = await CacheService.getUserSocket(user.user_id);
            
            console.log(`📌 [SOCKET] Old socket_id của user ${user.user_id}: ${oldSocketId}`);

            if (ioInstance && user.user_id && oldSocketId) {
                ioInstance.to(oldSocketId).emit('session_expired', {
                    code: 'SESSION_REPLACED',
                    // ✅ FIX: Dùng CÙNG message cho cả admin + user
                    message: 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.',
                    newDevice: {
                        ip: req.ip || req.connection?.remoteAddress || 'Unknown',
                        userAgent: req.headers?.['user-agent']?.substring(0, 100) || 'Unknown'
                    },
                    timestamp: new Date().toISOString()
                });

                console.log(`📤 [SOCKET] session_expired sent to OLD socket: ${oldSocketId}`);

                // ✅ XÓA socket cũ khỏi cache SAU KHI emit
                await CacheService.deleteUserSocket(user.user_id);
            } else {
                console.warn(`⚠️ [SOCKET] Không có oldSocketId để emit session_expired`);
            }
        }
    } else {
        console.log(`✅ [LOGIN] ${user.role} login OK — device ${activeTokens.length + 1}/${maxDevices} (không revoke)`);
    }

    // TẠO TOKEN MỚI
    const accessToken = generateAndSetTokens(user, res, rememberMe);
    const accessTokenHash = Jwt.hashRefreshToken(accessToken);

    await RefreshTokenRepository.create({
        user_id: user.user_id,
        token_hash: accessTokenHash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers?.["user-agent"] || null,
        device_name: req.headers?.["user-agent"]?.substring(0, 50) || "Unknown Device"
    });

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
            email_verified: user.email_verified
        }
    };
};

// ============================================================
// GET ME
// ============================================================
exports.getMe = async (userId) => {
    if (!userId) throw { statusCode: 401, message: "Chưa đăng nhập" };
    const user = await UserRepository.findProfile(userId);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    return { success: true, user };
};

// ============================================================
// LOGOUT
// ============================================================
exports.logout = async (req, res) => {
    let token = Cookie.getAdminAccessToken(req);
    if (token) {
        Cookie.clearAdminCookies(res);
    } else {
        token = Cookie.getUserAccessToken(req);
        if (token) Cookie.clearUserCookies(res);
    }
    
    if (token) {
        const tokenHash = Jwt.hashRefreshToken(token);
        const deleted = await RefreshTokenRepository.deleteByTokenHash(tokenHash);
        console.log(`🗑️ [LOGOUT] Đã xóa ${deleted} token khỏi DB`);
    }
    
    try {
        if (req.user?.user_id) await CacheService.deleteUserSocket(req.user.user_id);
    } catch (error) {
        console.error('❌ [LOGOUT] Lỗi khi xóa socket:', error.message);
    }
    
    return { success: true, message: "Đăng xuất thành công" };
};

// ============================================================
// LOGOUT ALL DEVICES
// ============================================================
exports.logoutAllDevices = async (userId, res) => {
    const deleted = await RefreshTokenRepository.deleteAllByUser(userId);
    console.log(`🗑️ [LOGOUT_ALL] Đã xóa ${deleted} token của user ${userId}`);
    
    try {
        await CacheService.deleteUserSocket(userId);
    } catch (error) {
        console.error('❌ [LOGOUT_ALL] Lỗi khi xóa socket:', error.message);
    }
    Cookie.clearAllCookies(res);
    return { success: true, message: "Đã đăng xuất tất cả thiết bị" };
};

// ============================================================
// CHANGE PASSWORD
// ============================================================
exports.changePassword = async (userId, passwordData) => {
    const { currentPassword, newPassword } = passwordData;
    if (!currentPassword?.trim()) {
        throw { statusCode: 400, field: "currentPassword", message: "Vui lòng nhập mật khẩu hiện tại" };
    }
    if (!newPassword?.trim()) {
        throw { statusCode: 400, field: "newPassword", message: "Vui lòng nhập mật khẩu mới" };
    }
    if (!Password.isStrong(newPassword)) {
        throw { statusCode: 400, field: "newPassword", message: "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt" };
    }

    const user = await UserRepository.findById(userId);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };

    const rateLimit = await CacheService.checkRateLimit(user.email, "change-password", 3, 60);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn đã thử đổi mật khẩu quá nhiều lần. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 60} giây.` 
        };
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
    await RefreshTokenRepository.revokeByUser(userId, "Đổi mật khẩu");
    try {
        await CacheService.deleteUserSocket(userId);
    } catch (error) {
        console.error('❌ [CHANGE_PASSWORD] Lỗi khi xóa socket:', error.message);
    }

    return { success: true, message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." };
};

// ============================================================
// FORGOT PASSWORD
// ============================================================
exports.forgotPassword = async (email, req) => {
    if (!email?.trim()) throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };

    const user = await UserRepository.findByEmail(email);
    
    if (!user) {
        throw { 
            statusCode: 404, 
            field: "email",
            message: "Email này chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại." 
        };
    }

    if (!user.email_verified) {
        throw { 
            statusCode: 400, 
            field: "email",
            message: "Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư để xác thực." 
        };
    }

    if (user.status === 'banned') {
        throw { 
            statusCode: 403, 
            message: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ để được giúp đỡ." 
        };
    }

    const rateLimit = await CacheService.checkRateLimit(email, "password-reset", 3, 300);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn chỉ được gửi tối đa 3 lần trong 5 phút. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 300,
                maxAttempts: 3
            }
        };
    }

    await CacheService.markOTPAsUsed(email, OtpService.PURPOSE.RESET_PASSWORD);
    const otpResult = await OtpService.createOTP(email, OtpService.PURPOSE.RESET_PASSWORD);
    const serverTime = Date.now();
    
    await MailService.sendResetPasswordOTP(email, otpResult.otp, user.full_name)
        .then(() => console.log(`✅ Email sent to ${email}`))
        .catch(err => console.error(`❌ Email failed: ${err.message}`));

    const otpKey = `otp:${email}:${OtpService.PURPOSE.RESET_PASSWORD}`;
    const ttl = await CacheService.getTTL(otpKey);

    return {
        success: true,
        message: "Mã OTP đã được gửi tới email của bạn.",
        data: {
            expiresIn: ttl > 0 ? ttl : 300,
            serverTime: serverTime
        }
    };
};

// ============================================================
// SUBMIT NEW PASSWORD
// ============================================================
exports.submitNewPassword = async (token, newPassword) => {
    if (!token) throw { statusCode: 400, message: "Token không được để trống" };
    if (!newPassword?.trim()) {
        throw { statusCode: 400, field: "newPassword", message: "Mật khẩu mới không được để trống" };
    }
    if (!Password.isStrong(newPassword)) {
        throw { statusCode: 400, field: "newPassword", message: "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt" };
    }

    let payload;
    try {
        payload = Jwt.verifyResetToken(token);
        if (!payload) throw new Error('Invalid token');
    } catch (error) {
        throw { statusCode: 401, message: "Token không hợp lệ hoặc đã hết hạn" };
    }

    const user = await UserRepository.findByEmail(payload.email);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };

    const rateLimit = await CacheService.checkRateLimit(user.email, "submit-password", 3, 60);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn chỉ được gửi tối đa 3 lần. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 60} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 60,
                maxAttempts: 3
            }
        };
    }

    const otpResult = await OtpService.createOTP(user.email, OtpService.PURPOSE.RESET_PASSWORD);
    const serverTime = Date.now();
    
    await MailService.sendResetPasswordOTP(user.email, otpResult.otp, user.full_name)
        .then(() => console.log(`✅ Email sent to ${user.email}`))
        .catch(err => console.error(`❌ Email failed: ${err.message}`));

    return {
        success: true,
        message: "Mã OTP xác nhận đã được gửi tới email của bạn.",
        email: user.email,
        data: {
            expiresIn: otpResult.expiresIn || 300,
            serverTime: serverTime
        }
    };
};

// ============================================================
// VERIFY OTP AND RESET
// ============================================================
exports.verifyOtpAndReset = async (email, otp, newPassword) => {
    const rateLimit = await CacheService.checkRateLimit(email, "verify-otp-reset", 5, 300);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn đã thử OTP quá nhiều lần. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 300,
                maxAttempts: 5
            }
        };
    }

    const otpData = await CacheService.getOTPData(email, OtpService.PURPOSE.RESET_PASSWORD);
    if (!otpData) {
        throw {
            statusCode: 400,
            field: "otp",
            message: "OTP không tồn tại hoặc đã hết hạn. Vui lòng gửi lại OTP mới."
        };
    }

    const otpResult = await OtpService.verifyOTP(
        email, 
        otp, 
        OtpService.PURPOSE.RESET_PASSWORD, 
        false
    );
    
    if (!otpResult.success) {
        throw {
            statusCode: otpResult.code === "OTP_LOCKED" ? 429 : 400,
            field: "otp",
            message: otpResult.message
        };
    }

    if (!newPassword || newPassword.length === 0) {
        return { success: true, message: "Xác thực OTP thành công" };
    }

    if (!Password.isStrong(newPassword)) {
        throw { statusCode: 400, field: "newPassword", message: "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt" };
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    const samePassword = await Password.compare(newPassword, user.password);
    if (samePassword) {
        throw { statusCode: 400, field: "newPassword", message: "Mật khẩu mới không được trùng mật khẩu cũ" };
    }

    const hashedPassword = await Password.hash(newPassword);
    await UserRepository.updatePassword(user.user_id, hashedPassword);
    await RefreshTokenRepository.revokeByUser(user.user_id, "Đặt lại mật khẩu");
    try {
        await CacheService.deleteUserSocket(user.user_id);
    } catch (error) {
        console.error('❌ [RESET_PASSWORD] Lỗi khi xóa socket:', error.message);
    }

    await CacheService.markOTPAsUsed(email, OtpService.PURPOSE.RESET_PASSWORD);

    return {
        success: true,
        message: "Đặt lại mật khẩu thành công!"
    };
};

// ============================================================
// SEND VERIFICATION EMAIL — ✅ FIX URL THEO ROLE
// ============================================================
exports.sendVerificationEmail = async (email) => {
    if (!email?.trim()) throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, field: "email", message: "Email không hợp lệ" };

    const user = await UserRepository.findByEmail(email);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    if (user.email_verified) throw { statusCode: 400, message: "Email đã được xác thực" };

    const rateLimit = await CacheService.checkRateLimit(email, "send-verify", 3, 300);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn chỉ được gửi tối đa 3 lần. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 300,
                maxAttempts: 3
            }
        };
    }

    const verifyToken = Jwt.generateEmailVerifyToken({ user_id: user.user_id, email: user.email });

    // ✅ FIX: chọn URL theo role
    const frontendUrl = getFrontendUrlByRole(user.role);
    const verifyUrl = `${frontendUrl}/verify-email?token=${verifyToken}`;

    await MailService.sendEmailVerification(email, verifyUrl, user.full_name);

    return { success: true, message: "Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư." };
};

// ============================================================
// VERIFY EMAIL
// ============================================================
exports.verifyEmail = async (verifyToken) => {
    if (!verifyToken) throw { statusCode: 400, message: "Token không được để trống" };
    let payload;
    try {
        payload = Jwt.verifyEmailVerifyToken(verifyToken);
        if (!payload) throw new Error('Invalid token');
    } catch (error) {
        throw { statusCode: 401, message: "Token không hợp lệ hoặc đã hết hạn" };
    }

    const user = await UserRepository.findById(payload.user_id);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    if (user.email_verified) throw { statusCode: 400, message: "Email đã được xác thực" };

    await UserRepository.updateEmailVerified(user.user_id, true);
    return {
        success: true,
        message: "Xác thực email thành công!",
        user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            email_verified: 1
        }
    };
};

// ============================================================
// GET ACTIVE DEVICES
// ============================================================
exports.getActiveDevices = async (userId) => {
    if (!userId) throw { statusCode: 401, message: "Chưa đăng nhập" };
    const tokens = await RefreshTokenRepository.getActiveByUser(userId);
    return {
        success: true,
        devices: tokens.map(token => ({
            device_id: token.token_id,
            device_name: token.device_name || "Unknown Device",
            ip_address: token.ip_address || "Unknown",
            last_used_at: token.last_used_at || token.created_at,
            created_at: token.created_at,
            expires_at: token.expires_at,
            is_current: false
        }))
    };
};

// ============================================================
// REVOKE DEVICE
// ============================================================
exports.revokeDeviceById = async (userId, tokenId) => {
    if (!userId) throw { statusCode: 401, message: "Chưa đăng nhập" };
    const tokens = await RefreshTokenRepository.getActiveByUser(userId);
    const targetToken = tokens.find(t => t.token_id === parseInt(tokenId));
    if (!targetToken) {
        throw { statusCode: 404, message: "Không tìm thấy thiết bị hoặc thiết bị đã bị đăng xuất" };
    }

    await RefreshTokenRepository.revoke(targetToken.token_hash, "Người dùng chủ động đăng xuất");
    return {
        success: true,
        message: "Đã đăng xuất thiết bị thành công",
        device: {
            device_name: targetToken.device_name,
            ip_address: targetToken.ip_address
        }
    };
};

// ============================================================
// FORGOT PIN
// ============================================================
exports.forgotPin = async (email) => {
    if (!email?.trim()) {
        throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    }

    const user = await UserRepository.findByEmail(email);
    
    if (!user) {
        throw { 
            statusCode: 404, 
            field: "email",
            message: "Email này chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại." 
        };
    }

    if (!user.email_verified) {
        throw { 
            statusCode: 400, 
            field: "email",
            message: "Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư để xác thực." 
        };
    }

    if (user.status === 'banned') {
        throw { 
            statusCode: 403, 
            message: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ để được giúp đỡ." 
        };
    }

    const rateLimit = await CacheService.checkRateLimit(email, "forgot-pin", 3, 300);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn chỉ được gửi tối đa 3 lần trong 5 phút. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 300,
                maxAttempts: 3
            }
        };
    }

    await CacheService.markOTPAsUsed(email, OtpService.PURPOSE.FORGOT_PIN);
    const otpResult = await OtpService.createOTP(email, OtpService.PURPOSE.FORGOT_PIN);
    const serverTime = Date.now();
    
    await MailService.sendForgotPinOTP(email, otpResult.otp, user.full_name)
        .then(() => console.log(`✅ Forgot PIN email sent to ${email}`))
        .catch(err => console.error(`❌ Forgot PIN email failed: ${err.message}`));

    const otpKey = `otp:${email}:${OtpService.PURPOSE.FORGOT_PIN}`;
    const ttl = await CacheService.getTTL(otpKey);

    return {
        success: true,
        message: "Mã OTP đã được gửi tới email. Vui lòng kiểm tra hộp thư.",
        data: {
            expiresIn: ttl > 0 ? ttl : 300,
            serverTime: serverTime
        }
    };
};

// ============================================================
// VERIFY OTP AND CHANGE PIN
// ============================================================
exports.verifyOtpAndChangePin = async (email, otp, newPin) => {
    const rateLimit = await CacheService.checkRateLimit(email, "verify-otp-pin", 5, 300);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn đã thử OTP quá nhiều lần. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 300,
                maxAttempts: 5
            }
        };
    }

    const otpData = await CacheService.getOTPData(email, OtpService.PURPOSE.FORGOT_PIN);
    if (!otpData) {
        throw {
            statusCode: 400,
            field: "otp",
            message: "OTP không tồn tại hoặc đã hết hạn. Vui lòng gửi lại OTP mới."
        };
    }

    const otpResult = await OtpService.verifyOTP(
        email, 
        otp, 
        OtpService.PURPOSE.FORGOT_PIN, 
        false
    );
    
    if (!otpResult.success) {
        throw {
            statusCode: otpResult.code === "OTP_LOCKED" ? 429 : 400,
            field: "otp",
            message: otpResult.message
        };
    }

    if (!newPin || newPin.length === 0) {
        return { success: true, message: "Xác thực OTP thành công" };
    }

    if (!/^\d{6}$/.test(newPin)) {
        throw { statusCode: 400, field: "newPin", message: "Mã PIN mới phải là 6 chữ số" };
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    const hashedPin = await Password.hash(newPin);
    await UserRepository.updatePinHash(user.user_id, hashedPin);

    await CacheService.markOTPAsUsed(email, OtpService.PURPOSE.FORGOT_PIN);

    return {
        success: true,
        message: "Đổi mã PIN thành công!"
    };
};

// ============================================================
// REGISTER STEP 1
// ============================================================
exports.registerStep1 = async (data) => {
    const { username, full_name, email, phone, password, address } = data;

    if (!username?.trim()) {
        throw { statusCode: 400, field: "username", message: "Tên đăng nhập không được để trống" };
    }
    if (!full_name?.trim()) {
        throw { statusCode: 400, field: "full_name", message: "Họ tên không được để trống" };
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
    if (!password?.trim()) {
        throw { statusCode: 400, field: "password", message: "Mật khẩu không được để trống" };
    }
    if (!Password.isStrong(password)) {
        throw { statusCode: 400, field: "password", message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt" };
    }

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

    const rateLimit = await CacheService.checkRateLimit(email, "register", 3, 300);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn chỉ được gửi tối đa 3 lần. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 300,
                maxAttempts: 3
            }
        };
    }

    const tempToken = Jwt.generateResetToken({ 
        purpose: "register",
        email: email,
        username: username 
    });

    return {
        success: true,
        data: {
            temp_token: tempToken,
            email: email,
            full_name: full_name
        }
    };
};

// ============================================================
// COMPLETE REGISTRATION — ✅ FIX URL (dùng role customer)
// ============================================================
exports.completeRegistration = async (data, req, res) => {
    const { temp_token, pin, username, full_name, email, phone, password, address } = data;

    const rateLimit = await CacheService.checkRateLimit(email, "register", 3, 300);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn chỉ được gửi tối đa 3 lần. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 300,
                maxAttempts: 3
            }
        };
    }

    let payload;
    try {
        payload = Jwt.verifyResetToken(temp_token);
        if (!payload) {
            throw new Error('Invalid token');
        }
        console.log('✅ [REGISTER] Token payload:', payload);
    } catch (error) {
        console.error('❌ [REGISTER] Token verification failed:', error.message);
        throw {
            statusCode: 401,
            message: "Phiên đăng ký đã hết hạn. Vui lòng quay lại bước 1."
        };
    }

    if (payload.purpose !== 'register') {
        throw {
            statusCode: 400,
            message: "Token không hợp lệ. Vui lòng đăng ký lại."
        };
    }

    if (!pin || !/^\d{6}$/.test(pin)) {
        throw { statusCode: 400, field: "pin", message: "Mã PIN phải là 6 chữ số" };
    }

    const hashedPassword = await Password.hash(password);
    const hashedPin = await Password.hash(pin);

    const userId = await UserRepository.create({
        username,
        full_name,
        phone,
        address: address || "",
        email,
        password: hashedPassword,
        role: "customer",
        status: "active",
        email_verified: 0,
        points: 0,
        pin_hash: hashedPin
    });

    const verifyToken = Jwt.generateEmailVerifyToken({ user_id: userId, email: email });

    // ✅ FIX: dùng USER_FRONTEND_URL vì đây là đăng ký customer
    const frontendUrl = getFrontendUrlByRole("customer");
    const verifyUrl = `${frontendUrl}/verify-email?token=${verifyToken}`;

    await MailService.sendEmailVerification(email, verifyUrl, full_name);

    return {
        success: true,
        message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
        data: {
            email: email,
            full_name: full_name
        }
    };
};

// ============================================================
// RESEND VERIFICATION — ✅ FIX URL THEO ROLE
// ============================================================
exports.resendVerificationAfterLogin = async (userId) => {
    const user = await UserRepository.findById(userId);
    if (!user) throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    if (user.email_verified) throw { statusCode: 400, message: "Email đã được xác thực" };

    const rateLimit = await CacheService.checkRateLimit(user.email, "resend-verify", 3, 120);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn chỉ được gửi tối đa 3 lần. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 120} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 120,
                maxAttempts: 3
            }
        };
    }

    const verifyToken = Jwt.generateEmailVerifyToken({ user_id: user.user_id, email: user.email });

    // ✅ FIX: chọn URL theo role
    const frontendUrl = getFrontendUrlByRole(user.role);
    const verifyUrl = `${frontendUrl}/verify-email?token=${verifyToken}`;

    await MailService.sendEmailVerification(user.email, verifyUrl, user.full_name);

    return {
        success: true,
        message: "Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư."
    };
};

// ============================================================
// CHECK OTP TTL
// ============================================================
exports.checkOtpTTL = async (email, purpose) => {
    if (!email) throw { statusCode: 400, message: "Thiếu email" };
    if (!purpose) throw { statusCode: 400, message: "Thiếu purpose" };

    const otpKey = `otp:${email}:${purpose}`;
    let ttl = await CacheService.getTTL(otpKey);
    let otp = await CacheService.getOTP(email, purpose);

    if (ttl <= 0) {
        const rateLimitKey = `otp:${email}:${purpose}:ratelimit`;
        ttl = await CacheService.getTTL(rateLimitKey);
    }

    return {
        success: true,
        data: {
            exists: !!otp,
            expiresIn: ttl > 0 ? ttl : 0,
            purpose: purpose
        }
    };
};

// ============================================================
// RESEND OTP — ✅ FIX URL THEO ROLE
// ============================================================
exports.resendOtp = async (email, purpose) => {
    if (!email?.trim()) {
        throw { statusCode: 400, field: "email", message: "Email không được để trống" };
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
        throw { statusCode: 404, message: "Không tìm thấy người dùng" };
    }

    const rateLimit = await CacheService.checkRateLimit(email, `${purpose}-resend`, 3, 300);
    if (!rateLimit.allowed) {
        throw { 
            statusCode: 429, 
            message: `Bạn chỉ được gửi tối đa 3 lần trong 5 phút. Vui lòng thử lại sau ${rateLimit.remainingSeconds || 300} giây.`,
            data: {
                remainingSeconds: rateLimit.remainingSeconds || 300,
                maxAttempts: 3
            }
        };
    }

    await CacheService.markOTPAsUsed(email, purpose);
    const otpResult = await OtpService.createOTP(email, purpose);
    const serverTime = Date.now();
    
    if (purpose === OtpService.PURPOSE.FORGOT_PIN) {
        await MailService.sendForgotPinOTP(email, otpResult.otp, user.full_name)
            .then(() => console.log(`✅ Forgot PIN email sent to ${email}`))
            .catch(err => console.error(`❌ Forgot PIN email failed: ${err.message}`));
    } else if (purpose === OtpService.PURPOSE.RESET_PASSWORD) {
        await MailService.sendResetPasswordOTP(email, otpResult.otp, user.full_name)
            .then(() => console.log(`✅ Reset password email sent to ${email}`))
            .catch(err => console.error(`❌ Reset password email failed: ${err.message}`));
    } else if (purpose === OtpService.PURPOSE.REGISTER) {
        const verifyToken = Jwt.generateEmailVerifyToken({ user_id: user.user_id, email: email });

        // ✅ FIX: chọn URL theo role
        const frontendUrl = getFrontendUrlByRole(user.role);
        const verifyUrl = `${frontendUrl}/verify-email?token=${verifyToken}`;

        await MailService.sendEmailVerification(email, verifyUrl, user.full_name)
            .then(() => console.log(`✅ Verify email sent to ${email}`))
            .catch(err => console.error(`❌ Verify email failed: ${err.message}`));
    }

    return {
        success: true,
        message: "Mã OTP đã được gửi lại tới email.",
        data: {
            expiresIn: otpResult.expiresIn || 300,
            serverTime: serverTime
        }
    };
};

// ============================================================
// LOGIN AFTER REGISTRATION
// ============================================================
exports.loginAfterRegistration = async (user, req, res) => {
    const accessToken = generateAndSetTokens(user, res, false);
    const accessTokenHash = Jwt.hashRefreshToken(accessToken);

    await RefreshTokenRepository.create({
        user_id: user.user_id,
        token_hash: accessTokenHash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers?.["user-agent"] || null,
        device_name: req.headers?.["user-agent"]?.substring(0, 50) || "New Device"
    });

    return {
        success: true,
        user: {
            user_id: user.user_id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            points: user.points,
            email_verified: user.email_verified
        }
    };
};

// ============================================================
// EXPORT SOCKET + HELPER
// ============================================================
exports.setIO = setIO;
exports.getFrontendUrlByRole = getFrontendUrlByRole;