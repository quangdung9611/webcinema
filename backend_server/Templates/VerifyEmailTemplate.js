// =========================================================
// VERIFY EMAIL TEMPLATE — Dùng SVG inline
// =========================================================

module.exports = (fullName, verifyUrl) => {

    // =========================================================
    // SVG ICONS
    // =========================================================

    // 🎬 Film
    const ICON_FILM = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" 
             viewBox="0 0 24 24" fill="none" stroke="#e50914" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M7 3v18"/>
            <path d="M3 7.5h4"/>
            <path d="M3 12h18"/>
            <path d="M3 16.5h4"/>
            <path d="M17 3v18"/>
            <path d="M17 7.5h4"/>
            <path d="M17 16.5h4"/>
        </svg>
    `;

    // 🔒 Lock
    const ICON_LOCK = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="#e50914" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    `;

    // ✅ CheckCircle (for button)
    const ICON_CHECK = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" 
             viewBox="0 0 24 24" fill="none" stroke="#ffffff" 
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    `;

    // 🏠 Home (footer)
    const ICON_HOME = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" 
             viewBox="0 0 24 24" fill="none" stroke="#e50914" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 4px;">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
    `;

    // 📧 Mail (footer)
    const ICON_MAIL = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" 
             viewBox="0 0 24 24" fill="none" stroke="#e50914" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 4px;">
            <rect width="20" height="16" x="2" y="4" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
    `;

    // =========================================================
    // TEMPLATE
    // =========================================================

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác thực email</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 30px auto;
                background-color: #ffffff;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #e50914;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #e50914;
                font-size: 28px;
                margin: 0;
                display: inline-flex;
                align-items: center;
                gap: 10px;
            }
            .content {
                padding: 30px 0;
                color: #333333;
            }
            .content h2 {
                color: #333333;
                font-size: 22px;
            }
            .btn {
                display: inline-block;
                background-color: #e50914;
                color: #ffffff !important;
                padding: 14px 32px;
                border-radius: 5px;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
                margin: 20px 0;
                border: none;
            }
            .btn:hover {
                background-color: #b20710;
            }
            .footer {
                text-align: center;
                font-size: 12px;
                color: #999999;
                border-top: 1px solid #eeeeee;
                padding-top: 20px;
            }
            .footer a {
                color: #e50914;
                text-decoration: none;
                margin: 0 6px;
            }
            .note {
                color: #666666;
                font-size: 14px;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>
                    ${ICON_FILM}
                    <span style="vertical-align: middle;">Dũng Cinema</span>
                </h1>
                <p style="color: #666666; margin: 10px 0 0 0;">Xác thực địa chỉ email</p>
            </div>
            <div class="content">
                <h2>Xin chào ${fullName || 'bạn'}!</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Dũng Cinema</strong>.</p>
                <p>Vui lòng nhấn vào nút bên dưới để xác thực địa chỉ email của bạn:</p>
                <div style="text-align: center;">
                    <a href="${verifyUrl}" class="btn" style="color: #ffffff !important;">
                        ${ICON_CHECK}
                        <span style="vertical-align: middle;">Xác thực email</span>
                    </a>
                </div>
                <p class="note">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                <p class="note">
                    ${ICON_LOCK}
                    <span style="vertical-align: middle;">
                        Liên kết này sẽ hết hạn sau <strong>30 phút</strong>.
                    </span>
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2026 Dũng Cinema. All rights reserved.</p>
                <p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">
                        ${ICON_HOME}
                        <span style="vertical-align: middle;">Trang chủ</span>
                    </a>
                    |
                    <a href="mailto:support@quangdungcinema.id.vn">
                        ${ICON_MAIL}
                        <span style="vertical-align: middle;">Hỗ trợ</span>
                    </a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};