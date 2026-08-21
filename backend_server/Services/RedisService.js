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
        🟢 SOCKET MANAGEMENT - THÊM MỚI
    =========================================================*/

    /**
     * Lưu socketId của user
     * @param {number|string} userId - ID của user
     * @param {string} socketId - Socket ID
     * @param {number} ttlSeconds - Thời gian sống (mặc định 24h)
     */
    async saveUserSocket(userId, socketId, ttlSeconds = 86400) {
        try {
            const key = `user:socket:${userId}`;
            await redis.set(key, socketId, { ex: ttlSeconds });

            console.log(`✅ [SOCKET] Saved socket ${socketId} for user ${userId}`);

            return true;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to save socket for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Lấy socketId của user
     * @param {number|string} userId - ID của user
     * @returns {string|null} Socket ID hoặc null nếu không tìm thấy
     */
    async getUserSocket(userId) {
        try {
            const key = `user:socket:${userId}`;
            const socketId = await redis.get(key);

            if (socketId) {
                console.log(`📥 [SOCKET] Got socket ${socketId} for user ${userId}`);
            } else {
                console.log(`ℹ️ [SOCKET] No socket found for user ${userId}`);
            }

            return socketId;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to get socket for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Xóa socketId của user
     * @param {number|string} userId - ID của user
     */
    async deleteUserSocket(userId) {
        try {
            const key = `user:socket:${userId}`;
            await redis.del(key);

            console.log(`🗑️ [SOCKET] Deleted socket for user ${userId}`);

            return true;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to delete socket for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Kiểm tra user có đang online không
     * @param {number|string} userId - ID của user
     * @returns {boolean} True nếu user đang online
     */
    async isUserOnline(userId) {
        try {
            const socketId = await this.getUserSocket(userId);
            const isOnline = socketId !== null;

            console.log(`🔍 [SOCKET] User ${userId} is ${isOnline ? 'online' : 'offline'}`);

            return isOnline;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to check online status for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Cập nhật TTL cho socket của user (gia hạn session)
     * @param {number|string} userId - ID của user
     * @param {number} ttlSeconds - Thời gian sống mới (mặc định 24h)
     */
    async refreshUserSocket(userId, ttlSeconds = 86400) {
        try {
            const key = `user:socket:${userId}`;
            const socketId = await redis.get(key);

            if (socketId) {
                await redis.expire(key, ttlSeconds);
                console.log(`🔄 [SOCKET] Refreshed TTL for user ${userId} (${ttlSeconds}s)`);
                return true;
            } else {
                console.log(`ℹ️ [SOCKET] No socket to refresh for user ${userId}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to refresh socket for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Lấy tất cả socketId đang hoạt động (cho admin)
     * @returns {Array} Danh sách các socket đang hoạt động
     */
    async getAllActiveSockets() {
        try {
            const keys = await redis.keys('user:socket:*');
            const result = [];

            for (const key of keys) {
                const userId = key.replace('user:socket:', '');
                const socketId = await redis.get(key);
                result.push({ userId, socketId });
            }

            console.log(`📊 [SOCKET] Found ${result.length} active sockets`);

            return result;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to get all active sockets:`, error);
            throw error;
        }
    }

    /**
     * Xóa tất cả socket của user (khi user logout all devices)
     * @param {number|string} userId - ID của user
     */
    async deleteAllUserSockets(userId) {
        try {
            // Xóa socket chính
            await this.deleteUserSocket(userId);

            // Xóa các socket khác (nếu có nhiều socket cho cùng user)
            const keys = await redis.keys(`user:socket:${userId}:*`);
            for (const key of keys) {
                await redis.del(key);
            }

            console.log(`🗑️ [SOCKET] Deleted all sockets for user ${userId}`);

            return true;
        } catch (error) {
            console.error(`❌ [SOCKET] Failed to delete all sockets for user ${userId}:`, error);
            throw error;
        }
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