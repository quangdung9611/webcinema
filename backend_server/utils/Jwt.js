const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/*=========================================================
    ENV
=========================================================*/

const ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET;

const REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET;

const RESET_SECRET =
    process.env.JWT_RESET_SECRET;

const VERIFY_SECRET =
    process.env.JWT_VERIFY_SECRET;

const ACCESS_EXPIRES =
    process.env.JWT_ACCESS_EXPIRES || "15m";

const REFRESH_EXPIRES =
    process.env.JWT_REFRESH_EXPIRES || "7d";

const RESET_EXPIRES =
    process.env.JWT_RESET_EXPIRES || "5m";

const VERIFY_EXPIRES =
    process.env.JWT_VERIFY_EXPIRES || "10m";

/*=========================================================
    JWT
=========================================================*/

class Jwt {

    /*=====================================================
        ACCESS TOKEN
    =====================================================*/

    generateAccessToken(user) {

        return jwt.sign(

            {

                user_id: user.user_id,

                role: user.role,

                token_type: "access"

            },

            ACCESS_SECRET,

            {

                expiresIn: ACCESS_EXPIRES

            }

        );

    }

    verifyAccessToken(token) {

        try {

            return jwt.verify(

                token,

                ACCESS_SECRET

            );

        }

        catch (error) {

            return null;

        }

    }
        /*=====================================================
        REFRESH TOKEN
    =====================================================*/

    generateRefreshToken(user) {

        return jwt.sign(

            {

                user_id: user.user_id,

                role: user.role,

                token_type: "refresh",

                jti: this.generateTokenId()

            },

            REFRESH_SECRET,

            {

                expiresIn: REFRESH_EXPIRES

            }

        );

    }

    verifyRefreshToken(token) {

        try {

            return jwt.verify(

                token,

                REFRESH_SECRET

            );

        }

        catch (error) {

            return null;

        }

    }

    /*=====================================================
        RESET PASSWORD TOKEN
    =====================================================*/

    generateResetToken(payload) {

        return jwt.sign(

            {

                ...payload,

                token_type: "reset"

            },

            RESET_SECRET,

            {

                expiresIn: RESET_EXPIRES

            }

        );

    }

    verifyResetToken(token) {

        try {

            return jwt.verify(

                token,

                RESET_SECRET

            );

        }

        catch (error) {

            return null;

        }

    }

    /*=====================================================
        EMAIL VERIFY TOKEN
    =====================================================*/

    generateEmailVerifyToken(payload) {

        return jwt.sign(

            {

                ...payload,

                token_type: "verify"

            },

            VERIFY_SECRET,

            {

                expiresIn: VERIFY_EXPIRES

            }

        );

    }

    verifyEmailVerifyToken(token) {

        try {

            return jwt.verify(

                token,

                VERIFY_SECRET

            );

        }

        catch (error) {

            return null;

        }

    }

    /*=====================================================
        COMPATIBILITY (OLD METHOD)
    =====================================================*/

    generateVerifiedToken(payload) {

        return this.generateEmailVerifyToken(payload);

    }

    verifyVerifiedToken(token) {

        return this.verifyEmailVerifyToken(token);

    }
        /*=====================================================
        DECODE TOKEN
    =====================================================*/

    decode(token) {

        try {

            return jwt.decode(token);

        }

        catch (error) {

            return null;

        }

    }

    /*=====================================================
        GET TOKEN EXPIRATION
    =====================================================*/

    getExpiration(token) {

        const decoded = this.decode(token);

        if (!decoded || !decoded.exp) {

            return null;

        }

        return new Date(decoded.exp * 1000);

    }

    /*=====================================================
        HASH REFRESH TOKEN
    =====================================================*/

    hashRefreshToken(token) {

        return crypto

            .createHash("sha256")

            .update(token)

            .digest("hex");

    }

    /*=====================================================
        GENERATE TOKEN ID (JTI)
    =====================================================*/

    generateTokenId() {

        return crypto.randomUUID();

    }

    /*=====================================================
        CHECK TOKEN TYPE
    =====================================================*/

    isAccessToken(payload) {

        return payload?.token_type === "access";

    }

    isRefreshToken(payload) {

        return payload?.token_type === "refresh";

    }

    isResetToken(payload) {

        return payload?.token_type === "reset";

    }

    isVerifyToken(payload) {

        return payload?.token_type === "verify";

    }

}

module.exports = new Jwt();