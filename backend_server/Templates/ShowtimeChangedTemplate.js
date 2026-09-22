// ============================================================
// SHOWTIME CHANGED TEMPLATE
// Email thông báo suất chiếu đã thay đổi + so sánh cũ/mới
// ============================================================

const ShowtimeChangedTemplate = (data) => {
    const {
        customerName,
        movieTitle,
        moviePoster,
        oldInfo = {},
        newInfo = {},
        reason,
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
    // SO SÁNH CŨ vs MỚI — Highlight cái nào thay đổi
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

                <!-- BODY -->
                <div style="padding:30px;">
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

                    <!-- SO SÁNH CŨ vs MỚI -->
                    <div style="margin:20px 0; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">

                        <!-- HEADER -->
                        <div style="display:flex; background:#f9fafb; padding:12px 16px; border-bottom:1px solid #e5e7eb;">
                            <div style="flex:1; text-align:center; font-weight:700; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
                                Thông tin cũ
                            </div>
                            <div style="width:40px;"></div>
                            <div style="flex:1; text-align:center; font-weight:700; color:#3b82f6; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
                                Thông tin mới
                            </div>
                        </div>

                        <!-- ROW 1: PHIM -->
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

                        <!-- ROW 2: RẠP -->
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

                        <!-- ROW 3: PHÒNG -->
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

                        <!-- ROW 4: GIỜ -->
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

                        <!-- ROW 5: NGÀY -->
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

                    <!-- FOOTER -->
                    <div style="text-align:center; padding:15px 0; border-top: 1px solid #eee;">
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