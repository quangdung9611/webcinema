const ShowtimeRepository = require("../Repositories/ShowtimeRepository");

// Định nghĩa cấu hình giá vé theo loại phòng (đồng bộ với SeatService)
const ROOM_CONFIG = {
    '2D': { defaultPrice: 80000 },
    '3D': { defaultPrice: 120000 },
    '4DMAX': { defaultPrice: 180000 },
    'IMAX': { defaultPrice: 250000 },
    'VIP': { defaultPrice: 250000 }
};

const formatDateTime = (dateTime) => {
    if (!dateTime) return null;
    return dateTime.replace("T", " ").substring(0, 16);
};

const validateShowtime = (data) => {
    const { movie_id, cinema_id, room_id, start_time } = data;
    if (!movie_id || !cinema_id || !room_id || !start_time) {
        return "Vui lòng chọn đầy đủ: Phim, Rạp, Phòng và Thời gian chiếu";
    }
    return null;
};

class ShowtimeService {

    /*=========================================================
        GET ALL SHOWTIMES - KHÔNG PHÂN TRANG
    =========================================================*/
    async getAllShowtimesAll(search = "") {
        return await ShowtimeRepository.findAllAll(search);
    }

    /*=========================================================
        GET ALL SHOWTIMES - CÓ PHÂN TRANG
    =========================================================*/
    async getAllShowtimesPaginated(page = 1, limit = 20, search = "") {
        return await ShowtimeRepository.findAll(page, limit, search);
    }

    /*=========================================================
        GET SHOWTIMES BY CINEMA AND ROOM
    =========================================================*/
    async getShowtimesByCinemaAndRoom(cinema_id, room_id) {
        return await ShowtimeRepository.findByCinemaAndRoom(cinema_id, room_id);
    }

    /*=========================================================
        GET SHOWTIME DETAIL
    =========================================================*/
    async getShowtimeDetail(showtimeId) {
        const showtime = await ShowtimeRepository.findById(showtimeId);
        if (!showtime) {
            const err = new Error("Không tìm thấy suất chiếu");
            err.statusCode = 404;
            throw err;
        }
        return showtime;
    }

    /*=========================================================
        GET SHOWTIMES BY MOVIE
    =========================================================*/
    async getShowtimesByMovie(movieId) {
        return await ShowtimeRepository.findByMovie(movieId);
    }

