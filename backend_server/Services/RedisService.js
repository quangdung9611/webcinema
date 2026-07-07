/*=========================================================
    DEPENDENCIES
=========================================================*/

const redis = require("../Config/Redis");

/*=========================================================
    REDIS SERVICE
=========================================================*/

class RedisService {

    /*=========================================================
        SET WITH EXPIRY
    =========================================================*/
    async set(key, value, ttlSeconds = 300) {
        try {
            await redis.set(key, value, { ex: ttlSeconds });
            return true;
        } catch (error) {
            console.error("Redis set error:", error);
            return false;
        }
    }

    /*=========================================================
        GET
    =========================================================*/
    async get(key) {
        try {
            return await redis.get(key);
        } catch (error) {
            console.error("Redis get error:", error);
            return null;
        }
    }

    /*=========================================================
        DELETE
    =========================================================*/
    async delete(key) {
        try {
            await redis.del(key);
            return true;
        } catch (error) {
            console.error("Redis delete error:", error);
            return false;
        }
    }

    /*=========================================================
        INCREMENT
    =========================================================*/
    async increment(key) {
        try {
            return await redis.incr(key);
        } catch (error) {
            console.error("Redis increment error:", error);
            return 0;
        }
    }

    /*=========================================================
        EXPIRE (SET TTL)
    =========================================================*/
    async expire(key, ttlSeconds) {
        try {
            await redis.expire(key, ttlSeconds);
            return true;
        } catch (error) {
            console.error("Redis expire error:", error);
            return false;
        }
    }

    /*=========================================================
        OTP METHODS
    =========================================================*/

    /*=====================================================
        SAVE OTP
    =====================================================*/
    async saveOTP(email, purpose, otp, ttlSeconds = 300) {
        const key = `otp:${email}:${purpose}`;
        return await this.set(key, otp, ttlSeconds);
    }

    /*=====================================================
        GET OTP
    =====================================================*/
    async getOTP(email, purpose) {
        const key = `otp:${email}:${purpose}`;
        return await this.get(key);
    }

    /*=====================================================
        DELETE OTP
    =====================================================*/
    async deleteOTP(email, purpose) {
        const key = `otp:${email}:${purpose}`;
        await this.delete(key);
        await this.deleteAttempts(email, purpose);
    }

    /*=====================================================
        GET OTP ATTEMPTS
    =====================================================*/
    async getOTPAttempts(email, purpose) {
        const key = `otp:${email}:${purpose}:attempts`;
        const attempts = await this.get(key);
        return attempts ? parseInt(attempts) : 0;
    }

    /*=====================================================
        INCREMENT OTP ATTEMPTS
    =====================================================*/
    async incrementOTPAttempts(email, purpose, ttlSeconds = 300) {
        const key = `otp:${email}:${purpose}:attempts`;
        const attempts = await this.increment(key);
        await this.expire(key, ttlSeconds);
        return attempts;
    }

    /*=====================================================
        DELETE OTP ATTEMPTS
    =====================================================*/
    async deleteAttempts(email, purpose) {
        const key = `otp:${email}:${purpose}:attempts`;
        await this.delete(key);
    }

    /*=====================================================
        IS OTP LOCKED
    =====================================================*/
    async isOTPLocked(email, purpose, maxAttempts = 5) {
        const attempts = await this.getOTPAttempts(email, purpose);
        return attempts >= maxAttempts;
    }

    /*=====================================================
        RATE LIMIT CHECK
    =====================================================*/
    async checkRateLimit(email, purpose, limit = 3, windowSeconds = 60) {
        const key = `otp:${email}:${purpose}:ratelimit`;
        const current = await this.get(key);
        
        if (current) {
            const count = parseInt(current);
            if (count >= limit) {
                return {
                    allowed: false,
                    remaining: 0,
                    message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${windowSeconds} giây`
                };
            }
        }

        const newCount = await this.increment(key);
        await this.expire(key, windowSeconds);

        return {
            allowed: true,
            remaining: limit - newCount
        };
    }

    /*=========================================================
        TOKEN BLACKLIST (Optional)
    =========================================================*/
    async blacklistToken(token, ttlSeconds = 86400) {
        const key = `blacklist:${token}`;
        return await this.set(key, "revoked", ttlSeconds);
    }

    async isTokenBlacklisted(token) {
        const key = `blacklist:${token}`;
        const result = await this.get(key);
        return result !== null;
    }

    /*=========================================================
        DELETE ALL OTP FOR EMAIL
    =========================================================*/
    async deleteAllOTP(email) {
        try {
            const keys = await redis.keys(`otp:${email}:*`);
            for (const key of keys) {
                await this.delete(key);
            }
            return keys.length;
        } catch (error) {
            console.error("Redis deleteAllOTP error:", error);
            return 0;
        }
    }

    /*=========================================================
        HEALTH CHECK
    =========================================================*/
    async ping() {
        try {
            await redis.ping();
            return true;
        } catch (error) {
            console.error("Redis ping error:", error);
            return false;
        }
    }
}

module.exports = new RedisService();