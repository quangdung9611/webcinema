// Repositories/RefreshTokenRepository.js
const db = require("../Config/db");

class RefreshTokenRepository {

    /*=========================================================
        1. LOGIN — INSERT (action='login')
    =========================================================*/
    async create(data) {
        const {
            user_id, token_hash, expires_at,
            ip_address, user_agent, device_name,
            socket_token = null
        } = data;

        const [result] = await db.query(
            `INSERT INTO refresh_tokens
            (user_id, token_hash, expires_at, ip_address, user_agent, device_name,
             socket_token, action)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'login')`,
            [user_id, token_hash, expires_at, ip_address, user_agent, device_name, socket_token]
        );

        console.log(`📝 [REFRESH] Login: token_id=${result.insertId}, user=${user_id}`);
        return result.insertId;
    }

    /*=========================================================
        2. SOCKET_LINKED — INSERT (action='socket_linked')
        Gọi khi frontend register_socket
    =========================================================*/
    async logSocketLinked(userId, tokenHash, socketToken) {
        const fakeHash = `socket_linked_${tokenHash.substring(0, 16)}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const [result] = await db.query(
            `INSERT INTO refresh_tokens
            (user_id, token_hash, expires_at, socket_token, action)
            VALUES (?, ?, NOW(), ?, 'socket_linked')`,
            [userId, fakeHash, socketToken]
        );

        console.log(`📝 [REFRESH] socket_linked: token_id=${result.insertId}, socket=${socketToken}`);
        return result.insertId;
    }

    /*=========================================================
        3. UPDATE SOCKET TOKEN
        ✅ Vẫn UPDATE socket_token vào token gốc — để query nhanh
    =========================================================*/
    async updateSocketToken(tokenHash, socketToken) {
        // Lấy user_id từ token
        const [rows] = await db.query(
            `SELECT user_id FROM refresh_tokens
            WHERE token_hash = ? AND action = 'login' AND expires_at > NOW()
            LIMIT 1`,
            [tokenHash]
        );

        if (rows.length === 0) {
            console.warn(`⚠️ [REFRESH] No active login token to update socket`);
            return false;
        }

        const { user_id } = rows[0];

        // UPDATE socket_token vào token gốc
        const [result] = await db.query(
            `UPDATE refresh_tokens
            SET socket_token = ?
            WHERE token_hash = ? AND action = 'login'`,
            [socketToken, tokenHash]
        );

        // ✅ INSERT thêm record action='socket_linked'
        await this.logSocketLinked(user_id, tokenHash, socketToken);

        console.log(`🔗 [REFRESH] socket_token=${socketToken} updated + logged`);
        return result.affectedRows > 0;
    }

    /*=========================================================
        4. CLEAR SOCKET TOKEN
    =========================================================*/
    async clearSocketToken(socketToken) {
        const [result] = await db.query(
            `UPDATE refresh_tokens
            SET socket_token = NULL
            WHERE socket_token = ? AND action = 'login'`,
            [socketToken]
        );
        return result.affectedRows;
    }

    /*=========================================================
        5. GET ACTIVE BY USER — lấy token action='login'
    =========================================================*/
    async getActiveByUser(userId) {
        const [rows] = await db.query(
            `SELECT * FROM refresh_tokens
            WHERE user_id = ? 
              AND action = 'login'
              AND expires_at > NOW()
            ORDER BY created_at DESC, token_id DESC`,
            [userId]
        );
        return rows;
    }

    /*=========================================================
        6. FIND VALID TOKEN HASH
    =========================================================*/
    async findValidTokenHash(tokenHash) {
        const [rows] = await db.query(
            `SELECT * FROM refresh_tokens
            WHERE token_hash = ? 
              AND action = 'login'
              AND expires_at > NOW()
            LIMIT 1`,
            [tokenHash]
        );
        return rows[0] || null;
    }

    /*=========================================================
        7. ✅ REVOKE — INSERT record mới (action='revoked_by_login')
        KHÔNG UPDATE token gốc, chỉ INSERT record mới
    =========================================================*/
    async revoke(tokenHash, options = {}) {
        const {
            action = 'revoked_by_login',
            reason = 'Đăng nhập từ thiết bị khác'
        } = options;

        // Lấy info token cần revoke
        const [rows] = await db.query(
            `SELECT token_id, user_id, socket_token, device_name, ip_address, user_agent
            FROM refresh_tokens
            WHERE token_hash = ? AND action = 'login'
            LIMIT 1`,
            [tokenHash]
        );

        if (rows.length === 0) {
            console.warn(`⚠️ [REFRESH] No active token to revoke`);
            return 0;
        }

        const tokenData = rows[0];

        // ✅ INSERT record MỚI với action='revoked_by_login'
        const fakeHash = `revoked_${tokenData.token_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const [result] = await db.query(
            `INSERT INTO refresh_tokens
            (user_id, token_hash, expires_at, socket_token, device_name,
             ip_address, user_agent, action)
            VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
            [
                tokenData.user_id,
                fakeHash,
                tokenData.socket_token,
                tokenData.device_name,
                tokenData.ip_address,
                tokenData.user_agent,
                action
            ]
        );

        console.log(`📝 [REFRESH] ${action}: token_id=${result.insertId}, user=${tokenData.user_id}`);
        return result.insertId;
    }

    /*=========================================================
        8. ✅ REVOKE ALL BY USER — INSERT record cho mỗi token
    =========================================================*/
    async revokeByUser(userId, options = {}) {
        const {
            action = 'revoked_by_login',
            reason = 'Đăng nhập từ thiết bị khác'
        } = options;

        // Lấy tất cả active tokens
        const [rows] = await db.query(
            `SELECT token_id, token_hash, socket_token, device_name, ip_address, user_agent
            FROM refresh_tokens
            WHERE user_id = ? AND action = 'login' AND expires_at > NOW()`,
            [userId]
        );

        if (rows.length === 0) {
            return 0;
        }

        // ✅ INSERT record mới cho mỗi token
        let count = 0;
        for (const tokenData of rows) {
            const fakeHash = `revoked_all_${tokenData.token_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            await db.query(
                `INSERT INTO refresh_tokens
                (user_id, token_hash, expires_at, socket_token, device_name,
                 ip_address, user_agent, action)
                VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
                [
                    userId,
                    fakeHash,
                    tokenData.socket_token,
                    tokenData.device_name,
                    tokenData.ip_address,
                    tokenData.user_agent,
                    action
                ]
            );
            count++;
        }

        console.log(`🔄 [REFRESH] Revoked ${count} tokens của user ${userId} → action=${action}`);
        return count;
    }

    /*=========================================================
        9. ✅ LOGOUT — INSERT record (action='logged_out')
    =========================================================*/
    async logLogout(tokenHash, userId = null) {
        const [rows] = await db.query(
            `SELECT token_id, user_id, socket_token, device_name, ip_address, user_agent
            FROM refresh_tokens
            WHERE token_hash = ? AND action = 'login'
            LIMIT 1`,
            [tokenHash]
        );

        if (rows.length === 0) {
            console.warn(`⚠️ [REFRESH] No active token to log logout`);
            return 0;
        }

        const tokenData = rows[0];
        const fakeHash = `logged_out_${tokenData.token_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const [result] = await db.query(
            `INSERT INTO refresh_tokens
            (user_id, token_hash, expires_at, socket_token, device_name,
             ip_address, user_agent, action)
            VALUES (?, ?, NOW(), ?, ?, ?, ?, 'logged_out')`,
            [
                tokenData.user_id,
                fakeHash,
                tokenData.socket_token,
                tokenData.device_name,
                tokenData.ip_address,
                tokenData.user_agent
            ]
        );

        console.log(`🚪 [REFRESH] Logout: token_id=${result.insertId}, user=${tokenData.user_id}`);
        return result.insertId;
    }

    /*=========================================================
        10. ✅ DELETE BY TOKEN HASH — Gọi logLogout + DELETE token gốc
    =========================================================*/
    async deleteByTokenHash(tokenHash) {
        // ✅ Log logout
        await this.logLogout(tokenHash);

        // ✅ DELETE token gốc
        const [result] = await db.query(
            `DELETE FROM refresh_tokens WHERE token_hash = ?`,
            [tokenHash]
        );

        console.log(`🗑️ [REFRESH] Deleted token: ${result.affectedRows} row`);
        return result.affectedRows;
    }

    /*=========================================================
        11. ✅ DELETE ALL BY USER
    =========================================================*/
    async deleteAllByUser(userId) {
        // ✅ Log logout cho tất cả active tokens
        const [rows] = await db.query(
            `SELECT token_hash FROM refresh_tokens
            WHERE user_id = ? AND action = 'login'`,
            [userId]
        );

        for (const tokenData of rows) {
            await this.logLogout(tokenData.token_hash, userId);
        }

        // ✅ DELETE tất cả tokens
        const [result] = await db.query(
            `DELETE FROM refresh_tokens WHERE user_id = ?`,
            [userId]
        );

        console.log(`🗑️ [REFRESH] Deleted all: ${result.affectedRows} tokens`);
        return result.affectedRows;
    }

    /*=========================================================
        12. UPDATE USAGE
    =========================================================*/
    async updateUsage(tokenHash) {
        await db.query(
            `UPDATE refresh_tokens SET last_used_at = NOW() WHERE token_hash = ?`,
            [tokenHash]
        );
    }

    /*=========================================================
        13. ✅ DELETE EXPIRED — Log 'expired' + DELETE
    =========================================================*/
    async deleteExpired() {
        const [rows] = await db.query(
            `SELECT token_id, user_id, token_hash, socket_token, device_name,
                    ip_address, user_agent
            FROM refresh_tokens
            WHERE expires_at < NOW() AND action = 'login'`,
            []
        );

        // ✅ Log 'expired' cho mỗi token
        for (const tokenData of rows) {
            const fakeHash = `expired_${tokenData.token_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            await db.query(
                `INSERT INTO refresh_tokens
                (user_id, token_hash, expires_at, socket_token, device_name,
                 ip_address, user_agent, action)
                VALUES (?, ?, NOW(), ?, ?, ?, ?, 'expired')`,
                [
                    tokenData.user_id,
                    fakeHash,
                    tokenData.socket_token,
                    tokenData.device_name,
                    tokenData.ip_address,
                    tokenData.user_agent
                ]
            );
        }

        // ✅ DELETE expired tokens
        const [result] = await db.query(
            `DELETE FROM refresh_tokens WHERE expires_at < NOW() AND action = 'login'`,
            []
        );

        console.log(`⏰ [REFRESH] Marked ${result.affectedRows} tokens as expired`);
        return result.affectedRows;
    }

    /*=========================================================
        14. ✅ LẤY LỊCH SỬ USER
    =========================================================*/
    async getHistoryByUser(userId, limit = 50) {
        const [rows] = await db.query(
            `SELECT
                token_id, action, socket_token, device_name, ip_address, created_at
            FROM refresh_tokens
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    /*=========================================================
        15. ✅ CLEANUP — Xóa records cũ > 7 ngày (trừ action='login')
    =========================================================*/
    async cleanupOldRecords(days = 7) {
        const [result] = await db.query(
            `DELETE FROM refresh_tokens
            WHERE action != 'login'
              AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [days]
        );

        console.log(`🧹 [REFRESH] Cleanup: deleted ${result.affectedRows} old records`);
        return result.affectedRows;
    }
}

module.exports = new RefreshTokenRepository();