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
    SOCKET.IO INSTANCE
=========================================================*/

let ioInstance = null;

const setIO = (io) => {
    ioInstance = io;

    console.log(
        "✅ [AUTH] Socket.IO instance set successfully"
    );
};

/*=========================================================
    REALTIME SESSION EXPIRED
=========================================================*/

/**
 * Gửi thông báo realtime đến socket hiện tại của user.
 *
 * Dùng khi:
 * - Đăng nhập thiết bị khác
 * - Đổi mật khẩu
 * - Reset mật khẩu
 * - Logout all devices
 */
const emitSessionExpired = async (
    userId,
    {
        code = "SESSION_REPLACED",
        type = "device",
        message = "Tài khoản của bạn đã được đăng nhập trên thiết bị khác.",
        newDevice = null,
        reason = null,
    } = {}
) => {
    try {
        if (!userId) {
            return false;
        }

        if (!ioInstance) {
            console.warn(
                "⚠️ [AUTH SOCKET] ioInstance chưa được khởi tạo"
            );

            return false;
        }

        const socketId =
            await RedisService.getUserSocket(userId);

        if (!socketId) {
            console.log(
                `ℹ️ [AUTH SOCKET] User ${userId} không có socket đang hoạt động`
            );

            return false;
        }

        const payload = {
            code,

            type,

            message,

            reason,

            newDevice,

            timestamp:
                new Date().toISOString(),
        };

        console.warn(
            `🔴 [AUTH SOCKET] Sending session_expired to user ${userId}`
        );

        console.log(
            "📨 [AUTH SOCKET] Socket:",
            socketId
        );

        console.log(
            "📨 [AUTH SOCKET] Payload:",
            payload
        );

        ioInstance
            .to(socketId)
            .emit(
                "session_expired",
                payload
            );

        return true;

    } catch (error) {

        console.error(
            "❌ [AUTH SOCKET] emitSessionExpired error:",
            error.message
        );

        return false;
    }
};

/*=========================================================
    REGEX
=========================================================*/

const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX =
    /^[0-9]{10}$/;

const USERNAME_REGEX =
    /^[a-zA-Z0-9_.]{4,20}$/;

/*=========================================================
    CONSTANTS
=========================================================*/

const FRONTEND_URL =
    "https://quangdungcinema.id.vn";

/*=========================================================
    VALIDATE REGISTER
=========================================================*/

const validateRegister = (data) => {

    const {
        username,
        full_name,
        phone,
        email,
        password
    } = data;

    if (!username?.trim()) {
        throw {
            statusCode: 400,
            field: "username",
            message:
                "Tên đăng nhập không được để trống"
        };
    }

    if (username.trim().length < 4) {
        throw {
            statusCode: 400,
            field: "username",
            message:
                "Tên đăng nhập phải từ 4 ký tự"
        };
    }

    if (!USERNAME_REGEX.test(username)) {
        throw {
            statusCode: 400,
            field: "username",
            message:
                "Tên đăng nhập chỉ được chứa chữ, số, dấu gạch dưới và dấu chấm"
        };
    }

    if (!full_name?.trim()) {
        throw {
            statusCode: 400,
            field: "full_name",
            message:
                "Họ tên không được để trống"
        };
    }

    if (full_name.trim().length < 6) {
        throw {
            statusCode: 400,
            field: "full_name",
            message:
                "Họ tên phải từ 6 ký tự"
        };
    }

    if (!email?.trim()) {
        throw {
            statusCode: 400,
            field: "email",
            message:
                "Email không được để trống"
        };
    }

    if (!EMAIL_REGEX.test(email)) {
        throw {
            statusCode: 400,
            field: "email",
            message:
                "Email không hợp lệ"
        };
    }

    if (!phone?.trim()) {
        throw {
            statusCode: 400,
            field: "phone",
            message:
                "Số điện thoại không được để trống"
        };
    }

    if (!PHONE_REGEX.test(phone)) {
        throw {
            statusCode: 400,
            field: "phone",
            message:
                "Số điện thoại không hợp lệ (10 số)"
        };
    }

    if (!password?.trim()) {
        throw {
            statusCode: 400,
            field: "password",
            message:
                "Mật khẩu không được để trống"
        };
    }

    if (!Password.isStrong(password)) {
        throw {
            statusCode: 400,
            field: "password",
            message:
                "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
        };
    }
};

