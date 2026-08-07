const TicketEmailTemplate = (

    ticketData,
    fileExists

) => {

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
        qrCode

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

                    <h1
                        style="
                            margin: 0;
                            font-size: 24px;
                        "
                    >
                        THANH TOÁN THÀNH CÔNG!
                    </h1>

                    <p
                        style="
                            margin-top: 5px;
                            opacity: 0.9;
                        "
                    >
                        Hệ thống Dũng Cinema đã ghi nhận đơn hàng
                    </p>

                </div>

                <!-- BODY -->

                <div
                    style="
                        padding: 30px;
                    "
                >

                    <p>
                        Chào <b>${customerName}</b>,
                    </p>

                    <div
                        style="
                            border: 2px dashed #eee;
                            padding: 20px;
                            margin: 20px 0;
                            border-radius: 8px;
                        "
                    >

                        <h3
                            style="
                                color: #e74c3c;
                                margin: 0 0 15px 0;
                                font-size: 20px;
                            "
                        >
                            ${movieTitle}
                        </h3>

                        <p style="margin: 5px 0;">
                            <b>📍 Rạp:</b>
                            ${cinemaName}
                        </p>

                        <p style="margin: 5px 0;">
                            <b>⏰ Suất:</b>
                            ${startTime} | ${selectedDate}
                        </p>

                        <p style="margin: 5px 0;">

                            <b>💺 Ghế:</b>

                            <span
                                style="
                                    font-size: 18px;
                                    color: #e74c3c;
                                    font-weight: bold;
                                "
                            >
                                ${seatLabel}
                            </span>

                        </p>

                        <p style="margin: 5px 0;">
                            <b>🍿 Đồ ăn:</b>
                            ${selectedFoods || 'Không có'}
                        </p>

                    </div>

                    <!-- POSTER -->

                    ${

                        fileExists

                            ? `

                                <div
                                    style="
                                        text-align: center;
                                        margin: 20px 0;
                                    "
                                >

                                    <img
                                        src="cid:poster_img"
                                        style="
                                            max-width: 200px;
                                            border-radius: 10px;
                                        "
                                    />

                                </div>

                            `

                            : ''

                    }
                                    <!-- QR CODE -->

                <div
                    style="
                        text-align:center;
                        margin:30px 0;
                    "
                >

                    <h2
                        style="
                            color:#333;
                            margin-bottom:10px;
                        "
                    >
                        QUÉT MÃ QR NHẬN VÉ
                    </h2>

                    <h1
                        style="
                            color:#e74c3c;
                            font-size:30px;
                            letter-spacing:5px;
                            margin-bottom:20px;
                        "
                    >
                        ${ticketPIN}
                    </h1>

                    <img
                        src="${qrCode}"
                        alt="QR Code"
                        width="180"
                        height="180"
                        style="
                            border:8px solid #fff;
                            border-radius:12px;
                            box-shadow:0 4px 12px rgba(0,0,0,.15);
                        "
                    />

                    <p
                        style="
                            color:#666;
                            margin-top:15px;
                        "
                    >
                        Quét mã QR tại quầy hoặc kiosk để nhận vé.
                    </p>

                </div>
                    <!-- FOOTER -->

                    <div
                        style="
                            text-align: center;
                            padding: 15px;
                            background: #fff9f9;
                            border-radius: 8px;
                        "
                    >

                        <p
                            style="
                                color: #27ae60;
                                font-weight: bold;
                                margin: 0;
                            "
                        >
                            🌟 Bạn vừa tích lũy thêm:
                            ${earnedPoints} điểm!
                        </p>

                        <h2
                            style="
                                margin: 10px 0 0 0;
                                color: #333;
                                font-size: 24px;
                            "
                        >
                            Mã vé: #${bookingId}
                        </h2>

                    </div>

                </div>

            </div>

        </div>

    `;

};

module.exports = TicketEmailTemplate;