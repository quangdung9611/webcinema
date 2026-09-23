const BookingRepository = require("../Repositories/BookingRepository");
const BookingDetailService = require("./BookingDetailService");
const TicketService = require("./TicketService");
const ShowtimeService = require("./ShowtimeService");

class BookingService {

    /*=========================================================
        GET ALL BOOKINGS - KHÔNG PHÂN TRANG
    =========================================================*/
    async getAllBookingsAll(search = "") {
        return await BookingRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL BOOKINGS - CÓ PHÂN TRANG
    =========================================================*/
    async getAllBookingsPaginated(page = 1, limit = 20, search = "") {
        return await BookingRepository.findAll(page, limit, search);
    }

    /*=========================================================
        GET BOOKING DETAIL
    =========================================================*/
    async getBookingDetail(connection, bookingId) {
        const booking = await BookingRepository.getDetail(connection, bookingId);
        if (booking) {
            const details = await BookingDetailService.getDetailsWithSeat(connection, bookingId);
            booking.details = details;
            booking.seats = details.filter(d => d.seat_id !== null);
            booking.foods = details.filter(d => d.seat_id === null);
        }
        return booking;
    }

    /*=========================================================
        GET FOOD DETAIL
    =========================================================*/
    async getFoodDetail(connection, bookingId) {
        return await BookingDetailService.getFoodItems(connection, bookingId);
    }

    /*=========================================================
        GET TICKETS
    =========================================================*/
    async getTickets(connection, bookingId) {
        return await TicketService.getTicketsByBooking(connection, bookingId);
    }

    /*=========================================================
        FIND BOOKING BY ID
    =========================================================*/
    async findBookingById(connection, bookingId) {
        return await BookingRepository.findById(connection, bookingId);
    }

    /*=========================================================
        COMPLETE BOOKING
    =========================================================*/
    async completeBooking(connection, bookingId) {
        await BookingRepository.updateStatus(connection, bookingId, "Completed");
    }

    /*=========================================================
        CANCEL BOOKING
    =========================================================*/
    async cancelBooking(connection, bookingId) {
        await BookingRepository.updateStatus(connection, bookingId, "Cancelled");
    }

    /*=========================================================
        ✅ UPDATE CUSTOMER INFO
    =========================================================*/
    async updateBookingCustomerInfo(connection, bookingId, fullName, phone, email) {
        const affected = await BookingRepository.updateCustomerInfo(connection, bookingId, fullName, phone, email);
        if (affected === 0) {
            throw new Error("Không tìm thấy booking để cập nhật thông tin khách hàng");
        }
        return affected;
    }

    /*=========================================================
        DELETE BOOKING
    =========================================================*/
    async deleteBooking(bookingId) {
        return await BookingRepository.delete(bookingId);
    }

    /* ==========================================================
       ✅ RESCHEDULE — LẤY INFO ĐỂ HIỆN FORM ĐỔI SUẤT
       ========================================================== */
    async getRescheduleInfo(connection, bookingId) {
        const booking = await BookingRepository.findBookingForReschedule(connection, bookingId);

        if (!booking) {
            const err = new Error("Không tìm thấy booking");
            err.statusCode = 404;
            throw err;
        }

        if (booking.status !== "Completed") {
            const err = new Error("Chỉ có thể đổi suất chiếu đã thanh toán");
            err.statusCode = 400;
            throw err;
        }

        // ✅ Check thời gian: phải trước giờ chiếu ≥ 2 tiếng
        const now = new Date();
        const startTime = new Date(String(booking.start_time).replace(" ", "T"));
        const hoursLeft = (startTime - now) / (1000 * 60 * 60);

        if (hoursLeft < 2) {
            const err = new Error("Chỉ có thể đổi suất chiếu trước giờ chiếu ít nhất 2 tiếng");
            err.statusCode = 400;
            throw err;
        }

        // ✅ Đếm số lần đã đổi
        const rescheduleCount = await BookingRepository.countRescheduleHistory(connection, bookingId);

        if (rescheduleCount >= 2) {
            const err = new Error("Booking này đã đổi suất 2 lần, không thể đổi thêm");
            err.statusCode = 400;
            throw err;
        }

        // ✅ Lấy ghế hiện tại
        const seats = await BookingRepository.getBookingSeats(connection, bookingId);

        return {
            booking,
            seats,
            rescheduleCount,
            maxReschedule: 2
        };
    }

    /* ==========================================================
       ✅ RESCHEDULE — LẤY DANH SÁCH SUẤT CÓ THỂ ĐỔI
       ========================================================== */
    async getRescheduleOptions(bookingId) {
        const connection = await BookingRepository.getConnection();
        try {
            const info = await this.getRescheduleInfo(connection, bookingId);

            const now = new Date();
            const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

            const options = await BookingRepository.findRescheduleOptions({
                movieId: info.booking.movie_id,
                cinemaId: info.booking.cinema_id,
                currentShowtimeId: info.booking.showtime_id,
                minStartTime: minTime
            });

            return {
                booking: {
                    booking_id: info.booking.booking_id,
                    movie_id: info.booking.movie_id,
                    movie_title: info.booking.movie_title,
                    movie_slug: info.booking.movie_slug,
                    movie_poster: info.booking.movie_poster,
                    movie_duration: info.booking.movie_duration,
                    cinema_id: info.booking.cinema_id,
                    cinema_name: info.booking.cinema_name,
                    room_name: info.booking.room_name,
                    room_type: info.booking.room_type,
                    start_time: info.booking.start_time,
                    total_amount: info.booking.total_amount
                },
                currentSeats: info.seats,
                options,
                rescheduleCount: info.rescheduleCount,
                maxReschedule: info.maxReschedule
            };
        } finally {
            connection.release();
        }
    }

    /* ==========================================================
       ✅ RESCHEDULE — LẤY GHẾ TRỐNG
       ========================================================== */
    async getAvailableSeats(showtimeId, seatType = null) {
        if (!showtimeId) {
            const err = new Error("Thiếu showtime_id");
            err.statusCode = 400;
            throw err;
        }

        const seats = await BookingRepository.getAvailableSeatsByType(showtimeId, seatType);

        return seats;
    }

    /* ==========================================================
       ✅ RESCHEDULE — HÀM CHÍNH
       ========================================================== */
    async rescheduleBooking(bookingId, newShowtimeId, newSeatIds) {
        const connection = await BookingRepository.getConnection();

        try {
            await BookingRepository.beginTransaction(connection);

            // 1. GET INFO + VALIDATE
            const info = await this.getRescheduleInfo(connection, bookingId);

            if (!Array.isArray(newSeatIds) || newSeatIds.length === 0) {
                throw new Error("Vui lòng chọn ít nhất 1 ghế mới");
            }

            if (newSeatIds.length > 8) {
                throw new Error("Chỉ được chọn tối đa 8 ghế");
            }

            // 2. GET SHOWTIME MỚI
            const [newShowtimeRows] = await connection.query(
                `
                SELECT
                    s.showtime_id,
                    s.movie_id,
                    s.cinema_id,
                    s.room_id,
                    s.start_time,

                    r.room_name,
                    r.room_type,

                    c.cinema_name

                FROM showtimes s

                INNER JOIN rooms r ON s.room_id = r.room_id
                INNER JOIN cinemas c ON s.cinema_id = c.cinema_id

                WHERE s.showtime_id = ?
                LIMIT 1
                `,
                [newShowtimeId]
            );

            const newShowtime = newShowtimeRows[0];

            if (!newShowtime) {
                throw new Error("Suất chiếu mới không tồn tại");
            }

            if (Number(newShowtime.movie_id) !== Number(info.booking.movie_id)) {
                throw new Error("Chỉ có thể đổi sang suất chiếu cùng phim");
            }

            if (Number(newShowtime.cinema_id) !== Number(info.booking.cinema_id)) {
                throw new Error("Chỉ có thể đổi sang suất chiếu cùng rạp");
            }

            if (Number(newShowtime.showtime_id) === Number(info.booking.showtime_id)) {
                throw new Error("Không thể đổi sang cùng suất chiếu");
            }

            const newStart = new Date(String(newShowtime.start_time).replace(" ", "T"));
            const now = new Date();
            const hoursLeft = (newStart - now) / (1000 * 60 * 60);

            if (hoursLeft < 2) {
                throw new Error("Chỉ có thể đổi sang suất chiếu trước giờ chiếu ít nhất 2 tiếng");
            }

            // 3. LOCK GHẾ MỚI
            const normalizedSeatIds = [
                ...new Set(newSeatIds.map(Number).filter(Number.isInteger))
            ].sort((a, b) => a - b);

            if (normalizedSeatIds.length !== newSeatIds.length) {
                throw new Error("Danh sách ghế có ID trùng hoặc không hợp lệ");
            }

            const placeholders = normalizedSeatIds.map(() => "?").join(",");

            const [seatRows] = await connection.query(
                `
                SELECT
                    st.seat_id,
                    st.seat_row,
                    st.seat_number,
                    st.seat_type,
                    st.is_active
                FROM seats st
                WHERE st.seat_id IN (${placeholders})
                  AND st.room_id = ?
                  AND st.cinema_id = ?
                FOR UPDATE
                `,
                [...normalizedSeatIds, newShowtime.room_id, newShowtime.cinema_id]
            );

            if (seatRows.length !== normalizedSeatIds.length) {
                throw new Error("Một số ghế không hợp lệ cho suất chiếu mới");
            }

            for (const seat of seatRows) {
                if (Number(seat.is_active) !== 1) {
                    throw new Error(`Ghế ${seat.seat_row}${seat.seat_number} đang bảo trì`);
                }
            }

            const [bookedTickets] = await connection.query(
                `
                SELECT seat_id
                FROM tickets
                WHERE showtime_id = ?
                  AND seat_id IN (${placeholders})
                  AND ticket_status = 'Valid'
                FOR UPDATE
                `,
                [newShowtimeId, ...normalizedSeatIds]
            );

            if (bookedTickets.length > 0) {
                const bookedIds = bookedTickets.map(t => t.seat_id);
                throw new Error(`Một số ghế đã được đặt: ${bookedIds.join(", ")}`);
            }

            // 4. TÍNH GIÁ MỚI
            const timeSlot = this._getTimeSlot(newShowtime.start_time);
            const dayType = this._getDayType(newShowtime.start_time);

            let newTotalTicketAmount = 0;
            const newTicketData = [];

            for (const seat of seatRows) {
                const price = await BookingRepository.getPriceFromConfig({
                    roomType: newShowtime.room_type,
                    timeSlot,
                    dayType,
                    seatType: seat.seat_type
                });

                if (!price) {
                    throw new Error(`Không tìm thấy giá vé cho ghế loại ${seat.seat_type}`);
                }

                newTotalTicketAmount += Number(price);

                newTicketData.push({
                    seat_id: seat.seat_id,
                    seat_row: seat.seat_row,
                    seat_number: seat.seat_number,
                    seat_type: seat.seat_type,
                    price: Number(price),
                    ticket_code: `TIC-${bookingId}-${seat.seat_id}-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
                });
            }

            // 5. TÍNH CHÊNH LỆCH
            const oldTicketAmount = Number(info.booking.total_amount) || 0;
            const priceDifference = newTotalTicketAmount - oldTicketAmount;

            // 6. CHECK ĐỦ ĐIỂM
            if (priceDifference > 0) {
                const userInfo = await BookingRepository.getUserPoints(
                    connection,
                    info.booking.user_id
                );

                const currentPoints = Number(userInfo?.points) || 0;

                if (currentPoints < priceDifference) {
                    const err = new Error(
                        `Bạn không đủ điểm để đổi. Cần thêm ${priceDifference.toLocaleString('vi-VN')} điểm, hiện có ${currentPoints.toLocaleString('vi-VN')} điểm`
                    );
                    err.statusCode = 400;
                    throw err;
                }
            }

            // 7. LẤY FOOD
            const foods = await BookingRepository.getFoodDetails(connection, bookingId);
            const foodString = foods.length
                ? foods.map(f => `${f.item_name} (x${f.quantity})`).join(", ")
                : "Không có";

            // 8. PERFORM RESCHEDULE
            await BookingRepository.performReschedule(connection, {
                bookingId,
                userId: info.booking.user_id,
                oldShowtimeId: info.booking.showtime_id,
                newShowtimeId,
                newRoomId: newShowtime.room_id,
                newCinemaId: newShowtime.cinema_id,
                newTicketData,
                newTotalAmount: newTotalTicketAmount,
                priceDifference
            });

            await BookingRepository.commit(connection);

            // 9. GỬI MAIL
            try {
                const MailService = require("./MailService");

                const oldStart = String(info.booking.start_time).replace("T", " ");
                const newStartStr = String(newShowtime.start_time).replace("T", " ");

                const oldTime = oldStart.split(" ")[1]?.substring(0, 5) || "---";
                const newTime = newStartStr.split(" ")[1]?.substring(0, 5) || "---";
                const oldDate = oldStart.split(" ")[0]?.split("-").reverse().join("/") || "---";
                const newDate = newStartStr.split(" ")[0]?.split("-").reverse().join("/") || "---";

                const newSeatLabels = newTicketData
                    .map(t => `${t.seat_row}${t.seat_number}`)
                    .join(", ");

                const firstTicketCode = newTicketData[0]?.ticket_code || null;

                await MailService.sendRescheduleSuccessEmail({
                    email: info.booking.email,
                    customerName: info.booking.full_name || "Quý khách",
                    movieTitle: info.booking.movie_title,
                    moviePoster: info.booking.movie_poster,

                    oldInfo: {
                        time: oldTime,
                        date: oldDate,
                        room_name: info.booking.room_name,
                    },
                    newInfo: {
                        time: newTime,
                        date: newDate,
                        room_name: newShowtime.room_name,
                    },

                    priceDifference,
                    newTotalAmount: newTotalTicketAmount,

                    bookingId,
                    seatLabel: newSeatLabels,
                    cinemaName: newShowtime.cinema_name,
                    roomName: newShowtime.room_name,
                    startTime: newTime,
                    selectedDate: newDate,
                    selectedFoods: foodString,
                    ticketPIN: firstTicketCode || "",
                    ticketCode: firstTicketCode,
                    qrUrl: firstTicketCode
                        ? `https://admin.quangdungcinema.id.vn/check-in/${firstTicketCode}`
                        : null,
                });

                console.log(`✅ [RESCHEDULE] Email sent to ${info.booking.email}`);
            } catch (mailError) {
                console.error("❌ [RESCHEDULE] Email failed:", mailError.message);
            }

            // 10. RETURN
            return {
                success: true,
                bookingId,
                oldShowtimeId: info.booking.showtime_id,
                newShowtimeId,
                oldTotalAmount: oldTicketAmount,
                newTotalAmount: newTotalTicketAmount,
                priceDifference,
                action: priceDifference > 0 ? "PAY_EXTRA" : priceDifference < 0 ? "REFUND" : "NO_CHANGE",
                message: priceDifference > 0
                    ? `Đổi suất thành công! Đã trừ thêm ${priceDifference.toLocaleString('vi-VN')} điểm`
                    : priceDifference < 0
                        ? `Đổi suất thành công! Đã hoàn ${Math.abs(priceDifference).toLocaleString('vi-VN')} điểm`
                        : "Đổi suất thành công!",
                newSeats: newTicketData,
                newShowtime
            };

        } catch (error) {
            await BookingRepository.rollback(connection);
            throw error;
        } finally {
            connection.release();
        }
    }

    /* ==========================================================
       ✅ ADMIN — LẤY DANH SÁCH BOOKING ĐÃ ĐỔI SUẤT
       ========================================================== */
    async getRescheduledBookings(search = "", from = null, to = null) {
        return await BookingRepository.getRescheduledBookings(search, from, to);
    }

    /* ==========================================================
       ✅ HELPER — XÁC ĐỊNH TIME_SLOT
       ========================================================== */
    _getTimeSlot(startTime) {
        const str = String(startTime).replace("T", " ");
        const timePart = str.split(" ")[1] || "00:00";
        const hour = parseInt(timePart.split(":")[0], 10);

        if (hour >= 8 && hour < 12) return "MORNING";
        if (hour >= 12 && hour < 17) return "AFTERNOON";
        if (hour >= 17 && hour < 20) return "EVENING";
        return "NIGHT";
    }

    /* ==========================================================
       ✅ HELPER — XÁC ĐỊNH DAY_TYPE
       ========================================================== */
    _getDayType(startTime) {
        const str = String(startTime).replace("T", " ");
        const datePart = str.split(" ")[0];
        const d = new Date(datePart + "T00:00:00");
        const day = d.getDay();

        return (day === 0 || day === 6) ? "WEEKEND" : "WEEKDAY";
    }
}

module.exports = new BookingService();