/*=========================================================
    VALIDATE LOGIN
=========================================================*/

const validateLogin = (
    email,
    password
) => {

    if (!email?.trim()) {
        throw {
            statusCode: 400,
            field: "email",
            message:
                "Email không được để trống"
        };
    }

    if (!EMAIL_REGEX.test(email)) {
        throw {
            statusCode: 400,
            field: "email",
            message:
                "Email không hợp lệ"
        };
    }

    if (!password?.trim()) {
        throw {
            statusCode: 400,
            field: "password",
            message:
                "Mật khẩu không được để trống"
        };
    }
};

/*=========================================================
    GENERATE TOKEN & SET COOKIE
=========================================================*/

const generateAndSetTokens = (
    user,
    res,
    rememberMe = false
) => {

    const accessToken =
        Jwt.generateAccessToken(user);

    if (user.role === "admin") {

        Cookie.setAdminAccessToken(
            res,
            accessToken,
            rememberMe
        );

    } else {

        Cookie.setUserAccessToken(
            res,
            accessToken,
            rememberMe
        );
    }

    return accessToken;
};

/*=========================================================
    REGISTER
=========================================================*/

exports.register = async (
    userData
) => {

    validateRegister(userData);

    const {
        username,
        full_name,
        phone,
        address,
        email,
        password
    } = userData;

    const existed =
        await UserRepository.exists(
            username,
            email,
            phone
        );

    if (existed) {

        if (existed.username === username) {
            throw {
                statusCode: 400,
                field: "username",
                message:
                    "Tên đăng nhập đã tồn tại"
            };
        }

        if (existed.email === email) {
            throw {
                statusCode: 400,
                field: "email",
                message:
                    "Email đã tồn tại"
            };
        }

        if (existed.phone === phone) {
            throw {
                statusCode: 400,
                field: "phone",
                message:
                    "Số điện thoại đã tồn tại"
            };
        }
    }

    const hashedPassword =
        await Password.hash(password);

    const userId =
        await UserRepository.create({
            username,
            full_name,
            phone,
            address: address || "",
            email,
            password: hashedPassword,
            role: "customer",
            email_verified: 0
        });

    await OtpRepository.create({
        email,
        purpose: "register",
        ip_address: null,
        user_agent: null
    });

    try {

        const verifyToken =
            Jwt.generateEmailVerifyToken({
                user_id: userId,
                email
            });

        const verifyUrl =
            `${FRONTEND_URL}/verify-email?token=${verifyToken}`;

        await MailService.sendEmailVerification(
            email,
            verifyUrl,
            full_name
        );

        console.log(
            `✅ [REGISTER] Đã gửi email xác thực tới: ${email}`
        );

    } catch (error) {

        console.error(
            "❌ [REGISTER] Không thể gửi email xác thực:",
            error.message
        );
    }

    return {
        success: true,
        message:
            "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
        userId,
        emailSent: true
    };
};

/*=========================================================
    LOGIN
=========================================================*/

