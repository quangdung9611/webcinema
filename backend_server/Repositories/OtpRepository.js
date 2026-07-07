const db = require("../Config/db");

class OtpRepository {

    /*=========================================================
        CREATE OTP LOG
    =========================================================*/
    async create(data) {

        const {

            email,
            purpose,
            ip_address,
            user_agent

        } = data;

        const [result] = await db.query(

            `
            INSERT INTO otp_logs
            (

                email,
                purpose,
                status,
                ip_address,
                user_agent

            )

            VALUES

            (

                ?,?,?,?,?

            )
            `,

            [

                email,
                purpose,
                "sent",
                ip_address,
                user_agent

            ]

        );

        return result.insertId;

    }

    /*=========================================================
        FIND LATEST OTP LOG
    =========================================================*/
    async findLatest(

        email,
        purpose

    ) {

        const [rows] = await db.query(

            `
            SELECT *

            FROM otp_logs

            WHERE

                email = ?

                AND purpose = ?

            ORDER BY

                otp_id DESC

            LIMIT 1
            `,

            [

                email,
                purpose

            ]

        );

        return rows[0] || null;

    }

    /*=========================================================
        EXPIRE PREVIOUS OTP LOGS
    =========================================================*/
    async expirePreviousOtps(

        email,
        purpose

    ) {

        await db.query(

            `
            UPDATE otp_logs

            SET

                status = 'expired'

            WHERE

                email = ?

                AND purpose = ?

                AND status = 'sent'
            `,

            [

                email,
                purpose

            ]

        );

    }
        /*=========================================================
        MARK VERIFIED
    =========================================================*/
    async markVerified(otpId) {

        await db.query(

            `
            UPDATE otp_logs

            SET

                status = 'verified',

                verified_at = NOW()

            WHERE

                otp_id = ?
            `,

            [

                otpId

            ]

        );

    }

    /*=========================================================
        MARK USED
    =========================================================*/
    async markUsed(otpId) {

        await db.query(

            `
            UPDATE otp_logs

            SET

                status = 'used'

            WHERE

                otp_id = ?
            `,

            [

                otpId

            ]

        );

    }

    /*=========================================================
        MARK FAILED
    =========================================================*/
    async markFailed(otpId) {

        await db.query(

            `
            UPDATE otp_logs

            SET

                status = 'failed'

            WHERE

                otp_id = ?
            `,

            [

                otpId

            ]

        );

    }

    /*=========================================================
        MARK EXPIRED
    =========================================================*/
    async markExpired(otpId) {

        await db.query(

            `
            UPDATE otp_logs

            SET

                status = 'expired'

            WHERE

                otp_id = ?
            `,

            [

                otpId

            ]

        );

    }

    /*=========================================================
        DELETE OTP LOGS
    =========================================================*/
    async deleteByEmail(

        email,
        purpose

    ) {

        await db.query(

            `
            DELETE

            FROM otp_logs

            WHERE

                email = ?

                AND purpose = ?
            `,

            [

                email,
                purpose

            ]

        );

    }
        /*=========================================================
        COUNT RECENT OTPS
    =========================================================*/
    async countRecentOtps(

        email,
        minutes = 1

    ) {

        const [rows] = await db.query(

            `
            SELECT COUNT(*) AS total

            FROM otp_logs

            WHERE

                email = ?

                AND created_at >= DATE_SUB(

                    NOW(),

                    INTERVAL ? MINUTE

                )
            `,

            [

                email,
                minutes

            ]

        );

        return rows[0].total;

    }

    /*=========================================================
        CLEANUP OLD LOGS
    =========================================================*/
    async cleanupOldLogs(

        days = 90

    ) {

        const [result] = await db.query(

            `
            DELETE

            FROM otp_logs

            WHERE

                created_at < DATE_SUB(

                    NOW(),

                    INTERVAL ? DAY

                )
            `,

            [

                days

            ]

        );

        return result.affectedRows;

    }

}

module.exports = new OtpRepository();