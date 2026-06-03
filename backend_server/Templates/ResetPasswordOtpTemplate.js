const ResetPasswordOtpTemplate = (otp) => {

    return `
    
    <div
        style="
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 40px;
        "
    >

        <div
            style="
                max-width: 600px;
                margin: auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,.1);
            "
        >

            <div
                style="
                    background:#e50914;
                    color:white;
                    padding:20px;
                    text-align:center;
                "
            >
                <h1>
                    🎬 Dũng Cinema
                </h1>
            </div>

            <div
                style="
                    padding:30px;
                "
            >

                <h2>
                    Khôi phục mật khẩu
                </h2>

                <p>
                    Bạn vừa yêu cầu đặt lại mật khẩu tài khoản.
                </p>

                <p>
                    Mã OTP của bạn:
                </p>

                <div
                    style="
                        text-align:center;
                        font-size:36px;
                        font-weight:bold;
                        color:#e50914;
                        letter-spacing:8px;
                        margin:30px 0;
                    "
                >
                    ${otp}
                </div>

                <p>
                    OTP sẽ hết hạn sau
                    <strong>5 phút</strong>.
                </p>

                <p>
                    Nếu bạn không thực hiện yêu cầu này,
                    vui lòng bỏ qua email.
                </p>

            </div>

        </div>

    </div>

    `;
};

module.exports =
    ResetPasswordOtpTemplate;