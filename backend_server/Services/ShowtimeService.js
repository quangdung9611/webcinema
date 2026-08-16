const ShowtimeRepository =
    require("../Repositories/ShowtimeRepository");

const ShowtimeScheduler =
    require("./ShowtimeScheduler");


// ==========================================================
// ROOM CONFIG
// Đồng bộ với SeatService
// ==========================================================

const ROOM_CONFIG = {

    "2D": {
        defaultPrice: 80000
    },

    "3D": {
        defaultPrice: 120000
    },

    "4DMAX": {
        defaultPrice: 180000
    },

    "IMAX": {
        defaultPrice: 250000
    },

    "VIP": {
        defaultPrice: 250000
    }
};


// ==========================================================
// FORMAT DATETIME
// ==========================================================

const formatDateTime = (dateTime) => {

    if (!dateTime) {
        return null;
    }

    return String(dateTime)
        .replace("T", " ")
        .substring(0, 16);
};


// ==========================================================
// VALIDATE SHOWTIME
// ==========================================================

const validateShowtime = (data) => {

    const {
        movie_id,
        cinema_id,
        room_id,
        start_time
    } = data;

    if (
        !movie_id ||
        !cinema_id ||
        !room_id ||
        !start_time
    ) {

        return (
            "Vui lòng chọn đầy đủ: " +
            "Phim, Rạp, Phòng và Thời gian chiếu"
        );
    }

    return null;
};


// ==========================================================
// SERVICE
// ==========================================================

class ShowtimeService {


    /*=========================================================
        GET ALL SHOWTIMES
        KHÔNG PHÂN TRANG
    =========================================================*/

    async getAllShowtimesAll(search = "") {

        return await ShowtimeRepository.findAllAll(
            search
        );
    }


    /*=========================================================
        GET ALL SHOWTIMES
        CÓ PHÂN TRANG
    =========================================================*/

    async getAllShowtimesPaginated(
        page = 1,
        limit = 20,
        search = ""
    ) {

        return await ShowtimeRepository.findAll(
            page,
            limit,
            search
        );
    }


    /*=========================================================
        GET SHOWTIMES BY CINEMA + ROOM
    =========================================================*/

    async getShowtimesByCinemaAndRoom(
        cinema_id,
        room_id
    ) {

        return await ShowtimeRepository
            .findByCinemaAndRoom(
                cinema_id,
                room_id
            );
    }


    /*=========================================================
        GET SHOWTIME DETAIL
    =========================================================*/

    async getShowtimeDetail(showtimeId) {

        const showtime =
            await ShowtimeRepository.findById(
                showtimeId
            );

        if (!showtime) {

            const err =
                new Error(
                    "Không tìm thấy suất chiếu"
                );

            err.statusCode = 404;

            throw err;
        }

        return showtime;
    }


    /*=========================================================
        GET SHOWTIMES BY MOVIE
    =========================================================*/

    async getShowtimesByMovie(movieId) {

        return await ShowtimeRepository.findByMovie(
            movieId
        );
    }


    /*=========================================================
        GET SHOWTIMES FOR MOVIE DETAIL
        GROUP BY ROOM TYPE
    =========================================================*/

    async getShowtimesForMovieDetail(
        movieId,
        cinemaId,
        date
    ) {

        const showtimes =
            await ShowtimeRepository
                .findByMovieCinemaDateForDetail(
                    movieId,
                    cinemaId,
                    date
                );


        const enrichedShowtimes =
            showtimes.map((showtime) => {

                const roomType =
                    showtime.room_type;

                const price =
                    ROOM_CONFIG[roomType]
                        ?.defaultPrice || 0;


                return {

                    ...showtime,

                    price,

                    priceDisplay:
                        price.toLocaleString(
                            "vi-VN"
                        ) + "đ"
                };
            });


        const grouped =
            enrichedShowtimes.reduce(
                (acc, item) => {

                    const key =
                        item.room_type;

                    if (!acc[key]) {
                        acc[key] = [];
                    }

                    acc[key].push(item);

                    return acc;

                },
                {}
            );


        return grouped;
    }


