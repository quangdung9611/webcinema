const TicketEmailTemplate = (ticketData, fileExists) => {

    const {

        bookingId,
        customerName,
        seatLabel,
        movieTitle,
        cinemaName,
        startTime,
        selectedDate,
        selectedFoods,
        earnedPoints,
        ticketPIN,
        qrCid,
        roomName      // 👈 Thêm roomName từ ticketData

    } = ticketData;

    return `

        <div
            style="
                background-color: #f4f4f4;
                padding: 20px;
                font-family: 'Segoe UI', Arial, sans-serif;
            "
        >

            <div
                style="
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                "
            >

                <!-- HEADER -->

                <div
                    style="
                        background: #e74c3c;
                        padding: 25px;
                        text-align: center;
                        color: white;
                    "
                >

                    <h1 style="margin:0; font-size:24px;">THANH TOÁN THÀNH CÔNG!</h1>
                    <p style="margin-top:5px; opacity:0.9;">
                        Hệ thống Dũng Cinema đã ghi nhận đơn hàng
                    </p>

                </div>

                <!-- BODY -->

                <div style="padding:30px;">

                    <p>Chào <b>${customerName}</b>,</p>

                    <div
                        style="
                            border: 2px dashed #eee;
                            padding: 20px;
                            margin: 20px 0;
                            border-radius: 8px;
                        "
                    >

                        <h3 style="color:#e74c3c; margin:0 0 15px 0; font-size:20px;">
                            ${movieTitle}
                        </h3>

                        <p style="margin:5px 0;">
                            <b>📍 Rạp:</b> ${cinemaName}
                        </p>

                        <p style="margin:5px 0;">
                            <b>⏰ Suất:</b> ${startTime} | ${selectedDate}
                        </p>

                        <!-- 👇 HIỂN THỊ THÊM TÊN PHÒNG -->
                        <p style="margin:5px 0;">
                            <b>🏠 Phòng:</b> ${roomName || '---'}
                        </p>

                        <p style="margin:5px 0;">
                            <b>💺 Ghế:</b>
                            <span style="font-size:18px; color:#e74c3c; font-weight:bold;">
                                ${seatLabel}
                            </span>
                        </p>

                        <p style="margin:5px 0;">
                            <b>🍿 Đồ ăn:</b> ${selectedFoods || 'Không có'}
                        </p>

                    </div>

                    <!-- POSTER (nếu có) -->

                    ${fileExists ? `
                        <div style="text-align:center; margin:20px 0;">
                            <img src="cid:poster_img" style="max-width:200px; border-radius:10px;" />
                        </div>
                    ` : ''}

                    <!-- QR CODE (dùng cid) -->

                    <div
                        style="
                            margin:30px 0;
                            text-align:center;
                            padding:25px;
                            border:1px dashed #ddd;
                            border-radius:12px;
                            background:#fafafa;
                        "
                    >

                        <h2 style="margin:0; color:#222; font-size:26px;">
                            MÃ NHẬN VÉ
                        </h2>

                        <div
                            style="
                                margin:15px 0;
                                font-size:38px;
                                font-weight:bold;
                                color:#e74c3c;
                                letter-spacing:8px;
                            "
                        >
                            ${ticketPIN || ""}
                        </div>

                        <img
                            src="cid:${qrCid || 'qr_img'}"
                            alt="QR Code"
                            style="
                                width:220px;
                                height:220px;
                                display:block;
                                margin:20px auto;
                                border-radius:10px;
                                border:8px solid #fff;
                                box-shadow:0 4px 12px rgba(0,0,0,.15);
                            "
                        />

                        <p style="margin-top:15px; color:#666; line-height:24px;">
                            Vui lòng quét mã QR tại quầy hoặc kiosk để in vé.
                        </p>

                    </div>

                    <!-- FOOTER -->

                    <div
                        style="
                            text-align:center;
                            padding:15px;
                            background:#fff9f9;
                            border-radius:8px;
                        "
                    >

                        <p style="color:#27ae60; font-weight:bold; margin:0;">
                            🌟 Bạn vừa tích lũy thêm: ${earnedPoints} điểm!
                        </p>

                        <h2 style="margin:10px 0 0 0; color:#333; font-size:24px;">
                            Mã vé: #${bookingId}
                        </h2>

                    </div>

                </div>

            </div>

        </div>

    `;

};

module.exports = TicketEmailTemplate;