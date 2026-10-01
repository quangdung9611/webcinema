const BookingService = require("../Services/BookingService");
const TicketService = require("../Services/TicketService");
const PointsService = require("../Services/PointsService");
const BookingRepository = require("../Repositories/BookingRepository");

/*=========================================================
    ADMIN - GET ALL BOOKINGS (KHÔNG PHÂN TRANG)
=========================================================*/
exports.getAllBookingsAll = async (req, res) => {
    try {
        const { search = "", page, limit } = req.query;

        if (page !== undefined || limit !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Route /api/bookings không hỗ trợ tham số page hoặc limit. Vui lòng sử dụng /api/bookings/paginated để phân trang."
            });
        }

        const data = await BookingService.getAllBookingsAll(search);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi lấy danh sách booking"
        });
    }
};

/*=========================================================
    ADMIN - GET BOOKINGS WITH PAGINATION
=========================================================*/
exports.getBookingsWithPagination = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = "" } = req.query;

        const result = await BookingService.getAllBookingsPaginated(page, limit, search);

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi lấy danh sách booking"
        });
    }
};

/*=========================================================
    ADMIN - GET BOOKING DETAILS
=========================================================*/
exports.getBookingDetails = async (req, res) => {
    const connection = await BookingRepository.getConnection();
    try {
        const { booking_id } = req.params;

        const booking = await BookingService.getBookingDetail(connection, booking_id);
        if (!booking) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy booking"
            });
        }

        const tickets = await TicketService.getTicketsByBooking(connection, booking_id);
        const foods = await BookingService.getFoodDetail(connection, booking_id);

        connection.release();

        return res.json({
            success: true,
            booking,
            tickets,
            foods,
        });
    } catch (error) {
        connection.release();
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/*=========================================================
    ✅ USER - GET MY BOOKING DETAIL
=========================================================*/
exports.getMyBookingDetail = async (req, res) => {
    const connection = await BookingRepository.getConnection();
    try {
        const { booking_id } = req.params;
        const userId = req.user?.user_id;

        if (!userId) {
            connection.release();
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập để xem thông tin vé"
            });
        }

        const booking = await BookingService.getBookingDetail(connection, booking_id);

        if (!booking) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy booking"
            });
        }

        // ✅ CHECK OWNER
        if (Number(booking.user_id) !== Number(userId)) {
            connection.release();
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền xem booking này"
            });
        }

        const tickets = await TicketService.getTicketsByBooking(connection, booking_id);
        const foods = await BookingService.getFoodDetail(connection, booking_id);
        const details = booking.details || [];

        connection.release();

        return res.json({
            success: true,
            booking,
            tickets,
            foods,
            details,
        });
    } catch (error) {
        connection.release();
        console.error("❌ [getMyBookingDetail]", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi lấy chi tiết booking"
        });
    }
};

/*=========================================================
    ADMIN - UPDATE BOOKING STATUS
=========================================================*/
exports.updateBookingStatus = async (req, res) => {
    const connection = await BookingRepository.getConnection();
    try {
        await BookingRepository.beginTransaction(connection);

        const { booking_id } = req.params;
        const { status } = req.body;

        const booking = await BookingService.findBookingById(connection, booking_id);
        if (!booking) {
            await BookingRepository.rollback(connection);
            connection.release();
            throw new Error("Không tìm thấy booking");
        }

        const oldStatus = booking.status;
        const newStatus = String(status || "").toUpperCase();

        await BookingService.completeBooking(connection, booking_id);

        if (newStatus === "COMPLETED") {
            await TicketService.bookTickets(connection, booking_id);
            if (String(oldStatus).toUpperCase() !== "COMPLETED") {
                const points = await PointsService.calculateBookingPoints(connection, booking_id);
                await PointsService.addPointsToUser(connection, booking.user_id, points);
            }
        }

        if (newStatus === "CANCELLED") {
            await TicketService.cancelTickets(connection, booking_id);
        }

        await BookingRepository.commit(connection);
        connection.release();

        return res.json({
            success: true,
            message: `Đã cập nhật đơn #${booking_id} thành ${status}`,
        });
    } catch (error) {
        await BookingRepository.rollback(connection);
        connection.release();
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/*=========================================================
    ✅ UPDATE CUSTOMER INFO — FIX CHECK OWNER
=========================================================*/
exports.updateBookingCustomerInfo = async (req, res) => {
    const connection = await BookingRepository.getConnection();
    try {
        const { booking_id, full_name, phone, email } = req.body;
        const userId = req.user?.user_id;
        const isAdmin = req.user?.role === "admin";

        /*=====================================================
            ✅ VALIDATE INPUT
        =====================================================*/

        if (!booking_id || !full_name || !phone || !email) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin booking_id, full_name, phone hoặc email"
            });
        }

        // ✅ Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Email không hợp lệ"
            });
        }

        // ✅ Validate phone (chỉ số, 10 ký tự)
        if (!/^[0-9]{10}$/.test(String(phone).trim())) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Số điện thoại phải là 10 chữ số"
            });
        }

        /*=====================================================
            ✅ CHECK BOOKING TỒN TẠI
        =====================================================*/

        const booking = await BookingRepository.findById(connection, booking_id);

        if (!booking) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy booking"
            });
        }

        /*=====================================================
            ✅ FIX LỖ HỔNG: CHECK OWNER
            Admin được sửa tất cả, customer chỉ sửa của mình
        =====================================================*/

        if (!isAdmin && Number(booking.user_id) !== Number(userId)) {
            connection.release();
            console.warn(`🚫 [Booking] User ${userId} tried to update booking ${booking_id} of user ${booking.user_id}`);
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền sửa booking này"
            });
        }

        /*=====================================================
            ✅ CHECK STATUS — không cho sửa booking đã hủy
        =====================================================*/

        if (String(booking.status).toUpperCase() === "CANCELLED") {
            connection.release();
            return res.status(400).json({
                success: false,
                message: "Không thể sửa booking đã hủy"
            });
        }

        /*=====================================================
            UPDATE
        =====================================================*/

        await BookingRepository.beginTransaction(connection);
        await BookingService.updateBookingCustomerInfo(
            connection,
            booking_id,
            full_name.trim(),
            phone.trim(),
            email.trim().toLowerCase()
        );
        await BookingRepository.commit(connection);
        connection.release();

        return res.status(200).json({
            success: true,
            message: "Cập nhật thông tin khách hàng thành công"
        });
    } catch (error) {
        try {
            await BookingRepository.rollback(connection);
        } catch (_) {}
        connection.release();
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi cập nhật thông tin"
        });
    }
};

