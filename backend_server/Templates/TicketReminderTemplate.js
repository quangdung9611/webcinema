// ============================================================
// TICKET REMINDER TEMPLATE
// Email nhắc nhở suất chiếu trước 30 phút
// ============================================================

const TicketReminderTemplate = (reminderData) => {
    const {
        bookingId,
        customerName,
        seatLabel,
        movieTitle,
        moviePoster,
        cinemaName,
        cinemaAddress,
        cinemaMap,
        startTime,
        selectedDate,
        selectedFoods,
        ticketPIN,
        qrCid,
        roomName,
        minutesBefore = 30,
    } = reminderData;

    const posterUrl = moviePoster || '';

    // ✅ ICONS — SVG INLINE
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

    const ICON_BELL = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" 
             viewBox="0 0 24 24" fill="none" stroke="#ffffff" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
    `;

    return `
        <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">

                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #f39c12, #e74c3c); padding: 30px 25px; text-align: center; color: white;">
                    <div style="margin-bottom: 10px;">
                        ${ICON_BELL}
                    </div>
                    <h1 style="margin:0; font-size:22px; letter-spacing: 0.5px;">
                        SUẤT CHIẾU SẮP BẮT ĐẦU!
                    </h1>
                    <p style="margin-top:8px; opacity:0.95; font-size: 15px;">
                        Còn <strong>${minutesBefore} phút</strong> nữa là đến giờ chiếu
                    </p>
                </div>

                <!-- BODY -->
                <div style="padding:30px;">
                    <p style="font-size: 15px; line-height: 1.6;">
                        Chào <b>${customerName}</b>,<br>
                        Dũng Cinema xin nhắc bạn về suất chiếu sắp tới. 
                        Vui lòng có mặt tại rạp trước <strong>15 phút</strong> để ổn định chỗ ngồi.
                    </p>

                    <!-- POSTER PHIM -->
                    ${posterUrl ? `
                        <div style="text-align:center; margin:25px 0;">
                            <img 
                                src="${posterUrl}" 
                                alt="${movieTitle}"
                                style="max-width:200px; width:100%; height:auto; border-radius:12px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); display:block; margin:0 auto; border: 0;"
                            />
                        </div>
                    ` : ''}

                    <!-- THÔNG TIN SUẤT CHIẾU -->
                    <div style="border: 2px dashed #f39c12; padding: 20px; margin: 20px 0; border-radius: 8px; background: #fffdf5;">
                        <h3 style="color:#e74c3c; margin:0 0 15px 0; font-size:20px; text-align:center;">
                            ${movieTitle}
                        </h3>

                        <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                            ${ICON_MAP_PIN}
                            <b>Rạp:</b>&nbsp;${cinemaName}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                            ${ICON_CLOCK}
                            <b>Suất:</b>&nbsp;<strong style="color: #e74c3c; font-size: 16px;">${startTime}</strong>&nbsp;|&nbsp;${selectedDate}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                            ${ICON_DOOR}
                            <b>Phòng:</b>&nbsp;${roomName || '---'}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                            ${ICON_ARMCHAIR}
                            <b>Ghế:</b>&nbsp;
                            <span style="font-size:17px; color:#e74c3c; font-weight:bold;">
                                ${seatLabel}
                            </span>
                        </p>

                        ${selectedFoods ? `
                            <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                                ${ICON_POPCORN}
                                <b>Đồ ăn:</b>&nbsp;${selectedFoods}
                            </p>
                        ` : ''}
                    </div>

                    <!-- ĐỊA CHỈ RẠP -->
                    ${cinemaAddress ? `
                        <div style="background: #f9f9f9; padding: 15px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666; text-transform: uppercase; font-weight: 600;">
                                📍 Địa chỉ rạp
                            </p>
                            <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.5;">
                                ${cinemaAddress}
                            </p>
                            ${cinemaMap ? `
                                <p style="margin: 10px 0 0 0;">
                                    <a href="#" style="color: #e74c3c; text-decoration: none; font-size: 13px; font-weight: 600;">
                                        Xem bản đồ →
                                    </a>
                                </p>
                            ` : ''}
                        </div>
                    ` : ''}

                    <!-- QR CODE -->
                    <div style="margin:30px 0; text-align:center; padding:25px; border:1px dashed #ddd; border-radius:12px; background:#fafafa;">
                        <h2 style="margin:0; color:#222; font-size:20px;">MÃ NHẬN VÉ</h2>

                        <div style="margin:15px 0; font-size:32px; font-weight:bold; color:#e74c3c; letter-spacing:6px; word-break: break-all;">
                            ${ticketPIN || ""}
                        </div>

                        ${qrCid ? `
                            <img 
                                src="cid:${qrCid}" 
                                alt="QR Code" 
                                style="width:200px; height:200px; display:block; margin:20px auto; border-radius:10px; border:8px solid #fff; box-shadow:0 4px 12px rgba(0,0,0,.15);" 
                            />
                        ` : ''}

                        <p style="margin-top:15px; color:#666; line-height:22px; font-size: 13px;">
                            Vui lòng quét mã QR tại quầy hoặc kiosk để soát vé.
                        </p>
                    </div>

                    <!-- LƯU Ý -->
                    <div style="background: #fff9f9; padding: 15px 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.6;">
                            <strong style="color: #e74c3c;">💡 Lưu ý:</strong> 
                            Vui lòng đến rạp trước giờ chiếu <strong>15 phút</strong> để không bỏ lỡ phần đầu phim. 
                            Mang theo mã QR này để soát vé nhanh chóng.
                        </p>
                    </div>

                    <!-- FOOTER -->
                    <div style="text-align:center; padding:15px 0; border-top: 1px solid #eee;">
                        <p style="margin: 0 0 8px 0; color:#333; font-size: 15px; font-weight: 600;">
                            Hẹn gặp bạn tại rạp! 🎬
                        </p>
                        <p style="margin:0; color:#999; font-size: 12px;">
                            Mã vé: #${bookingId}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

module.exports = TicketReminderTemplate;