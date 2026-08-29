const redis = require("../Config/redis");

class RedisService {

    // ============================================================
    // BASIC
    // ============================================================

    async set(
        key,
        value,
        ttlSeconds = 300
    ) {
        try {
            await redis.set(
                key,
                value,
                {
                    ex: ttlSeconds
                }
            );

            return true;
        } catch (error) {
            console.error(
                `❌ Redis SET error (${key}):`,
                error
            );

            throw error;
        }
    }

    async get(key) {
        try {
            return await redis.get(
                key
            );
        } catch (error) {
            console.error(
                `❌ Redis GET error (${key}):`,
                error
            );

            throw error;
        }
    }

    async delete(key) {
        try {
            await redis.del(key);

            return true;
        } catch (error) {
            console.error(
                `❌ Redis DEL error (${key}):`,
                error
            );

            throw error;
        }
    }

    async increment(key) {
        try {
            return await redis.incr(
                key
            );
        } catch (error) {
            console.error(
                `❌ Redis INCR error (${key}):`,
                error
            );

            throw error;
        }
    }

    async expire(
        key,
        ttlSeconds
    ) {
        try {
            await redis.expire(
                key,
                ttlSeconds
            );

            return true;
        } catch (error) {
            console.error(
                `❌ Redis EXPIRE error (${key}):`,
                error
            );

            throw error;
        }
    }

    async getTTL(key) {
        try {
            return await redis.ttl(
                key
            );
        } catch (error) {
            console.error(
                `❌ Redis TTL error (${key}):`,
                error
            );

            return -2;
        }
    }

    // ============================================================
    // OTP
    // ============================================================

    getOtpKey(
        email,
        purpose
    ) {
        return `otp:${email}:${purpose}`;
    }

    getOtpAttemptsKey(
        email,
        purpose
    ) {
        return `otp:${email}:${purpose}:attempts`;
    }

    getOtpLockKey(
        email,
        purpose
    ) {
        return `otp:${email}:${purpose}:lock`;
    }

    getOtpRateLimitKey(
        email,
        purpose
    ) {
        return `otp:${email}:${purpose}:ratelimit`;
    }

    // ============================================================
    // SAVE OTP
    // ============================================================

    async saveOTP(
        email,
        purpose,
        otp,
        ttlSeconds = 300
    ) {
        return await this.set(
            this.getOtpKey(
                email,
                purpose
            ),
            otp,
            ttlSeconds
        );
    }

    // ============================================================
    // GET OTP
    // ============================================================

    async getOTP(
        email,
        purpose
    ) {
        return await this.get(
            this.getOtpKey(
                email,
                purpose
            )
        );
    }

    // ============================================================
    // DELETE OTP
    //
    // CHỈ xóa:
    // - OTP
    // - attempts
    //
    // KHÔNG xóa:
    // - OTP LOCK
    // - RATE LIMIT
    // ============================================================

    async deleteOTP(
        email,
        purpose
    ) {
        await this.delete(
            this.getOtpKey(
                email,
                purpose
            )
        );

        await this.delete(
            this.getOtpAttemptsKey(
                email,
                purpose
            )
        );

        return true;
    }

    // ============================================================
    // OTP ATTEMPTS
    // ============================================================

    async getOTPAttempts(
        email,
        purpose
    ) {
        const attempts =
            await this.get(
                this.getOtpAttemptsKey(
                    email,
                    purpose
                )
            );

        return attempts
            ? Number(attempts)
            : 0;
    }

    async incrementOTPAttempts(
        email,
        purpose,
        ttlSeconds = 300
    ) {
        const key =
            this.getOtpAttemptsKey(
                email,
                purpose
            );

        const attempts =
            await this.increment(
                key
            );

        /*
         * Mỗi lần sai refresh TTL attempts.
         */
        await this.expire(
            key,
            ttlSeconds
        );

        return attempts;
    }

    async resetOTPAttempts(
        email,
        purpose
    ) {
        await this.delete(
            this.getOtpAttemptsKey(
                email,
                purpose
            )
        );

        return true;
    }

    // ============================================================
    // OTP LOCK
    //
    // KEY:
    //
    // otp:{email}:{purpose}:lock
    //
    // Lock tồn tại độc lập với OTP.
    // ============================================================

