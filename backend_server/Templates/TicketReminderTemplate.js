// Templates/TicketReminderTemplate.js

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
        downloadUrl,
        homeUrl,
    } = reminderData;

    const posterUrl = moviePoster || "";
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://quangdungcinema.id.vn";
    const finalHomeUrl = homeUrl || FRONTEND_URL;
    const finalDownloadUrl = downloadUrl || `${FRONTEND_URL}/confirm-success?orderId=${bookingId}`;

    const GREEN = "#43B77A";
    const GREEN_DARK = "#2E9B62";
    const ORANGE = "#F39C12";
    const ORANGE_DARK = "#E67E22";
    const SILVER_LIGHT = "#F4F6F8";
    const TEXT_MUTED = "#6a737d";
    const TEXT_BODY = "#d9dde2";

    // ==========================================================
    // ICONS
    // ==========================================================
    const ICON_BELL = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
    const ICON_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    const ICON_MONITOR = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`;
    const ICON_CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`;
    const ICON_CLOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const ICON_ARMCHAIR = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>`;
    const ICON_POPCORN = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M18 8a2 2 0 0 0 0-4 2 2 0 0 0-2 2"/><path d="M10 22 9 8"/><path d="m14 22 1-14"/><path d="M2 8h20"/><path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M8 8a2 2 0 0 0 0-4 2 2 0 0 0-2 2"/></svg>`;
    const ICON_MAP = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    const ICON_ALERT = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${ORANGE}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;
    const ICON_HOME = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    const ICON_DOWNLOAD = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`;

    // Info row helper
    const infoRow = (icon, label, value, options = {}) => {
        const { borderTop = true, valueColor = TEXT_BODY, valueBold = 600, valueSize = 13 } = options;
        const borderStyle = borderTop ? "border-top: 1px dashed rgba(255,255,255,0.08);" : "";
        return `
        <tr>
            <td width="20" valign="middle" style="padding: 7px 0; ${borderStyle}">${icon}</td>
            <td width="70" valign="middle" style="padding: 7px 0; ${borderStyle} color: ${TEXT_MUTED}; font-weight: 600; font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase;">
                ${label}
            </td>
            <td valign="middle" style="padding: 7px 0; ${borderStyle} color: ${valueColor}; font-weight: ${valueBold}; font-size: ${valueSize}px; line-height: 1.4;">
                ${value}
            </td>
        </tr>`;
    };

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nhắc nhở suất chiếu - ${movieTitle}</title>
</head>
<body style="margin:0; padding:0; background-color:#0f1115; font-family: 'Segoe UI', Arial, Tahoma, sans-serif; -webkit-font-smoothing:antialiased;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" 
       style="background-color:#0f1115; padding:28px 14px;">
    <tr>
        <td align="center">

            <!-- CONTAINER 720px -->
            <table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" 
                   style="max-width:720px; width:100%; background-color:#141821; border-radius:18px; 
                          overflow:hidden; border:1px solid rgba(244,246,248,0.08);
                          box-shadow:0 24px 60px rgba(0,0,0,0.6);">

                <!-- HEADER — ORANGE -->
                <tr>
                    <td align="center" 
                        style="background: linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%);
                               padding: 34px 24px 28px; text-align:center;">

                        <div style="width:80px; height:80px; margin:0 auto 16px; 
                                    border-radius:50%; 
                                    background: rgba(255,255,255,0.15);
                                    border: 3px solid rgba(255,255,255,0.9);
                                    box-shadow: 0 0 0 8px rgba(255,255,255,0.1), 0 12px 30px rgba(0,0,0,0.25);
                                    line-height: 74px; text-align:center;">
                            ${ICON_BELL}
                        </div>

                        <h1 style="margin:0 0 6px; padding:0; color:#FFFFFF; font-size:22px; 
                                   font-weight:800; letter-spacing:1.5px; text-transform:uppercase;
                                   text-shadow: 0 2px 12px rgba(0,0,0,0.25);">
                            SUẤT CHIẾU SẮP BẮT ĐẦU!
                        </h1>

                        <p style="margin:0; color:rgba(255,255,255,0.95); font-size:14px; 
                                  line-height:1.5; letter-spacing:0.3px;">
                            Còn <strong style="color:#FFFFFF; font-size: 16px;">${minutesBefore} phút</strong> 
                            nữa là đến giờ chiếu
                        </p>
                    </td>
                </tr>

                <!-- BODY -->
                <tr>
                    <td style="padding: 24px 20px 8px;">

                        <!-- GREETING -->
                        <p style="margin: 0 0 18px; padding: 0; font-size: 14px; line-height: 1.7; color: ${TEXT_BODY};">
                            Chào <strong style="color: ${SILVER_LIGHT};">${customerName || "Quý khách"}</strong>,<br>
                            Dũng Cinema xin nhắc bạn về suất chiếu sắp tới. 
                            Vui lòng có mặt tại rạp trước <strong style="color: ${ORANGE};">15 phút</strong> 
                            để ổn định chỗ ngồi.
                        </p>

                        <!-- 🎯 TICKET — 3 CỘT NGANG -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                               style="background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
                                      border: 1px solid rgba(244,246,248,0.12);
                                      border-radius: 16px; overflow:hidden;">

                            <tr>
                                <td colspan="4" style="height:2px; 
                                    background: linear-gradient(90deg, transparent, rgba(244,246,248,0.5), ${ORANGE}, rgba(244,246,248,0.5), transparent);
                                    font-size:0; line-height:0;">&nbsp;</td>
                            </tr>

                            <tr>
                                <!-- POSTER -->
                                <td width="200" valign="top" align="center"
                                    style="padding: 20px 12px 20px 20px;">
                                    ${posterUrl ? `
                                        <img src="${posterUrl}" alt="${movieTitle}"
                                             width="176"
                                             style="width:176px; max-width:100%; height:auto; 
                                                    border-radius: 10px; display:block;
                                                    box-shadow: 0 12px 28px rgba(0,0,0,0.5);
                                                    border: 1px solid rgba(255,255,255,0.08);" />
                                    ` : `
                                        <div style="width:176px; height:264px; 
                                                    background: rgba(255,255,255,0.03); 
                                                    border: 1px dashed rgba(255,255,255,0.15);
                                                    border-radius: 10px;
                                                    line-height:264px; text-align:center;
                                                    color: ${TEXT_MUTED}; font-size: 11px; letter-spacing: 1px;">
                                            NO IMAGE
                                        </div>
                                    `}
                                </td>

                                <!-- INFO -->
                                <td valign="top" style="padding: 20px 14px 20px 0;">

                                    <h2 style="margin: 0 0 14px; padding: 0; 
                                               color: ${SILVER_LIGHT}; 
                                               font-size: 16px; font-weight: 800;
                                               letter-spacing: 0.5px; text-transform: uppercase;
                                               line-height: 1.3;">
                                        ${movieTitle}
                                    </h2>

                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" 
                                           style="font-size:13px;">
                                        ${infoRow(ICON_PIN, "Rạp", cinemaName || "---", { borderTop: false })}
                                        ${infoRow(ICON_MONITOR, "Phòng", roomName || "---")}
                                        ${infoRow(ICON_CALENDAR, "Ngày", selectedDate || "---")}
                                        ${infoRow(ICON_CLOCK, "Suất", startTime || "---", { valueColor: ORANGE, valueBold: 800, valueSize: 15 })}
                                        ${infoRow(ICON_ARMCHAIR, "Ghế", seatLabel || "---", { valueColor: GREEN, valueBold: 800, valueSize: 15 })}
                                        ${selectedFoods && selectedFoods !== "Không có" 
                                            ? infoRow(ICON_POPCORN, "Đồ ăn", selectedFoods) 
                                            : ""}
                                    </table>
                                </td>

                                <!-- DIVIDER -->
                                <td width="1" valign="top" 
                                    style="background-image: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.2) 80%, transparent 100%);
                                           background-size: 1px 100%;
                                           background-repeat: repeat-y;
                                           background-position: center;
                                           padding: 20px 0;">
                                    &nbsp;
                                </td>

                                <!-- QR + PIN -->
                                <td width="210" valign="middle" align="center"
                                    style="padding: 20px 16px;
                                           background: linear-gradient(180deg, rgba(243,156,18,0.05), rgba(255,255,255,0.01));">

                                    <p style="margin: 0 0 8px; padding: 0; 
                                              font-size: 10px; font-weight: 800; 
                                              letter-spacing: 1.8px; text-transform: uppercase;
                                              color: ${TEXT_MUTED};">
                                        MÃ NHẬN VÉ
                                    </p>

                                    <div style="margin: 0 0 14px; padding: 8px 10px;
                                                background: rgba(67,183,122,0.08);
                                                border: 1px solid rgba(67,183,122,0.3);
                                                border-radius: 6px;
                                                font-family: 'Courier New', Consolas, monospace;
                                                font-size: 10px; font-weight: 800; 
                                                color: ${GREEN}; 
                                                letter-spacing: 0.5px; 
                                                line-height: 1.3;
                                                word-break: break-all;
                                                text-align: center;">
                                        ${ticketPIN || "------"}
                                    </div>

                                    ${qrCid ? `
                                    <div style="display:inline-block; padding: 10px; 
                                                background:#FFFFFF; border-radius: 8px;
                                                box-shadow: 0 10px 24px rgba(0,0,0,0.4);">
                                        <img src="cid:${qrCid}" alt="QR Code" 
                                             width="150" height="150"
                                             style="display:block; width:150px; height:150px;" />
                                    </div>
                                    ` : `
                                    <div style="padding: 40px 20px; background:#FFFFFF; border-radius:8px;">
                                        <p style="margin:0; font-size:11px; color:#666;">QR Code</p>
                                    </div>
                                    `}

                                    <p style="margin: 10px 0 0; padding: 0; 
                                              font-size: 10px; color: ${TEXT_MUTED}; 
                                              line-height: 1.4; text-align: center;">
                                        Quét mã QR tại quầy<br/>hoặc kiosk để soát vé
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <!-- ĐỊA CHỈ RẠP -->
                        ${cinemaAddress ? `
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                               style="margin-top: 14px;
                                      background: rgba(255,255,255,0.03);
                                      border-left: 4px solid ${GREEN};
                                      border-radius: 10px;">
                            <tr>
                                <td style="padding: 14px 16px;">
                                    <p style="margin: 0 0 5px; padding: 0; 
                                              font-size: 10px; font-weight: 800; 
                                              letter-spacing: 1.2px; text-transform: uppercase;
                                              color: ${TEXT_MUTED};">
                                        📍 Địa chỉ rạp
                                    </p>
                                    <p style="margin: 0; padding: 0; 
                                              font-size: 13px; color: ${TEXT_BODY}; 
                                              line-height: 1.6;">
                                        ${cinemaAddress}
                                    </p>
                                    ${cinemaMap ? `
                                    <p style="margin: 9px 0 0; padding: 0;">
                                        <a href="${cinemaMap}" 
                                           style="color: ${GREEN}; text-decoration: none; 
                                                  font-size: 12px; font-weight: 700;">
                                            ${ICON_MAP} &nbsp; Xem bản đồ Google Maps →
                                        </a>
                                    </p>
                                    ` : ""}
                                </td>
                            </tr>
                        </table>
                        ` : ""}

                        <!-- WARNING BOX -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                               style="margin-top: 14px;
                                      background: rgba(243,156,18,0.08);
                                      border: 1px solid rgba(243,156,18,0.25);
                                      border-radius: 10px;">
                            <tr>
                                <td valign="top" style="padding: 12px 14px;">
                                    <p style="margin: 0; padding: 0; 
                                              font-size: 12px; color: ${TEXT_BODY}; 
                                              line-height: 1.6;">
                                        ${ICON_ALERT}
                                        <strong style="color: ${ORANGE};">Lưu ý:</strong>
                                        Vui lòng đến rạp trước giờ chiếu <strong style="color: #FFFFFF;">15 phút</strong> 
                                        để không bỏ lỡ phần đầu phim. Mang theo mã QR này 
                                        để soát vé nhanh chóng.
                                    </p>
                                </td>
                            </tr>
                        </table>

                        <!-- BUTTONS -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                               style="margin-top: 20px;">
                            <tr>
                                <td align="center" valign="middle" width="50%" style="padding-right: 6px;">
                                    <a href="${finalHomeUrl}" 
                                       style="display: block; width: 100%; box-sizing: border-box;
                                              padding: 13px 16px; text-decoration: none;
                                              background: linear-gradient(135deg, #FFFFFF 0%, #D8DDE3 50%, #B0B7BF 100%);
                                              color: #0a0a0f; font-size: 12px; font-weight: 800;
                                              letter-spacing: 0.8px; text-transform: uppercase;
                                              border-radius: 8px; text-align: center;">
                                        ${ICON_HOME} &nbsp; VỀ TRANG CHỦ
                                    </a>
                                </td>
                                <td align="center" valign="middle" width="50%" style="padding-left: 6px;">
                                    <a href="${finalDownloadUrl}" 
                                       style="display: block; width: 100%; box-sizing: border-box;
                                              padding: 13px 16px; text-decoration: none;
                                              background: linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%);
                                              color: #FFFFFF; font-size: 12px; font-weight: 800;
                                              letter-spacing: 0.8px; text-transform: uppercase;
                                              border-radius: 8px; text-align: center;">
                                        ${ICON_DOWNLOAD} &nbsp; XEM VÉ
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin: 18px 0 6px; padding: 0; 
                                  text-align: center; font-size: 11px; 
                                  color: ${TEXT_MUTED}; line-height: 1.6;">
                            Nếu có vấn đề, vui lòng liên hệ hotline 
                            <span style="color: ${GREEN}; font-weight: 700;">1900 2224</span>
                        </p>

                    </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                    <td align="center" 
                        style="padding: 18px 24px 24px; 
                               border-top: 1px solid rgba(244,246,248,0.06);">
                        <p style="margin: 0 0 5px; padding: 0; 
                                  font-size: 13px; font-weight: 700; 
                                  color: ${SILVER_LIGHT}; letter-spacing: 0.5px;">
                            QUANG DŨNG CINEMA
                        </p>
                        <p style="margin: 0; padding: 0; font-size: 11px; color: ${TEXT_MUTED}; line-height: 1.6;">
                            Hẹn gặp bạn tại rạp! —
                            <a href="${FRONTEND_URL}" 
                               style="color: ${GREEN}; text-decoration: none; font-weight: 600;">
                                ${FRONTEND_URL.replace('https://','').replace('http://','')}
                            </a>
                        </p>
                        <p style="margin: 10px 0 0; padding: 0; font-size: 10px; color: #4a4f56;">
                            Mã vé: #${bookingId} — Email tự động.
                        </p>
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
    `;
};

module.exports = TicketReminderTemplate;