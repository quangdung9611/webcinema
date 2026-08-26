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
            return true;
        } catch (error) {
            console.error(`❌ Redis SET error (${key}):`, error);
            throw error;
        }
    }

    async get(key) {
        try {
            const value = await redis.get(key);
            return value;
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
            const result = await redis.incr(key);
            return result;
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

    /*=========================================================
        OTP METHODS
    =========================================================*/

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
        SOCKET MANAGEMENT
    =========================================================*/

    async saveUserSocket(userId, socketId, ttlSeconds = 86400) {
        try {
            const key = `user:socket:${userId}`;
            await redis.set(key, socketId, { ex: ttlSeconds });
            return true;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to save socket for user ${userId}:`, error);
            throw error;
        }
    }

    async getUserSocket(userId) {
        try {
            const key = `user:socket:${userId}`;
            const socketId = await redis.get(key);
            return socketId;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to get socket for user ${userId}:`, error);
            throw error;
        }
    }

    async deleteUserSocket(userId) {
        try {
            const key = `user:socket:${userId}`;
            await redis.del(key);
            return true;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to delete socket for user ${userId}:`, error);
            throw error;
        }
    }

    async isUserOnline(userId) {
        try {
            const socketId = await this.getUserSocket(userId);
            return socketId !== null;
        } catch (error) {
            return false;
        }
    }

    async refreshUserSocket(userId, ttlSeconds = 86400) {
        try {
            const key = `user:socket:${userId}`;
            const socketId = await redis.get(key);
            if (socketId) {
                await redis.expire(key, ttlSeconds);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to refresh socket for user ${userId}:`, error);
            throw error;
        }
    }

    async getAllActiveSockets() {
        try {
            const keys = await redis.keys('user:socket:*');
            const result = [];
            for (const key of keys) {
                const userId = key.replace('user:socket:', '');
                const socketId = await redis.get(key);
                result.push({ userId, socketId });
            }
            return result;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to get all active sockets:`, error);
            throw error;
        }
    }

    async deleteAllUserSockets(userId) {
        try {
            await this.deleteUserSocket(userId);
            const keys = await redis.keys(`user:socket:${userId}:*`);
            for (const key of keys) {
                await redis.del(key);
            }
            return true;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to delete all sockets for user ${userId}:`, error);
            throw error;
        }
    }

    /*=========================================================
        🔥 LOGIN ATTEMPTS (SỐ LẦN THỬ ĐĂNG NHẬP)
    =========================================================*/

    async checkLoginAttempts(email) {
        const key = `login_attempts:${email}`;
        const attempts = await this.get(key);
        return attempts ? Number(attempts) : 0;
    }

    async incrementLoginAttempts(email) {
        const key = `login_attempts:${email}`;
        const attempts = await this.increment(key);

        const ttl = await this.getTTL(key);
        if (ttl === -1) {
            await this.expire(key, 60);
        }

        return attempts;
    }

    async resetLoginAttempts(email) {
        const key = `login_attempts:${email}`;
        await this.delete(key);
    }

    async isAccountLocked(email) {
        const attempts = await this.checkLoginAttempts(email);
        return attempts >= 5;
    }

    async getLockTimeRemaining(email) {
        const key = `login_attempts:${email}`;
        const ttl = await this.getTTL(key);
        return ttl > 0 ? ttl : 0;
    }

    /*=========================================================
        🔥 LOCKOUT LEVEL - KHÓA TĂNG DẦN
    =========================================================*/

    async getLockoutLevel(email) {
        const key = `lockout_level:${email}`;
        const level = await this.get(key);
        return level ? Number(level) : 0;
    }

    async incrementLockoutLevel(email) {
        const key = `lockout_level:${email}`;
        const level = await this.increment(key);
        await this.expire(key, 86400); // 24 giờ
        return level;
    }

    async resetLockoutLevel(email) {
        const key = `lockout_level:${email}`;
        await this.delete(key);
    }

    /*=========================================================
        🔥 LOCKOUT INFO - LẤY THÔNG TIN KHÓA CHI TIẾT
    =========================================================*/

    async getLockoutInfo(email) {
        try {
            const level = await this.getLockoutLevel(email);
            const attempts = await this.checkLoginAttempts(email);
            const ttl = await this.getLockTimeRemaining(email);
            
            // Tính thời gian lock dựa trên level
            let lockDuration = 0;
            let lockDurationText = '';
            
            if (level >= 4) {
                lockDuration = 3600;
                lockDurationText = '1 giờ';
            } else if (level === 3) {
                lockDuration = 900;
                lockDurationText = '15 phút';
            } else if (level === 2) {
                lockDuration = 300;
                lockDurationText = '5 phút';
            } else if (level === 1) {
                lockDuration = 60;
                lockDurationText = '1 phút';
            }
            
            // Nếu level > 0 nhưng attempts < 5, tức là đã hết lock nhưng chưa reset level
            const isLocked = level >= 1 && attempts >= 5;
            
            return {
                isLocked: isLocked,
                level: level,
                attempts: attempts,
                remainingSeconds: isLocked ? ttl : 0,
                lockDuration: lockDuration,
                lockDurationText: lockDurationText,
                maxAttempts: 5
            };
        } catch (error) {
            console.error(`❌ [LOCKOUT] Failed to get lockout info:`, error);
            return null;
        }
    }

    /*=========================================================
        HELPER - LẤY TTL
    =========================================================*/

    async getTTL(key) {
        try {
            return await redis.ttl(key);
        } catch (error) {
            console.error(`❌ Redis TTL error (${key}):`, error);
            return -2;
        }
    }

    /*=========================================================
        HEALTH CHECK
    =========================================================*/

    async ping() {
        try {
            const result = await redis.ping();
            return result;
        } catch (error) {
            console.error("❌ Redis Ping Error:", error);
            throw error;
        }
    }
}

module.exports = new RedisService();