    async createOTPLock(
        email,
        purpose,
        durationSeconds = 300
    ) {
        const key =
            this.getOtpLockKey(
                email,
                purpose
            );

        await this.set(
            key,
            '1',
            durationSeconds
        );

        const ttl =
            await this.getTTL(
                key
            );

        const remainingSeconds =
            ttl > 0
                ? ttl
                : durationSeconds;

        const lockedUntil =
            Date.now() +
            remainingSeconds *
                1000;

        return {
            isLocked: true,
            remainingSeconds,
            lockedUntil,
            duration:
                durationSeconds
        };
    }

    // ============================================================
    // CHECK OTP LOCK
    // ============================================================

    async isOTPLocked(
        email,
        purpose
    ) {
        const key =
            this.getOtpLockKey(
                email,
                purpose
            );

        const value =
            await this.get(key);

        if (!value) {
            return false;
        }

        const ttl =
            await this.getTTL(
                key
            );

        return ttl > 0;
    }

    // ============================================================
    // GET OTP LOCK INFO
    // ============================================================

    async getOTPLockInfo(
        email,
        purpose
    ) {
        const key =
            this.getOtpLockKey(
                email,
                purpose
            );

        const value =
            await this.get(key);

        const ttl =
            await this.getTTL(
                key
            );

        if (
            !value ||
            ttl <= 0
        ) {
            return {
                isLocked: false,
                remainingSeconds: 0,
                lockedUntil: 0
            };
        }

        return {
            isLocked: true,
            remainingSeconds:
                ttl,
            lockedUntil:
                Date.now() +
                ttl * 1000
        };
    }

    // ============================================================
    // DELETE OTP LOCK
    // ============================================================

    async deleteOTPLock(
        email,
        purpose
    ) {
        await this.delete(
            this.getOtpLockKey(
                email,
                purpose
            )
        );

        return true;
    }

    // ============================================================
    // RATE LIMIT GỬI OTP
    // ============================================================

    async checkRateLimit(
        email,
        purpose,
        limit = 3,
        windowSeconds = 300
    ) {
        const key =
            this.getOtpRateLimitKey(
                email,
                purpose
            );

        const currentRaw =
            await this.get(key);

        const current =
            Number(currentRaw) || 0;

        // ========================================================
        // ĐÃ VƯỢT LIMIT
        // ========================================================

        if (
            current >= limit
        ) {
            let ttl =
                await this.getTTL(
                    key
                );

            if (
                ttl <= 0
            ) {
                ttl =
                    windowSeconds;
            }

            return {
                allowed: false,
                remaining: 0,
                remainingSeconds:
                    ttl,
                maxAttempts:
                    limit,
                message:
                    `Quá nhiều yêu cầu. Vui lòng thử lại sau ${ttl} giây`
            };
        }

        // ========================================================
        // TĂNG COUNTER
        // ========================================================

        const newCount =
            await this.increment(
                key
            );

        /*
         * Chỉ set TTL khi key mới.
         *
         * Nếu mỗi lần increment lại expire,
         * window 5 phút sẽ bị kéo dài liên tục.
         */
        if (
            newCount === 1
        ) {
            await this.expire(
                key,
                windowSeconds
            );
        }

        const ttl =
            await this.getTTL(
                key
            );

        return {
            allowed: true,
            remaining:
                Math.max(
                    0,
                    limit -
                        newCount
                ),
            remainingSeconds:
                ttl > 0
                    ? ttl
                    : windowSeconds,
            maxAttempts:
                limit
        };
    }

    // ============================================================
    // RESET RATE LIMIT
    // ============================================================

    async resetRateLimit(
        email,
        purpose
    ) {
        await this.delete(
            this.getOtpRateLimitKey(
                email,
                purpose
            )
        );

        return true;
    }

    // ============================================================
    // SOCKET
    // ============================================================

    async saveUserSocket(
        userId,
        socketId,
        ttlSeconds = 86400
    ) {
        await redis.set(
            `user:socket:${userId}`,
            socketId,
            {
                ex: ttlSeconds
            }
        );

        return true;
    }

    async getUserSocket(
        userId
    ) {
        return await redis.get(
            `user:socket:${userId}`
        );
    }

    async deleteUserSocket(
        userId
    ) {
        await redis.del(
            `user:socket:${userId}`
        );

        return true;
    }

    async isUserOnline(
        userId
    ) {
        return (
            await this.getUserSocket(
                userId
            )
        ) !== null;
    }