    /*=========================================================
        CREATE SHOWTIME
        ADMIN - TẠO 1 SUẤT
    =========================================================*/

    async createShowtime(data) {

        let {
            movie_id,
            cinema_id,
            room_id,
            start_time
        } = data;


        start_time =
            formatDateTime(start_time);


        movie_id =
            Number(movie_id);

        cinema_id =
            Number(cinema_id);

        room_id =
            Number(room_id);


        const validationError =
            validateShowtime({

                movie_id,
                cinema_id,
                room_id,
                start_time

            });


        if (validationError) {

            const err =
                new Error(
                    validationError
                );

            err.statusCode = 400;

            throw err;
        }


        // ------------------------------------------------------
        // KHÔNG CHO TẠO SUẤT TRONG QUÁ KHỨ
        // ------------------------------------------------------

        const isPast =
            await ShowtimeRepository.isPastTime(
                start_time
            );


        if (isPast) {

            const err =
                new Error(
                    "Không thể tạo suất chiếu trong quá khứ"
                );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }


        // ------------------------------------------------------
        // KIỂM TRA TRÙNG LỊCH
        // ------------------------------------------------------

        const conflict =
            await ShowtimeRepository.findConflict(
                room_id,
                start_time
            );


        if (conflict) {

            const err =
                new Error(
                    "Phòng này đã có lịch chiếu vào giờ đó"
                );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }


        // ------------------------------------------------------
        // CREATE
        // ------------------------------------------------------

        return await ShowtimeRepository.create({

            movie_id,

            cinema_id,

            room_id,

            start_time
        });
    }


    /*=========================================================
        AUTO SCHEDULE SHOWTIMES
        ADMIN

        Controller gọi:

        scheduleShowtimes(data)

        Dữ liệu:

        {
            movie_id,
            cinema_id,
            room_ids: [1, 2, 3],
            start_date: "2026-08-17",
            end_date: "2026-09-17",
            start_hour: "09:00",
            end_hour: "24:00",
            distribution: "high"
        }

        Scheduler sẽ:

        - lấy duration phim
        - lấy thông tin phòng
        - tính khoảng cách suất
        - phân bổ theo mức độ
        - kiểm tra trùng
        - bỏ qua suất xung đột
        - tạo các suất hợp lệ
    =========================================================*/