exports.login = async (
    email,
    password,
    rememberMe = false,
    req,
    res
) => {

    validateLogin(
        email,
        password
    );

    const user =
        await UserRepository.findByEmail(
            email
        );

    if (!user) {
        throw {
            statusCode: 401,
            field: "email",
            message:
                "Email không tồn tại"
        };
    }

    if (user.status === "banned") {
        throw {
            statusCode: 403,
            message:
                "Tài khoản đã bị khóa"
        };
    }

    const matched =
        await Password.compare(
            password,
            user.password
        );

    if (!matched) {
        throw {
            statusCode: 401,
            field: "password",
            message:
                "Mật khẩu không đúng"
        };
    }

    if (!user.email_verified) {
        throw {
            statusCode: 403,
            field: "email",
            message:
                "Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn."
        };
    }

    /* =====================================================
        1. GỬI REALTIME EVENT CHO THIẾT BỊ CŨ
    ===================================================== */

    await emitSessionExpired(
        user.user_id,
        {
            code: "SESSION_REPLACED",

            type: "device",

            message:
                "Tài khoản của bạn đã được đăng nhập trên thiết bị khác.",

            reason:
                "LOGIN_FROM_ANOTHER_DEVICE",

            newDevice: {
                ip:
                    req.ip ||
                    req.connection?.remoteAddress ||
                    "Unknown",

                userAgent:
                    req.headers?.["user-agent"]
                        ?.substring(0, 100) ||
                    "Unknown",

                timestamp:
                    new Date().toISOString()
            }
        }
    );

    /*
    =====================================================
        2. REVOKE TOKEN CŨ
    =====================================================
    */

    await RefreshTokenRepository.revokeByUser(
        user.user_id,
        "Đăng nhập từ thiết bị khác"
    );

    console.log(
        `🔴 [REVOKE] Đã revoke tất cả token cũ của user: ${user.user_id}`
    );

    /*
    =====================================================
        3. XÓA SOCKET CŨ KHỎI REDIS

        Socket cũ sẽ disconnect sau khi frontend
        nhận session_expired.
    =====================================================
    */

    try {

        await RedisService.deleteUserSocket(
            user.user_id
        );

    } catch (error) {

        console.warn(
            "⚠️ [LOGIN] Không thể xóa socket cũ:",
            error.message
        );
    }

    /*
    =====================================================
        4. TẠO TOKEN MỚI
    =====================================================
    */

    const accessToken =
        generateAndSetTokens(
            user,
            res,
            rememberMe
        );

    const accessTokenHash =
        Jwt.hashRefreshToken(
            accessToken
        );

    await RefreshTokenRepository.create({
        user_id:
            user.user_id,

        token_hash:
            accessTokenHash,

        expires_at:
            new Date(
                Date.now() +
                24 * 60 * 60 * 1000
            ),

        ip_address:
            req.ip ||
            req.connection?.remoteAddress ||
            null,

        user_agent:
            req.headers?.["user-agent"] ||
            null,

        device_name:
            req.headers?.["user-agent"]
                ?.substring(0, 50) ||
            "Unknown Device"
    });

    return {
        success: true,

        message:
            "Đăng nhập thành công",

        user: {
            user_id:
                user.user_id,

            username:
                user.username,

            full_name:
                user.full_name,

            email:
                user.email,

            phone:
                user.phone,

            role:
                user.role,

            points:
                user.points,

            email_verified:
                user.email_verified
        }
    };
};

/*=========================================================
    GET CURRENT USER
=========================================================*/

exports.getMe = async (
    userId
) => {

    if (!userId) {
        throw {
            statusCode: 401,
            message:
                "Chưa đăng nhập"
        };
    }

    const user =
        await UserRepository.findProfile(
            userId
        );

    if (!user) {
        throw {
            statusCode: 404,
            message:
                "Không tìm thấy người dùng"
        };
    }

    return {
        success: true,
        user
    };
};

/*=========================================================
    LOGOUT
=========================================================*/

exports.logout = async (
    req,
    res
) => {

    let token =
        Cookie.getAdminAccessToken(
            req
        );

    if (token) {

        Cookie.clearAdminCookies(
            res
        );

    } else {

        token =
            Cookie.getUserAccessToken(
                req
            );

        if (token) {

            Cookie.clearUserCookies(
                res
            );
        }
    }

    if (token) {

        const tokenHash =
            Jwt.hashRefreshToken(
                token
            );

        await RefreshTokenRepository.revoke(
            tokenHash,
            "Đăng xuất"
        );
    }

    try {

        if (req.user?.user_id) {

            await RedisService.deleteUserSocket(
                req.user.user_id
            );
        }

    } catch (error) {

        console.error(
            "❌ [LOGOUT] Lỗi khi xóa socket:",
            error.message
        );
    }

    return {
        success: true,
        message:
            "Đăng xuất thành công"
    };
};

/*=========================================================
    LOGOUT ALL DEVICES
=========================================================*/

exports.logoutAllDevices = async (
    userId,
    res
) => {

    /*
    =====================================================
        BÁO REALTIME TRƯỚC
    =====================================================
    */

    await emitSessionExpired(
        userId,
        {
            code:
                "SESSION_EXPIRED",

            type:
                "device",

            message:
                "Bạn đã đăng xuất khỏi tất cả thiết bị.",

            reason:
                "LOGOUT_ALL_DEVICES"
        }
    );

    await RefreshTokenRepository.revokeByUser(
        userId,
        "Đăng xuất tất cả thiết bị"
    );

    try {

        await RedisService.deleteUserSocket(
            userId
        );

    } catch (error) {

        console.error(
            "❌ [LOGOUT_ALL] Lỗi khi xóa socket:",
            error.message
        );
    }

    Cookie.clearAllCookies(
        res
    );

    return {
        success: true,
        message:
            "Đã đăng xuất tất cả thiết bị"
    };
};

