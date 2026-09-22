// ============================================================
// RESCHEDULE SUCCESS TEMPLATE
// Email thông báo đổi suất chiếu thành công
// ============================================================

const RescheduleSuccessTemplate = (ticketData) => {
    const {
        bookingId,
        customerName,
        movieTitle,
        moviePoster,
        cinemaName,
        roomName,
        startTime,
        selectedDate,
        seatLabel,
        selectedFoods,

        // ✅ Chỉ dùng cho đổi suất
        oldInfo = {},
        newInfo = {},
        priceDifference = 0,
        newTotalAmount = 0,

        ticketPIN,
        qrCid,
    } = ticketData;

    const posterUrl = moviePoster || '';

    // ===== ICONS =====
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

    const formatMoney = (n) => Number(n || 0).toLocaleString('vi-VN');

    // ===== BOX CHÊNH LỆCH GIÁ =====
    const priceBox = priceDifference > 0
        ? `
            <div style="background:#fff3cd;border-left:4px solid #f39c12;padding:14px 18px;border-radius:8px;margin:16px 0;">
                <p style="margin:0;color:#856404;font-weight:700;font-size:14px;">
                    💰 Bạn đã trả thêm: <strong>+${formatMoney(priceDifference)} điểm</strong>
                </p>
                <p style="margin:6px 0 0 0;color:#856404;font-size:13px;">
                    Tổng tiền vé mới: ${formatMoney(newTotalAmount)} điểm
                </p>
            </div>
        `
        : priceDifference < 0
            ? `
                <div style="background:#d4edda;border-left:4px solid #27ae60;padding:14px 18px;border-radius:8px;margin:16px 0;">
                    <p style="margin:0;color:#155724;font-weight:700;font-size:14px;">
                        💰 Bạn được hoàn: <strong>${formatMoney(Math.abs(priceDifference))} điểm</strong>
                    </p>
                    <p style="margin:6px 0 0 0;color:#155724;font-size:13px;">
                        Tổng tiền vé mới: ${formatMoney(newTotalAmount)} điểm
                    </p>
                </div>
            `
            : `
                <div style="background:#e7f3ff;border-left:4px solid #2196F3;padding:14px 18px;border-radius:8px;margin:16px 0;">
                    <p style="margin:0;color:#0c5460;font-weight:700;font-size:14px;">
                        💰 Không thay đổi giá vé
                    </p>
                    <p style="margin:6px 0 0 0;color:#0c5460;font-size:13px;">
                        Tổng tiền: ${formatMoney(newTotalAmount)} điểm
                    </p>
                </div>
            `;

    // ===== RENDER =====
    return `
        <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">

                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); padding: 30px 25px; text-align: center; color: white;">
                    <h1 style="margin:0; font-size:22px; letter-spacing: 0.5px;">
                        ✅ ĐỔI SUẤT CHIẾU THÀNH CÔNG
                    </h1>
                    <p style="margin-top:8px; opacity:0.95; font-size: 15px;">
                        Vé mới của bạn đã được cập nhật
                    </p>
                </div>

                <!-- BODY -->
                <div style="padding:30px;">
                    <p style="font-size: 15px; line-height: 1.6;">
                        Chào <b>${customerName}</b>,<br><br>
                        Dũng Cinema xin thông báo bạn đã 
                        <b style="color: #27ae60;">đổi suất chiếu thành công</b>. 
                        Vé mới đã được cập nhật và gửi đến email này.
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

                        <div style="display:flex; background:#f9fafb; padding:12px 16px; border-bottom:1px solid #e5e7eb;">
                            <div style="flex:1; text-align:center; font-weight:700; color:#999; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
                                Suất cũ
                            </div>
                            <div style="width:40px;"></div>
                            <div style="flex:1; text-align:center; font-weight:700; color:#27ae60; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
                                Suất mới
                            </div>
                        </div>

                        <!-- GIỜ -->
                        <div style="display:flex; padding:14px 16px; background:#f0fdf4; align-items:center; border-bottom:1px solid #f3f4f6;">
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:#999; text-decoration:line-through;">
                                    ${oldInfo.time || '---'}
                                </div>
                            </div>
                            <div style="width:40px; text-align:center; color:#27ae60; font-size:18px;">
                                →
                            </div>
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:15px; color:#27ae60; font-weight:700;">
                                    ${newInfo.time || '---'}
                                </div>
                            </div>
                        </div>

                        <!-- NGÀY -->
                        <div style="display:flex; padding:14px 16px; background:#f0fdf4; align-items:center; border-bottom:1px solid #f3f4f6;">
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:#999; text-decoration:line-through;">
                                    ${oldInfo.date || '---'}
                                </div>
                            </div>
                            <div style="width:40px; text-align:center; color:#27ae60; font-size:18px;">
                                →
                            </div>
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:15px; color:#27ae60; font-weight:700;">
                                    ${newInfo.date || '---'}
                                </div>
                            </div>
                        </div>

                        <!-- PHÒNG -->
                        <div style="display:flex; padding:14px 16px; align-items:center;">
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:#999; text-decoration:line-through;">
                                    ${oldInfo.room_name || '---'}
                                </div>
                            </div>
                            <div style="width:40px; text-align:center; color:#27ae60; font-size:18px;">
                                →
                            </div>
                            <div style="flex:1; text-align:center;">
                                <div style="font-size:13px; color:#333; font-weight:600;">
                                    ${newInfo.room_name || '---'}
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- CHÊNH LỆCH GIÁ -->
                    ${priceBox}

                    <!-- THÔNG TIN VÉ MỚI -->
                    <div style="border: 2px dashed #eee; padding: 20px; margin: 20px 0; border-radius: 8px;">
                        <h3 style="color:#27ae60; margin:0 0 15px 0; font-size:18px; text-align:center;">
                            🎬 ${movieTitle}
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
                            <span style="font-size:18px; color:#27ae60; font-weight:bold;">
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
                        <h2 style="margin:0; color:#222; font-size:24px;">MÃ NHẬN VÉ MỚI</h2>

                        <div style="margin:15px 0; font-size:36px; font-weight:bold; color:#27ae60; letter-spacing:8px;">
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
                    <div style="text-align:center; padding:15px; background:#f0fdf4; border-radius:8px;">
                        <p style="margin:0; color:#27ae60; font-weight:bold; display: flex; align-items: center; justify-content: center;">
                            ${ICON_STAR}
                            Cảm ơn bạn đã sử dụng dịch vụ!
                        </p>

                        <h2 style="margin:10px 0 0 0; color:#333; font-size:22px;">
                            Mã booking: #${bookingId || '---'}
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

module.exports = RescheduleSuccessTemplate;