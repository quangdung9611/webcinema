/*=========================================================
    DEPENDENCIES
=========================================================*/

const Jwt = require("../utils/Jwt");
const Cookie = require("../utils/Cookie");
const RefreshTokenRepository = require("../Repositories/RefreshTokenRepository");

/*=========================================================
    AUTHENTICATE USER (CUSTOMER) - CHỈ KIỂM TRA USER_TOKEN
=========================================================*/

const authenticateUser = async (req, res, next) => {
    try {
        // ============================================================
        // 1️⃣ LẤY TOKEN TỪ COOKIE (CHỈ USER_TOKEN)
        // ============================================================
        const accessToken = Cookie.getUserAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                code: "UNAUTHORIZED",
                message: "Vui lòng đăng nhập."
            });
        }

        // ============================================================
        // 2️⃣ VERIFY TOKEN - PHÂN BIỆT LỖI
        // ============================================================
        let payload;
        try {
            payload = Jwt.verifyAccessToken(accessToken);
        } catch (error) {
            // ========== TOKEN_EXPIRED - Token hết hạn ==========
            if (error.name === 'TokenExpiredError') {
                console.warn('🔴 [AUTH] Token đã hết hạn');
                Cookie.clearUserCookies(res);
                return res.status(401).json({
                    success: false,
                    code: "TOKEN_EXPIRED",
                    message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
                });
            }
            
            // ========== TOKEN_INVALID - Token không hợp lệ ==========
            console.warn('🔴 [AUTH] Token không hợp lệ:', error.message);
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "TOKEN_INVALID",
                message: "Token không hợp lệ."
            });
        }

        // ============================================================
        // 3️⃣ CHECK ROLE - PHẢI LÀ CUSTOMER
        // ============================================================
        if (payload.role !== "customer") {
            return res.status(403).json({
                success: false,
                code: "FORBIDDEN",
                message: "Không có quyền truy cập."
            });
        }

        // ============================================================
        // 4️⃣ CHECK DB: KIỂM TRA TOKEN CÓ CÒN HỢP LỆ KHÔNG
        // ============================================================
        const accessTokenHash = Jwt.hashRefreshToken(accessToken);
        const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);

        if (!validToken) {
            console.warn('🔴 [AUTH] Token không tồn tại trong DB hoặc đã bị revoke');
            Cookie.clearUserCookies(res);
            return res.status(401).json({
                success: false,
                code: "SESSION_EXPIRED",
                message: "Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
            });
        }

        // ============================================================
        // 5️⃣ GÁN USER VÀO REQ
        // ============================================================
        req.user = {
            user_id: payload.user_id,
            email: payload.email,
            role: payload.role,
            username: payload.username,
            full_name: payload.full_name
        };

        next();
    } catch (error) {
        console.error("Authenticate User Error:", error);
        Cookie.clearUserCookies(res);
        return res.status(401).json({
            success: false,
            code: "UNAUTHORIZED",
            message: "Phiên đăng nhập không hợp lệ."
        });
    }
};

/*=========================================================
    OPTIONAL AUTH - KHÔNG BẮT BUỘC ĐĂNG NHẬP
=========================================================*/

const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = Cookie.getUserAccessToken(req);
        
        if (accessToken) {
            try {
                const payload = Jwt.verifyAccessToken(accessToken);
                
                // Kiểm tra role
                if (payload.role === "customer") {
                    // Kiểm tra DB
                    const accessTokenHash = Jwt.hashRefreshToken(accessToken);
                    const validToken = await RefreshTokenRepository.findValidTokenHash(accessTokenHash);
                    
                    if (validToken) {
                        req.user = {
                            user_id: payload.user_id,
                            email: payload.email,
                            role: payload.role,
                            username: payload.username,
                            full_name: payload.full_name
                        };
                    }
                }
            } catch (error) {
                // Token hết hạn hoặc không hợp lệ, bỏ qua
                console.log('🟡 [AUTH] Token không hợp lệ trong optional auth');
            }
        }
        next();
    } catch (error) {
        next();
    }
};

/*=========================================================
    EXPORT
=========================================================*/

module.exports = {
    authenticateUser,
    optionalAuth
};