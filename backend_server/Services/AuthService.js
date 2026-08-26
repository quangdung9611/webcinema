const Jwt = require("../utils/Jwt");

const Cookie = require("../utils/Cookie");

const Password = require("../utils/Password");

const UserRepository = require("../Repositories/UserRepository");

const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

const MailService = require("./MailServiceTicket");

const RedisService = require("./RedisService");

const Otp = require("../utils/Otp");


// ============================================================
// SOCKET INSTANCE
// ============================================================

let ioInstance = null;


const setIO = (io) => {

    ioInstance = io;

    console.log(
        '✅ [AUTH] Socket.IO instance set successfully'
    );
};


// ============================================================
// CONSTANTS
// ============================================================

const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const FRONTEND_URL =
    'https://quangdungcinema.id.vn';


// ============================================================
// VALIDATE LOGIN
// ============================================================

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


// ============================================================
// GENERATE ACCESS TOKEN
// ============================================================

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


// ============================================================
// CHECK LOCK STATUS
//
// Dùng khi:
// - F5 trang
// - Quay lại trang login
// - Frontend kiểm tra trạng thái khóa
// ============================================================

exports.checkLockStatus = async (email) => {

    if (!email) {

        throw {
            statusCode: 400,
            message: "Thiếu email"
        };
    }


    const lockInfo =
        await RedisService.getLockoutInfo(email);


    if (
        lockInfo &&
        lockInfo.isLocked
    ) {

        return {

            success: true,

            isLocked: true,

            data: {

                level:
                    lockInfo.level,

                remainingSeconds:
                    lockInfo.remainingSeconds,

                lockDuration:
                    lockInfo.lockDuration,

                lockDurationText:
                    lockInfo.lockDurationText,

                maxAttempts:
                    lockInfo.maxAttempts,

                lockedUntil:
                    lockInfo.lockedUntil,

                message:
                    `Tài khoản đã bị khóa ` +
                    `${lockInfo.lockDurationText}. ` +
                    `Vui lòng thử lại sau.`
            }
        };
    }


    return {

        success: true,

        isLocked: false,

        data: null
    };
};


// ============================================================
// LOGIN
// ============================================================