/*=========================================================
    ACTIVE DEVICES
=========================================================*/

exports.getActiveDevices = async (
    userId
) => {

    if (!userId) {
        throw {
            statusCode: 401,
            message:
                "Chưa đăng nhập"
        };
    }

    const tokens =
        await RefreshTokenRepository.getActiveByUser(
            userId
        );

    return {
        success: true,

        devices:
            tokens.map(
                (token) => ({
                    device_id:
                        token.token_id,

                    device_name:
                        token.device_name ||
                        "Unknown Device",

                    ip_address:
                        token.ip_address ||
                        "Unknown",

                    last_used_at:
                        token.last_used_at ||
                        token.created_at,

                    created_at:
                        token.created_at,

                    expires_at:
                        token.expires_at,

                    is_current:
                        false
                })
            )
    };
};

/*=========================================================
    REVOKE DEVICE
=========================================================*/

exports.revokeDeviceById = async (
    userId,
    tokenId
) => {

    if (!userId) {
        throw {
            statusCode: 401,
            message:
                "Chưa đăng nhập"
        };
    }

    const tokens =
        await RefreshTokenRepository.getActiveByUser(
            userId
        );

    const targetToken =
        tokens.find(
            (t) =>
                t.token_id ===
                parseInt(tokenId)
        );

    if (!targetToken) {
        throw {
            statusCode: 404,
            message:
                "Không tìm thấy thiết bị hoặc thiết bị đã bị đăng xuất"
        };
    }

    await RefreshTokenRepository.revoke(
        targetToken.token_hash,
        "Người dùng chủ động đăng xuất"
    );

    return {
        success: true,

        message:
            "Đã đăng xuất thiết bị thành công",

        device: {
            device_name:
                targetToken.device_name,

            ip_address:
                targetToken.ip_address
        }
    };
};

/*=========================================================
    CHANGE PASSWORD
=========================================================*/

exports.changePassword = async (
    userId,
    passwordData
) => {

    const {
        currentPassword,
        newPassword
    } = passwordData;

    if (!currentPassword?.trim()) {
        throw {
            statusCode: 400,
            field: "currentPassword",
            message:
                "Vui lòng nhập mật khẩu hiện tại"
        };
    }

    if (!newPassword?.trim()) {
        throw {
            statusCode: 400,
            field: "newPassword",
            message:
                "Vui lòng nhập mật khẩu mới"
        };
    }

    if (!Password.isStrong(newPassword)) {
        throw {
            statusCode: 400,
            field: "newPassword",
            message:
                "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt"
        };
    }

    const user =
        await UserRepository.findById(
            userId
        );

    if (!user) {
        throw {
            statusCode: 404,
            message:
                "Không tìm thấy người dùng"
        };
    }

    const matched =
        await Password.compare(
            currentPassword,
            user.password
        );

    if (!matched) {
        throw {
            statusCode: 400,
            field: "currentPassword",
            message:
                "Mật khẩu hiện tại không đúng"
        };
    }

    const samePassword =
        await Password.compare(
            newPassword,
            user.password
        );

    if (samePassword) {
        throw {
            statusCode: 400,
            field: "newPassword",
            message:
                "Mật khẩu mới không được trùng mật khẩu cũ"
        };
    }

    const hashedPassword =
        await Password.hash(
            newPassword
        );

    await UserRepository.updatePassword(
        userId,
        hashedPassword
    );

    await emitSessionExpired(
        userId,
        {
            code:
                "SESSION_EXPIRED",

            type:
                "token",

            message:
                "Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.",

            reason:
                "PASSWORD_CHANGED"
        }
    );

    await RefreshTokenRepository.revokeByUser(
        userId,
        "Đổi mật khẩu"
    );

    try {

        await RedisService.deleteUserSocket(
            userId
        );

    } catch (error) {

        console.error(
            "❌ [CHANGE_PASSWORD] Lỗi khi xóa socket:",
            error.message
        );
    }

    return {
        success: true,

        message:
            "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
    };
};

/*=========================================================
    FORGOT PASSWORD
=========================================================*/

