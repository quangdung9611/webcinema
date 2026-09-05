const db = require("../Config/db");

/*=========================================================
    CONFIG
=========================================================*/

const OTP_EXPIRE_SECONDS = parseInt(process.env.OTP_EXPIRE_SECONDS) || 300;
const TEMP_BOOKING_TTL = parseInt(process.env.TEMP_BOOKING_TTL) || 300;
const SEAT_LOCK_TTL = parseInt(process.env.SEAT_LOCK_TTL) || 600; // 10 phút
const SOCKET_TTL = parseInt(process.env.SOCKET_TTL) || 86400; // 24 giờ


/*=========================================================
    CACHE SERVICE - THAY THẾ HOÀN TOÀN REDIS
=========================================================*/

class CacheService {

    // ============================================================
    // 1. RATE LIMIT
    // ============================================================

    async checkRateLimit(key, action, maxAttempts, windowSeconds) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

        // Tìm hoặc tạo record
        let record = await db.query(
            `SELECT * FROM rate_limits WHERE key = ? AND action = ?`,
            [key, action]
        );

        if (record.length === 0) {
            await db.query(
                `INSERT INTO rate_limits (key, action, attempts, max_attempts, first_attempt_at, last_attempt_at, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [key, action, 1, maxAttempts, now, now, expiresAt]
            );
            return { allowed: true, remainingSeconds: windowSeconds };
        }

        const data = record[0];

        // Kiểm tra nếu đã hết hạn -> reset
        if (new Date(data.expires_at) < now) {
            await db.query(
                `UPDATE rate_limits SET attempts = 1, first_attempt_at = ?, last_attempt_at = ?, expires_at = ?
                 WHERE rate_limit_id = ?`,
                [now, now, expiresAt, data.rate_limit_id]
            );
            return { allowed: true, remainingSeconds: windowSeconds };
        }

        // Kiểm tra nếu vượt quá số lần cho phép
        if (data.attempts >= maxAttempts) {
            const remaining = Math.ceil((new Date(data.expires_at) - now) / 1000);
            return { allowed: false, remainingSeconds: Math.max(0, remaining) };
        }

        // Tăng attempts
        await db.query(
            `UPDATE rate_limits SET attempts = attempts + 1, last_attempt_at = ?
             WHERE rate_limit_id = ?`,
            [now, data.rate_limit_id]
        );

        const remaining = Math.ceil((new Date(data.expires_at) - now) / 1000);
        return { allowed: true, remainingSeconds: Math.max(0, remaining) };
    }

    // ============================================================
    // 2. LOGIN ATTEMPTS
    // ============================================================

    async incrementLoginAttempts(email) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 60 * 1000); // 1 phút

        let record = await db.query(
            `SELECT * FROM login_attempts WHERE email = ? AND expires_at > ?`,
            [email, now]
        );

        if (record.length === 0) {
            await db.query(
                `INSERT INTO login_attempts (email, attempt_count, last_attempt_at, expires_at)
                 VALUES (?, ?, ?, ?)`,
                [email, 1, now, expiresAt]
            );
            return 1;
        }

        const data = record[0];
        const newCount = data.attempt_count + 1;

        await db.query(
            `UPDATE login_attempts SET attempt_count = ?, last_attempt_at = ?
             WHERE login_attempt_id = ?`,
            [newCount, now, data.login_attempt_id]
        );

        return newCount;
    }

    async resetLoginAttempts(email) {
        await db.query(
            `DELETE FROM login_attempts WHERE email = ?`,
            [email]
        );
    }

    // ============================================================
    // 3. LOCKOUT
    // ============================================================

    async getLockoutInfo(email) {
        const now = new Date();
        const record = await db.query(
            `SELECT * FROM user_locks WHERE email = ? AND expires_at > ?`,
            [email, now]
        );

        if (record.length === 0) return null;

        const data = record[0];
        const remaining = Math.ceil((new Date(data.expires_at) - now) / 1000);

        return {
            isLocked: true,
            level: data.lock_level,
            remainingSeconds: Math.max(0, remaining),
            lockDuration: remaining,
            lockDurationText: this._formatDuration(remaining),
            maxAttempts: 5,
            lockedUntil: new Date(data.expires_at).getTime()
        };
    }

    async incrementLockoutLevel(email) {
        const now = new Date();
        const levels = [60, 300, 900, 3600]; // 1p, 5p, 15p, 1h

        let record = await db.query(
            `SELECT * FROM user_locks WHERE email = ?`,
            [email]
        );

        let newLevel = 1;
        if (record.length > 0) {
            newLevel = record[0].lock_level + 1;
            if (newLevel > levels.length) newLevel = levels.length;
        }

        const duration = levels[newLevel - 1];
        const expiresAt = new Date(now.getTime() + duration * 1000);

        await db.query(
            `INSERT INTO user_locks (email, lock_level, locked_at, expires_at)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 lock_level = VALUES(lock_level),
                 locked_at = VALUES(locked_at),
                 expires_at = VALUES(expires_at)`,
            [email, newLevel, now, expiresAt]
        );

        return newLevel;
    }

    getLockDuration(level) {
        const durations = [60, 300, 900, 3600];
        const texts = ['1 phút', '5 phút', '15 phút', '1 giờ'];
        const index = Math.min(level - 1, durations.length - 1);
        return { duration: durations[index], text: texts[index] };
    }

    // ============================================================
    // 4. OTP
    // ============================================================

    async saveOTP(email, purpose, otp, ttl = OTP_EXPIRE_SECONDS) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttl * 1000);

        await db.query(
            `INSERT INTO otp_codes (email, purpose, otp, created_at, expires_at, is_used)
             VALUES (?, ?, ?, ?, ?, 0)
             ON DUPLICATE KEY UPDATE
                 otp = VALUES(otp),
                 attempts = 0,
                 is_used = 0,
                 created_at = VALUES(created_at),
                 expires_at = VALUES(expires_at)`,
            [email, purpose, otp, now, expiresAt]
        );

        return true;
    }

    async getOTP(email, purpose) {
        const now = new Date();
        const record = await db.query(
            `SELECT otp FROM otp_codes 
             WHERE email = ? AND purpose = ? AND is_used = 0 AND expires_at > ?
             ORDER BY otp_code_id DESC LIMIT 1`,
            [email, purpose, now]
        );

        return record.length > 0 ? record[0].otp : null;
    }

    async deleteOTP(email, purpose) {
        await db.query(
            `DELETE FROM otp_codes WHERE email = ? AND purpose = ?`,
            [email, purpose]
        );
        return true;
    }

    async incrementOTPAttempts(email, purpose, ttl = 300) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttl * 1000);

        let record = await db.query(
            `SELECT * FROM otp_codes WHERE email = ? AND purpose = ? AND expires_at > ?`,
            [email, purpose, now]
        );

        if (record.length === 0) return 0;

        const data = record[0];
        const newAttempts = data.attempts + 1;

        await db.query(
            `UPDATE otp_codes SET attempts = ? WHERE otp_code_id = ?`,
            [newAttempts, data.otp_code_id]
        );

        return newAttempts;
    }

    async resetOTPAttempts(email, purpose) {
        await db.query(
            `UPDATE otp_codes SET attempts = 0 WHERE email = ? AND purpose = ?`,
            [email, purpose]
        );
    }

    async isOTPLocked(email, purpose, maxAttempts = 5) {
        const now = new Date();
        const record = await db.query(
            `SELECT attempts FROM otp_codes 
             WHERE email = ? AND purpose = ? AND expires_at > ? AND is_used = 0`,
            [email, purpose, now]
        );

        if (record.length === 0) return false;
        return record[0].attempts >= maxAttempts;
    }

    // ============================================================
    // 5. TEMP BOOKING
    // ============================================================

    async set(key, data, ttl = TEMP_BOOKING_TTL) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttl * 1000);
        const bookingKey = key.replace('temp:', '');

        const jsonData = typeof data === 'string' ? data : JSON.stringify(data);

        await db.query(
            `INSERT INTO temp_bookings (booking_key, data, expires_at, created_at)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 data = VALUES(data),
                 expires_at = VALUES(expires_at),
                 updated_at = NOW()`,
            [bookingKey, jsonData, expiresAt, now]
        );

        return true;
    }

    async get(key) {
        const bookingKey = key.replace('temp:', '');
        const now = new Date();

        const record = await db.query(
            `SELECT data FROM temp_bookings 
             WHERE booking_key = ? AND expires_at > ?
             ORDER BY temp_booking_id DESC LIMIT 1`,
            [bookingKey, now]
        );

        if (record.length === 0) return null;

        try {
            return JSON.parse(record[0].data);
        } catch (error) {
            return record[0].data;
        }
    }

    async delete(key) {
        const bookingKey = key.replace('temp:', '');
        const result = await db.query(
            `DELETE FROM temp_bookings WHERE booking_key = ?`,
            [bookingKey]
        );
        return result.affectedRows > 0;
    }

    async getTTL(key) {
        const now = new Date();
        let bookingKey = key;

        // Xử lý cả 2 định dạng: "temp:xxx" và "otp:xxx"
        if (key.startsWith('temp:')) {
            bookingKey = key.replace('temp:', '');
            const record = await db.query(
                `SELECT expires_at FROM temp_bookings WHERE booking_key = ? AND expires_at > ?`,
                [bookingKey, now]
            );
            if (record.length === 0) return 0;
            const remaining = Math.ceil((new Date(record[0].expires_at) - now) / 1000);
            return Math.max(0, remaining);
        }

        if (key.startsWith('otp:')) {
            const parts = key.split(':');
            if (parts.length !== 3) return 0;
            const email = parts[1];
            const purpose = parts[2];

            const record = await db.query(
                `SELECT expires_at FROM otp_codes 
                 WHERE email = ? AND purpose = ? AND is_used = 0 AND expires_at > ?
                 ORDER BY otp_code_id DESC LIMIT 1`,
                [email, purpose, now]
            );
            if (record.length === 0) return 0;
            const remaining = Math.ceil((new Date(record[0].expires_at) - now) / 1000);
            return Math.max(0, remaining);
        }

        return 0;
    }

    // ============================================================
    // 6. SEAT LOCK
    // ============================================================

    async acquireSeatLock(showtimeId, seatId, ownerToken, ttl = SEAT_LOCK_TTL) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttl * 1000);

        try {
            // Kiểm tra xem ghế đã có lock chưa
            const existing = await db.query(
                `SELECT * FROM seat_locks 
                 WHERE showtime_id = ? AND seat_id = ? AND expires_at > ?
                 FOR UPDATE`,
                [showtimeId, seatId, now]
            );

            // Nếu đã có lock và không phải của owner này -> fail
            if (existing.length > 0 && existing[0].owner_token !== ownerToken) {
                return {
                    locked: false,
                    ownerToken: existing[0].owner_token,
                    ttl: Math.ceil((new Date(existing[0].expires_at) - now) / 1000)
                };
            }

            // Nếu đã có lock của owner này -> renew TTL
            if (existing.length > 0 && existing[0].owner_token === ownerToken) {
                await db.query(
                    `UPDATE seat_locks SET expires_at = ? WHERE seat_lock_id = ?`,
                    [expiresAt, existing[0].seat_lock_id]
                );
                return {
                    locked: true,
                    ownerToken: ownerToken,
                    ttl: ttl
                };
            }

            // Tạo lock mới
            await db.query(
                `INSERT INTO seat_locks (showtime_id, seat_id, owner_token, expires_at, created_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [showtimeId, seatId, ownerToken, expiresAt, now]
            );

            return {
                locked: true,
                ownerToken: ownerToken,
                ttl: ttl
            };

        } catch (error) {
            console.error('❌ acquireSeatLock error:', error.message);
            return { locked: false, ownerToken: null, ttl: 0 };
        }
    }

