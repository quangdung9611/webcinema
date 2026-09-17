// Repositories/RefreshTokenRepository.js
const db = require("../Config/db");

class RefreshTokenRepository {

    /*=========================================================
        TẠO REFRESH TOKEN MỚI
        ✅ DÙNG socket_token (KHÔNG PHẢI socket_id)
    =========================================================*/
    async create(data) {
        const {
            user_id,
            token_hash,
            expires_at,
            ip_address,
            user_agent,
            device_name,
            socket_token = null  // ✅ ĐỔI TÊN
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO refresh_tokens
            (user_id, token_hash, expires_at, ip_address, user_agent, device_name, socket_token, is_revoked)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            `,
            [user_id, token_hash, expires_at, ip_address, user_agent, device_name, socket_token]
        );

        return result.insertId;
    }

    /*=========================================================
        ✅ CẬP NHẬT SOCKET_TOKEN CHO TOKEN
        Gọi khi frontend register_socket
    =========================================================*/
    async updateSocketToken(tokenHash, socketToken) {
        const [result] = await db.query(
            `
            UPDATE refresh_tokens
            SET socket_token = ?
            WHERE token_hash = ?
              AND is_revoked = 0
            `,
            [socketToken, tokenHash]
        );

        console.log(`🔗 [REFRESH TOKEN] Updated socket_token=${socketToken} (affected: ${result.affectedRows})`);
        return result.affectedRows > 0;
    }

    /*=========================================================
        ✅ XÓA SOCKET_TOKEN KHI SOCKET DISCONNECT
    =========================================================*/
    async clearSocketToken(socketToken) {
        const [result] = await db.query(
            `
            UPDATE refresh_tokens
            SET socket_token = NULL
            WHERE socket_token = ?
              AND is_revoked = 0
            `,
            [socketToken]
        );

        console.log(`🔌 [REFRESH TOKEN] Cleared socket_token=${socketToken} (affected: ${result.affectedRows})`);
        return result.affectedRows;
    }

    /*=========================================================
        LẤY TẤT CẢ TOKEN ACTIVE CỦA USER
    =========================================================*/
    async getActiveByUser(userId) {
        const [rows] = await db.query(
            `
            SELECT *
            FROM refresh_tokens
            WHERE user_id = ?
              AND is_revoked = 0
              AND expires_at > NOW()
            ORDER BY created_at DESC, token_id DESC
            `,
            [userId]
        );
        return rows;
    }

    /*=========================================================
        LẤY TOKEN HỢP LỆ THEO HASH
    =========================================================*/
    async findValidTokenHash(tokenHash) {
        const [rows] = await db.query(
            `
            SELECT *
            FROM refresh_tokens
            WHERE token_hash = ?
              AND is_revoked = 0
              AND expires_at > NOW()
            LIMIT 1
            `,
            [tokenHash]
        );
        return rows[0] || null;
    }

    /*=========================================================
        REVOKE 1 TOKEN CỤ THỂ
    =========================================================*/
    async revoke(tokenHash, reason = "Đăng xuất") {
        const [result] = await db.query(
            `
            UPDATE refresh_tokens
            SET is_revoked = 1,
                revoked_at = NOW(),
                revoked_reason = ?,
                socket_token = NULL
            WHERE token_hash = ?
              AND is_revoked = 0
            `,
            [reason, tokenHash]
        );
        return result.affectedRows;
    }

    /*=========================================================
        REVOKE TẤT CẢ TOKEN CỦA USER
    =========================================================*/
    async revokeByUser(userId, reason = "Đăng nhập từ thiết bị khác") {
        const [result] = await db.query(
            `
            UPDATE refresh_tokens
            SET is_revoked = 1,
                revoked_at = NOW(),
                revoked_reason = ?,
                socket_token = NULL
            WHERE user_id = ?
              AND is_revoked = 0
            `,
            [reason, userId]
        );
        console.log(`🔄 [REVOKE] Đã revoke ${result.affectedRows} token của user ${userId} - Lý do: ${reason}`);
        return result.affectedRows;
    }

    /*=========================================================
        XÓA HẲN TOKEN KHỎI DB (DÙNG CHO LOGOUT)
    =========================================================*/
    async deleteByTokenHash(tokenHash) {
        const [result] = await db.query(
            `
            DELETE FROM refresh_tokens
            WHERE token_hash = ?
            `,
            [tokenHash]
        );
        console.log(`🗑️ [DELETE] Đã xóa ${result.affectedRows} token khỏi DB`);
        return result.affectedRows;
    }

    /*=========================================================
        XÓA TẤT CẢ TOKEN CỦA USER (DÙNG CHO LOGOUT ALL)
    =========================================================*/
    async deleteAllByUser(userId) {
        const [result] = await db.query(
            `
            DELETE FROM refresh_tokens
            WHERE user_id = ?
            `,
            [userId]
        );
        console.log(`🗑️ [DELETE ALL] Đã xóa ${result.affectedRows} token của user ${userId}`);
        return result.affectedRows;
    }

    /*=========================================================
        CẬP NHẬT LAST USED
    =========================================================*/
    async updateUsage(tokenHash) {
        await db.query(
            `
            UPDATE refresh_tokens
            SET last_used_at = NOW()
            WHERE token_hash = ?
            `,
            [tokenHash]
        );
    }

    /*=========================================================
        XÓA TOKEN HẾT HẠN
    =========================================================*/
    async deleteExpired() {
        const [result] = await db.query(
            `
            DELETE FROM refresh_tokens
            WHERE expires_at < NOW()
            `,
            []
        );
        console.log(`🧹 [CLEANUP] Đã xóa ${result.affectedRows} token hết hạn`);
        return result.affectedRows;
    }
}

module.exports = new RefreshTokenRepository();