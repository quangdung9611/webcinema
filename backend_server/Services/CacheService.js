const db = require("../Config/db");

/*=========================================================
    CONFIG
=========================================================*/

const OTP_EXPIRE_SECONDS =
    parseInt(process.env.OTP_EXPIRE_SECONDS, 10) || 300;

const TEMP_BOOKING_TTL =
    parseInt(process.env.TEMP_BOOKING_TTL, 10) || 300;

const SEAT_LOCK_TTL =
    parseInt(process.env.SEAT_LOCK_TTL, 10) || 600; // 10 phút

const SOCKET_TTL =
    parseInt(process.env.SOCKET_TTL, 10) || 86400; // 24 giờ

const LOGIN_ATTEMPT_WINDOW =
    parseInt(process.env.LOGIN_ATTEMPT_WINDOW, 10) || 60;

const LOGIN_MAX_ATTEMPTS =
    parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5;


/*=========================================================
    CACHE SERVICE
    MYSQL2/PROMISE VERSION
=========================================================*/

class CacheService {

    /*=======================================================
        1. RATE LIMIT
        Dùng cho OTP / REGISTER / FORGOT PASSWORD...
        KHÔNG dùng để khóa login.
    =======================================================*/

    async checkRateLimit(
        key,
        action,
        maxAttempts,
        windowSeconds
    ) {

        const now = new Date();

        const expiresAt = new Date(
            now.getTime() + windowSeconds * 1000
        );

        // ---------------------------------------------------
        // Tìm record
        // mysql2/promise => [rows]
        // ---------------------------------------------------

        const [rows] = await db.query(
            `
            SELECT *
            FROM rate_limits
            WHERE rate_key = ?
              AND action = ?
            LIMIT 1
            `,
            [key, action]
        );

        // ---------------------------------------------------
        // Chưa có record
        // ---------------------------------------------------

        if (rows.length === 0) {

            await db.query(
                `
                INSERT INTO rate_limits
                (
                    rate_key,
                    action,
                    attempts,
                    max_attempts,
                    first_attempt_at,
                    last_attempt_at,
                    expires_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    key,
                    action,
                    1,
                    maxAttempts,
                    now,
                    now,
                    expiresAt
                ]
            );

            return {
                allowed: true,
                remainingSeconds: windowSeconds,
                attempts: 1,
                maxAttempts
            };
        }

        const data = rows[0];

        // ---------------------------------------------------
        // Record đã hết hạn
        // Reset lại window
        // ---------------------------------------------------

        if (
            !data.expires_at ||
            new Date(data.expires_at) <= now
        ) {

            await db.query(
                `
                UPDATE rate_limits
                SET
                    attempts = 1,
                    max_attempts = ?,
                    first_attempt_at = ?,
                    last_attempt_at = ?,
                    expires_at = ?
                WHERE rate_limit_id = ?
                `,
                [
                    maxAttempts,
                    now,
                    now,
                    expiresAt,
                    data.rate_limit_id
                ]
            );

            return {
                allowed: true,
                remainingSeconds: windowSeconds,
                attempts: 1,
                maxAttempts
            };
        }

        // ---------------------------------------------------
        // Đã vượt giới hạn
        // ---------------------------------------------------

        const attempts = Number(data.attempts) || 0;

        if (attempts >= maxAttempts) {

            const remaining = Math.ceil(
                (
                    new Date(data.expires_at).getTime() -
                    now.getTime()
                ) / 1000
            );

            return {
                allowed: false,
                remainingSeconds: Math.max(0, remaining),
                attempts,
                maxAttempts
            };
        }

        // ---------------------------------------------------
        // Tăng attempts
        // ---------------------------------------------------

        const newAttempts = attempts + 1;

        await db.query(
            `
            UPDATE rate_limits
            SET
                attempts = ?,
                last_attempt_at = ?
            WHERE rate_limit_id = ?
            `,
            [
                newAttempts,
                now,
                data.rate_limit_id
            ]
        );

        const remaining = Math.ceil(
            (
                new Date(data.expires_at).getTime() -
                now.getTime()
            ) / 1000
        );

        return {
            allowed: true,
            remainingSeconds: Math.max(0, remaining),
            attempts: newAttempts,
            maxAttempts
        };
    }


    /*=======================================================
        2. LOGIN ATTEMPTS

        Chỉ theo dõi:
            1
            2
            3
            4
            5

        Đủ 5 lần sai => AuthService tạo LOCK.
    =======================================================*/

    async incrementLoginAttempts(email) {

        const now = new Date();

        const expiresAt = new Date(
            now.getTime() +
            LOGIN_ATTEMPT_WINDOW * 1000
        );

        // ---------------------------------------------------
        // Tìm record hiện tại
        // ---------------------------------------------------

        const [rows] = await db.query(
            `
            SELECT *
            FROM login_attempts
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

        // ---------------------------------------------------
        // Chưa có record
        // ---------------------------------------------------

        if (rows.length === 0) {

            await db.query(
                `
                INSERT INTO login_attempts
                (
                    email,
                    attempt_count,
                    last_attempt_at,
                    expires_at
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    email,
                    1,
                    now,
                    expiresAt
                ]
            );

            return 1;
        }

        const data = rows[0];

        // ---------------------------------------------------
        // Record đã hết hạn
        // Reset về lần 1
        // ---------------------------------------------------

        if (
            !data.expires_at ||
            new Date(data.expires_at) <= now
        ) {

            await db.query(
                `
                UPDATE login_attempts
                SET
                    attempt_count = 1,
                    last_attempt_at = ?,
                    expires_at = ?
                WHERE login_attempt_id = ?
                `,
                [
                    now,
                    expiresAt,
                    data.login_attempt_id
                ]
            );

            return 1;
        }

        // ---------------------------------------------------
        // Tăng số lần login sai
        // ---------------------------------------------------

        const newCount =
            Number(data.attempt_count || 0) + 1;

        await db.query(
            `
            UPDATE login_attempts
            SET
                attempt_count = ?,
                last_attempt_at = ?
            WHERE login_attempt_id = ?
            `,
            [
                newCount,
                now,
                data.login_attempt_id
            ]
        );

        return newCount;
    }


    /*=======================================================
        RESET LOGIN ATTEMPTS
    =======================================================*/

    async resetLoginAttempts(email) {

        await db.query(
            `
            DELETE FROM login_attempts
            WHERE email = ?
            `,
            [email]
        );

        return true;
    }


    /*=======================================================
        GET LOGIN ATTEMPTS
    =======================================================*/

    async getLoginAttempts(email) {

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT *
            FROM login_attempts
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

        if (rows.length === 0) {
            return {
                attempts: 0,
                remainingAttempts: LOGIN_MAX_ATTEMPTS
            };
        }

        const data = rows[0];

        // Hết hạn
        if (
            !data.expires_at ||
            new Date(data.expires_at) <= now
        ) {
            return {
                attempts: 0,
                remainingAttempts: LOGIN_MAX_ATTEMPTS
            };
        }

        const attempts =
            Number(data.attempt_count) || 0;

        return {
            attempts,
            remainingAttempts: Math.max(
                0,
                LOGIN_MAX_ATTEMPTS - attempts
            )
        };
    }


    /*=======================================================
        3. LOCKOUT
    =======================================================*/

    async getLockoutInfo(email) {

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT *
            FROM user_locks
            WHERE email = ?
              AND expires_at > ?
            LIMIT 1
            `,
            [
                email,
                now
            ]
        );

        // Không có lock
        if (rows.length === 0) {
            return null;
        }

        const data = rows[0];

        const expiresAt =
            new Date(data.expires_at);

        const remaining = Math.ceil(
            (
                expiresAt.getTime() -
                now.getTime()
            ) / 1000
        );

        return {
            isLocked: remaining > 0,

            level:
                Number(data.lock_level) || 1,

            remainingSeconds:
                Math.max(0, remaining),

            lockDuration:
                Math.max(0, remaining),

            lockDurationText:
                this._formatDuration(
                    Math.max(0, remaining)
                ),

            maxAttempts: LOGIN_MAX_ATTEMPTS,

            lockedUntil:
                expiresAt.getTime()
        };
    }


    /*=======================================================
        INCREMENT LOCK LEVEL

        Level:
            1 = 1 phút
            2 = 5 phút
            3 = 15 phút
            4 = 1 giờ
    =======================================================*/

    async incrementLockoutLevel(email) {

        const now = new Date();

        const levels = [
            60,     // 1 phút
            300,    // 5 phút
            900,    // 15 phút
            3600    // 1 giờ
        ];

        // ---------------------------------------------------
        // Lấy lock hiện tại
        // ---------------------------------------------------

        const [rows] = await db.query(
            `
            SELECT *
            FROM user_locks
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );

        let newLevel = 1;

        if (rows.length > 0) {

            const currentLevel =
                Number(rows[0].lock_level) || 0;

            newLevel = currentLevel + 1;

            if (newLevel > levels.length) {
                newLevel = levels.length;
            }
        }

        const duration =
            levels[newLevel - 1];

        const expiresAt = new Date(
            now.getTime() +
            duration * 1000
        );

        // ---------------------------------------------------
        // INSERT / UPDATE
        // ---------------------------------------------------

        await db.query(
            `
            INSERT INTO user_locks
            (
                email,
                lock_level,
                locked_at,
                expires_at
            )
            VALUES (?, ?, ?, ?)

            ON DUPLICATE KEY UPDATE
                lock_level = VALUES(lock_level),
                locked_at = VALUES(locked_at),
                expires_at = VALUES(expires_at)
            `,
            [
                email,
                newLevel,
                now,
                expiresAt
            ]
        );

        return newLevel;
    }


    /*=======================================================
        LOCK DURATION
    =======================================================*/

    getLockDuration(level) {

        const durations = [
            60,
            300,
            900,
            3600
        ];

        const texts = [
            "1 phút",
            "5 phút",
            "15 phút",
            "1 giờ"
        ];

        const normalizedLevel =
            Number(level) || 1;

        const index = Math.min(
            Math.max(normalizedLevel - 1, 0),
            durations.length - 1
        );

        return {
            duration: durations[index],
            text: texts[index]
        };
    }


    /*=======================================================
        4. OTP
    =======================================================*/

    async saveOTP(
        email,
        purpose,
        otp,
        ttl = OTP_EXPIRE_SECONDS
    ) {

        const now = new Date();

        const expiresAt = new Date(
            now.getTime() +
            ttl * 1000
        );

        await db.query(
            `
            INSERT INTO otp_codes
            (
                email,
                purpose,
                otp,
                created_at,
                expires_at,
                is_used,
                attempts
            )
            VALUES (?, ?, ?, ?, ?, 0, 0)

            ON DUPLICATE KEY UPDATE
                otp = VALUES(otp),
                attempts = 0,
                is_used = 0,
                created_at = VALUES(created_at),
                expires_at = VALUES(expires_at)
            `,
            [
                email,
                purpose,
                otp,
                now,
                expiresAt
            ]
        );

        return true;
    }


    /*=======================================================
        GET OTP
    =======================================================*/

    async getOTP(email, purpose) {

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT otp
            FROM otp_codes
            WHERE email = ?
              AND purpose = ?
              AND is_used = 0
              AND expires_at > ?
            ORDER BY otp_code_id DESC
            LIMIT 1
            `,
            [
                email,
                purpose,
                now
            ]
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0].otp;
    }


    /*=======================================================
        DELETE OTP
    =======================================================*/

    async deleteOTP(email, purpose) {

        await db.query(
            `
            DELETE FROM otp_codes
            WHERE email = ?
              AND purpose = ?
            `,
            [
                email,
                purpose
            ]
        );

        return true;
    }


    /*=======================================================
        INCREMENT OTP ATTEMPTS
    =======================================================*/

    async incrementOTPAttempts(
        email,
        purpose,
        ttl = OTP_EXPIRE_SECONDS
    ) {

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT *
            FROM otp_codes
            WHERE email = ?
              AND purpose = ?
              AND expires_at > ?
              AND is_used = 0
            ORDER BY otp_code_id DESC
            LIMIT 1
            `,
            [
                email,
                purpose,
                now
            ]
        );

        if (rows.length === 0) {
            return 0;
        }

        const data = rows[0];

        const newAttempts =
            Number(data.attempts || 0) + 1;

        await db.query(
            `
            UPDATE otp_codes
            SET attempts = ?
            WHERE otp_code_id = ?
            `,
            [
                newAttempts,
                data.otp_code_id
            ]
        );

        return newAttempts;
    }


    /*=======================================================
        RESET OTP ATTEMPTS
    =======================================================*/

    async resetOTPAttempts(
        email,
        purpose
    ) {

        await db.query(
            `
            UPDATE otp_codes
            SET attempts = 0
            WHERE email = ?
              AND purpose = ?
            `,
            [
                email,
                purpose
            ]
        );

        return true;
    }


    /*=======================================================
        CHECK OTP LOCK
    =======================================================*/

    async isOTPLocked(
        email,
        purpose,
        maxAttempts = 5
    ) {

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT attempts
            FROM otp_codes
            WHERE email = ?
              AND purpose = ?
              AND expires_at > ?
              AND is_used = 0
            ORDER BY otp_code_id DESC
            LIMIT 1
            `,
            [
                email,
                purpose,
                now
            ]
        );

        if (rows.length === 0) {
            return false;
        }

        return (
            Number(rows[0].attempts || 0) >=
            maxAttempts
        );
    }


    /*=======================================================
        5. TEMP BOOKING
    =======================================================*/

    async set(
        key,
        data,
        ttl = TEMP_BOOKING_TTL
    ) {

        const now = new Date();

        const expiresAt = new Date(
            now.getTime() +
            ttl * 1000
        );

        const bookingKey =
            key.replace("temp:", "");

        const jsonData =
            typeof data === "string"
                ? data
                : JSON.stringify(data);

        await db.query(
            `
            INSERT INTO temp_bookings
            (
                booking_key,
                data,
                expires_at,
                created_at
            )
            VALUES (?, ?, ?, ?)

            ON DUPLICATE KEY UPDATE
                data = VALUES(data),
                expires_at = VALUES(expires_at),
                updated_at = NOW()
            `,
            [
                bookingKey,
                jsonData,
                expiresAt,
                now
            ]
        );

        return true;
    }


    /*=======================================================
        GET TEMP BOOKING
    =======================================================*/

    async get(key) {

        const bookingKey =
            key.replace("temp:", "");

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT data
            FROM temp_bookings
            WHERE booking_key = ?
              AND expires_at > ?
            ORDER BY temp_booking_id DESC
            LIMIT 1
            `,
            [
                bookingKey,
                now
            ]
        );

        if (rows.length === 0) {
            return null;
        }

        try {
            return JSON.parse(rows[0].data);
        } catch (error) {
            return rows[0].data;
        }
    }


    /*=======================================================
        DELETE TEMP BOOKING
    =======================================================*/

    async delete(key) {

        const bookingKey =
            key.replace("temp:", "");

        const [result] = await db.query(
            `
            DELETE FROM temp_bookings
            WHERE booking_key = ?
            `,
            [bookingKey]
        );

        return result.affectedRows > 0;
    }


    /*=======================================================
        GET TTL
    =======================================================*/

    async getTTL(key) {

        const now = new Date();

        // ---------------------------------------------------
        // TEMP BOOKING
        // ---------------------------------------------------

        if (key.startsWith("temp:")) {

            const bookingKey =
                key.replace("temp:", "");

            const [rows] = await db.query(
                `
                SELECT expires_at
                FROM temp_bookings
                WHERE booking_key = ?
                  AND expires_at > ?
                LIMIT 1
                `,
                [
                    bookingKey,
                    now
                ]
            );

            if (rows.length === 0) {
                return 0;
            }

            const remaining = Math.ceil(
                (
                    new Date(rows[0].expires_at).getTime() -
                    now.getTime()
                ) / 1000
            );

            return Math.max(0, remaining);
        }


        // ---------------------------------------------------
        // OTP
        // ---------------------------------------------------

        if (key.startsWith("otp:")) {

            const parts =
                key.split(":");

            if (parts.length !== 3) {
                return 0;
            }

            const email = parts[1];
            const purpose = parts[2];

            const [rows] = await db.query(
                `
                SELECT expires_at
                FROM otp_codes
                WHERE email = ?
                  AND purpose = ?
                  AND is_used = 0
                  AND expires_at > ?
                ORDER BY otp_code_id DESC
                LIMIT 1
                `,
                [
                    email,
                    purpose,
                    now
                ]
            );

            if (rows.length === 0) {
                return 0;
            }

            const remaining = Math.ceil(
                (
                    new Date(rows[0].expires_at).getTime() -
                    now.getTime()
                ) / 1000
            );

            return Math.max(0, remaining);
        }

        return 0;
    }


    /*=======================================================
        6. SEAT LOCK
    =======================================================*/

    async acquireSeatLock(
        showtimeId,
        seatId,
        ownerToken,
        ttl = SEAT_LOCK_TTL
    ) {

        const connection =
            await db.getConnection();

        try {

            await connection.beginTransaction();

            const now = new Date();

            const expiresAt = new Date(
                now.getTime() +
                ttl * 1000
            );

            // ------------------------------------------------
            // Tìm lock hiện tại
            // ------------------------------------------------

            const [rows] =
                await connection.query(
                    `
                    SELECT *
                    FROM seat_locks
                    WHERE showtime_id = ?
                      AND seat_id = ?
                      AND expires_at > ?
                    FOR UPDATE
                    `,
                    [
                        showtimeId,
                        seatId,
                        now
                    ]
                );

            // ------------------------------------------------
            // Đang bị người khác giữ
            // ------------------------------------------------

            if (
                rows.length > 0 &&
                rows[0].owner_token !== ownerToken
            ) {

                await connection.rollback();

                const existing =
                    rows[0];

                const remaining = Math.ceil(
                    (
                        new Date(
                            existing.expires_at
                        ).getTime() -
                        now.getTime()
                    ) / 1000
                );

                return {
                    locked: false,
                    ownerToken:
                        existing.owner_token,
                    ttl: Math.max(
                        0,
                        remaining
                    )
                };
            }

            // ------------------------------------------------
            // Chính owner đang giữ
            // => renew TTL
            // ------------------------------------------------

            if (
                rows.length > 0 &&
                rows[0].owner_token === ownerToken
            ) {

                await connection.query(
                    `
                    UPDATE seat_locks
                    SET expires_at = ?
                    WHERE seat_lock_id = ?
                    `,
                    [
                        expiresAt,
                        rows[0].seat_lock_id
                    ]
                );

                await connection.commit();

                return {
                    locked: true,
                    ownerToken,
                    ttl
                };
            }

            // ------------------------------------------------
            // Tạo lock mới
            // ------------------------------------------------

            await connection.query(
                `
                INSERT INTO seat_locks
                (
                    showtime_id,
                    seat_id,
                    owner_token,
                    expires_at,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    showtimeId,
                    seatId,
                    ownerToken,
                    expiresAt,
                    now
                ]
            );

            await connection.commit();

            return {
                locked: true,
                ownerToken,
                ttl
            };

        } catch (error) {

            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "❌ Seat lock rollback error:",
                    rollbackError.message
                );
            }

