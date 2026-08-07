const BookingRepository = require("../Repositories/BookingRepository");
const BookingDetailService = require("./BookingDetailService");
const TicketService = require("./TicketService");

class BookingService {

    /*=========================================================
        GET ALL BOOKINGS - KHÔNG PHÂN TRANG
        RETURN: rows[]
    =========================================================*/
    async getAllBookingsAll(search = "") {
        return await BookingRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL BOOKINGS - CÓ PHÂN TRANG
        RETURN: { data: [], pagination: {} }
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
        ✅ UPDATE CUSTOMER INFO (FULL_NAME, PHONE, EMAIL)
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
}

module.exports = new BookingService();