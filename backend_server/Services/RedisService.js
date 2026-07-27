const redis = require("../Config/redis");

class RedisService {

    async set(key, value, ttlSeconds = 300) {
        try {
            await redis.set(key, value, { ex: ttlSeconds });
            console.log(`✅ Redis SET success: ${key} = ${value}`);
            return true;
        } catch (error) {
            console.error(`❌ Redis SET error: ${key}`, error);
            return false;
        }
    }

    async get(key) {
        try {
            const value = await redis.get(key);
            console.log(`📥 Redis GET: ${key} => ${value}`);
            return value;
        } catch (error) {
            console.error(`❌ Redis GET error: ${key}`, error);
            return null;
        }
    }

    async delete(key) {
        try {
            await redis.del(key);
            console.log(`🗑️ Redis DEL: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Redis DEL error: ${key}`, error);
            return false;
        }
    }

    async increment(key) {
        try {
            const result = await redis.incr(key);
            console.log(`📈 Redis INCR: ${key} => ${result}`);
            return result;
        } catch (error) {
            console.error(`❌ Redis INCR error: ${key}`, error);
            return 0;
        }
    }

    async expire(key, ttlSeconds) {
        try {
            await redis.expire(key, ttlSeconds);
            console.log(`⏰ Redis EXPIRE: ${key} ${ttlSeconds}s`);
            return true;
        } catch (error) {
            console.error(`❌ Redis EXPIRE error: ${key}`, error);
            return false;
        }
    }

    // OTP specific methods
    async saveOTP(email, purpose, otp, ttlSeconds = 300) {
        const key = `otp:${email}:${purpose}`;
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
        return attempts ? parseInt(attempts) : 0;
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
}

module.exports = new RedisService();