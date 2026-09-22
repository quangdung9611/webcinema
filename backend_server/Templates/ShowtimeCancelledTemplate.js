// ============================================================
// SHOWTIME CANCELLED TEMPLATE
// Email thông báo hủy + hoàn điểm + link đổi vé miễn phí
// ============================================================

const ShowtimeCancelledTemplate = (data) => {
    const {
        customerName,
        movieTitle,
        moviePoster,
        cinemaName,
        roomName,
        startTime,
        reason,
        refundPoints = 0,
        newTotalPoints = 0,
        rescheduleLink = '',
        expiresAt = null,
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

    const formatExpiryDate = (date) => {
        if (!date) return '---';
        try {
            const d = new Date(date);
            return d.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '---';
        }
    };

    const { date: showDate, time: showTime } = formatDateTime(startTime);
    const expiryFormatted = formatExpiryDate(expiresAt);

    // =========================================================
    // FORMAT NUMBER
    // =========================================================
    const formatNumber = (num) => {
        return Number(num || 0).toLocaleString('vi-VN');
    };

    // =========================================================
    // ICONS
    // =========================================================
    const ICON_ALERT = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" 
             viewBox="0 0 24 24" fill="none" stroke="#ffffff" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
        </svg>
    `;

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

    const ICON_REASON = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="#e74c3c" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
        </svg>
    `;

    const ICON_COINS = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" 
             viewBox="0 0 24 24" fill="none" stroke="#27ae60" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
            <circle cx="8" cy="8" r="6"/>
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
            <path d="M7 6h1v4"/>
            <path d="m16.71 13.88.7.71-2.82 2.82"/>
        </svg>
    `;

    const ICON_CALENDAR = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
             viewBox="0 0 24 24" fill="none" stroke="#f39c12" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle; margin-right: 6px;">
            <rect width="18" height="18" x="3" y="4" rx="2"/>
            <path d="M16 2v4"/>
            <path d="M8 2v4"/>
            <path d="M3 10h18"/>
        </svg>
    `;

    // =========================================================
    // RENDER HTML
    // =========================================================
    return `
        <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">

                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #f39c12, #e74c3c); padding: 30px 25px; text-align: center; color: white;">
                    <div style="margin-bottom: 10px;">
                        ${ICON_ALERT}
                    </div>
                    <h1 style="margin:0; font-size:22px; letter-spacing: 0.5px;">
                        SUẤT CHIẾU CỦA BẠN ĐÃ BỊ HỦY
                    </h1>
                    <p style="margin-top:8px; opacity:0.95; font-size: 15px;">
                        Rất tiếc vì sự bất tiện này
                    </p>
                </div>

                <!-- BODY -->
                <div style="padding:30px;">
                    <p style="font-size: 15px; line-height: 1.6;">
                        Chào <b>${customerName}</b>,<br><br>
                        Dũng Cinema xin thông báo suất chiếu bạn đã đặt 
                        <strong>không thể diễn ra</strong> như kế hoạch. 
                        Chúng tôi chân thành xin lỗi vì sự bất tiện này.
                    </p>

                    ${posterUrl ? `
                        <div style="text-align:center; margin:25px 0;">
                            <img 
                                src="${posterUrl}" 
                                alt="${movieTitle}"
                                style="max-width:180px; width:100%; height:auto; border-radius:12px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); display:block; margin:0 auto; border: 0; opacity: 0.7;"
                            />
                        </div>
                    ` : ''}

                    <div style="border: 2px dashed #f39c12; padding: 20px; margin: 20px 0; border-radius: 8px; background: #fffdf5;">
                        <h3 style="color:#e74c3c; margin:0 0 15px 0; font-size:18px; text-align:center;">
                            ${movieTitle}
                        </h3>

                        <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                            ${ICON_MAP_PIN}
                            <b>Rạp:</b>&nbsp;${cinemaName}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                            ${ICON_CLOCK}
                            <b>Suất:</b>&nbsp;<span style="text-decoration: line-through; color: #999;">${showTime}</span>&nbsp;|&nbsp;${showDate}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                            ${ICON_DOOR}
                            <b>Phòng:</b>&nbsp;${roomName || '---'}
                        </p>

                        <p style="margin:8px 0; display: flex; align-items: center; font-size: 14px;">
                            ${ICON_REASON}
                            <b>Lý do:</b>&nbsp;<span style="color: #e74c3c;">${reason}</span>
                        </p>
                    </div>

                    <!-- HOÀN ĐIỂM -->
                    <div style="margin:30px 0; padding:25px; border:2px dashed #27ae60; border-radius:12px; background:#f0fdf4; text-align: center;">
                        <div style="margin-bottom: 12px;">
                            ${ICON_COINS}
                        </div>

                        <h2 style="margin:0 0 20px 0; color:#27ae60; font-size:20px;">
                            CHÚNG TÔI ĐÃ HOÀN LẠI ĐIỂM
                        </h2>

                        <div style="margin: 20px 0;">
                            <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                                Số điểm được hoàn:
                            </div>
                            <div style="font-size: 34px; font-weight: bold; color: #27ae60; letter-spacing: 1px;">
                                +${formatNumber(refundPoints)}
                            </div>
                            <div style="font-size: 13px; color: #999; margin-top: 6px;">
                                (Tương đương ${formatNumber(refundPoints)}đ)
                            </div>
                        </div>

                        <div style="background: #ffffff; padding: 14px; border-radius: 8px; margin-top: 20px; border: 1px solid #d4edda;">
                            <div style="font-size: 13px; color: #666; margin-bottom: 6px;">
                                Tổng điểm hiện tại của bạn:
                            </div>
                            <div style="font-size: 22px; font-weight: bold; color: #27ae60;">
                                ${formatNumber(newTotalPoints)} điểm
                            </div>
                        </div>
                    </div>

                    <!-- HOẶC ĐỔI VÉ MIỄN PHÍ -->
                    ${rescheduleLink ? `
                        <div style="margin:30px 0; padding:25px; border:2px dashed #3b82f6; border-radius:12px; background:#eff6ff; text-align: center;">
                            <h2 style="margin:0 0 12px 0; color:#3b82f6; font-size:20px;">
                                HOẶC ĐỔI SANG SUẤT KHÁC
                            </h2>

                            <p style="margin: 0 0 20px 0; color: #666; font-size: 14px; line-height: 1.6;">
                                Bạn có thể click link dưới đây để đổi sang suất chiếu khác 
                                <strong style="color: #3b82f6;">MIỄN PHÍ 100%</strong> 
                                (không cần dùng điểm).
                            </p>

                            <a 
                                href="${rescheduleLink}" 
                                style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 8px; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);"
                            >
                                ĐỔI SUẤT MIỄN PHÍ
                            </a>

                            <p style="margin: 20px 0 0 0; font-size: 13px; color: #999;">
                                ${ICON_CALENDAR}
                                Link có hiệu lực đến <strong>${expiryFormatted}</strong>
                            </p>
                        </div>
                    ` : ''}

                    <!-- LƯU Ý -->
                    <div style="background: #fff9f9; padding: 15px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
                        <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.7;">
                            <strong style="color: #e74c3c;">💡 Lưu ý:</strong> 
                            Vé của bạn đã được hủy và hoàn điểm tự động.
                            Bạn có thể dùng điểm để đặt vé mới, 
                            hoặc click link trên để đổi suất MIỄN PHÍ.
                            Nếu có thắc mắc, vui lòng liên hệ hotline <strong>1900 1234</strong>.
                        </p>
                    </div>

                    <!-- FOOTER -->
                    <div style="text-align:center; padding:15px 0; border-top: 1px solid #eee;">
                        <p style="margin: 0 0 8px 0; color:#333; font-size: 15px;">
                            Xin lỗi vì sự bất tiện này! 🙏
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

module.exports = ShowtimeCancelledTemplate;