const redis = require("../Config/redis");

// ============================================================
// CONFIG
// ============================================================

const DEFAULT_SEAT_LOCK_TTL = 10 * 60; // 10 phút


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
    // SEAT LOCK
    //
    // MỤC TIÊU:
    // Chống nhiều người cùng lúc chọn cùng một ghế.
    //
    // Key:
    // seat_lock:{showtimeId}:{seatId}
    //
    // Value:
    // ownerToken
    //
    // Redis:
    // SET NX EX
    //
    // NX = chỉ tạo nếu key chưa tồn tại
    // EX = tự động hết hạn
    // ============================================================

    buildSeatLockKey(showtimeId, seatId) {
        return `seat_lock:${showtimeId}:${seatId}`;
    }


    // ============================================================
    // ACQUIRE SEAT LOCK
    // ============================================================

    async acquireSeatLock(
        showtimeId,
        seatId,
        ownerToken,
        ttlSeconds = DEFAULT_SEAT_LOCK_TTL
    ) {
        if (!showtimeId) {
            throw new Error("showtimeId không hợp lệ");
        }

        if (!seatId) {
            throw new Error("seatId không hợp lệ");
        }

        if (!ownerToken) {
            throw new Error("ownerToken không hợp lệ");
        }

        const key = this.buildSeatLockKey(
            showtimeId,
            seatId
        );

        try {

            /*
             * QUAN TRỌNG:
             *
             * SET NX EX là một operation atomic.
             *
             * Nếu:
             *
             * User A -> SET NX
             * User B -> SET NX
             *
             * cùng lúc cho cùng key,
             *
             * Redis chỉ cho MỘT request thành công.
             */

            const result = await redis.set(
                key,
                ownerToken,
                {
                    nx: true,
                    ex: ttlSeconds
                }
            );

            if (result === "OK") {

                return {
                    success: true,
                    locked: true,
                    key,
                    ownerToken,
                    ttl: ttlSeconds
                };
            }


            // ====================================================
            // GHẾ ĐÃ BỊ NGƯỜI KHÁC GIỮ
            // ====================================================

            const currentOwner =
                await redis.get(key);

            const ttl =
                await redis.ttl(key);


            return {
                success: false,
                locked: false,
                key,
                ownerToken: currentOwner || null,
                ttl: ttl > 0 ? ttl : 0
            };

        } catch (error) {

            console.error(
                `❌ [SEAT LOCK] Acquire error (${key}):`,
                error
            );

            throw error;
        }
    }


    // ============================================================
    // CHECK SEAT LOCK
    // ============================================================

    async getSeatLock(showtimeId, seatId) {

        const key = this.buildSeatLockKey(
            showtimeId,
            seatId
        );

        try {

            const ownerToken =
                await redis.get(key);

            const ttl =
                await redis.ttl(key);


            if (!ownerToken || ttl <= 0) {

                return {
                    locked: false,
                    ownerToken: null,
                    ttl: 0
                };
            }


            return {
                locked: true,
                ownerToken,
                ttl
            };

        } catch (error) {

            console.error(
                `❌ [SEAT LOCK] Get error (${key}):`,
                error
            );

            throw error;
        }
    }


    // ============================================================
    // CHECK OWNER
    // ============================================================

    async isSeatLockOwner(
        showtimeId,
        seatId,
        ownerToken
    ) {

        if (!ownerToken) {
            return false;
        }

        const key =
            this.buildSeatLockKey(
                showtimeId,
                seatId
            );

        try {

            const currentOwner =
                await redis.get(key);

            return (
                currentOwner &&
                currentOwner === ownerToken
            );

        } catch (error) {

            console.error(
                `❌ [SEAT LOCK] Owner check error (${key}):`,
                error
            );

            throw error;
        }
    }


    // ============================================================
    // RELEASE SEAT LOCK
    //
    // Chỉ owner mới được phép mở khóa.
    //
    // Lưu ý:
    // Hàm này sẽ kiểm tra owner trước khi DEL.
    //
    // Ở bước server.js tiếp theo mình sẽ sử dụng ownerToken
    // để đảm bảo user A không thể mở ghế của user B.
    // ============================================================

    async releaseSeatLock(
        showtimeId,
        seatId,
        ownerToken
    ) {

        if (!ownerToken) {
            return false;
        }

        const key =
            this.buildSeatLockKey(
                showtimeId,
                seatId
            );

        try {

            const currentOwner =
                await redis.get(key);


            // Không tồn tại
            if (!currentOwner) {
                return false;
            }


            // Không phải owner
            if (currentOwner !== ownerToken) {

                console.warn(
                    `⚠️ [SEAT LOCK] Unauthorized release attempt: ${key}`
                );

                return false;
            }


            await redis.del(key);

            return true;

        } catch (error) {

            console.error(
                `❌ [SEAT LOCK] Release error (${key}):`,
                error
            );

            throw error;
        }
    }


    // ============================================================
    // REFRESH SEAT LOCK
    //
    // Dùng khi muốn gia hạn thời gian giữ ghế.
    // Ví dụ:
    //
    // User đang ở trang thanh toán
    // ↓
    // cần thêm thời gian
    //
    // Nhưng CHỈ owner mới được gia hạn.
    // ============================================================

    async refreshSeatLock(
        showtimeId,
        seatId,
        ownerToken,
        ttlSeconds = DEFAULT_SEAT_LOCK_TTL
    ) {

        if (!ownerToken) {
            return false;
        }

        const key =
            this.buildSeatLockKey(
                showtimeId,
                seatId
            );

        try {

            const currentOwner =
                await redis.get(key);


            if (!currentOwner) {
                return false;
            }


            if (currentOwner !== ownerToken) {
                return false;
            }


            await redis.expire(
                key,
                ttlSeconds
            );

            return true;

        } catch (error) {

            console.error(
                `❌ [SEAT LOCK] Refresh error (${key}):`,
                error
            );

            throw error;
        }
    }


    // ============================================================
    // GET SEAT LOCK TTL
    // ============================================================

    async getSeatLockTTL(
        showtimeId,
        seatId
    ) {

        const key =
            this.buildSeatLockKey(
                showtimeId,
                seatId
            );

        return await this.getTTL(key);
    }


    // ============================================================
    // RELEASE ALL SEATS OF OWNER
    //
    // Dùng cho:
    //
    // - disconnect socket
    // - clear all holding seats
    // - session expired
    // - cancel booking
    //
    // Hiện tại dùng scan pattern để tránh dùng KEYS toàn Redis.
    // ============================================================

    async releaseAllSeatLocksByOwner(
        ownerToken
    ) {

        if (!ownerToken) {
            return 0;
        }

        try {

            let cursor = 0;
            let releasedCount = 0;


            do {

                const result =
                    await redis.scan(cursor, {
                        match: "seat_lock:*",
                        count: 100
                    });


                cursor = result[0];

                const keys = result[1] || [];


                for (const key of keys) {

                    const currentOwner =
                        await redis.get(key);


                    if (
                        currentOwner &&
                        currentOwner === ownerToken
                    ) {

                        await redis.del(key);

                        releasedCount++;
                    }
                }

            } while (cursor !== 0);


            return releasedCount;

        } catch (error) {

            console.error(
                `❌ [SEAT LOCK] Release all error:`,
                error
            );

            throw error;
        }
    }


    // ============================================================
    // GET ALL LOCKED SEATS OF SHOWTIME
    //
    // Dùng để đồng bộ trạng thái ghế khi client:
    //
    // - vừa connect socket
    // - refresh trang
    // - request-holding-seats
    //
    // Trả về:
    //
    // [
    //   {
    //      showtimeId,
    //      seatId,
    //      ownerToken,
    //      ttl
    //   }
    // ]
    // ============================================================

    async getLockedSeatsByShowtime(showtimeId) {

        if (!showtimeId) {
            return [];
        }

        try {

            const pattern =
                `seat_lock:${showtimeId}:*`;

            let cursor = 0;
            const result = [];


            do {

                const scanResult =
                    await redis.scan(cursor, {
                        match: pattern,
                        count: 100
                    });


                cursor = scanResult[0];

                const keys =
                    scanResult[1] || [];


                for (const key of keys) {

                    const ownerToken =
                        await redis.get(key);

                    const ttl =
                        await redis.ttl(key);


                    if (
                        ownerToken &&
                        ttl > 0
                    ) {

                        const prefix =
                            `seat_lock:${showtimeId}:`;

                        const seatId =
                            key.substring(
                                prefix.length
                            );


                        result.push({
                            showtimeId: Number(showtimeId),
                            seatId: Number(seatId),
                            ownerToken,
                            ttl
                        });
                    }
                }

            } while (cursor !== 0);


            return result;

        } catch (error) {

            console.error(
                `❌ [SEAT LOCK] Get showtime locks error (${showtimeId}):`,
                error
            );

            throw error;
        }
    }


    // ============================================================
    // RELEASE ALL SEATS OF SHOWTIME + OWNER
    //
    // Tối ưu hơn khi disconnect:
    //
    // chỉ scan:
    //
    // seat_lock:{showtimeId}:*
    //
    // thay vì toàn bộ seat_lock:*.
    // ============================================================

    async releaseShowtimeSeatLocksByOwner(
        showtimeId,
        ownerToken
    ) {

        if (!showtimeId || !ownerToken) {
            return 0;
        }

        try {

            const pattern =
                `seat_lock:${showtimeId}:*`;

            let cursor = 0;
            let releasedCount = 0;


            do {

                const scanResult =
                    await redis.scan(cursor, {
                        match: pattern,
                        count: 100
                    });


                cursor = scanResult[0];

                const keys =
                    scanResult[1] || [];


                for (const key of keys) {

                    const currentOwner =
                        await redis.get(key);


                    if (
                        currentOwner &&
                        currentOwner === ownerToken
                    ) {

                        await redis.del(key);

                        releasedCount++;
                    }
                }

            } while (cursor !== 0);


            return releasedCount;

        } catch (error) {

            console.error(
                `❌ [SEAT LOCK] Release showtime locks error:`,
                error
            );

            throw error;
        }
    }


    // ============================================================
    // OTP
    // ============================================================

    async saveOTP(
        email,
        purpose,
        otp,
        ttlSeconds = 300
    ) {

        return await this.set(
            `otp:${email}:${purpose}`,
            otp,
            ttlSeconds
        );
    }


    async getOTP(email, purpose) {

        return await this.get(
            `otp:${email}:${purpose}`
        );
    }


    async deleteOTP(email, purpose) {

        await this.delete(
            `otp:${email}:${purpose}`
        );

        await this.delete(
            `otp:${email}:${purpose}:attempts`
        );
    }


    async getOTPAttempts(email, purpose) {

        const attempts =
            await this.get(
                `otp:${email}:${purpose}:attempts`
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
            `otp:${email}:${purpose}:attempts`;

        const attempts =
            await this.increment(key);

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

        const key =
            `otp:${email}:${purpose}:attempts`;

        await this.delete(key);

        return true;
    }


    async isOTPLocked(
        email,
        purpose,
        maxAttempts = 5
    ) {

        return (
            await this.getOTPAttempts(
                email,
                purpose
            )
        ) >= maxAttempts;
    }


    async checkRateLimit(
        email,
        purpose,
        limit = 3,
        windowSeconds = 60
    ) {

        const key =
            `otp:${email}:${purpose}:ratelimit`;

        const current =
            Number(await this.get(key)) || 0;


        if (current >= limit) {

            return {
                allowed: false,
                remaining: 0,
                remainingSeconds:
                    await this.getTTL(key) ||
                    windowSeconds,
                message:
                    `Quá nhiều yêu cầu. Vui lòng thử lại sau ${windowSeconds} giây`
            };
        }


        const newCount =
            await this.increment(key);

        await this.expire(
            key,
            windowSeconds
        );


        return {
            allowed: true,
            remaining:
                Math.max(
                    0,
                    limit - newCount
                ),
            remainingSeconds:
                windowSeconds
        };
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


    async getUserSocket(userId) {

        return await redis.get(
            `user:socket:${userId}`
        );
    }


    async deleteUserSocket(userId) {

        await redis.del(
            `user:socket:${userId}`
        );

        return true;
    }


    async isUserOnline(userId) {

        return (
            await this.getUserSocket(userId)
        ) !== null;
    }


    async refreshUserSocket(
        userId,
        ttlSeconds = 86400
    ) {

        const socketId =
            await this.getUserSocket(userId);


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
                "user:socket:*"
            );

        const result = [];


        for (const key of keys) {

            const userId =
                key.replace(
                    "user:socket:",
                    ""
                );

            const socketId =
                await redis.get(key);


            result.push({
                userId,
                socketId
            });
        }


        return result;
    }


    async deleteAllUserSockets(userId) {

        await this.deleteUserSocket(userId);

        const keys =
            await redis.keys(
                `user:socket:${userId}:*`
            );


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
                text: "3 phút"
            };
        }


        return {
            duration: 60,
            text: "1 phút"
        };
    }


    async checkLoginAttempts(email) {

        return Number(
            await this.get(
                `login_attempts:${email}`
            )
        ) || 0;
    }


    async incrementLoginAttempts(email) {

        const key =
            `login_attempts:${email}`;

        const attempts =
            await this.increment(key);


        if (attempts === 1) {

            await this.expire(
                key,
                86400
            );
        }


        return attempts;
    }


    async resetLoginAttempts(email) {

        await this.delete(
            `login_attempts:${email}`
        );

        return true;
    }


    async getLockoutLevel(email) {

        return Number(
            await this.get(
                `lockout_level:${email}`
            )
        ) || 0;
    }


    async incrementLockoutLevel(email) {

        const key =
            `lockout_level:${email}`;

        const newLevel =
            await this.increment(key);


        await this.expire(
            key,
            86400
        );


        return newLevel;
    }


    async resetLockoutLevel(email) {

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
        } = this.getLockDuration(level);


        await this.set(
            key,
            String(level),
            duration
        );


        await this.resetLoginAttempts(email);


        return {
            level,
            duration,
            text,
            lockedUntil:
                Date.now() +
                duration * 1000
        };
    }


    async getLockoutInfo(email) {

        try {

            const lockKey =
                `login_lock:${email}`;

            const levelValue =
                await this.get(lockKey);

            const ttl =
                await this.getTTL(lockKey);


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
                    lockDurationText: "",
                    maxAttempts: 5,
                    lockedUntil: 0
                };
            }


            const level =
                Number(levelValue);


            const {
                duration,
                text
            } = this.getLockDuration(level);


            const lockedUntil =
                Date.now() +
                ttl * 1000;


            return {
                isLocked: true,
                level,
                attempts:
                    await this.checkLoginAttempts(
                        email
                    ),
                remainingSeconds: ttl,
                lockDuration: duration,
                lockDurationText: text,
                maxAttempts: 5,
                lockedUntil
            };

        } catch (error) {

            console.error(
                "❌ [LOCKOUT] Failed to get lockout info:",
                error
            );

            return null;
        }
    }


    async deleteLoginLock(email) {

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


// ============================================================
// EXPORT
// ============================================================

module.exports = new RedisService();