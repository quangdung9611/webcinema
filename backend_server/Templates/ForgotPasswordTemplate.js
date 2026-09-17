// =========================================================
// FORGOT PASSWORD TEMPLATE — Dùng SVG inline
// =========================================================

const ForgotPasswordTemplate = (otp, fullName = "", expiresAt) => {

    // 🔒 Lock
    const ICON_LOCK = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    `;

    // ⏰ Clock
    const ICON_CLOCK = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 4px;">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    `;

    // 🍿 Popcorn (footer)
    const ICON_POPCORN = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" 
             viewBox="0 0 24 24" fill="none" stroke="#666" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-left: 6px;">
            <path d="M18 8a2 2 0 0 0 0-4 2 2 0 0 0-2 2"/>
            <path d="M10 22 9 8"/>
            <path d="m14 22 1-14"/>
            <path d="M2 8h20"/>
            <path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/>
            <path d="M8 8a2 2 0 0 0 0-4 2 2 0 0 0-2 2"/>
        </svg>
    `;

    return `
        <div style="text-align:center;font-family:Arial, sans-serif;">
            
            <div style="max-width:500px;margin:0 auto;padding:20px;">
                
                <h2 style="margin-bottom:10px;color:#333; display: inline-flex; align-items: center; gap: 10px;">
                    ${ICON_LOCK}
                    <span style="vertical-align: middle;">Đặt lại mật khẩu</span>
                </h2>

                ${fullName ? `<p style="color:#555;">Xin chào <b>${fullName}</b>,</p>` : ''}
                
                <p style="color:#555;">
                    Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
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
                        font-family: 'Courier New', monospace;
                    ">
                        ${otp}
                    </span>
                </div>

                <p style="color:#777;font-size:14px;">
                    Nhập mã OTP này để xác thực và đặt mật khẩu mới cho tài khoản của bạn.
                    <br/>
                    ${ICON_CLOCK}
                    <span style="vertical-align: middle;">
                        Mã OTP có hiệu lực đến <b style="color:#e74c3c;">${expiresAt}</b> (Giờ Việt Nam).
                    </span>
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
                    Dũng Cinema
                    ${ICON_POPCORN}
                </div>

            </div>
        </div>
    `;
};

module.exports = ForgotPasswordTemplate;