    async releaseSeatLock(showtimeId, seatId, ownerToken) {
        const result = await db.query(
            `DELETE FROM seat_locks 
             WHERE showtime_id = ? AND seat_id = ? AND owner_token = ?`,
            [showtimeId, seatId, ownerToken]
        );
        return result.affectedRows > 0;
    }

    async getSeatLock(showtimeId, seatId) {
        const now = new Date();
        const record = await db.query(
            `SELECT * FROM seat_locks 
             WHERE showtime_id = ? AND seat_id = ? AND expires_at > ?`,
            [showtimeId, seatId, now]
        );

        if (record.length === 0) {
            return { locked: false, ownerToken: null, ttl: 0 };
        }

        const data = record[0];
        const remaining = Math.ceil((new Date(data.expires_at) - now) / 1000);

        return {
            locked: true,
            ownerToken: data.owner_token,
            ttl: Math.max(0, remaining)
        };
    }

    async getLockedSeatsByShowtime(showtimeId) {
        const now = new Date();
        const records = await db.query(
            `SELECT seat_id, owner_token, expires_at FROM seat_locks 
             WHERE showtime_id = ? AND expires_at > ?`,
            [showtimeId, now]
        );

        return records.map(row => ({
            seatId: row.seat_id,
            ownerToken: row.owner_token,
            ttl: Math.ceil((new Date(row.expires_at) - now) / 1000)
        }));
    }