    async refreshUserSocket(
        userId,
        ttlSeconds = 86400
    ) {
        const socketId =
            await this.getUserSocket(
                userId
            );

        if (socketId) {
            await redis.expire(
                `user:socket:${userId}`,
                ttlSeconds
            );

            return true;
        }

        return false;
    }

    async getAllActiveSockets() {
        const keys =
            await redis.keys(
                'user:socket:*'
            );

        const result = [];

        for (
            const key of keys
        ) {
            const userId =
                key.replace(
                    'user:socket:',
                    ''
                );

            const socketId =
                await redis.get(
                    key
                );

            result.push({
                userId,
                socketId
            });
        }

        return result;
    }

    async deleteAllUserSockets(
        userId
    ) {
        await this.deleteUserSocket(
            userId
        );

        const keys =
            await redis.keys(
                `user:socket:${userId}:*`
            );

        for (
            const key of keys
        ) {
            await redis.del(
                key
            );
        }

        return true;
    }

    // ============================================================
    // LOGIN ATTEMPTS & LOCKOUT
    // ============================================================

    getLockDuration(
        level
    ) {
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

    async checkLoginAttempts(
        email
    ) {
        return (
            Number(
                await this.get(
                    `login_attempts:${email}`
                )
            ) || 0
        );
    }

    async incrementLoginAttempts(
        email
    ) {
        const key =
            `login_attempts:${email}`;

        const attempts =
            await this.increment(
                key
            );

        if (
            attempts === 1
        ) {
            await this.expire(
                key,
                86400
            );
        }

        return attempts;
    }

    async resetLoginAttempts(
        email
    ) {
        await this.delete(
            `login_attempts:${email}`
        );

        return true;
    }

    async getLockoutLevel(
        email
    ) {
        return (
            Number(
                await this.get(
                    `lockout_level:${email}`
                )
            ) || 0
        );
    }

    async incrementLockoutLevel(
        email
    ) {
        const key =
            `lockout_level:${email}`;

        const newLevel =
            await this.increment(
                key
            );

        await this.expire(
            key,
            86400
        );

        return newLevel;
    }

    async resetLockoutLevel(
        email
    ) {
        await this.delete(
            `lockout_level:${email}`
        );

        return true;
    }

    async createLoginLock(
        email,
        level
    ) {
        const key =
            `login_lock:${email}`;

        const {
            duration,
            text
        } =
            this.getLockDuration(
                level
            );

        await this.set(
            key,
            String(level),
            duration
        );

        await this.resetLoginAttempts(
            email
        );

        const ttl =
            await this.getTTL(
                key
            );

        const remainingSeconds =
            ttl > 0
                ? ttl
                : duration;

        return {
            level,
            duration,
            text,
            remainingSeconds,
            lockedUntil:
                Date.now() +
                remainingSeconds *
                    1000
        };
    }

    async getLockoutInfo(
        email
    ) {
        try {
            const lockKey =
                `login_lock:${email}`;

            const levelValue =
                await this.get(
                    lockKey
                );

            const ttl =
                await this.getTTL(
                    lockKey
                );

            if (
                !levelValue ||
                ttl <= 0
            ) {
                return {
                    isLocked: false,
                    level:
                        await this.getLockoutLevel(
                            email
                        ),
                    attempts:
                        await this.checkLoginAttempts(
                            email
                        ),
                    remainingSeconds: 0,
                    lockDuration: 0,
                    lockDurationText: '',
                    maxAttempts: 5,
                    lockedUntil: 0
                };
            }

            const level =
                Number(
                    levelValue
                );

            const {
                duration,
                text
            } =
                this.getLockDuration(
                    level
                );

            return {
                isLocked: true,
                level,
                attempts:
                    await this.checkLoginAttempts(
                        email
                    ),
                remainingSeconds:
                    ttl,
                lockDuration:
                    duration,
                lockDurationText:
                    text,
                maxAttempts: 5,
                lockedUntil:
                    Date.now() +
                    ttl * 1000
            };
        } catch (error) {
            console.error(
                '❌ [LOCKOUT] Failed to get lockout info:',
                error
            );

            return null;
        }
    }

    async deleteLoginLock(
        email
    ) {
        await this.delete(
            `login_lock:${email}`
        );

        return true;
    }

    // ============================================================
    // PING
    // ============================================================

    async ping() {
        return await redis.ping();
    }
}

module.exports =
    new RedisService();