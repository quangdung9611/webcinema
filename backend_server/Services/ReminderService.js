// ============================================================
// REMINDER SERVICE
// Gửi email nhắc nhở suất chiếu trước 30 phút
// ============================================================

const db = require("../Config/db");
const BookingRepository = require("../Repositories/BookingRepository");
const BookingService = require("./BookingService");
const TicketService = require("./TicketService");
const MailService = require("./MailService");

// ============================================================
// CONFIG
// ============================================================

const REMINDER_MINUTES_BEFORE =
    parseInt(process.env.REMINDER_MINUTES_BEFORE, 10) || 30;

const REMINDER_WINDOW_MINUTES =
    parseInt(process.env.REMINDER_WINDOW_MINUTES, 10) || 5;

// ============================================================
// HELPER — FORMAT
// ============================================================

const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return "---";
    try {
        // "2026-09-22 18:15:00" → "18:15"
        const parts = dateTimeStr.split(" ");
        if (parts.length >= 2) {
            return parts[1].substring(0, 5);
        }
        return dateTimeStr;
    } catch (err) {
        return "---";
    }
};

const formatDate = (dateTimeStr) => {
    if (!dateTimeStr) return "---";
    try {
        // "2026-09-22 18:15:00" → "22/09/2026"
        const datePart = dateTimeStr.split(" ")[0];
        return datePart.split("-").reverse().join("/");
    } catch (err) {
        return "---";
    }
};

const formatFoods = (foods) => {
    if (!Array.isArray(foods) || foods.length === 0) return "";
    return foods
        .map(f => `${f.item_name} (x${f.quantity})`)
        .join(", ");
};

// ============================================================
// SERVICE
// ============================================================

class ReminderService {

    /**
     * ✅ MAIN — Gửi tất cả reminder cần thiết
     * Được gọi bởi cron job trong server.js
     */
    async sendReminders() {
        const connection = await db.getConnection();
        let sentCount = 0;

        try {
            // =====================================================
            // 1. TÌM BOOKINGS CẦN NHẮC
            // =====================================================

            const bookings = await BookingRepository.findUpcomingBookings(
                connection,
                REMINDER_MINUTES_BEFORE,
                REMINDER_WINDOW_MINUTES
            );

            if (!bookings || bookings.length === 0) {
                console.log(
                    `📧 [REMINDER] No bookings to remind (window: ${REMINDER_MINUTES_BEFORE - REMINDER_WINDOW_MINUTES}-${REMINDER_MINUTES_BEFORE + REMINDER_WINDOW_MINUTES} min)`
                );
                return 0;
            }

            console.log(`📧 [REMINDER] Found ${bookings.length} bookings to remind`);

            // =====================================================
            // 2. GỬI TỪNG EMAIL
            // =====================================================

            for (const booking of bookings) {
                try {
                    // ---------------------------------------------
                    // 2.1. Lấy chi tiết booking
                    // ---------------------------------------------

                    const order = await BookingService.getBookingDetail(
                        connection,
                        booking.booking_id
                    );

                    if (!order) {
                        console.warn(
                            `⚠️ [REMINDER] Booking ${booking.booking_id} not found — skip`
                        );
                        continue;
                    }

                    // ---------------------------------------------
                    // 2.2. Lấy foods + tickets
                    // ---------------------------------------------

                    const foods = await BookingService.getFoodDetail(
                        connection,
                        booking.booking_id
                    );

                    const tickets = await TicketService.getTicketsByBooking(
                        connection,
                        booking.booking_id
                    );

                    const firstTicketCode = tickets?.[0]?.ticket_code || null;

                    const qrUrl = firstTicketCode
                        ? `https://admin.quangdungcinema.id.vn/check-in/${firstTicketCode}`
                        : null;

                    // ---------------------------------------------
                    // 2.3. Build data
                    // ---------------------------------------------

                    const reminderData = {
                        email: order.email || booking.booking_email || booking.user_email,
                        bookingId: order.booking_id,
                        customerName: order.full_name || "Quý khách",
                        movieTitle: order.movie_name,
                        moviePoster: order.movie_poster,
                        cinemaName: order.cinema_name,
                        cinemaAddress: booking.cinema_address || "",
                        cinemaMap: booking.cinema_map || "",
                        roomName: order.room_name || booking.room_name || "---",
                        startTime: formatTime(order.start_time),
                        selectedDate: formatDate(order.start_time),
                        seatLabel: order.seat_label || "---",
                        selectedFoods: formatFoods(foods),
                        ticketPIN: firstTicketCode || order.pin || "",
                        ticketCode: firstTicketCode,
                        qrUrl: qrUrl,
                        minutesBefore: REMINDER_MINUTES_BEFORE,
                    };

                    // ---------------------------------------------
                    // 2.4. Atomic check + gửi + mark sent
                    // ---------------------------------------------

                    // Atomic UPDATE — chỉ set nếu reminder_sent = 0
                    // → Tránh gửi trùng khi có 2 cron chạy song song
                    const affected = await BookingRepository.markReminderSent(
                        connection,
                        booking.booking_id
                    );

                    if (affected === 0) {
                        console.log(
                            `⏭️ [REMINDER] Booking ${booking.booking_id} already sent — skip`
                        );
                        continue;
                    }

                    // Gửi email SAU KHI đã mark (đảm bảo không gửi trùng)
                    await MailService.sendTicketReminder(reminderData);

                    sentCount++;

                    console.log(
                        `✅ [REMINDER] Sent for booking ${booking.booking_id} → ${reminderData.email}`
                    );

                } catch (err) {
                    console.error(
                        `❌ [REMINDER] Failed for booking ${booking.booking_id}:`,
                        err.message
                    );

                    // Rollback flag nếu gửi lỗi → cron lần sau thử lại
                    try {
                        await connection.query(
                            `UPDATE bookings 
                             SET reminder_sent = 0, reminder_sent_at = NULL 
                             WHERE booking_id = ? AND reminder_sent = 1`,
                            [booking.booking_id]
                        );
                    } catch (rollbackErr) {
                        console.error(
                            `❌ [REMINDER] Rollback flag failed:`,
                            rollbackErr.message
                        );
                    }

                    // Không throw → tiếp tục booking khác
                }
            }

            return sentCount;

        } catch (error) {
            console.error("❌ [REMINDER] Service error:", error.message);
            throw error;

        } finally {
            connection.release();
        }
    }

    /**
     * ✅ RESET FLAG — Dùng khi cần test lại
     * Xóa reminder_sent cho 1 booking cụ thể
     */
    async resetReminderFlag(bookingId) {
        const connection = await db.getConnection();
        try {
            const [result] = await connection.query(
                `UPDATE bookings 
                 SET reminder_sent = 0, reminder_sent_at = NULL 
                 WHERE booking_id = ?`,
                [bookingId]
            );
            console.log(
                `🔄 [REMINDER] Reset flag for booking ${bookingId}: ${result.affectedRows} affected`
            );
            return result.affectedRows;
        } finally {
            connection.release();
        }
    }
}

module.exports = new ReminderService();