            console.error(
                "❌ acquireSeatLock error:",
                error.message
            );

            return {
                locked: false,
                ownerToken: null,
                ttl: 0
            };

        } finally {

            connection.release();
        }
    }


    /*=======================================================
        RELEASE SEAT LOCK
    =======================================================*/

    async releaseSeatLock(
        showtimeId,
        seatId,
        ownerToken
    ) {

        const [result] = await db.query(
            `
            DELETE FROM seat_locks
            WHERE showtime_id = ?
              AND seat_id = ?
              AND owner_token = ?
            `,
            [
                showtimeId,
                seatId,
                ownerToken
            ]
        );

        return result.affectedRows > 0;
    }


    /*=======================================================
        GET SEAT LOCK
    =======================================================*/

    async getSeatLock(
        showtimeId,
        seatId
    ) {

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT *
            FROM seat_locks
            WHERE showtime_id = ?
              AND seat_id = ?
              AND expires_at > ?
            LIMIT 1
            `,
            [
                showtimeId,
                seatId,
                now
            ]
        );

        if (rows.length === 0) {

            return {
                locked: false,
                ownerToken: null,
                ttl: 0
            };
        }

        const data = rows[0];

        const remaining = Math.ceil(
            (
                new Date(data.expires_at).getTime() -
                now.getTime()
            ) / 1000
        );

        return {
            locked: true,
            ownerToken: data.owner_token,
            ttl: Math.max(0, remaining)
        };
    }


    /*=======================================================
        GET ALL LOCKED SEATS
    =======================================================*/

    async getLockedSeatsByShowtime(
        showtimeId
    ) {

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT
                seat_id,
                owner_token,
                expires_at
            FROM seat_locks
            WHERE showtime_id = ?
              AND expires_at > ?
            `,
            [
                showtimeId,
                now
            ]
        );

        return rows.map(row => ({
            seatId: row.seat_id,
            ownerToken: row.owner_token,
            ttl: Math.max(
                0,
                Math.ceil(
                    (
                        new Date(
                            row.expires_at
                        ).getTime() -
                        now.getTime()
                    ) / 1000
                )
            )
        }));
    }


    /*=======================================================
        RELEASE ALL LOCKS BY OWNER
    =======================================================*/

    async releaseAllSeatLocksByOwner(
        ownerToken
    ) {

        const [result] = await db.query(
            `
            DELETE FROM seat_locks
            WHERE owner_token = ?
            `,
            [ownerToken]
        );

        return result.affectedRows || 0;
    }


    /*=======================================================
        RELEASE SHOWTIME LOCKS BY OWNER
    =======================================================*/

    async releaseShowtimeSeatLocksByOwner(
        showtimeId,
        ownerToken
    ) {

        const [result] = await db.query(
            `
            DELETE FROM seat_locks
            WHERE showtime_id = ?
              AND owner_token = ?
            `,
            [
                showtimeId,
                ownerToken
            ]
        );

        return result.affectedRows || 0;
    }


    /*=======================================================
        7. USER SOCKET
    =======================================================*/

    async saveUserSocket(
        userId,
        socketToken,
        ttl = SOCKET_TTL
    ) {

        const now = new Date();

        const expiresAt = new Date(
            now.getTime() +
            ttl * 1000
        );

        await db.query(
            `
            INSERT INTO user_sockets
            (
                user_id,
                socket_token,
                expires_at,
                created_at
            )
            VALUES (?, ?, ?, ?)

            ON DUPLICATE KEY UPDATE
                socket_token = VALUES(socket_token),
                expires_at = VALUES(expires_at),
                updated_at = NOW()
            `,
            [
                userId,
                socketToken,
                expiresAt,
                now
            ]
        );

        return true;
    }


    /*=======================================================
        GET USER SOCKET
    =======================================================*/

    async getUserSocket(userId) {

        const now = new Date();

        const [rows] = await db.query(
            `
            SELECT socket_token
            FROM user_sockets
            WHERE user_id = ?
              AND expires_at > ?
            ORDER BY socket_id DESC
            LIMIT 1
            `,
            [
                userId,
                now
            ]
        );

        if (rows.length === 0) {
            return null;
        }

        return rows[0].socket_token;
    }


    /*=======================================================
        DELETE USER SOCKET
    =======================================================*/

    async deleteUserSocket(userId) {

        await db.query(
            `
            DELETE FROM user_sockets
            WHERE user_id = ?
            `,
            [userId]
        );

        return true;
    }


    /*=======================================================
        8. PING
    =======================================================*/

    async ping() {

        try {

            await db.query(
                "SELECT 1"
            );

            return true;

        } catch (error) {

            console.error(
                "❌ CacheService ping failed:",
                error.message
            );

            return false;
        }
    }


    /*=======================================================
        9. UTILITY
    =======================================================*/

    _formatDuration(seconds) {

        const totalSeconds =
            Math.max(
                0,
                Number(seconds) || 0
            );

        if (totalSeconds < 60) {
            return `${totalSeconds} giây`;
        }

        const minutes =
            Math.floor(
                totalSeconds / 60
            );

        if (minutes < 60) {
            return `${minutes} phút`;
        }

        const hours =
            Math.floor(
                minutes / 60
            );

        const remainingMinutes =
            minutes % 60;

        if (remainingMinutes === 0) {
            return `${hours} giờ`;
        }

        return `${hours} giờ ${remainingMinutes} phút`;
    }


    /*=======================================================
        10. CLEANUP EXPIRED DATA
    =======================================================*/

    async cleanupExpiredData() {

        const now = new Date();

        try {

            // ------------------------------------------------
            // RATE LIMIT
            // ------------------------------------------------

            await db.query(
                `
                DELETE FROM rate_limits
                WHERE expires_at < ?
                `,
                [now]
            );


            // ------------------------------------------------
            // USER LOCKS
            // ------------------------------------------------

            await db.query(
                `
                DELETE FROM user_locks
                WHERE expires_at < ?
                `,
                [now]
            );


            // ------------------------------------------------
            // LOGIN ATTEMPTS
            // ------------------------------------------------

            await db.query(
                `
                DELETE FROM login_attempts
                WHERE expires_at < ?
                `,
                [now]
            );


            // ------------------------------------------------
            // OTP
            // ------------------------------------------------

            await db.query(
                `
                DELETE FROM otp_codes
                WHERE expires_at < ?
                   OR is_used = 1
                `,
                [now]
            );


            // ------------------------------------------------
            // TEMP BOOKING
            // ------------------------------------------------

            await db.query(
                `
                DELETE FROM temp_bookings
                WHERE expires_at < ?
                `,
                [now]
            );


            // ------------------------------------------------
            // SEAT LOCK
            // ------------------------------------------------

            await db.query(
                `
                DELETE FROM seat_locks
                WHERE expires_at < ?
                `,
                [now]
            );


            // ------------------------------------------------
            // USER SOCKET
            // ------------------------------------------------

            await db.query(
                `
                DELETE FROM user_sockets
                WHERE expires_at < ?
                `,
                [now]
            );


            console.log(
                "🧹 [CACHE] Cleaned up expired data"
            );

            return true;

        } catch (error) {

            console.error(
                "❌ [CACHE] Cleanup error:",
                error.message
            );

            return false;
        }
    }
}


/*===========================================================
    EXPORT SINGLETON
===========================================================*/

const cacheService =
    new CacheService();

module.exports =
    cacheService;