    async releaseAllSeatLocksByOwner(ownerToken) {
        const result = await db.query(
            `DELETE FROM seat_locks WHERE owner_token = ?`,
            [ownerToken]
        );
        return result.affectedRows || 0;
    }

    async releaseShowtimeSeatLocksByOwner(showtimeId, ownerToken) {
        const result = await db.query(
            `DELETE FROM seat_locks WHERE showtime_id = ? AND owner_token = ?`,
            [showtimeId, ownerToken]
        );
        return result.affectedRows || 0;
    }

    // ============================================================
    // 7. USER SOCKET
    // ============================================================

    async saveUserSocket(userId, socketToken, ttl = SOCKET_TTL) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttl * 1000);

        await db.query(
            `INSERT INTO user_sockets (user_id, socket_token, expires_at, created_at)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 socket_token = VALUES(socket_token),
                 expires_at = VALUES(expires_at),
                 updated_at = NOW()`,
            [userId, socketToken, expiresAt, now]
        );

        return true;
    }

    async getUserSocket(userId) {
        const now = new Date();
        const record = await db.query(
            `SELECT socket_token FROM user_sockets 
             WHERE user_id = ? AND expires_at > ?
             ORDER BY socket_id DESC LIMIT 1`,
            [userId, now]
        );

        return record.length > 0 ? record[0].socket_token : null;
    }

    async deleteUserSocket(userId) {
        await db.query(
            `DELETE FROM user_sockets WHERE user_id = ?`,
            [userId]
        );
        return true;
    }

    // ============================================================
    // 8. PING - KIỂM TRA KẾT NỐI
    // ============================================================

    async ping() {
        try {
            await db.query('SELECT 1');
            return true;
        } catch (error) {
            console.error('❌ CacheService ping failed:', error.message);
            return false;
        }
    }

    // ============================================================
    // 9. UTILITY
    // ============================================================

    _formatDuration(seconds) {
        if (seconds < 60) return `${seconds} giây`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút`;
        const hours = Math.floor(minutes / 60);
        return `${hours} giờ`;
    }

    // ============================================================
    // 10. CLEANUP EXPIRED DATA (GỌI ĐỊNH KỲ)
    // ============================================================

    async cleanupExpiredData() {
        const now = new Date();

        // Xóa rate_limits hết hạn
        await db.query(
            `DELETE FROM rate_limits WHERE expires_at < ?`,
            [now]
        );

        // Xóa user_locks hết hạn
        await db.query(
            `DELETE FROM user_locks WHERE expires_at < ?`,
            [now]
        );

        // Xóa login_attempts hết hạn
        await db.query(
            `DELETE FROM login_attempts WHERE expires_at < ?`,
            [now]
        );

        // Xóa otp_codes hết hạn hoặc đã dùng
        await db.query(
            `DELETE FROM otp_codes WHERE expires_at < ? OR is_used = 1`,
            [now]
        );

        // Xóa temp_bookings hết hạn
        await db.query(
            `DELETE FROM temp_bookings WHERE expires_at < ?`,
            [now]
        );

        // Xóa seat_locks hết hạn
        await db.query(
            `DELETE FROM seat_locks WHERE expires_at < ?`,
            [now]
        );

        // Xóa user_sockets hết hạn
        await db.query(
            `DELETE FROM user_sockets WHERE expires_at < ?`,
            [now]
        );

        console.log('🧹 [CACHE] Cleaned up expired data');
        return true;
    }
}


/*===========================================================
    EXPORT SINGLETON
===========================================================*/

const cacheService = new CacheService();
module.exports = cacheService;