    /*=========================================================
        🚀 NEW: GET SHOWTIMES FOR MOVIE DETAIL
        Trả về dữ liệu đã nhóm theo loại phòng, kèm giá tiền
    =========================================================*/
    async getShowtimesForMovieDetail(movieId, cinemaId, date) {
        // 1. Lấy danh sách suất chiếu từ Repository
        const showtimes = await ShowtimeRepository.findByMovieCinemaDateForDetail(movieId, cinemaId, date);

        // 2. Tính giá vé dựa trên loại phòng từ ROOM_CONFIG
        const enrichedShowtimes = showtimes.map(st => {
            const roomType = st.room_type;
            const price = ROOM_CONFIG[roomType]?.defaultPrice || 0;
            return {
                ...st,
                price: price,
                priceDisplay: price.toLocaleString() + 'đ'
            };
        });

        // 3. Nhóm theo room_type (2D, 3D, IMAX, ...)
        const grouped = enrichedShowtimes.reduce((acc, item) => {
            const key = item.room_type;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        return grouped;
    }

    /*=========================================================
        CREATE SHOWTIME (ADMIN)
    =========================================================*/
    async createShowtime(data) {
        let { movie_id, cinema_id, room_id, start_time } = data;
        start_time = formatDateTime(start_time);
        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        const error = validateShowtime({ movie_id, cinema_id, room_id, start_time });
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const isPast = await ShowtimeRepository.isPastTime(start_time);
        if (isPast) {
            const err = new Error("Không thể tạo suất chiếu trong quá khứ");
            err.statusCode = 400;
            err.field = "start_time";
            throw err;
        }

        const conflict = await ShowtimeRepository.findConflict(room_id, start_time);
        if (conflict) {
            const err = new Error("Phòng này đã có lịch chiếu vào giờ đó");
            err.statusCode = 400;
            err.field = "start_time";
            throw err;
        }

        return await ShowtimeRepository.create({ movie_id, cinema_id, room_id, start_time });
    }

    /*=========================================================
        UPDATE SHOWTIME (ADMIN)
    =========================================================*/
    async updateShowtime(showtimeId, data) {
        let { movie_id, cinema_id, room_id, start_time } = data;
        const existing = await ShowtimeRepository.findById(showtimeId);
        if (!existing) {
            const err = new Error("Không tìm thấy suất chiếu");
            err.statusCode = 404;
            throw err;
        }
        start_time = formatDateTime(start_time);
        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        const error = validateShowtime({ movie_id, cinema_id, room_id, start_time });
        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const isPast = await ShowtimeRepository.isPastTime(start_time);
        if (isPast) {
            const err = new Error("Không thể cập nhật suất chiếu trong quá khứ");
            err.statusCode = 400;
            err.field = "start_time";
            throw err;
        }

        const conflict = await ShowtimeRepository.findConflict(room_id, start_time, showtimeId);
        if (conflict) {
            const err = new Error("Phòng này đã có lịch chiếu giờ đó");
            err.statusCode = 400;
            err.field = "start_time";
            throw err;
        }

        const affected = await ShowtimeRepository.update(showtimeId, { movie_id, cinema_id, room_id, start_time });
        if (affected === 0) {
            const err = new Error("Không thể cập nhật suất chiếu");
            err.statusCode = 500;
            throw err;
        }
        return true;
    }

    /*=========================================================
        DELETE SHOWTIME (ADMIN)
    =========================================================*/
    async deleteShowtime(showtimeId) {
        const existing = await ShowtimeRepository.findById(showtimeId);
        if (!existing) {
            const err = new Error("Không tìm thấy suất chiếu");
            err.statusCode = 404;
            throw err;
        }
        const hasTickets = await ShowtimeRepository.hasTickets(showtimeId);
        if (hasTickets) {
            const err = new Error("Suất chiếu này đã có vé bán, không thể xóa");
            err.statusCode = 400;
            throw err;
        }
        const affected = await ShowtimeRepository.delete(showtimeId);
        if (affected === 0) {
            const err = new Error("Không thể xóa suất chiếu");
            err.statusCode = 500;
            throw err;
        }
        return true;
    }

    /*=========================================================
        QUICK BOOKING DATA (PUBLIC)
    =========================================================*/
    async getQuickBookingData(movie_id, cinema_id, date) {
        if (!movie_id && !cinema_id && !date) {
            return await ShowtimeRepository.getQuickBookingMovies();
        }
        if (movie_id && !cinema_id && !date) {
            return await ShowtimeRepository.getQuickBookingCinemas(movie_id);
        }
        if (movie_id && cinema_id && !date) {
            return await ShowtimeRepository.getQuickBookingDates(movie_id, cinema_id);
        }
        if (movie_id && cinema_id && date) {
            return await ShowtimeRepository.getQuickBookingTimes(movie_id, cinema_id, date);
        }
        return [];
    }

    /*=========================================================
        GET SHOWTIMES FOR BOOKING (PUBLIC)
    =========================================================*/
    async getShowtimesForBooking(movie_id, cinema_id, date) {
        if (!movie_id || !cinema_id || !date) {
            const err = new Error("Vui lòng chọn rạp và ngày");
            err.statusCode = 400;
            throw err;
        }
        return await ShowtimeRepository.getShowtimesForBooking(movie_id, cinema_id, date);
    }

    /*=========================================================
        FILTER SHOWTIMES (PUBLIC)
    =========================================================*/
    async filterShowtimes(movie_id, room_id, date) {
        if (!movie_id || !room_id || !date) {
            const err = new Error("Thiếu dữ liệu lọc");
            err.statusCode = 400;
            throw err;
        }
        return await ShowtimeRepository.filterShowtimes(movie_id, room_id, date);
    }
}

module.exports = new ShowtimeService();