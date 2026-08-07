const redis = require("../Config/redis");

class RedisService {

    /*=========================================================
        BASIC REDIS METHODS
    =========================================================*/

    async set(key, value, ttlSeconds = 300) {
        try {
            await redis.set(key, value, {
                ex: ttlSeconds
            });

            console.log(`✅ Redis SET: ${key}`);

            return true;
        } catch (error) {
            console.error(`❌ Redis SET error (${key}):`, error);
            throw error;
        }
    }

    async get(key) {
        try {
            const value = await redis.get(key);

            console.log(`📥 Redis GET: ${key}`);

            return value;
        } catch (error) {
            console.error(`❌ Redis GET error (${key}):`, error);
            throw error;
        }
    }

    async delete(key) {
        try {
            await redis.del(key);

            console.log(`🗑️ Redis DEL: ${key}`);

            return true;
        } catch (error) {
            console.error(`❌ Redis DEL error (${key}):`, error);
            throw error;
        }
    }

    async increment(key) {
        try {
            const result = await redis.incr(key);

            console.log(`📈 Redis INCR: ${key} => ${result}`);

            return result;
        } catch (error) {
            console.error(`❌ Redis INCR error (${key}):`, error);
            throw error;
        }
    }

    async expire(key, ttlSeconds) {
        try {
            await redis.expire(key, ttlSeconds);

            console.log(`⏰ Redis EXPIRE: ${key} (${ttlSeconds}s)`);

            return true;
        } catch (error) {
            console.error(`❌ Redis EXPIRE error (${key}):`, error);
            throw error;
        }
    }

    /*=========================================================
        OTP METHODS
    =========================================================*/

    async saveOTP(email, purpose, otp, ttlSeconds = 300) {

        const key = `otp:${email}:${purpose}`;

        console.log(`🔐 Save OTP -> ${key}`);

        return await this.set(key, otp, ttlSeconds);
    }

    async getOTP(email, purpose) {

        const key = `otp:${email}:${purpose}`;

        return await this.get(key);
    }

    async deleteOTP(email, purpose) {

        const key = `otp:${email}:${purpose}`;

        await this.delete(key);
        await this.deleteAttempts(email, purpose);
    }

    async deleteAttempts(email, purpose) {

        const key = `otp:${email}:${purpose}:attempts`;

        await this.delete(key);
    }

    async getOTPAttempts(email, purpose) {

        const key = `otp:${email}:${purpose}:attempts`;

        const attempts = await this.get(key);

        return attempts ? Number(attempts) : 0;
    }

    async incrementOTPAttempts(email, purpose, ttlSeconds = 300) {

        const key = `otp:${email}:${purpose}:attempts`;

        const attempts = await this.increment(key);

        await this.expire(key, ttlSeconds);

        return attempts;
    }

    async isOTPLocked(email, purpose, maxAttempts = 5) {

        const attempts = await this.getOTPAttempts(email, purpose);

        return attempts >= maxAttempts;
    }

    /*=========================================================
        RATE LIMIT
    =========================================================*/

    async checkRateLimit(email, purpose, limit = 3, windowSeconds = 60) {

        const key = `otp:${email}:${purpose}:ratelimit`;

        const current = await this.get(key);

        const count = current ? Number(current) : 0;

        if (count >= limit) {
            return {
                allowed: false,
                remaining: 0,
                message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${windowSeconds} giây`
            };
        }

        const newCount = await this.increment(key);

        await this.expire(key, windowSeconds);

        return {
            allowed: true,
            remaining: Math.max(0, limit - newCount)
        };
    }

    /*=========================================================
        HEALTH CHECK
    =========================================================*/

    async ping() {
        try {
            const result = await redis.ping();

            console.log("🏓 Redis Ping:", result);

            return result;
        } catch (error) {
            console.error("❌ Redis Ping Error:", error);
            throw error;
        }
    }
}

module.exports = new RedisService();