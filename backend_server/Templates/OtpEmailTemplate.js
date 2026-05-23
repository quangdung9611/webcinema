const OtpPaymentTemplate = (otp, bookingId) => {
    return `
        <div style="text-align:center;font-family:Arial, sans-serif;">
            
            <div style="max-width:500px;margin:0 auto;padding:20px;">
                
                <h2 style="margin-bottom:10px;">
                    Mã xác thực thanh toán
                </h2>

                <p style="color:#555;">
                    Đơn hàng #${bookingId}
                </p>

                <div style="margin:20px 0;">
                    <span style="
                        display:inline-block;
                        font-size:32px;
                        font-weight:bold;
                        color:red;
                        letter-spacing:5px;
                    ">
                        ${otp}
                    </span>
                </div>

                <p style="color:#777;font-size:14px;">
                    Mã OTP có hiệu lực trong <b>5 phút</b>.
                    <br/>
                    Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.
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

module.exports = OtpPaymentTemplate;