const db = require("../Config/db");

class RefreshTokenRepository {

    /*=========================================================
        CREATE
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
            (

                user_id,
                token_hash,
                ip_address,
                user_agent,
                device_name,
                expires_at,
                last_used_at,
                is_revoked,
                revoked_at,
                revoked_reason,
                created_at,
                updated_at

            )

            VALUES

            (

                ?,?,?,?,?,?,
                NOW(),
                0,
                NULL,
                NULL,
                NOW(),
                NOW()

            )
            `,

            [

                user_id,
                token_hash,
                ip_address,
                user_agent,
                device_name,
                expires_at

            ]

        );

        return result.insertId;

    }

    /*=========================================================
        FIND BY TOKEN HASH
    =========================================================*/
    async findByTokenHash(tokenHash) {

        const [rows] = await db.query(

            `
            SELECT *
            FROM refresh_tokens
            WHERE token_hash = ?
            LIMIT 1
            `,

            [

                tokenHash

            ]

        );

        return rows[0] || null;

    }

    /*=========================================================
        FIND BY USER
    =========================================================*/
    async findByUser(userId) {

        const [rows] = await db.query(

            `
            SELECT *
            FROM refresh_tokens
            WHERE user_id = ?
            ORDER BY created_at DESC
            `,

            [

                userId

            ]

        );

        return rows;

    }

    /*=========================================================
        UPDATE LAST USED
    =========================================================*/
    async updateUsage(

        tokenHash,
        ip_address = null,
        user_agent = null

    ) {

        await db.query(

            `
            UPDATE refresh_tokens

            SET

                last_used_at = NOW(),

                ip_address = COALESCE(?, ip_address),

                user_agent = COALESCE(?, user_agent),

                updated_at = NOW()

            WHERE

                token_hash = ?
            `,

            [

                ip_address,
                user_agent,
                tokenHash

            ]

        );

    }
        /*=========================================================
        REVOKE TOKEN
    =========================================================*/
    async revoke(

        tokenHash,
        reason = "Logout"

    ) {

        await db.query(

            `
            UPDATE refresh_tokens

            SET

                is_revoked = 1,

                revoked_at = NOW(),

                revoked_reason = ?,

                updated_at = NOW()

            WHERE

                token_hash = ?
            `,

            [

                reason,
                tokenHash

            ]

        );

    }

    /*=========================================================
        DELETE TOKEN
    =========================================================*/
    async deleteByTokenHash(tokenHash) {

        await db.query(

            `
            DELETE
            FROM refresh_tokens

            WHERE token_hash = ?
            `,

            [

                tokenHash

            ]

        );

    }

    /*=========================================================
        DELETE USER TOKENS
    =========================================================*/
    async deleteByUser(userId) {

        await db.query(

            `
            DELETE
            FROM refresh_tokens

            WHERE user_id = ?
            `,

            [

                userId

            ]

        );

    }

    /*=========================================================
        REVOKE USER TOKENS
    =========================================================*/
    async revokeByUser(

        userId,
        reason = "Logout All"

    ) {

        await db.query(

            `
            UPDATE refresh_tokens

            SET

                is_revoked = 1,

                revoked_at = NOW(),

                revoked_reason = ?,

                updated_at = NOW()

            WHERE

                user_id = ?

                AND is_revoked = 0
            `,

            [

                reason,
                userId

            ]

        );

    }

    /*=========================================================
        COUNT ACTIVE TOKENS
    =========================================================*/
    async countActiveByUser(userId) {

        const [rows] = await db.query(

            `
            SELECT COUNT(*) AS total

            FROM refresh_tokens

            WHERE

                user_id = ?

                AND is_revoked = 0

                AND expires_at > NOW()
            `,

            [

                userId

            ]

        );

        return rows[0].total;

    }

    /*=========================================================
        DELETE OLDEST TOKEN
    =========================================================*/
    async deleteOldestByUser(userId) {

        await db.query(

            `
            DELETE
            FROM refresh_tokens

            WHERE token_hash = (

                SELECT token_hash

                FROM (

                    SELECT token_hash

                    FROM refresh_tokens

                    WHERE

                        user_id = ?

                        AND is_revoked = 0

                    ORDER BY

                        COALESCE(last_used_at, created_at) ASC

                    LIMIT 1

                ) AS t

            )
            `,

            [

                userId

            ]

        );

    }
        /*=========================================================
        DELETE EXPIRED TOKENS
    =========================================================*/
    async deleteExpired() {

        await db.query(

            `
            DELETE
            FROM refresh_tokens

            WHERE expires_at < NOW()
            `

        );

    }

    /*=========================================================
        CHECK TOKEN EXISTS
    =========================================================*/
    async exists(tokenHash) {

        const [rows] = await db.query(

            `
            SELECT 1

            FROM refresh_tokens

            WHERE

                token_hash = ?

                AND is_revoked = 0

                AND expires_at > NOW()

            LIMIT 1
            `,

            [

                tokenHash

            ]

        );

        return rows.length > 0;

    }

    /*=========================================================
        GET ACTIVE TOKENS BY USER
    =========================================================*/
    async getActiveByUser(userId) {

        const [rows] = await db.query(

            `
            SELECT *

            FROM refresh_tokens

            WHERE

                user_id = ?

                AND is_revoked = 0

                AND expires_at > NOW()

            ORDER BY

                COALESCE(last_used_at, created_at) DESC
            `,

            [

                userId

            ]

        );

        return rows;

    }

    /*=========================================================
        FIND VALID TOKEN HASH
    =========================================================*/
    async findValidTokenHash(tokenHash) {

        const [rows] = await db.query(

            `
            SELECT *

            FROM refresh_tokens

            WHERE

                token_hash = ?

                AND is_revoked = 0

                AND expires_at > NOW()

            LIMIT 1
            `,

            [

                tokenHash

            ]

        );

        return rows[0] || null;

    }

}

module.exports = new RefreshTokenRepository();