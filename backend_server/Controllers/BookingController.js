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
    ✅ UPDATE CUSTOMER INFO (FULL_NAME, PHONE, EMAIL)
=========================================================*/
exports.updateBookingCustomerInfo = async (req, res) => {
    const connection = await BookingRepository.getConnection();
    try {
        const { booking_id, full_name, phone, email } = req.body;

        if (!booking_id || !full_name || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin booking_id, full_name, phone hoặc email"
            });
        }

        await BookingRepository.beginTransaction(connection);
        await BookingService.updateBookingCustomerInfo(connection, booking_id, full_name, phone, email);
        await BookingRepository.commit(connection);
        connection.release();

        return res.status(200).json({
            success: true,
            message: "Cập nhật thông tin khách hàng thành công"
        });
    } catch (error) {
        await BookingRepository.rollback(connection);
        connection.release();
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
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