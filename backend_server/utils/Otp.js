const crypto = require("crypto");

class Otp {

    /*=========================================================
        GENERATE OTP
    =========================================================*/

    static generate(length = 6) {

        if (length < 4 || length > 8) {
            throw new Error("OTP length must be between 4 and 8 digits.");
        }

        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;

        return crypto.randomInt(min, max + 1).toString();

    }

    /*=========================================================
        GENERATE 4 DIGITS OTP
    =========================================================*/

    static generate4() {

        return this.generate(4);

    }

    /*=========================================================
        GENERATE 6 DIGITS OTP
    =========================================================*/

    static generate6() {

        return this.generate(6);

    }

    /*=========================================================
        VALIDATE OTP FORMAT
    =========================================================*/

    static isValidFormat(otp, length = 6) {

        if (typeof otp !== "string") {
            return false;
        }

        const regex = new RegExp(`^\\d{${length}}$`);

        return regex.test(otp);

    }

}

module.exports = Otp;