exports.forgotPassword = async (
    email,
    req
) => {

    if (!email?.trim()) {
        throw {
            statusCode: 400,
            field: "email",
            message:
                "Email không được để trống"
        };
    }

    if (!EMAIL_REGEX.test(email)) {
        throw {
            statusCode: 400,
            field: "email",
            message:
                "Email không hợp lệ"
        };
    }

    const user =
        await UserRepository.findByEmail(
            email
        );

    if (!user) {
        throw {
            statusCode: 404,
            field: "email",
            message:
                "Email không tồn tại"
        };
    }

    const rateLimit =
        await RedisService.checkRateLimit(
            email,
            "password-reset",
            3,
            60
        );

    if (!rateLimit.allowed) {
        throw {
            statusCode: 429,
            message:
                rateLimit.message
        };
    }

    const isLocked =
        await RedisService.isOTPLocked(
            email,
            "password-reset",
            5
        );

    if (isLocked) {
        throw {
            statusCode: 429,
            message:
                "Tài khoản đã bị khóa do nhập sai OTP quá nhiều. Vui lòng thử lại sau 5 phút"
        };
    }

    const otpCode =
        Otp.generate6();

    await RedisService.saveOTP(
        email,
        "password-reset",
        otpCode,
        300
    );

    await OtpRepository.create({
        email,

        purpose:
            "password-reset",

        ip_address:
            req?.ip ||
            req?.connection?.remoteAddress ||
            null,

        user_agent:
            req?.headers?.["user-agent"] ||
            null
    });

    await MailService.sendPasswordResetOTP(
        email,
        otpCode,
        user.full_name
    );

    return {
        success: true,

        message:
            "Mã OTP đã được gửi đến email của bạn",

        ...(process.env.NODE_ENV ===
            "development" && {
                otp: otpCode
            })
    };
};

/*=========================================================
    VERIFY RESET OTP
=========================================================*/

exports.verifyResetOTP = async (
    email,
    otp
) => {

    if (!email?.trim()) {
        throw {
            statusCode: 400,
            field: "email",
            message:
                "Email không được để trống"
        };
    }

    if (!EMAIL_REGEX.test(email)) {
        throw {
            statusCode: 400,
            field: "email",
            message:
                "Email không hợp lệ"
        };
    }

    if (!Otp.isValidFormat(otp, 6)) {
        throw {
            statusCode: 400,
            field: "otp",
            message:
                "OTP phải là 6 chữ số"
        };
    }

    const isLocked =
        await RedisService.isOTPLocked(
            email,
            "password-reset",
            5
        );

    if (isLocked) {
        throw {
            statusCode: 429,
            message:
                "Tài khoản đã bị khóa do nhập sai OTP quá nhiều. Vui lòng thử lại sau 5 phút"
        };
    }

    const savedOTP =
        await RedisService.getOTP(
            email,
            "password-reset"
        );

    if (!savedOTP) {
        throw {
            statusCode: 404,
            message:
                "OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu lại"
        };
    }

    if (savedOTP !== otp) {

        const attempts =
            await RedisService.incrementOTPAttempts(
                email,
                "password-reset",
                300
            );

        if (attempts >= 5) {
            throw {
                statusCode: 429,
                message:
                    "Bạn đã nhập sai OTP quá 5 lần. Vui lòng thử lại sau 5 phút"
            };
        }

        throw {
            statusCode: 400,
            field: "otp",
            message:
                `OTP không chính xác. Còn ${5 - attempts} lần thử`
        };
    }

    await RedisService.deleteOTP(
        email,
        "password-reset"
    );

    const user =
        await UserRepository.findByEmail(
            email
        );

    if (!user) {
        throw {
            statusCode: 404,
            message:
                "Không tìm thấy người dùng"
        };
    }

    const resetToken =
        Jwt.generateResetToken({
            user_id:
                user.user_id,

            email
        });

    return {
        success: true,
        message:
            "Xác thực OTP thành công",
        resetToken
    };
};

/*=========================================================
    RESET PASSWORD
=========================================================*/

