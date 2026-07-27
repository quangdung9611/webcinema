const redis = require("../Config/redis");

class RedisService {

    /*=========================================================
        BASIC REDIS METHODS
    =========================================================*/

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

    /*=========================================================
        OTP METHODS
    =========================================================*/

    async saveOTP(email, purpose, otp, ttlSeconds = 300) {

        const key = `otp:${email}:${purpose}`;

        console.log("\n========== SAVE OTP ==========");
        console.log("📧 Email   :", email);
        console.log("🎯 Purpose :", purpose);
        console.log("🔑 Key     :", key);
        console.log("🔢 OTP     :", otp);

        const saved = await this.set(key, otp, ttlSeconds);

        const value = await this.get(key);

        console.log("📥 Redis value sau khi lưu :", value);
        console.log("================================\n");

        return saved;
    }

    async getOTP(email, purpose) {

        const key = `otp:${email}:${purpose}`;

        console.log("\n========== GET OTP ==========");
        console.log("📧 Email   :", email);
        console.log("🎯 Purpose :", purpose);
        console.log("🔑 Key     :", key);

        const value = await this.get(key);

        console.log("📥 OTP đọc từ Redis :", value);
        console.log("==============================\n");

        return value;
    }

    async deleteOTP(email, purpose) {

        const key = `otp:${email}:${purpose}`;

        console.log("\n========== DELETE OTP ==========");
        console.log("📧 Email   :", email);
        console.log("🎯 Purpose :", purpose);
        console.log("🔑 Key     :", key);

        await this.delete(key);
        await this.deleteAttempts(email, purpose);

        console.log("✅ OTP Deleted");
        console.log("================================\n");
    }

    async deleteAttempts(email, purpose) {
        const key = `otp:${email}:${purpose}:attempts`;

        console.log(`🗑️ Delete attempts: ${key}`);

        await this.delete(key);
    }

    async getOTPAttempts(email, purpose) {

        const key = `otp:${email}:${purpose}:attempts`;

        const attempts = await this.get(key);

        const total = attempts ? parseInt(attempts) : 0;

        console.log(`🔢 OTP Attempts: ${total}`);

        return total;
    }

    async incrementOTPAttempts(email, purpose, ttlSeconds = 300) {

        const key = `otp:${email}:${purpose}:attempts`;

        const attempts = await this.increment(key);

        await this.expire(key, ttlSeconds);

        console.log(`❌ OTP Sai lần thứ: ${attempts}`);

        return attempts;
    }

    async isOTPLocked(email, purpose, maxAttempts = 5) {

        const attempts = await this.getOTPAttempts(email, purpose);

        const locked = attempts >= maxAttempts;

        console.log(
            `🔒 OTP Locked? ${locked} (${attempts}/${maxAttempts})`
        );

        return locked;
    }

    /*=========================================================
        RATE LIMIT
    =========================================================*/

    async checkRateLimit(email, purpose, limit = 3, windowSeconds = 60) {

        const key = `otp:${email}:${purpose}:ratelimit`;

        console.log("\n========== RATE LIMIT ==========");
        console.log("Key:", key);

        const current = await this.get(key);

        if (current) {

            const count = parseInt(current);

            console.log(`Current Count: ${count}`);

            if (count >= limit) {

                console.log("⛔ Rate Limit Block");

                return {
                    allowed: false,
                    remaining: 0,
                    message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${windowSeconds} giây`
                };
            }
        }

        const newCount = await this.increment(key);

        await this.expire(key, windowSeconds);

        console.log(`✅ Rate Limit Count: ${newCount}`);
        console.log("===============================\n");

        return {
            allowed: true,
            remaining: limit - newCount
        };
    }
}

module.exports = new RedisService();