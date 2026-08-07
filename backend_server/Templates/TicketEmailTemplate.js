const TicketEmailTemplate = (
    ticketData,
    fileExists
) => {

    const {

        bookingId,
        customerName,
        customerEmail,

        movieTitle,
        moviePoster,

        cinemaName,
        roomName,

        startTime,
        selectedDate,

        seatLabel,
        selectedFoods,

        earnedPoints,

        ticketPIN,
        qrCode

    } = ticketData;

    return `

    <div
        style="
            background:#f5f5f5;
            padding:40px 0;
            font-family:Segoe UI,Arial,sans-serif;
        "
    >

        <div
            style="
                max-width:720px;
                margin:auto;
                background:#ffffff;
                border-radius:18px;
                overflow:hidden;
                box-shadow:0 12px 35px rgba(0,0,0,.15);
            "
        >

            <!-- HEADER -->

            <div
                style="
                    background:linear-gradient(135deg,#d91f26,#8b0000);
                    padding:35px;
                    text-align:center;
                    color:#fff;
                "
            >

                <h1
                    style="
                        margin:0;
                        font-size:32px;
                        letter-spacing:1px;
                    "
                >
                    🎉 THANH TOÁN THÀNH CÔNG
                </h1>

                <p
                    style="
                        margin-top:10px;
                        font-size:15px;
                        opacity:.9;
                    "
                >
                    Cảm ơn bạn đã lựa chọn
                    <b>Dũng Cinema</b>
                </p>

            </div>

            <!-- BODY -->

            <div
                style="
                    padding:35px;
                "
            >

                <p
                    style="
                        margin-top:0;
                        font-size:17px;
                    "
                >
                    Xin chào
                    <b>${customerName}</b>,
                </p>

                <p
                    style="
                        color:#555;
                        line-height:1.8;
                    "
                >
                    Vé điện tử của bạn đã được tạo thành công.
                    Bạn chỉ cần mang
                    <b>QR Code</b>
                    bên dưới đến quầy hoặc kiosk để nhận vé.
                </p>

                <!-- CARD -->

                <div
                    style="
                        margin-top:25px;
                        border:2px dashed #e3e3e3;
                        border-radius:14px;
                        overflow:hidden;
                    "
                >

                    <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        style="
                            border-collapse:collapse;
                        "
                    >

                        <tr>

                            <td
                                width="220"
                                valign="top"
                                style="
                                    padding:20px;
                                    background:#fafafa;
                                    text-align:center;
                                "
                            >
                            <td
                                width="220"
                                valign="top"
                                style="
                                    padding:20px;
                                    background:#fafafa;
                                    text-align:center;
                                "
                            >
                                            ${
                    fileExists
                        ? `
                        <div
                            style="
                                text-align:center;
                                margin:30px 0;
                            "
                        >
                            <img
                                src="cid:poster_img"
                                alt="Movie Poster"
                                style="
                                    width:220px;
                                    border-radius:12px;
                                    box-shadow:0 8px 25px rgba(0,0,0,.18);
                                "
                            />
                        </div>
                        `
                        : ""
                }

                <!-- QR CODE -->

                ${
                    qrCode
                        ? `
                        <div
                            style="
                                text-align:center;
                                margin-top:35px;
                            "
                        >

                            <h3
                                style="
                                    margin-bottom:12px;
                                    color:#111827;
                                "
                            >
                                QUÉT MÃ QR NHẬN VÉ
                            </h3>

                            <img
                                src="${qrCode}"
                                width="180"
                                height="180"
                                alt="QR Code"
                                style="
                                    border:8px solid #ffffff;
                                    border-radius:14px;
                                    box-shadow:0 6px 18px rgba(0,0,0,.15);
                                "
                            />

                            <p
                                style="
                                    margin-top:12px;
                                    color:#666;
                                    font-size:14px;
                                "
                            >
                                Vui lòng xuất trình mã QR tại quầy hoặc kiosk
                            </p>

                        </div>
                        `
                        : ""
                }

                <!-- FOOTER -->

                <div
                    style="
                        margin-top:35px;
                        background:#f9fafb;
                        border-radius:12px;
                        padding:25px;
                        text-align:center;
                    "
                >

                    <div
                        style="
                            font-size:16px;
                            color:#16a34a;
                            font-weight:bold;
                        "
                    >
                        🌟 Bạn nhận được
                        <span style="font-size:20px;">
                            ${earnedPoints || 0}
                        </span>
                        điểm thưởng
                    </div>

                    <div
                        style="
                            margin-top:18px;
                            font-size:28px;
                            color:#dc2626;
                            font-weight:bold;
                            letter-spacing:2px;
                        "
                    >
                        #${bookingId}
                    </div>

                    <p
                        style="
                            color:#666;
                            margin-top:8px;
                            font-size:13px;
                        "
                    >
                        Mã đơn hàng
                    </p>

                </div>

                <hr
                    style="
                        border:none;
                        border-top:1px dashed #ddd;
                        margin:35px 0 25px;
                    "
                />

                <div
                    style="
                        text-align:center;
                        color:#777;
                        font-size:13px;
                        line-height:24px;
                    "
                >
                    Cảm ơn bạn đã lựa chọn
                    <b>Dũng Cinema</b>.
                    <br/>
                    Chúc bạn có một trải nghiệm xem phim tuyệt vời!
                    <br/><br/>

                    <span style="font-size:12px;">
                        © ${new Date().getFullYear()} Dũng Cinema
                    </span>

                </div>

            </div>

        </div>

    </div>

    `;

};

module.exports = TicketEmailTemplate;