exports.resetPassword = async (
    resetToken,
    newPassword
) => {

    if (!resetToken) {
        throw {
            statusCode: 400,
            message:
                "Token không được để trống"
        };
    }

    if (!newPassword?.trim()) {
        throw {
            statusCode: 400,
            field: "newPassword",
            message:
                "Mật khẩu mới không được để trống"
        };
    }

    if (!Password.isStrong(newPassword)) {
        throw {
            statusCode: 400,
            field: "newPassword",
            message:
                "Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt"
        };
    }

    let payload;

    try {

        payload =
            Jwt.verifyResetToken(
                resetToken
            );

        if (!payload) {
            throw new Error(
                "Invalid token"
            );
        }

    } catch (error) {

        throw {
            statusCode: 401,
            message:
                "Token không hợp lệ hoặc đã hết hạn"
        };
    }

    const user =
        await UserRepository.findById(
            payload.user_id
        );

    if (!user) {
        throw {
            statusCode: 404,
            message:
                "Không tìm thấy người dùng"
        };
    }

    const samePassword =
        await Password.compare(
            newPassword,
            user.password
        );

    if (samePassword) {
        throw {
            statusCode: 400,
            field: "newPassword",
            message:
                "Mật khẩu mới không được trùng mật khẩu cũ"
        };
    }

    const hashedPassword =
        await Password.hash(
            newPassword
        );

    await UserRepository.updatePassword(
        user.user_id,
        hashedPassword
    );

    /*
    =====================================================
        BÁO REALTIME CHO THIẾT BỊ ĐANG ĐĂNG NHẬP
    =====================================================
    */

    await emitSessionExpired(
        user.user_id,
        {
            code:
                "SESSION_EXPIRED",

            type:
                "token",

            message:
                "Mật khẩu của bạn vừa được đặt lại. Vui lòng đăng nhập lại.",

            reason:
                "PASSWORD_RESET"
        }
    );

    await RefreshTokenRepository.revokeByUser(
        user.user_id,
        "Đặt lại mật khẩu"
    );

    try {

        await RedisService.deleteUserSocket(
            user.user_id
        );

    } catch (error) {

        console.error(
            "❌ [RESET_PASSWORD] Lỗi khi xóa socket:",
            error.message
        );
    }

    await OtpRepository.create({
        email:
            user.email,

        purpose:
            "password-reset-success",

        ip_address:
            null,

        user_agent:
            null
    });

    return {
        success: true,

        message:
            "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."
    };
};

/*=========================================================
    SEND VERIFICATION EMAIL
=========================================================*/

exports.sendVerificationEmail =
    async (email) => {

        if (!email?.trim()) {
            throw {
                statusCode: 400,
                field: "email",
                message:
                    "Email không được để trống"
            };
        }

        if (!EMAIL_REGEX.test(email)) {
            throw {
                statusCode: 400,
                field: "email",
                message:
                    "Email không hợp lệ"
            };
        }

        const user =
            await UserRepository.findByEmail(
                email
            );

        if (!user) {
            throw {
                statusCode: 404,
                message:
                    "Không tìm thấy người dùng"
            };
        }

        if (user.email_verified) {
            throw {
                statusCode: 400,
                message:
                    "Email đã được xác thực"
            };
        }

        const verifyToken =
            Jwt.generateEmailVerifyToken({
                user_id:
                    user.user_id,

                email:
                    user.email
            });

        const verifyUrl =
            `${FRONTEND_URL}/verify-email?token=${verifyToken}`;

        await MailService.sendEmailVerification(
            email,
            verifyUrl,
            user.full_name
        );

        return {
            success: true,

            message:
                "Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư."
        };
    };

/*=========================================================
    VERIFY EMAIL
=========================================================*/

exports.verifyEmail =
    async (verifyToken) => {

        if (!verifyToken) {
            throw {
                statusCode: 400,
                message:
                    "Token không được để trống"
            };
        }

        let payload;

        try {

            payload =
                Jwt.verifyEmailVerifyToken(
                    verifyToken
                );

            if (!payload) {
                throw new Error(
                    "Invalid token"
                );
            }

        } catch (error) {

            throw {
                statusCode: 401,
                message:
                    "Token không hợp lệ hoặc đã hết hạn"
            };
        }

        const user =
            await UserRepository.findById(
                payload.user_id
            );

        if (!user) {
            throw {
                statusCode: 404,
                message:
                    "Không tìm thấy người dùng"
            };
        }

        if (user.email_verified) {
            throw {
                statusCode: 400,
                message:
                    "Email đã được xác thực"
            };
        }

        await UserRepository.updateEmailVerified(
            user.user_id,
            true
        );

        return {
            success: true,

            message:
                "Xác thực email thành công!",

            user: {
                user_id:
                    user.user_id,

                email:
                    user.email,

                full_name:
                    user.full_name,

                email_verified:
                    1
            }
        };
    };

/*=========================================================
    EXPORT SOCKET
=========================================================*/

exports.setIO = setIO;