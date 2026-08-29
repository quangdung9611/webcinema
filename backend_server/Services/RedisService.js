const redis = require("../Config/redis");

class RedisService {

    // ============================================================
    // BASIC
    // ============================================================

    async set(key, value, ttlSeconds = 300) {
        try {
            await redis.set(key, value, {
                ex: ttlSeconds
            });
            return true;
        } catch (error) {
            console.error(`❌ Redis SET error (${key}):`, error);
            throw error;
        }
    }

    async get(key) {
        try {
            return await redis.get(key);
        } catch (error) {
            console.error(`❌ Redis GET error (${key}):`, error);
            throw error;
        }
    }

    async delete(key) {
        try {
            await redis.del(key);
            return true;
        } catch (error) {
            console.error(`❌ Redis DEL error (${key}):`, error);
            throw error;
        }
    }

    async increment(key) {
        try {
            return await redis.incr(key);
        } catch (error) {
            console.error(`❌ Redis INCR error (${key}):`, error);
            throw error;
        }
    }

    async expire(key, ttlSeconds) {
        try {
            await redis.expire(key, ttlSeconds);
            return true;
        } catch (error) {
            console.error(`❌ Redis EXPIRE error (${key}):`, error);
            throw error;
        }
    }

    async getTTL(key) {
        try {
            return await redis.ttl(key);
        } catch (error) {
            console.error(`❌ Redis TTL error (${key}):`, error);
            return -2;
        }
    }

    // ============================================================
    // OTP
    // ============================================================

    async saveOTP(email, purpose, otp, ttlSeconds = 300) {
        return await this.set(`otp:${email}:${purpose}`, otp, ttlSeconds);
    }

    async getOTP(email, purpose) {
        return await this.get(`otp:${email}:${purpose}`);
    }

    async deleteOTP(email, purpose) {
        await this.delete(`otp:${email}:${purpose}`);
        await this.delete(`otp:${email}:${purpose}:attempts`);
    }

    async getOTPAttempts(email, purpose) {
        const attempts = await this.get(`otp:${email}:${purpose}:attempts`);
        return attempts ? Number(attempts) : 0;
    }

    async incrementOTPAttempts(email, purpose, ttlSeconds = 300) {
        const key = `otp:${email}:${purpose}:attempts`;
        const attempts = await this.increment(key);
        await this.expire(key, ttlSeconds);
        return attempts;
    }

    // ✅ THÊM HÀM NÀY - RESET OTP ATTEMPTS
    async resetOTPAttempts(email, purpose) {
        const key = `otp:${email}:${purpose}:attempts`;
        await this.delete(key);
        return true;
    }

    async isOTPLocked(email, purpose, maxAttempts = 5) {
        return (await this.getOTPAttempts(email, purpose)) >= maxAttempts;
    }

    async checkRateLimit(email, purpose, limit = 3, windowSeconds = 60) {
        const key = `otp:${email}:${purpose}:ratelimit`;
        const current = Number(await this.get(key)) || 0;

        if (current >= limit) {
            return {
                allowed: false,
                remaining: 0,
                remainingSeconds: await this.getTTL(key) || windowSeconds,
                message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${windowSeconds} giây`
            };
        }

        const newCount = await this.increment(key);
        await this.expire(key, windowSeconds);

        return {
            allowed: true,
            remaining: Math.max(0, limit - newCount),
            remainingSeconds: windowSeconds
        };
    }

    // ============================================================
    // SOCKET
    // ============================================================

    async saveUserSocket(userId, socketId, ttlSeconds = 86400) {
        await redis.set(`user:socket:${userId}`, socketId, {
            ex: ttlSeconds
        });
        return true;
    }

    async getUserSocket(userId) {
        return await redis.get(`user:socket:${userId}`);
    }

    async deleteUserSocket(userId) {
        await redis.del(`user:socket:${userId}`);
        return true;
    }

    async isUserOnline(userId) {
        return (await this.getUserSocket(userId)) !== null;
    }

    async refreshUserSocket(userId, ttlSeconds = 86400) {
        const socketId = await this.getUserSocket(userId);
        if (socketId) {
            await redis.expire(`user:socket:${userId}`, ttlSeconds);
            return true;
        }
        return false;
    }

    async getAllActiveSockets() {
        const keys = await redis.keys('user:socket:*');
        const result = [];
        for (const key of keys) {
            const userId = key.replace('user:socket:', '');
            const socketId = await redis.get(key);
            result.push({ userId, socketId });
        }
        return result;
    }

    async deleteAllUserSockets(userId) {
        await this.deleteUserSocket(userId);
        const keys = await redis.keys(`user:socket:${userId}:*`);
        for (const key of keys) {
            await redis.del(key);
        }
        return true;
    }

    // ============================================================
    // LOGIN ATTEMPTS & LOCKOUT
    // ============================================================

    getLockDuration(level) {
        if (level >= 2) {
            return {
                duration: 180,
                text: '3 phút'
            };
        }
        return {
            duration: 60,
            text: '1 phút'
        };
    }

    async checkLoginAttempts(email) {
        return Number(await this.get(`login_attempts:${email}`)) || 0;
    }

    async incrementLoginAttempts(email) {
        const key = `login_attempts:${email}`;
        const attempts = await this.increment(key);
        if (attempts === 1) {
            await this.expire(key, 86400);
        }
        return attempts;
    }

    async resetLoginAttempts(email) {
        await this.delete(`login_attempts:${email}`);
        return true;
    }

    async getLockoutLevel(email) {
        return Number(await this.get(`lockout_level:${email}`)) || 0;
    }

    async incrementLockoutLevel(email) {
        const key = `lockout_level:${email}`;
        const newLevel = await this.increment(key);
        await this.expire(key, 86400);
        return newLevel;
    }

    async resetLockoutLevel(email) {
        await this.delete(`lockout_level:${email}`);
        return true;
    }

    async createLoginLock(email, level) {
        const key = `login_lock:${email}`;
        const { duration, text } = this.getLockDuration(level);
        await this.set(key, String(level), duration);
        await this.resetLoginAttempts(email);
        return {
            level,
            duration,
            text,
            lockedUntil: Date.now() + duration * 1000
        };
    }

    async getLockoutInfo(email) {
        try {
            const lockKey = `login_lock:${email}`;
            const levelValue = await this.get(lockKey);
            const ttl = await this.getTTL(lockKey);

            if (!levelValue || ttl <= 0) {
                return {
                    isLocked: false,
                    level: await this.getLockoutLevel(email),
                    attempts: await this.checkLoginAttempts(email),
                    remainingSeconds: 0,
                    lockDuration: 0,
                    lockDurationText: '',
                    maxAttempts: 5,
                    lockedUntil: 0
                };
            }

            const level = Number(levelValue);
            const { duration, text } = this.getLockDuration(level);
            const lockedUntil = Date.now() + ttl * 1000;

            return {
                isLocked: true,
                level,
                attempts: await this.checkLoginAttempts(email),
                remainingSeconds: ttl,
                lockDuration: duration,
                lockDurationText: text,
                maxAttempts: 5,
                lockedUntil
            };

        } catch (error) {
            console.error('❌ [LOCKOUT] Failed to get lockout info:', error);
            return null;
        }
    }

    async deleteLoginLock(email) {
        await this.delete(`login_lock:${email}`);
        return true;
    }

    // ============================================================
    // PING
    // ============================================================

    async ping() {
        return await redis.ping();
    }
}

module.exports = new RedisService();