    async scheduleShowtimes(data) {

        if (!data) {

            const err =
                new Error(
                    "Dữ liệu tạo lịch chiếu không hợp lệ"
                );

            err.statusCode = 400;

            throw err;
        }


        const {
            movie_id,
            cinema_id,
            room_ids,
            start_date,
            end_date,
            start_hour,
            end_hour,
            distribution
        } = data;


        // ------------------------------------------------------
        // VALIDATE MOVIE
        // ------------------------------------------------------

        if (!movie_id) {

            const err =
                new Error(
                    "Vui lòng chọn phim"
                );

            err.statusCode = 400;
            err.field = "movie_id";

            throw err;
        }


        // ------------------------------------------------------
        // VALIDATE CINEMA
        // ------------------------------------------------------

        if (!cinema_id) {

            const err =
                new Error(
                    "Vui lòng chọn rạp"
                );

            err.statusCode = 400;
            err.field = "cinema_id";

            throw err;
        }


        // ------------------------------------------------------
        // VALIDATE ROOMS
        // ------------------------------------------------------

        if (
            !Array.isArray(room_ids) ||
            room_ids.length === 0
        ) {

            const err =
                new Error(
                    "Vui lòng chọn ít nhất một phòng chiếu"
                );

            err.statusCode = 400;
            err.field = "room_ids";

            throw err;
        }


        // ------------------------------------------------------
        // VALIDATE DATE
        // ------------------------------------------------------

        if (!start_date) {

            const err =
                new Error(
                    "Vui lòng chọn ngày bắt đầu"
                );

            err.statusCode = 400;
            err.field = "start_date";

            throw err;
        }


        if (!end_date) {

            const err =
                new Error(
                    "Vui lòng chọn ngày kết thúc"
                );

            err.statusCode = 400;
            err.field = "end_date";

            throw err;
        }


        // ------------------------------------------------------
        // VALIDATE DATE RANGE
        // ------------------------------------------------------

        const startDate =
            new Date(
                `${start_date}T00:00:00`
            );


        const endDate =
            new Date(
                `${end_date}T00:00:00`
            );


        if (
            Number.isNaN(
                startDate.getTime()
            ) ||
            Number.isNaN(
                endDate.getTime()
            )
        ) {

            const err =
                new Error(
                    "Khoảng thời gian không hợp lệ"
                );

            err.statusCode = 400;

            throw err;
        }


        if (endDate < startDate) {

            const err =
                new Error(
                    "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
                );

            err.statusCode = 400;
            err.field = "end_date";

            throw err;
        }


        // ------------------------------------------------------
        // DEFAULT TIME
        // ------------------------------------------------------

        const scheduleStartHour =
            start_hour || "09:00";


        const scheduleEndHour =
            end_hour || "24:00";


        // ------------------------------------------------------
        // DISTRIBUTION
        //
        // low    = ít
        // medium = vừa
        // high   = nhiều
        // ------------------------------------------------------

        const allowedDistribution = [
            "low",
            "medium",
            "high"
        ];


        const scheduleDistribution =
            distribution || "medium";


        if (
            !allowedDistribution.includes(
                scheduleDistribution
            )
        ) {

            const err =
                new Error(
                    "Mức độ phân bổ không hợp lệ"
                );

            err.statusCode = 400;
            err.field = "distribution";

            throw err;
        }


        // ------------------------------------------------------
        // NORMALIZE ROOM IDS
        // ------------------------------------------------------

        const normalizedRoomIds = [

            ...new Set(

                room_ids
                    .map(Number)
                    .filter(
                        (id) =>
                            Number.isInteger(id) &&
                            id > 0
                    )
            )
        ];


        if (
            normalizedRoomIds.length === 0
        ) {

            const err =
                new Error(
                    "Danh sách phòng chiếu không hợp lệ"
                );

            err.statusCode = 400;
            err.field = "room_ids";

            throw err;
        }


        // ------------------------------------------------------
        // GỌI SCHEDULER
        // ------------------------------------------------------

        const result =
            await ShowtimeScheduler.generateSchedule({

                movie_id:
                    Number(movie_id),

                cinema_id:
                    Number(cinema_id),

                room_ids:
                    normalizedRoomIds,

                start_date,

                end_date,

                start_hour:
                    scheduleStartHour,

                end_hour:
                    scheduleEndHour,

                distribution:
                    scheduleDistribution
            });


        return result;
    }


    /*=========================================================
        UPDATE SHOWTIME
    =========================================================*/

    async updateShowtime(
        showtimeId,
        data
    ) {

        let {
            movie_id,
            cinema_id,
            room_id,
            start_time
        } = data;


        const existing =
            await ShowtimeRepository.findById(
                showtimeId
            );


        if (!existing) {

            const err =
                new Error(
                    "Không tìm thấy suất chiếu"
                );

            err.statusCode = 404;

            throw err;
        }


        start_time =
            formatDateTime(start_time);


        movie_id =
            Number(movie_id);

        cinema_id =
            Number(cinema_id);

        room_id =
            Number(room_id);


        const validationError =
            validateShowtime({

                movie_id,

                cinema_id,

                room_id,

                start_time
            });


        if (validationError) {

            const err =
                new Error(
                    validationError
                );

            err.statusCode = 400;

            throw err;
        }


        // ------------------------------------------------------
        // KHÔNG CHO ĐỔI THÀNH THỜI GIAN QUÁ KHỨ
        // ------------------------------------------------------

        const isPast =
            await ShowtimeRepository.isPastTime(
                start_time
            );


        if (isPast) {

            const err =
                new Error(
                    "Không thể cập nhật suất chiếu trong quá khứ"
                );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }


        // ------------------------------------------------------
        // KIỂM TRA CONFLICT
        // ------------------------------------------------------

        const conflict =
            await ShowtimeRepository.findConflict(
                room_id,
                start_time,
                showtimeId
            );


        if (conflict) {

            const err =
                new Error(
                    "Phòng này đã có lịch chiếu giờ đó"
                );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }


        // ------------------------------------------------------
        // UPDATE
        // ------------------------------------------------------

        const affected =
            await ShowtimeRepository.update(
                showtimeId,
                {
                    movie_id,
                    cinema_id,
                    room_id,
                    start_time
                }
            );


        if (affected === 0) {

            const err =
                new Error(
                    "Không thể cập nhật suất chiếu"
                );

            err.statusCode = 500;

            throw err;
        }


        return true;
    }