exports.login = async (
    email,
    password,
    rememberMe = false,
    req,
    res
) => {

    // --------------------------------------------------------
    // VALIDATE
    // --------------------------------------------------------

    validateLogin(
        email,
        password
    );


    // --------------------------------------------------------
    // KIỂM TRA ĐANG BỊ KHÓA HAY KHÔNG
    // --------------------------------------------------------

    const lockInfo =
        await RedisService.getLockoutInfo(email);


    if (
        lockInfo &&
        lockInfo.isLocked
    ) {

        throw {

            statusCode: 429,

            code: 'ACCOUNT_LOCKED',

            message:
                `Tài khoản đã bị khóa ` +
                `${lockInfo.lockDurationText}. ` +
                `Vui lòng thử lại sau.`,

            data: {

                level:
                    lockInfo.level,

                remainingSeconds:
                    lockInfo.remainingSeconds,

                lockDuration:
                    lockInfo.lockDuration,

                lockDurationText:
                    lockInfo.lockDurationText,

                maxAttempts:
                    lockInfo.maxAttempts,

                lockedUntil:
                    lockInfo.lockedUntil
            }
        };
    }


    // --------------------------------------------------------
    // TÌM USER
    // --------------------------------------------------------

    const user =
        await UserRepository.findByEmail(email);


    // ========================================================
    // EMAIL KHÔNG TỒN TẠI
    // ========================================================

    if (!user) {

        const attempts =
            await RedisService.incrementLoginAttempts(
                email
            );


        if (attempts >= 5) {

            const newLevel =
                await RedisService.incrementLockoutLevel(
                    email
                );


            const { duration, text } =
                RedisService.getLockDuration(newLevel);


            throw {

                statusCode: 429,

                code: 'ACCOUNT_LOCKED',

                message:
                    `Bạn đã nhập sai quá 5 lần. ` +
                    `Tài khoản đã bị khóa ${text}.`,

                data: {

                    level:
                        newLevel,

                    remainingSeconds:
                        duration,

                    lockDuration:
                        duration,

                    lockDurationText:
                        text,

                    maxAttempts: 5,

                    lockedUntil:
                        Date.now() + duration * 1000
                }
            };
        }


        throw {

            statusCode: 401,

            message:
                `Email hoặc mật khẩu không đúng. ` +
                `Bạn còn ${5 - attempts} lần thử.`
        };
    }


    // ========================================================
    // KIỂM TRA PASSWORD
    // ========================================================

    const matched =
        await Password.compare(
            password,
            user.password
        );


    // ========================================================
    // SAI PASSWORD
    // ========================================================

    if (!matched) {

        const attempts =
            await RedisService.incrementLoginAttempts(
                email
            );


        if (attempts >= 5) {

            const newLevel =
                await RedisService.incrementLockoutLevel(
                    email
                );


            const { duration, text } =
                RedisService.getLockDuration(newLevel);


            throw {

                statusCode: 429,

                code: 'ACCOUNT_LOCKED',

                message:
                    `Bạn đã nhập sai quá 5 lần. ` +
                    `Tài khoản đã bị khóa ${text}.`,

                data: {

                    level:
                        newLevel,

                    remainingSeconds:
                        duration,

                    lockDuration:
                        duration,

                    lockDurationText:
                        text,

                    maxAttempts: 5,

                    lockedUntil:
                        Date.now() + duration * 1000
                }
            };
        }


        throw {

            statusCode: 401,

            message:
                `Email hoặc mật khẩu không đúng. ` +
                `Bạn còn ${5 - attempts} lần thử.`
        };
    }


    // ========================================================
    // ĐĂNG NHẬP ĐÚNG
    // ========================================================

    await RedisService.resetLoginAttempts(email);


    // ========================================================
    // KIỂM TRA EMAIL VERIFIED
    // ========================================================

    if (!user.email_verified) {

        throw {

            statusCode: 403,

            field: "email",

            message:
                "Vui lòng xác thực email trước khi đăng nhập. " +
                "Kiểm tra hộp thư của bạn."
        };
    }


    // ========================================================
    // REVOKE TOKEN CŨ
    // ========================================================

    await RefreshTokenRepository.revokeByUser(
        user.user_id,
        "Đăng nhập từ thiết bị khác"
    );


    console.log(
        `🔴 [REVOKE] Đã revoke tất cả token cũ của user: ` +
        `${user.user_id}`
    );


    // ========================================================
    // SOCKET - THÔNG BÁO THIẾT BỊ CŨ
    // ========================================================

    if (
        ioInstance &&
        user.user_id
    ) {

        ioInstance
            .to(`user_${user.user_id}`)
            .emit(
                'session_expired',
                {

                    code:
                        'SESSION_REPLACED',

                    message:
                        'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.',

                    newDevice: {

                        ip:
                            req.ip ||
                            req.connection?.remoteAddress ||
                            'Unknown',

                        userAgent:
                            req.headers?.['user-agent']
                                ?.substring(0, 100) ||
                            'Unknown'
                    },

                    timestamp:
                        new Date().toISOString()
                }
            );


        await RedisService.deleteUserSocket(
            user.user_id
        );
    }


    // ========================================================
    // TẠO ACCESS TOKEN
    // ========================================================

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


    // ========================================================
    // SUCCESS
    // ========================================================

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


// ============================================================
// GET ME
// ============================================================

exports.getMe = async (userId) => {

    if (!userId) {

        throw {
            statusCode: 401,
            message: "Chưa đăng nhập"
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


// ============================================================
// LOGOUT
// ============================================================

exports.logout = async (
    req,
    res
) => {

    let token =
        Cookie.getAdminAccessToken(req);


    if (token) {

        Cookie.clearAdminCookies(res);

    } else {

        token =
            Cookie.getUserAccessToken(req);

        if (token) {

            Cookie.clearUserCookies(res);
        }
    }


    if (token) {

        const tokenHash =
            Jwt.hashRefreshToken(token);


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
            '❌ [LOGOUT] Lỗi khi xóa socket:',
            error.message
        );
    }


    return {

        success: true,

        message:
            "Đăng xuất thành công"
    };
};


// ============================================================
// CHANGE PASSWORD
// ============================================================

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


    if (
        !Password.isStrong(newPassword)
    ) {

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
            '❌ [CHANGE_PASSWORD] Lỗi khi xóa socket:',
            error.message
        );
    }


    return {

        success: true,

        message:
            "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
    };
};


// ============================================================
// FORGOT PASSWORD (GỬI LINK)
// ============================================================

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


    // 🔥 KHÔNG TIẾT LỘ EMAIL CÓ TỒN TẠI HAY KHÔNG
    if (!user) {

        return {
            success: true,
            message:
                "Nếu email này tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu."
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


    // 🔥 TẠO TOKEN (KHÔNG DÙNG OTP)
    const resetToken =
        Jwt.generateResetToken({

            user_id:
                user.user_id,

            email:
                user.email
        }, '15m');


    const resetUrl =
        `${FRONTEND_URL}/reset-password?token=${resetToken}`;


    await MailService.sendPasswordResetLink(
        email,
        resetUrl,
        user.full_name
    );


    return {

        success: true,

        message:
            "Nếu email này tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu."
    };
};


// ============================================================
// VERIFY RESET TOKEN (Xác thực link)
// ============================================================

exports.verifyResetToken = async (
    token
) => {

    if (!token) {

        throw {
            statusCode: 400,
            message:
                "Token không được để trống"
        };
    }


    let payload;


    try {

        payload =
            Jwt.verifyResetToken(
                token
            );


        if (!payload) {

            throw new Error(
                'Invalid token'
            );
        }

    } catch (error) {

        throw {
            statusCode: 401,
            message:
                "Link không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại."
        };
    }


    const user =
        await UserRepository.findByEmail(
            payload.email
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
        userId: user.user_id,
        email: user.email
    };
};


// ============================================================
// ĐẶT LẠI MẬT KHẨU (NHẬP MẬT KHẨU MỚI - GỬI OTP XÁC NHẬN)
// ============================================================

exports.submitNewPassword = async (
    token,
    newPassword
) => {

    if (!token) {

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


    if (
        !Password.isStrong(newPassword)
    ) {

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
                token
            );


        if (!payload) {

            throw new Error(
                'Invalid token'
            );
        }

    } catch (error) {

        throw {
            statusCode: 401,
            message:
                "Token không hợp lệ hoặc đã hết hạn"
        };
    }


    // 2. Tìm user
    const user =
        await UserRepository.findByEmail(
            payload.email
        );


    if (!user) {

        throw {
            statusCode: 404,
            message:
                "Không tìm thấy người dùng"
        };
    }


    // 🔥 TẠO OTP XÁC NHẬN (LỚP BẢO MẬT THỨ 2)
    const otpCode =
        Otp.generate6();


    await RedisService.saveOTP(
        user.email,
        "RESET_PASSWORD_CONFIRM",
        otpCode,
        300
    );


    // 🔥 GỬI OTP QUA EMAIL
    await MailService.sendResetPasswordOTP(
        user.email,
        otpCode,
        user.full_name
    );


    return {
        success: true,
        message: "Mã OTP xác nhận đã được gửi tới email của bạn.",
        email: user.email
    };
};


// ============================================================
// XÁC THỰC OTP VÀ ĐỔI MẬT KHẨU
// ============================================================

exports.verifyOtpAndReset = async (
    email,
    otp,
    newPassword
) => {

    // Kiểm tra OTP
    const savedOTP =
        await RedisService.getOTP(
            email,
            "RESET_PASSWORD_CONFIRM"
        );


    if (!savedOTP) {

        throw {
            statusCode: 404,
            message:
                "OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu gửi lại."
        };
    }


    if (savedOTP !== otp) {

        const attempts =
            await RedisService.incrementOTPAttempts(
                email,
                "RESET_PASSWORD_CONFIRM",
                300
            );


        if (attempts >= 5) {

            throw {
                statusCode: 429,
                message:
                    "Bạn đã nhập sai OTP quá 5 lần. Vui lòng thử lại sau 5 phút."
            };
        }


        throw {
            statusCode: 400,
            field: "otp",
            message:
                `OTP không chính xác. Còn ${5 - attempts} lần thử`
        };
    }


    // Xóa OTP sau khi xác thực thành công
    await RedisService.deleteOTP(
        email,
        "RESET_PASSWORD_CONFIRM"
    );


    // Tìm user
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


    // Kiểm tra trùng mật khẩu cũ
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


    // Đổi mật khẩu
    const hashedPassword =
        await Password.hash(
            newPassword
        );


    await UserRepository.updatePassword(
        user.user_id,
        hashedPassword
    );


    // Revoke toàn bộ token cũ
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
            '❌ [RESET_PASSWORD] Lỗi khi xóa socket:',
            error.message
        );
    }


    // Gửi email cảnh báo
    await MailService.sendPasswordChangeAlert(
        user.email,
        user.full_name
    );


    return {

        success: true,

        message:
            "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."
    };
};


// ============================================================
// SEND VERIFICATION EMAIL
// ============================================================

exports.sendVerificationEmail = async (
    email
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
            "Email xác thực đã được gửi. " +
            "Vui lòng kiểm tra hộp thư."
    };
};


// ============================================================
// VERIFY EMAIL
// ============================================================

exports.verifyEmail = async (
    verifyToken
) => {

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
                'Invalid token'
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

            email_verified: 1
        }
    };
};


// ============================================================
// LOGOUT ALL DEVICES
// ============================================================

exports.logoutAllDevices = async (
    userId,
    res
) => {

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
            '❌ [LOGOUT_ALL] Lỗi khi xóa socket:',
            error.message
        );
    }


    Cookie.clearAllCookies(res);


    return {

        success: true,

        message:
            "Đã đăng xuất tất cả thiết bị"
    };
};


// ============================================================
// GET ACTIVE DEVICES
// ============================================================

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
                token => ({

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

                    is_current: false
                })
            )
    };
};


// ============================================================
// REVOKE DEVICE
// ============================================================

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
            t =>
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


// ============================================================
// EXPORT SOCKET
// ============================================================

exports.setIO = setIO;