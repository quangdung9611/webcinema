// Repositories/RefreshTokenRepository.js
const db = require("../Config/db");

class RefreshTokenRepository {

    /*=========================================================
        TẠO REFRESH TOKEN MỚI
    =========================================================*/
    async create(data) {
        const {
            user_id,
            token_hash,
            expires_at,
            ip_address,
            user_agent,
            device_name
        } = data;

        const [result] = await db.query(
            `
            INSERT INTO refresh_tokens
            (user_id, token_hash, expires_at, ip_address, user_agent, device_name, is_revoked)
            VALUES (?, ?, ?, ?, ?, ?, 0)
            `,
            [user_id, token_hash, expires_at, ip_address, user_agent, device_name]
        );

        return result.insertId;
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
            ORDER BY created_at DESC
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
        REVOKE 1 TOKEN CỤ THỂ (DÙNG CHO LOGOUT)
    =========================================================*/
    async revoke(tokenHash, reason = "Đăng xuất") {
        const [result] = await db.query(
            `
            UPDATE refresh_tokens
            SET is_revoked = 1,
                revoked_at = NOW(),
                revoked_reason = ?
            WHERE token_hash = ?
              AND is_revoked = 0
            `,
            [reason, tokenHash]
        );
        return result.affectedRows;
    }

    /*=========================================================
        REVOKE TẤT CẢ TOKEN CỦA USER (DÙNG CHO LOGIN MỚI)
        👉 ĐÂY LÀ HÀM QUAN TRỌNG NHẤT - ĐÁ THIẾT BỊ CŨ
    =========================================================*/
    async revokeByUser(userId, reason = "Đăng nhập từ thiết bị khác") {
        const [result] = await db.query(
            `
            UPDATE refresh_tokens
            SET is_revoked = 1,
                revoked_at = NOW(),
                revoked_reason = ?
            WHERE user_id = ?
              AND is_revoked = 0
            `,
            [reason, userId]
        );
        console.log(`🔄 [REVOKE] Đã revoke ${result.affectedRows} token của user ${userId} - Lý do: ${reason}`);
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