    /*=========================================================
        DELETE SHOWTIME
    =========================================================*/

    async deleteShowtime(showtimeId) {

        const existing =
            await ShowtimeRepository.findById(
                showtimeId
            );


        if (!existing) {

            const err =
                new Error(
                    "Không tìm thấy suất chiếu"
                );

            err.statusCode = 404;

            throw err;
        }


        // ------------------------------------------------------
        // KHÔNG CHO XÓA NẾU ĐÃ CÓ VÉ
        // ------------------------------------------------------

        const hasTickets =
            await ShowtimeRepository.hasTickets(
                showtimeId
            );


        if (hasTickets) {

            const err =
                new Error(
                    "Suất chiếu này đã có vé bán, không thể xóa"
                );

            err.statusCode = 400;

            throw err;
        }


        const affected =
            await ShowtimeRepository.delete(
                showtimeId
            );


        if (affected === 0) {

            const err =
                new Error(
                    "Không thể xóa suất chiếu"
                );

            err.statusCode = 500;

            throw err;
        }


        return true;
    }


    /*=========================================================
        QUICK BOOKING DATA
    =========================================================*/

    async getQuickBookingData(
        movie_id,
        cinema_id,
        date
    ) {

        if (
            !movie_id &&
            !cinema_id &&
            !date
        ) {

            return await ShowtimeRepository
                .getQuickBookingMovies();
        }


        if (
            movie_id &&
            !cinema_id &&
            !date
        ) {

            return await ShowtimeRepository
                .getQuickBookingCinemas(
                    movie_id
                );
        }


        if (
            movie_id &&
            cinema_id &&
            !date
        ) {

            return await ShowtimeRepository
                .getQuickBookingDates(
                    movie_id,
                    cinema_id
                );
        }


        if (
            movie_id &&
            cinema_id &&
            date
        ) {

            return await ShowtimeRepository
                .getQuickBookingTimes(
                    movie_id,
                    cinema_id,
                    date
                );
        }


        return [];
    }


    /*=========================================================
        GET SHOWTIMES FOR BOOKING
    =========================================================*/

    async getShowtimesForBooking(
        movie_id,
        cinema_id,
        date
    ) {

        if (
            !movie_id ||
            !cinema_id ||
            !date
        ) {

            const err =
                new Error(
                    "Vui lòng chọn phim, rạp và ngày"
                );

            err.statusCode = 400;

            throw err;
        }


        return await ShowtimeRepository
            .getShowtimesForBooking(
                movie_id,
                cinema_id,
                date
            );
    }


    /*=========================================================
        FILTER SHOWTIMES
    =========================================================*/

    async filterShowtimes(
        movie_id,
        room_id,
        date
    ) {

        if (
            !movie_id ||
            !room_id ||
            !date
        ) {

            const err =
                new Error(
                    "Thiếu dữ liệu lọc"
                );

            err.statusCode = 400;

            throw err;
        }


        return await ShowtimeRepository
            .filterShowtimes(
                movie_id,
                room_id,
                date
            );
    }
}


// ==========================================================
// EXPORT SINGLETON
// ==========================================================

module.exports =
    new ShowtimeService();