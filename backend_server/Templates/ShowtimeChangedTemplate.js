const ShowtimeChangedTemplate = (ticketData) => {
    const {
        bookingId,
        customerName,
        seatLabel,
        movieTitle,
        moviePoster,       // ✅ URL công khai từ Cloudinary
        cinemaName,
        startTime,
        selectedDate,
        selectedFoods,
        earnedPoints,
        ticketPIN,
        qrCid,
        roomName,

        // ✅ Chỉ dùng cho thông báo thay đổi
        oldInfo = {},
        newInfo = {},
        reason = "",
    } = ticketData;

    // ✅ Fallback nếu không có poster
    const posterUrl = moviePoster || '';

    // ✅ ICONS — SVG INLINE (từ Lucide)
    const ICON_MAP_PIN = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
        </svg>
    `;

    const ICON_CLOCK = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    `;

    const ICON_DOOR = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <path d="M13 4h3a2 2 0 0 1 2 2v14"/>
            <path d="M2 20h3"/>
            <path d="M13 20h9"/>
            <path d="M10 12v.01"/>
            <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.562Z"/>
        </svg>
    `;

    const ICON_ARMCHAIR = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/>
            <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"/>
            <path d="M5 18v2"/>
            <path d="M19 18v2"/>
        </svg>
    `;

    const ICON_POPCORN = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <path d="M18 8a2 2 0 0 0 0-4 2 2 0 0 0-2 2"/>
            <path d="M10 22 9 8"/>
            <path d="m14 22 1-14"/>
            <path d="M2 8h20"/>
            <path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/>
            <path d="M8 8a2 2 0 0 0 0-4 2 2 0 0 0-2 2"/>
        </svg>
    `;

    const ICON_STAR = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="#27ae60" stroke="#27ae60" 
             stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    `;

    return `
        <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">

                <!-- ✅ HEADER — CHỈ ĐỔI TITLE -->
                <div style="background: #e74c3c; padding: 25px; text-align: center; color: white;">
                    <h1 style="margin:0; font-size:24px;">SUẤT CHIẾU ĐÃ THAY ĐỔI!</h1>
                    <p style="margin-top:5px; opacity:0.9;">
                        Vui lòng kiểm tra lại thông tin bên dưới
                    </p>
                </div>

                <!-- BODY -->
                <div style="padding:30px;">
                    <p>Chào <b>${customerName}</b>,</p>

                    <!-- ✅ THÔNG BÁO THAY ĐỔI (nhỏ gọn) -->
                    <div style="background:#fff9e6; border-left:4px solid #f39c12; border-radius:6px; padding:12px 16px; margin:15px 0 20px 0;">
                        <p style="margin:0; color:#92400e; font-size:14px; line-height:1.6;">
                            <b>📝 Thông báo:</b> Suất chiếu của bạn đã được thay đổi.
                            Vé cũ vẫn có hiệu lực, vui lòng đến đúng thông tin mới.
                            ${reason ? `<br><b>Lý do:</b> ${reason}` : ''}
                        </p>
                    </div>

                    <!-- ✅ POSTER PHIM — DÙNG URL CÔNG KHAI -->
                    ${posterUrl ? `
                        <div style="text-align:center; margin:20px 0 25px 0;">
                            <img 
                                src="${posterUrl}" 
                                alt="${movieTitle}"
                                style="max-width:220px; width:100%; height:auto; border-radius:12px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); display:block; margin:0 auto; border: 0; outline: none;"
                            />
                        </div>
                    ` : ''}

                    <div style="border: 2px dashed #eee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h3 style="color:#e74c3c; margin:0 0 15px 0; font-size:20px; text-align:center;">
                            ${movieTitle}
                        </h3>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_MAP_PIN}
                            <b>Rạp:</b>&nbsp;${cinemaName}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_CLOCK}
                            <b>Suất:</b>&nbsp;${startTime} | ${selectedDate}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_DOOR}
                            <b>Phòng:</b>&nbsp;${roomName || '---'}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_ARMCHAIR}
                            <b>Ghế:</b>&nbsp;
                            <span style="font-size:18px; color:#e74c3c; font-weight:bold;">
                                ${seatLabel}
                            </span>
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_POPCORN}
                            <b>Đồ ăn:</b>&nbsp;${selectedFoods || 'Không có'}
                        </p>
                    </div>

                    <!-- QR CODE -->
                    <div style="margin:30px 0; text-align:center; padding:25px; border:1px dashed #ddd; border-radius:12px; background:#fafafa;">
                        <h2 style="margin:0; color:#222; font-size:26px;">MÃ NHẬN VÉ</h2>

                        <div style="margin:15px 0; font-size:38px; font-weight:bold; color:#e74c3c; letter-spacing:8px;">
                            ${ticketPIN || ""}
                        </div>

                        ${qrCid ? `
                            <img 
                                src="cid:${qrCid}" 
                                alt="QR Code" 
                                style="width:220px; height:220px; display:block; margin:20px auto; border-radius:10px; border:8px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,.15);" 
                            />
                        ` : ''}

                        <p style="margin-top:15px; color:#666; line-height:24px;">
                            Vui lòng quét mã QR tại quầy hoặc kiosk để in vé.
                        </p>
                    </div>

                    <!-- FOOTER -->
                    <div style="text-align:center; padding:15px; background:#fff9f9; border-radius:8px;">
                        <p style="color:#27ae60; font-weight:bold; margin:0; display: flex; align-items: center; justify-content: center;">
                            ${ICON_STAR}
                            Bạn vừa tích lũy thêm: ${earnedPoints} điểm!
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

module.exports = ShowtimeChangedTemplate;