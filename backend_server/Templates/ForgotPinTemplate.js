const ForgotPinTemplate = (otp, fullName = "") => {
    return `
        <div style="text-align:center;font-family:Arial, sans-serif;">
            
            <div style="max-width:500px;margin:0 auto;padding:20px;">
                
                <h2 style="margin-bottom:10px;color:#333;">
                    🔐 Đặt lại mã PIN thanh toán
                </h2>

                ${fullName ? `<p style="color:#555;">Xin chào <b>${fullName}</b>,</p>` : ''}
                
                <p style="color:#555;">
                    Chúng tôi nhận được yêu cầu đặt lại mã PIN thanh toán cho tài khoản của bạn.
                </p>

                <div style="margin:20px 0;">
                    <span style="
                        display:inline-block;
                        font-size:32px;
                        font-weight:bold;
                        color:#e74c3c;
                        letter-spacing:5px;
                        background:#fdf2f2;
                        padding:10px 20px;
                        border-radius:8px;
                    ">
                        ${otp}
                    </span>
                </div>

                <p style="color:#777;font-size:14px;">
                    Nhập mã OTP này để xác thực và đặt mã PIN mới cho tài khoản của bạn.
                    <br/>
                    Mã OTP có hiệu lực trong <b>5 phút</b>.
                </p>

                <p style="color:#999;font-size:13px;">
                    Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
                    <br/>
                    Tuyệt đối không chia sẻ mã OTP này cho bất kỳ ai.
                </p>

                <div style="
                    margin-top:20px;
                    padding:10px;
                    background:#f4f4f4;
                    border-radius:8px;
                    font-size:12px;
                    color:#666;
                ">
                    Dũng Cinema 🍿
                </div>

            </div>
        </div>
    `;
};

module.exports = ForgotPinTemplate;