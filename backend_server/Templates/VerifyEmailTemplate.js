// =========================================================
// VERIFY EMAIL TEMPLATE
// =========================================================

module.exports = (fullName, verifyUrl) => {

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
                padding: 14px 40px;
                border-radius: 5px;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
                margin: 20px 0;
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
                <h1>🎬 Dũng Cinema</h1>
                <p style="color: #666666;">Xác thực địa chỉ email</p>
            </div>
            <div class="content">
                <h2>Xin chào ${fullName || 'bạn'}!</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Dũng Cinema</strong>.</p>
                <p>Vui lòng nhấn vào nút bên dưới để xác thực địa chỉ email của bạn:</p>
                <div style="text-align: center;">
                    <a href="${verifyUrl}" class="btn">Xác thực email</a>
                </div>
                <p class="note">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                <p class="note">Liên kết này sẽ hết hạn sau 10 phút.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Dũng Cinema. All rights reserved.</p>
                <p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Trang chủ</a> |
                    <a href="mailto:support@quangdungcinema.id.vn">Hỗ trợ</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

};