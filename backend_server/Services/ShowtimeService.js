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
    // Thêm vào cuối class ShowtimeService

    /*=========================================================
        BULK CREATE SHOWTIMES - TẠO HÀNG LOẠT
        Hỗ trợ: nhiều phim, nhiều phòng, tự động khoảng cách dựa trên thời lượng phim
    =========================================================*/
    async bulkCreateShowtimes(data) {
        let { cinema_id, movie_ids, room_ids, start_date, end_date, start_time, end_time, interval_minutes } = data;

        // Validate đầu vào
        if (!cinema_id || !movie_ids || !room_ids || !start_date || !end_date || !start_time || !end_time) {
            const err = new Error("Vui lòng chọn đầy đủ: Rạp, Danh sách phim, Danh sách phòng, Ngày bắt đầu, Ngày kết thúc, Giờ bắt đầu, Giờ kết thúc.");
            err.statusCode = 400;
            throw err;
        }

        // Đảm bảo mảng
        const movieIdList = Array.isArray(movie_ids) ? movie_ids : [movie_ids];
        const roomIdList = Array.isArray(room_ids) ? room_ids : [room_ids];

        if (movieIdList.length === 0 || roomIdList.length === 0) {
            const err = new Error("Danh sách phim hoặc danh sách phòng không được để trống.");
            err.statusCode = 400;
            throw err;
        }

        // Tự động tính khoảng cách nếu không nhập (dựa vào phim đầu tiên)
        if (!interval_minutes || interval_minutes === 0) {
            const firstMovie = await ShowtimeRepository.getMovieInfo(movieIdList[0]);
            if (!firstMovie) {
                const err = new Error("Không tìm thấy phim đầu tiên để tính thời lượng.");
                err.statusCode = 404;
                throw err;
            }
            const duration = firstMovie.duration || 0;
            const cleanup = 20;
            interval_minutes = duration + cleanup;
        }

        // Sinh danh sách giờ chiếu
        const timeSlots = [];
        let currentTime = new Date(`1970-01-01T${start_time}:00`);
        const endTime = new Date(`1970-01-01T${end_time}:00`);
        while (currentTime <= endTime) {
            timeSlots.push(currentTime.toTimeString().slice(0, 5));
            currentTime.setMinutes(currentTime.getMinutes() + interval_minutes);
        }

        if (timeSlots.length === 0) {
            const err = new Error("Không thể sinh danh sách giờ chiếu.");
            err.statusCode = 400;
            throw err;
        }

        // Duyệt qua tất cả các ngày
        const showtimesToInsert = [];
        const errors = [];
        let currentDate = new Date(start_date);
        const endDate = new Date(end_date);

        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];

            // Duyệt qua từng phim và phòng
            for (const movie_id of movieIdList) {
                for (const room_id of roomIdList) {
                    for (const timeStr of timeSlots) {
                        const startTime = `${dateString} ${timeStr}`;

                        // Kiểm tra quá khứ
                        const isPast = await ShowtimeRepository.isPastTime(startTime);
                        if (isPast) {
                            errors.push(`Bỏ qua ${movie_id}/${room_id} ${dateString} ${timeStr} vì quá khứ.`);
                            continue;
                        }

                        // Kiểm tra trùng lịch
                        const conflict = await ShowtimeRepository.findConflict(room_id, startTime);
                        if (conflict) {
                            errors.push(`Bỏ qua ${movie_id}/${room_id} ${dateString} ${timeStr} vì phòng đã có lịch chiếu.`);
                            continue;
                        }

                        showtimesToInsert.push([movie_id, cinema_id, room_id, startTime]);
                    }
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Insert hàng loạt
        let insertedCount = 0;
        if (showtimesToInsert.length > 0) {
            insertedCount = await ShowtimeRepository.bulkInsert(showtimesToInsert);
        }

        return {
            inserted: insertedCount,
            errors: errors,
            total_requested: showtimesToInsert.length + errors.length
        };
    }
}

module.exports = new ShowtimeService();