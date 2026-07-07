const bcrypt = require("bcryptjs");

const SALT_ROUNDS =
    Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

class Password {

    /*=========================================================
        HASH PASSWORD
    =========================================================*/

    async hash(password) {

        return await bcrypt.hash(
            password,
            SALT_ROUNDS
        );

    }

    /*=========================================================
        COMPARE PASSWORD
    =========================================================*/

    async compare(password, hashedPassword) {

        return await bcrypt.compare(
            password,
            hashedPassword
        );

    }

    /*=========================================================
        CHECK PASSWORD STRENGTH
    =========================================================*/

    isStrong(password) {

        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(
            password
        );

    }

}

module.exports = new Password();