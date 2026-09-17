// Repositories/RefreshTokenRepository.js
const db = require("../Config/db");

class RefreshTokenRepository {
    async create(data) {
        const {
            user_id, token_hash, expires_at,
            ip_address, user_agent, device_name,
            socket_token = null
        } = data;

        const [result] = await db.query(
            `INSERT INTO refresh_tokens
            (user_id, token_hash, expires_at, ip_address, user_agent, device_name, socket_token, is_revoked)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [user_id, token_hash, expires_at, ip_address, user_agent, device_name, socket_token]
        );
        return result.insertId;
    }

    async updateSocketToken(tokenHash, socketToken) {
        const [result] = await db.query(
            `UPDATE refresh_tokens
            SET socket_token = ?
            WHERE token_hash = ? AND is_revoked = 0`,
            [socketToken, tokenHash]
        );
        console.log(`🔗 [REFRESH TOKEN] Updated socket_token=${socketToken} (affected: ${result.affectedRows})`);
        return result.affectedRows > 0;
    }

    async clearSocketToken(socketToken) {
        const [result] = await db.query(
            `UPDATE refresh_tokens
            SET socket_token = NULL
            WHERE socket_token = ? AND is_revoked = 0`,
            [socketToken]
        );
        return result.affectedRows;
    }

    async getActiveByUser(userId) {
        const [rows] = await db.query(
            `SELECT * FROM refresh_tokens
            WHERE user_id = ? AND is_revoked = 0 AND expires_at > NOW()
            ORDER BY created_at DESC, token_id DESC`,
            [userId]
        );
        return rows;
    }

    async findValidTokenHash(tokenHash) {
        const [rows] = await db.query(
            `SELECT * FROM refresh_tokens
            WHERE token_hash = ? AND is_revoked = 0 AND expires_at > NOW()
            LIMIT 1`,
            [tokenHash]
        );
        return rows[0] || null;
    }

    async revoke(tokenHash, reason = "Đăng xuất") {
        const [result] = await db.query(
            `UPDATE refresh_tokens
            SET is_revoked = 1, revoked_at = NOW(), revoked_reason = ?, socket_token = NULL
            WHERE token_hash = ? AND is_revoked = 0`,
            [reason, tokenHash]
        );
        return result.affectedRows;
    }

    async revokeByUser(userId, reason = "Đăng nhập từ thiết bị khác") {
        const [result] = await db.query(
            `UPDATE refresh_tokens
            SET is_revoked = 1, revoked_at = NOW(), revoked_reason = ?, socket_token = NULL
            WHERE user_id = ? AND is_revoked = 0`,
            [reason, userId]
        );
        console.log(`🔄 [REVOKE] Đã revoke ${result.affectedRows} token của user ${userId}`);
        return result.affectedRows;
    }

    async deleteByTokenHash(tokenHash) {
        const [result] = await db.query(`DELETE FROM refresh_tokens WHERE token_hash = ?`, [tokenHash]);
        return result.affectedRows;
    }

    async deleteAllByUser(userId) {
        const [result] = await db.query(`DELETE FROM refresh_tokens WHERE user_id = ?`, [userId]);
        return result.affectedRows;
    }

    async updateUsage(tokenHash) {
        await db.query(`UPDATE refresh_tokens SET last_used_at = NOW() WHERE token_hash = ?`, [tokenHash]);
    }

    async deleteExpired() {
        const [result] = await db.query(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`, []);
        return result.affectedRows;
    }
}

module.exports = new RefreshTokenRepository();