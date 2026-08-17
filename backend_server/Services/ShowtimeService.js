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

        Frontend gửi:

        {
            movie_id,
            cinema_id,
            room_ids: [1, 2, 3],
            start_date: "2026-08-17",
            end_date: "2026-09-17",
            start_hour: "09:00",
            end_hour: "23:59",
            distribution: "high"
        }

        Scheduler cần:

        {
            movieId,
            roomIds,
            startDate,
            endDate,
            duration,
            startTime,
            endTime,
            distributionLevel
        }

        Service sẽ:

        1. Validate dữ liệu
        2. Lấy duration phim
        3. Kiểm tra phòng thuộc rạp
        4. Chuẩn hóa room IDs
        5. Gọi Scheduler
        6. Kiểm tra conflict với DB
        7. Bỏ qua suất bị conflict
        8. INSERT suất hợp lệ
        9. Trả summary
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
        // NORMALIZE MOVIE ID
        // ------------------------------------------------------

        const movieId =
            Number(movie_id);


        // ------------------------------------------------------
        // NORMALIZE CINEMA ID
        // ------------------------------------------------------

        const cinemaId =
            Number(cinema_id);


        // ------------------------------------------------------
        // VALIDATE MOVIE
        // ------------------------------------------------------

        if (
            !Number.isInteger(movieId) ||
            movieId <= 0
        ) {

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

        if (
            !Number.isInteger(cinemaId) ||
            cinemaId <= 0
        ) {

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
        // VALIDATE START DATE
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


        // ------------------------------------------------------
        // VALIDATE END DATE
        // ------------------------------------------------------

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
        // VALIDATE DATE FORMAT
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


        // ------------------------------------------------------
        // VALIDATE DATE RANGE
        // ------------------------------------------------------

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
            end_hour || "23:59";


        // ------------------------------------------------------
        // VALIDATE TIME FORMAT
        // ------------------------------------------------------

        const timeRegex =
            /^(?:[01]\d|2[0-3]):[0-5]\d$/;


        if (
            !timeRegex.test(
                scheduleStartHour
            )
        ) {

            const err =
                new Error(
                    "Giờ bắt đầu không hợp lệ"
                );

            err.statusCode = 400;
            err.field = "start_hour";

            throw err;
        }


        if (
            !timeRegex.test(
                scheduleEndHour
            )
        ) {

            const err =
                new Error(
                    "Giờ kết thúc không hợp lệ"
                );

            err.statusCode = 400;
            err.field = "end_hour";

            throw err;
        }


        // ------------------------------------------------------
        // KIỂM TRA GIỜ BẮT ĐẦU / KẾT THÚC
        // ------------------------------------------------------

        const [
            startHour,
            startMinute
        ] =
            scheduleStartHour
                .split(":")
                .map(Number);


        const [
            endHour,
            endMinute
        ] =
            scheduleEndHour
                .split(":")
                .map(Number);


        const startMinutes =
            startHour * 60 +
            startMinute;


        const endMinutes =
            endHour * 60 +
            endMinute;


        if (
            endMinutes <=
            startMinutes
        ) {

            const err =
                new Error(
                    "Giờ kết thúc phải lớn hơn giờ bắt đầu"
                );

            err.statusCode = 400;
            err.field = "end_hour";

            throw err;
        }


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
        // LẤY THỜI LƯỢNG PHIM
        // ------------------------------------------------------

        const movie =
            await ShowtimeRepository.getMovieDuration(
                movieId
            );


        if (!movie) {

            const err =
                new Error(
                    "Không tìm thấy phim"
                );

            err.statusCode = 404;
            err.field = "movie_id";

            throw err;
        }


        const duration =
            Number(movie.duration);


        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            const err =
                new Error(
                    "Thời lượng phim không hợp lệ"
                );

            err.statusCode = 400;
            err.field = "movie_id";

            throw err;
        }


        // ------------------------------------------------------
        // KIỂM TRA CÁC PHÒNG THUỘC ĐÚNG RẠP
        // ------------------------------------------------------

        for (
            const roomId
            of normalizedRoomIds
        ) {

            const room =
                await ShowtimeRepository
                    .findRoomInCinema(
                        roomId,
                        cinemaId
                    );


            if (!room) {

                const err =
                    new Error(
                        `Phòng ${roomId} không thuộc rạp đã chọn`
                    );

                err.statusCode = 400;
                err.field = "room_ids";

                throw err;
            }
        }


        // ------------------------------------------------------
        // GỌI SCHEDULER
        //
        // QUAN TRỌNG:
        //
        // Scheduler KHÔNG nhận:
        //
        // room_ids
        // start_date
        // end_date
        // start_hour
        // end_hour
        // distribution
        //
        // Scheduler nhận:
        //
        // roomIds
        // startDate
        // endDate
        // duration
        // startTime
        // endTime
        // distributionLevel
        // ------------------------------------------------------

        const generated =
            await ShowtimeScheduler.generate({

                movieId:

                    movieId,

                roomIds:

                    normalizedRoomIds,

                startDate:

                    start_date,

                endDate:

                    end_date,

                duration:

                    duration,

                startTime:

                    scheduleStartHour,

                endTime:

                    scheduleEndHour,

                distributionLevel:

                    scheduleDistribution
            });


        // ------------------------------------------------------
        // KIỂM TRA KẾT QUẢ SCHEDULER
        // ------------------------------------------------------

        if (
            !generated ||
            !Array.isArray(
                generated.data
            )
        ) {

            const err =
                new Error(
                    "Scheduler không trả về danh sách suất chiếu hợp lệ"
                );

            err.statusCode = 500;

            throw err;
        }


        // ------------------------------------------------------
        // INSERT CÁC SUẤT HỢP LỆ
        //
        // Scheduler chỉ GENERATE.
        //
        // Service mới là nơi INSERT DB.
        // ------------------------------------------------------

        const created = [];

        const conflicts = [];

        const skippedPast = [];


        for (
            const slot
            of generated.data
        ) {

            const roomId =
                Number(
                    slot.room_id
                );


            const slotStartTime =
                formatDateTime(
                    slot.start_time
                );


            const slotEndTime =
                formatDateTime(
                    slot.end_time
                );


            // --------------------------------------------------
            // VALIDATE SLOT
            // --------------------------------------------------

            if (
                !Number.isInteger(roomId) ||
                roomId <= 0 ||
                !slotStartTime
            ) {

                conflicts.push({

                    ...slot,

                    reason:
                        "Suất chiếu được Scheduler tạo ra không hợp lệ"
                });

                continue;
            }


            // --------------------------------------------------
            // KHÔNG CHO INSERT SUẤT TRONG QUÁ KHỨ
            // --------------------------------------------------

            const isPast =
                await ShowtimeRepository.isPastTime(
                    slotStartTime
                );


            if (isPast) {

                skippedPast.push({

                    ...slot,

                    reason:
                        "Suất chiếu nằm trong quá khứ"
                });

                continue;
            }


            // --------------------------------------------------
            // KIỂM TRA CONFLICT
            //
            // Dùng cả start_time và end_time
            // để kiểm tra khoảng thời gian.
            // --------------------------------------------------

            const conflict =
                await ShowtimeRepository.findConflict(
                    roomId,
                    slotStartTime,
                    slotEndTime
                );


            if (conflict) {

                conflicts.push({

                    ...slot,

                    reason:
                        "Phòng đã có suất chiếu bị trùng thời gian",

                    conflictShowtimeId:
                        conflict.showtime_id ||
                        conflict.id ||
                        null
                });

                continue;
            }


            // --------------------------------------------------
            // INSERT
            // --------------------------------------------------

            try {

                const showtimeId =
                    await ShowtimeRepository.create({

                        movie_id:
                            movieId,

                        cinema_id:
                            cinemaId,

                        room_id:
                            roomId,

                        start_time:
                            slotStartTime
                    });


                created.push({

                    showtime_id:
                        showtimeId,

                    movie_id:
                        movieId,

                    cinema_id:
                        cinemaId,

                    room_id:
                        roomId,

                    start_time:
                        slotStartTime,

                    end_time:
                        slotEndTime,

                    duration:
                        duration
                });

            } catch (error) {

                /*
                 * Nếu DB phát hiện conflict
                 * do race condition thì không
                 * làm chết toàn bộ batch.
                 */

                conflicts.push({

                    ...slot,

                    reason:
                        error.message ||
                        "Không thể tạo suất chiếu"
                });
            }
        }


        // ------------------------------------------------------
        // RETURN
        // ------------------------------------------------------

        return {

            success: true,

            data: created,

            conflicts,

            skippedPast,

            summary: {

                movieId:
                    movieId,

                cinemaId:
                    cinemaId,

                roomCount:
                    normalizedRoomIds.length,

                generatedCount:
                    generated.data.length,

                createdCount:
                    created.length,

                conflictCount:
                    conflicts.length,

                skippedPastCount:
                    skippedPast.length,

                duration:
                    duration,

                startDate:
                    start_date,

                endDate:
                    end_date,

                startTime:
                    scheduleStartHour,

                endTime:
                    scheduleEndHour,

                distribution:
                    scheduleDistribution
            },

            schedulerSummary:
                generated.summary || null
        };
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