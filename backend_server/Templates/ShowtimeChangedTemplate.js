// ============================================================
// SHOWTIME CHANGED TEMPLATE
// Email thông báo suất chiếu đã thay đổi + thông tin vé
// ============================================================

const ShowtimeChangedTemplate = (data) => {
    const {
        customerName,
        movieTitle,
        moviePoster,
        oldInfo = {},
        newInfo = {},
        reason,

        // ✅ THÔNG TIN VÉ
        bookingId,
        seatLabel,
        cinemaName,
        roomName,
        startTime,
        selectedDate,
        selectedFoods,
        earnedPoints,
        ticketPIN,
        qrCid,
    } = data;

    const posterUrl = moviePoster || '';

    // =========================================================
    // FORMAT DATE TIME
    // =========================================================
    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return { date: '---', time: '---' };
        try {
            const normalized = String(dateTimeStr).replace('T', ' ');
            const [datePart, timePart] = normalized.split(' ');
            const [year, month, day] = datePart.split('-');
            return {
                date: `${day}/${month}/${year}`,
                time: timePart?.substring(0, 5) || '---',
            };
        } catch {
            return { date: '---', time: '---' };
        }
    };

    const oldDT = formatDateTime(oldInfo.start_time);
    const newDT = formatDateTime(newInfo.start_time);

    // =========================================================
    // SO SÁNH CŨ vs MỚI
    // =========================================================
    const isRoomChanged =
        String(oldInfo.room_id) !== String(newInfo.room_id) ||
        String(oldInfo.room_name) !== String(newInfo.room_name);

    const isTimeChanged = oldDT.time !== newDT.time;
    const isDateChanged = oldDT.date !== newDT.date;

    // =========================================================
    // ICONS
    // =========================================================
    const ICON_ALERT = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" 
             viewBox="0 0 24 24" fill="none" stroke="#ffffff" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    `;

    const ICON_ARROW = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
             viewBox="0 0 24 24" fill="none" stroke="#3b82f6" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
        </svg>
    `;

    const ICON_REASON = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" 
             viewBox="0 0 24 24" fill="none" stroke="#f39c12" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
        </svg>
    `;

    // ===== ICONS TICKET =====
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

    // =========================================================
    // RENDER HTML
    // =========================================================
    return `
        <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">

                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 30px 25px; text-align: center; color: white;">
                    <div style="margin-bottom: 10px;">
                        ${ICON_ALERT}
                    </div>
                    <h1 style="margin:0; font-size:22px; letter-spacing: 0.5px;">
                        SUẤT CHIẾU CỦA BẠN ĐÃ THAY ĐỔI
                    </h1>
                    <p style="margin-top:8px; opacity:0.95; font-size: 15px;">
                        Vui lòng kiểm tra thông tin mới bên dưới
                    </p>
                </div>

                <!-- BODY — THAY ĐỔI -->
                <div style="padding:30px 30px 20px 30px;">
                    <p style="font-size: 15px; line-height: 1.6;">
                        Chào <b>${customerName}</b>,<br><br>
                        Dũng Cinema xin thông báo suất chiếu bạn đã đặt 
                        <strong>có thay đổi</strong>. 
                        Vé của bạn <strong style="color: #27ae60;">vẫn còn hiệu lực</strong> 
                        và chỉ cần đến đúng thông tin mới.
                    </p>

                    ${posterUrl ? `
                        <div style="text-align:center; margin:25px 0;">
                            <img 
                                src="${posterUrl}" 
                                alt="${movieTitle}"
                                style="max-width:180px; width:100%; height:auto; border-radius:12px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); display:block; margin:0 auto; border: 0;"
                            />
                        </div>
                    ` : ''}

                    <!-- SO SÁNH -->
                    <div style="margin:20px 0; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">

                        <div style="display:flex; background:#f9fafb; padding:12px 16px; border-bottom:1px solid #e5e7eb;">
                            <div style="flex:1; text-align:center; font-weight:700; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
                                Thông tin cũ
                            </div>
                            <div style="width:40px;"></div>
                            <div style="flex:1; text-align:center; font-weight:700; color:#3b82f6; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
                                Thông tin mới
                            </div>
                        </div>

                        <!-- PHIM -->
                        <div style="display:flex; padding:14px 16px; border-bottom:1px solid #f3f4f6; align-items:center;">
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:#333; font-weight:600;">
                                    ${oldInfo.movie_title || '---'}
                                </div>
                            </div>
                            <div style="width:40px; text-align:center;">
                                ${ICON_ARROW}
                            </div>
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:#333; font-weight:600;">
                                    ${newInfo.movie_title || '---'}
                                </div>
                            </div>
                        </div>

                        <!-- RẠP -->
                        <div style="display:flex; padding:14px 16px; border-bottom:1px solid #f3f4f6; align-items:center;">
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:#333; font-weight:600;">
                                    ${oldInfo.cinema_name || '---'}
                                </div>
                            </div>
                            <div style="width:40px; text-align:center;">
                                ${ICON_ARROW}
                            </div>
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:#333; font-weight:600;">
                                    ${newInfo.cinema_name || '---'}
                                </div>
                            </div>
                        </div>

                        <!-- PHÒNG -->
                        <div style="display:flex; padding:14px 16px; border-bottom:1px solid #f3f4f6; align-items:center; background:${isRoomChanged ? '#fef3c7' : 'transparent'};">
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:${isRoomChanged ? '#92400e' : '#333'}; font-weight:${isRoomChanged ? '700' : '600'};">
                                    ${oldInfo.room_name || '---'}
                                </div>
                            </div>
                            <div style="width:40px; text-align:center;">
                                ${ICON_ARROW}
                            </div>
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:${isRoomChanged ? '#92400e' : '#333'}; font-weight:${isRoomChanged ? '700' : '600'};">
                                    ${newInfo.room_name || '---'}
                                </div>
                            </div>
                        </div>

                        <!-- GIỜ -->
                        <div style="display:flex; padding:14px 16px; border-bottom:1px solid #f3f4f6; align-items:center; background:${isTimeChanged ? '#fef3c7' : 'transparent'};">
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:${isTimeChanged ? '#92400e' : '#333'}; font-weight:${isTimeChanged ? '700' : '600'};">
                                    ${oldDT.time}
                                </div>
                            </div>
                            <div style="width:40px; text-align:center;">
                                ${ICON_ARROW}
                            </div>
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:${isTimeChanged ? '#92400e' : '#333'}; font-weight:${isTimeChanged ? '700' : '600'};">
                                    ${newDT.time}
                                </div>
                            </div>
                        </div>

                        <!-- NGÀY -->
                        <div style="display:flex; padding:14px 16px; align-items:center; background:${isDateChanged ? '#fef3c7' : 'transparent'};">
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:${isDateChanged ? '#92400e' : '#333'}; font-weight:${isDateChanged ? '700' : '600'};">
                                    ${oldDT.date}
                                </div>
                            </div>
                            <div style="width:40px; text-align:center;">
                                ${ICON_ARROW}
                            </div>
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:${isDateChanged ? '#92400e' : '#333'}; font-weight:${isDateChanged ? '700' : '600'};">
                                    ${newDT.date}
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- LÝ DO -->
                    ${reason ? `
                        <div style="margin:20px 0; padding:16px 20px; background:#fffbf0; border-left:4px solid #f39c12; border-radius:8px;">
                            <p style="margin: 0 0 6px 0; font-size:13px; color:#92400e; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
                                ${ICON_REASON}
                                Lý do thay đổi
                            </p>
                            <p style="margin: 0; font-size:14px; color:#333; line-height:1.6;">
                                ${reason}
                            </p>
                        </div>
                    ` : ''}

                    <!-- LƯU Ý -->
                    <div style="background: #ecfdf5; padding: 15px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
                        <p style="margin: 0; font-size: 13px; color: #065f46; line-height: 1.7;">
                            <strong style="color: #27ae60;">✅ Lưu ý quan trọng:</strong> 
                            Vé của bạn <strong>KHÔNG bị hủy</strong>, chỉ thay đổi thông tin suất chiếu.
                            QR code cũ vẫn dùng được bình thường.
                            Vui lòng đến đúng giờ mới.
                        </p>
                    </div>
                </div>

                <!-- ============ THÔNG TIN VÉ ============ -->
                <div style="padding:0 30px 30px 30px;">

                    <div style="border-top: 2px dashed #e5e7eb; margin: 10px 0 25px 0; position: relative;">
                        <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: white; padding: 0 12px; color: #999; font-size: 12px; letter-spacing: 1px;">
                            THÔNG TIN VÉ
                        </div>
                    </div>

                    <div style="border: 2px dashed #eee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h3 style="color:#e74c3c; margin:0 0 15px 0; font-size:20px; text-align:center;">
                            ${movieTitle}
                        </h3>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_MAP_PIN}
                            <b>Rạp:</b>&nbsp;${cinemaName || '---'}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_CLOCK}
                            <b>Suất:</b>&nbsp;${startTime || '---'} | ${selectedDate || '---'}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_DOOR}
                            <b>Phòng:</b>&nbsp;${roomName || '---'}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center;">
                            ${ICON_ARMCHAIR}
                            <b>Ghế:</b>&nbsp;
                            <span style="font-size:18px; color:#e74c3c; font-weight:bold;">
                                ${seatLabel || '---'}
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

                    <!-- FOOTER VÉ -->
                    <div style="text-align:center; padding:15px; background:#fff9f9; border-radius:8px;">
                        <p style="color:#27ae60; font-weight:bold; margin:0; display: flex; align-items: center; justify-content: center;">
                            ${ICON_STAR}
                            Bạn vừa tích lũy thêm: ${earnedPoints || 0} điểm!
                        </p>

                        <h2 style="margin:10px 0 0 0; color:#333; font-size:24px;">
                            Mã vé: #${bookingId || '---'}
                        </h2>
                    </div>

                    <!-- FOOTER CUỐI -->
                    <div style="text-align:center; padding:20px 0 0 0; border-top: 1px solid #eee; margin-top: 25px;">
                        <p style="margin: 0 0 8px 0; color:#333; font-size: 15px;">
                            Hẹn gặp bạn tại rạp! 🎬
                        </p>
                        <p style="margin:0; color:#999; font-size: 12px;">
                            Dũng Cinema — More Than A Movie
                        </p>
                    </div>
                </div>

            </div>
        </div>
    `;
};

module.exports = ShowtimeChangedTemplate;