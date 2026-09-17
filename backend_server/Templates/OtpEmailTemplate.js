// =========================================================
// OTP EMAIL TEMPLATE (Payment) — Dùng SVG inline
// =========================================================

const OtpEmailTemplate = (otp, bookingId, expiresAt) => {

    // 💳 CreditCard (thanh toán)
    const ICON_CREDIT_CARD = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
            <rect width="20" height="14" x="2" y="5" rx="2"/>
            <line x1="2" x2="22" y1="10" y2="10"/>
        </svg>
    `;

    // 🎫 Ticket (booking ID)
    const ICON_TICKET = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
            <path d="M13 5v2"/>
            <path d="M13 17v2"/>
            <path d="M13 11v2"/>
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
                
                <h2 style="margin-bottom:10px; display: inline-flex; align-items: center; gap: 10px;">
                    ${ICON_CREDIT_CARD}
                    <span style="vertical-align: middle; color: #333;">Mã xác thực thanh toán</span>
                </h2>

                <p style="color:#555; display: inline-flex; align-items: center;">
                    ${ICON_TICKET}
                    <span style="vertical-align: middle;">Đơn hàng #${bookingId}</span>
                </p>

                <div style="margin:20px 0;">
                    <span style="
                        display:inline-block;
                        font-size:32px;
                        font-weight:bold;
                        color:#e74c3c;
                        letter-spacing:5px;
                        background: #fdf2f2;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-family: 'Courier New', monospace;
                    ">
                        ${otp}
                    </span>
                </div>

                <p style="color:#777;font-size:14px;">
                    ${ICON_CLOCK}
                    <span style="vertical-align: middle;">
                        Mã OTP có hiệu lực đến <b style="color:#e74c3c;">${expiresAt}</b> (Giờ Việt Nam).
                    </span>
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
                    Dũng Cinema
                    ${ICON_POPCORN}
                </div>

            </div>
        </div>
    `;
};

module.exports = OtpEmailTemplate;