/*=========================================================
    ADMIN - DELETE BOOKING
=========================================================*/
exports.deleteBooking = async (req, res) => {
    try {
        const { booking_id } = req.params;
        const affected = await BookingService.deleteBooking(booking_id);
        if (!affected) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy booking"
            });
        }
        return res.json({
            success: true,
            message: "Xóa booking thành công"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/*=========================================================
    ✅ RESCHEDULE — LẤY INFO — FIX CHECK OWNER
=========================================================*/
exports.getRescheduleInfo = async (req, res) => {
    const connection = await BookingRepository.getConnection();
    try {
        const { booking_id } = req.params;
        const userId = req.user?.user_id;
        const isAdmin = req.user?.role === "admin";

        // ✅ Truyền currentUserId nếu KHÔNG PHẢI admin
        // (Admin xem được booking của mọi user, customer chỉ xem của mình)
        const ownerId = isAdmin ? null : userId;

        const info = await BookingService.getRescheduleInfo(
            connection,
            booking_id,
            ownerId
        );

        return res.json({
            success: true,
            data: info
        });
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    } finally {
        connection.release();
    }
};

/*=========================================================
    ✅ RESCHEDULE — LẤY OPTIONS — FIX CHECK OWNER
=========================================================*/
exports.getRescheduleOptions = async (req, res) => {
    try {
        const { booking_id } = req.params;
        const userId = req.user?.user_id;
        const isAdmin = req.user?.role === "admin";

        const ownerId = isAdmin ? null : userId;

        const options = await BookingService.getRescheduleOptions(
            booking_id,
            ownerId
        );

        return res.json({
            success: true,
            data: options
        });
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

/*=========================================================
    ✅ RESCHEDULE — LẤY GHẾ TRỐNG (PUBLIC - KHÔNG CHECK OWNER)
=========================================================*/
exports.getAvailableSeats = async (req, res) => {
    try {
        const { showtime_id } = req.params;
        const { seat_type } = req.query;

        const seats = await BookingService.getAvailableSeats(showtime_id, seat_type);

        return res.json({
            success: true,
            data: seats
        });
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

/*=========================================================
    ✅ RESCHEDULE — THỰC HIỆN ĐỔI SUẤT — FIX CHECK OWNER
=========================================================*/
exports.rescheduleBooking = async (req, res) => {
    try {
        const { booking_id } = req.params;
        const { new_showtime_id, new_seat_ids } = req.body;
        const userId = req.user?.user_id;
        const isAdmin = req.user?.role === "admin";

        /*=====================================================
            ✅ VALIDATE INPUT
        =====================================================*/

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập"
            });
        }

        if (!new_showtime_id || !Array.isArray(new_seat_ids) || new_seat_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Thiếu new_showtime_id hoặc new_seat_ids"
            });
        }

        if (new_seat_ids.length > 8) {
            return res.status(400).json({
                success: false,
                message: "Chỉ được chọn tối đa 8 ghế"
            });
        }

        /*=====================================================
            ✅ TRUYỀN userId VÀO SERVICE ĐỂ CHECK OWNER
            (Admin không cần check, customer phải check)
        =====================================================*/

        const ownerId = isAdmin ? null : userId;

        const result = await BookingService.rescheduleBooking(
            booking_id,
            new_showtime_id,
            new_seat_ids,
            ownerId
        );

        return res.json({
            success: true,
            data: result,
            message: result.message
        });
    } catch (error) {
        console.error(error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};

/*=========================================================
    ✅ ADMIN — LẤY DANH SÁCH BOOKING ĐÃ ĐỔI SUẤT CHIẾU
=========================================================*/
exports.getRescheduledBookings = async (req, res) => {
    try {
        const { search = "", from, to } = req.query;

        const data = await BookingService.getRescheduledBookings(search, from, to);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get Rescheduled Bookings Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Lỗi lấy danh sách booking đã đổi suất"
        });
    }
};