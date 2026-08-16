const ShowtimeRepository = require("../Repositories/ShowtimeRepository");

/*=========================================================
    CẤU HÌNH
=========================================================*/

const CLEANUP_MINUTES = 20;

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

/*=========================================================
    FORMAT DATETIME
=========================================================*/

const formatDateTime = (dateTime) => {
    if (!dateTime) return null;

    return String(dateTime)
        .replace("T", " ")
        .substring(0, 16);
};

/*=========================================================
    VALIDATE
=========================================================*/

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
        return "Vui lòng chọn đầy đủ: Phim, Rạp, Phòng và Thời gian chiếu";
    }

    return null;
};

/*=========================================================
    DATE HELPERS
    Không dùng toISOString()
    để tránh lệch timezone
=========================================================*/

const parseDateOnly = (dateString) => {
    const match = String(dateString).match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(
        year,
        month - 1,
        day
    );

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
};

const formatDateOnly = (date) => {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const addDays = (date, amount) => {
    const result = new Date(date);
    result.setDate(
        result.getDate() + amount
    );
    return result;
};

/*=========================================================
    TIME HELPERS
=========================================================*/

const parseTimeToMinutes = (time) => {
    const match = String(time).match(
        /^(\d{2}):(\d{2})$/
    );

    if (!match) return null;

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    return hour * 60 + minute;
};

const formatMinutesToTime = (totalMinutes) => {
    totalMinutes =
        totalMinutes % (24 * 60);

    const hour = Math.floor(
        totalMinutes / 60
    );

    const minute =
        totalMinutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

/*=========================================================
    BUILD DATETIME
=========================================================*/

const buildDateTime = (
    dateString,
    timeString
) => {
    return `${dateString} ${timeString}`;
};

/*=========================================================
    CLASS
=========================================================*/

class ShowtimeService {

    /*=====================================================
        GET ALL
    =====================================================*/
    async getAllShowtimesAll(search = "") {
        return await ShowtimeRepository.findAllAll(search);
    }

    /*=====================================================
        GET ALL PAGINATED
    =====================================================*/
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

    /*=====================================================
        BY CINEMA + ROOM
    =====================================================*/
    async getShowtimesByCinemaAndRoom(
        cinema_id,
        room_id
    ) {
        return await ShowtimeRepository.findByCinemaAndRoom(
            cinema_id,
            room_id
        );
    }

    /*=====================================================
        DETAIL
    =====================================================*/
    async getShowtimeDetail(showtimeId) {
        const showtime =
            await ShowtimeRepository.findById(
                showtimeId
            );

        if (!showtime) {
            const err = new Error(
                "Không tìm thấy suất chiếu"
            );

            err.statusCode = 404;

            throw err;
        }

        return showtime;
    }

    /*=====================================================
        BY MOVIE
    =====================================================*/
    async getShowtimesByMovie(movieId) {
        return await ShowtimeRepository.findByMovie(
            movieId
        );
    }

    /*=====================================================
        MOVIE DETAIL
    =====================================================*/
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
            showtimes.map((st) => {
                const roomType =
                    st.room_type;

                const price =
                    ROOM_CONFIG[roomType]
                        ?.defaultPrice || 0;

                return {
                    ...st,
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

    /*=====================================================
        CREATE ONE
    =====================================================*/
    async createShowtime(data) {
        let {
            movie_id,
            cinema_id,
            room_id,
            start_time
        } = data;

        start_time =
            formatDateTime(start_time);

        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        const error =
            validateShowtime({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        /* Kiểm tra movie */
        const movie =
            await ShowtimeRepository.getMovieInfo(
                movie_id
            );

        if (!movie) {
            const err = new Error(
                "Không tìm thấy phim"
            );

            err.statusCode = 404;
            throw err;
        }

        /* Kiểm tra room */
        const room =
            await ShowtimeRepository.getRoomInfo(
                room_id
            );

        if (!room) {
            const err = new Error(
                "Không tìm thấy phòng"
            );

            err.statusCode = 404;
            throw err;
        }

        /* Room phải thuộc cinema */
        if (
            Number(room.cinema_id) !==
            cinema_id
        ) {
            const err = new Error(
                "Phòng chiếu không thuộc rạp đã chọn"
            );

            err.statusCode = 400;
            throw err;
        }

        /* Quá khứ */
        const isPast =
            await ShowtimeRepository.isPastTime(
                start_time
            );

        if (isPast) {
            const err = new Error(
                "Không thể tạo suất chiếu trong quá khứ"
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }

        /* Tính end time */
        const duration =
            Number(movie.duration || 0);

        const startMinutes =
            parseTimeToMinutes(
                start_time.substring(11, 16)
            );

        const endMinutes =
            startMinutes +
            duration +
            CLEANUP_MINUTES;

        const dateString =
            start_time.substring(0, 10);

        const endTime =
            buildDateTime(
                dateString,
                formatMinutesToTime(
                    endMinutes
                )
            );

        /* Trùng */
        const conflict =
            await ShowtimeRepository.findConflict(
                room_id,
                start_time
            );

        if (conflict) {
            const err = new Error(
                "Phòng này đã có suất chiếu vào giờ đó"
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }

        /* Chồng thời gian */
        const overlap =
            await ShowtimeRepository.findTimeOverlap(
                room_id,
                start_time,
                endTime
            );

        if (overlap) {
            const err = new Error(
                `Suất chiếu bị chồng với phim "${overlap.title}" bắt đầu lúc ${overlap.start_time}`
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }

        return await ShowtimeRepository.create({
            movie_id,
            cinema_id,
            room_id,
            start_time
        });
    }

    /*=====================================================
        UPDATE
    =====================================================*/
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
            const err = new Error(
                "Không tìm thấy suất chiếu"
            );

            err.statusCode = 404;
            throw err;
        }

        start_time =
            formatDateTime(start_time);

        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        const error =
            validateShowtime({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });

        if (error) {
            const err = new Error(error);
            err.statusCode = 400;
            throw err;
        }

        const movie =
            await ShowtimeRepository.getMovieInfo(
                movie_id
            );

        if (!movie) {
            const err = new Error(
                "Không tìm thấy phim"
            );

            err.statusCode = 404;
            throw err;
        }

        const room =
            await ShowtimeRepository.getRoomInfo(
                room_id
            );

        if (!room) {
            const err = new Error(
                "Không tìm thấy phòng"
            );

            err.statusCode = 404;
            throw err;
        }

        if (
            Number(room.cinema_id) !==
            cinema_id
        ) {
            const err = new Error(
                "Phòng chiếu không thuộc rạp đã chọn"
            );

            err.statusCode = 400;
            throw err;
        }

        const isPast =
            await ShowtimeRepository.isPastTime(
                start_time
            );

        if (isPast) {
            const err = new Error(
                "Không thể cập nhật suất chiếu trong quá khứ"
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }

        const duration =
            Number(movie.duration || 0);

        const startMinutes =
            parseTimeToMinutes(
                start_time.substring(11, 16)
            );

        const endMinutes =
            startMinutes +
            duration +
            CLEANUP_MINUTES;

        const endTime =
            buildDateTime(
                start_time.substring(0, 10),
                formatMinutesToTime(
                    endMinutes
                )
            );

        const conflict =
            await ShowtimeRepository.findConflict(
                room_id,
                start_time,
                showtimeId
            );

        if (conflict) {
            const err = new Error(
                "Phòng này đã có suất chiếu vào giờ đó"
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }

        const overlap =
            await ShowtimeRepository.findTimeOverlap(
                room_id,
                start_time,
                endTime,
                showtimeId
            );

        if (overlap) {
            const err = new Error(
                `Suất chiếu bị chồng với phim "${overlap.title}" bắt đầu lúc ${overlap.start_time}`
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }

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
            const err = new Error(
                "Không thể cập nhật suất chiếu"
            );

            err.statusCode = 500;

            throw err;
        }

        return true;
    }

    /*=====================================================
        DELETE
    =====================================================*/
    async deleteShowtime(showtimeId) {
        const existing =
            await ShowtimeRepository.findById(
                showtimeId
            );

        if (!existing) {
            const err = new Error(
                "Không tìm thấy suất chiếu"
            );

            err.statusCode = 404;
            throw err;
        }

        const hasTickets =
            await ShowtimeRepository.hasTickets(
                showtimeId
            );

        if (hasTickets) {
            const err = new Error(
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
            const err = new Error(
                "Không thể xóa suất chiếu"
            );

            err.statusCode = 500;

            throw err;
        }

        return true;
    }

    /*=====================================================
        QUICK BOOKING
    =====================================================*/
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

    /*=====================================================
        BOOKING
    =====================================================*/
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
            const err = new Error(
                "Vui lòng chọn rạp và ngày"
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

    /*=====================================================
        FILTER
    =====================================================*/
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
            const err = new Error(
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

    /*=====================================================
        BULK CREATE
        TẠO HÀNG LOẠT
    =====================================================*/
    async bulkCreateShowtimes(data) {

        let {
            cinema_id,
            movie_ids,
            room_ids,
            start_date,
            end_date,
            start_time,
            end_time,
            interval_minutes
        } = data;

        /*-------------------------------------------------
            1. VALIDATE INPUT
        -------------------------------------------------*/

        if (
            !cinema_id ||
            !movie_ids ||
            !room_ids ||
            !start_date ||
            !end_date ||
            !start_time ||
            !end_time
        ) {
            const err = new Error(
                "Vui lòng chọn đầy đủ: Rạp, Phim, Phòng, Ngày bắt đầu, Ngày kết thúc, Giờ bắt đầu và Giờ kết thúc."
            );

            err.statusCode = 400;

            throw err;
        }

        cinema_id = Number(cinema_id);

        const movieIdList = (
            Array.isArray(movie_ids)
                ? movie_ids
                : [movie_ids]
        )
            .map(Number)
            .filter(Boolean);

        const roomIdList = (
            Array.isArray(room_ids)
                ? room_ids
                : [room_ids]
        )
            .map(Number)
            .filter(Boolean);

        if (
            movieIdList.length === 0
        ) {
            const err = new Error(
                "Danh sách phim không được để trống."
            );

            err.statusCode = 400;

            throw err;
        }

        if (
            roomIdList.length === 0
        ) {
            const err = new Error(
                "Danh sách phòng không được để trống."
            );

            err.statusCode = 400;

            throw err;
        }

        /*-------------------------------------------------
            2. VALIDATE DATE
        -------------------------------------------------*/

        const startDate =
            parseDateOnly(start_date);

        const endDate =
            parseDateOnly(end_date);

        if (
            !startDate ||
            !endDate
        ) {
            const err = new Error(
                "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ."
            );

            err.statusCode = 400;

            throw err;
        }

        if (
            startDate > endDate
        ) {
            const err = new Error(
                "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            );

            err.statusCode = 400;

            throw err;
        }

        /*-------------------------------------------------
            3. VALIDATE TIME
        -------------------------------------------------*/

        const startMinutes =
            parseTimeToMinutes(
                start_time
            );

        const endMinutes =
            parseTimeToMinutes(
                end_time
            );

        if (
            startMinutes === null ||
            endMinutes === null
        ) {
            const err = new Error(
                "Giờ bắt đầu hoặc giờ kết thúc không hợp lệ. Định dạng phải là HH:mm."
            );

            err.statusCode = 400;

            throw err;
        }

        if (
            startMinutes >= endMinutes
        ) {
            const err = new Error(
                "Giờ bắt đầu phải nhỏ hơn giờ kết thúc."
            );

            err.statusCode = 400;

            throw err;
        }

        /*-------------------------------------------------
            4. GET MOVIES
        -------------------------------------------------*/

        const movies =
            await ShowtimeRepository.getMoviesByIds(
                movieIdList
            );

        if (
            movies.length !==
            movieIdList.length
        ) {
            const foundIds =
                new Set(
                    movies.map(
                        movie =>
                            Number(
                                movie.movie_id
                            )
                    )
                );

            const missingIds =
                movieIdList.filter(
                    id =>
                        !foundIds.has(id)
                );

            const err = new Error(
                `Không tìm thấy phim có ID: ${missingIds.join(", ")}`
            );

            err.statusCode = 404;

            throw err;
        }

        /*-------------------------------------------------
            5. VALIDATE MOVIE DURATION
        -------------------------------------------------*/

        for (const movie of movies) {
            if (
                !movie.duration ||
                Number(movie.duration) <= 0
            ) {
                const err = new Error(
                    `Phim "${movie.title}" chưa có thời lượng hợp lệ.`
                );

                err.statusCode = 400;

                throw err;
            }
        }

        /*-------------------------------------------------
            6. GET ROOMS
        -------------------------------------------------*/

        const rooms =
            await ShowtimeRepository.getRoomsByIds(
                roomIdList
            );

        if (
            rooms.length !==
            roomIdList.length
        ) {
            const foundIds =
                new Set(
                    rooms.map(
                        room =>
                            Number(
                                room.room_id
                            )
                    )
                );

            const missingIds =
                roomIdList.filter(
                    id =>
                        !foundIds.has(id)
                );

            const err = new Error(
                `Không tìm thấy phòng có ID: ${missingIds.join(", ")}`
            );

            err.statusCode = 404;

            throw err;
        }

        /*-------------------------------------------------
            7. ROOM PHẢI THUỘC CINEMA
        -------------------------------------------------*/

        const invalidRooms =
            rooms.filter(
                room =>
                    Number(
                        room.cinema_id
                    ) !== cinema_id
            );

        if (
            invalidRooms.length > 0
        ) {
            const names =
                invalidRooms.map(
                    room =>
                        room.room_name
                );

            const err = new Error(
                `Các phòng sau không thuộc rạp đã chọn: ${names.join(", ")}`
            );

            err.statusCode = 400;

            throw err;
        }

        /*-------------------------------------------------
            8. INTERVAL
        -------------------------------------------------*/

        let customInterval = null;

        if (
            interval_minutes !== undefined &&
            interval_minutes !== null &&
            interval_minutes !== ""
        ) {
            customInterval =
                Number(interval_minutes);

            if (
                !Number.isInteger(
                    customInterval
                ) ||
                customInterval < 0
            ) {
                const err = new Error(
                    "Khoảng cách giữa các suất phải là số phút hợp lệ."
                );

                err.statusCode = 400;

                throw err;
            }
        }

        /*-------------------------------------------------
            9. SORT MOVIES
            Giữ đúng thứ tự movie_ids
        -------------------------------------------------*/

        const movieMap =
            new Map(
                movies.map(movie => [
                    Number(movie.movie_id),
                    movie
                ])
            );

        const orderedMovies =
            movieIdList.map(
                id =>
                    movieMap.get(id)
            );

        /*-------------------------------------------------
            10. BULK DATA
        -------------------------------------------------*/

        const showtimesToInsert = [];
        const errors = [];

        let requested = 0;

        /*-------------------------------------------------
            11. DUYỆT NGÀY
        -------------------------------------------------*/

        for (
            let currentDate = startDate;
            currentDate <= endDate;
            currentDate = addDays(
                currentDate,
                1
            )
        ) {

            const dateString =
                formatDateOnly(
                    currentDate
                );

            /*---------------------------------------------
                MỖI PHÒNG CHẠY LỊCH RIÊNG
            ---------------------------------------------*/

            for (const room of rooms) {

                let currentSlotMinutes =
                    startMinutes;

                /*-----------------------------------------
                    MỖI PHIM TRONG PHÒNG
                -----------------------------------------*/

                for (
                    const movie of orderedMovies
                ) {

                    const duration =
                        Number(
                            movie.duration
                        );

                    const gap =
                        customInterval !== null
                            ? customInterval
                            : CLEANUP_MINUTES;

                    const slotTime =
                        formatMinutesToTime(
                            currentSlotMinutes
                        );

                    const startDateTime =
                        buildDateTime(
                            dateString,
                            slotTime
                        );

                    /*
                     * Nếu slot vượt quá giờ kết thúc
                     */
                    if (
                        currentSlotMinutes >
                        endMinutes
                    ) {
                        break;
                    }

                    /*
                     * Thời điểm kết thúc phim
                     * + cleanup
                     */
                    const movieEndMinutes =
                        currentSlotMinutes +
                        duration +
                        gap;

                    /*
                     * Nếu phim chạy quá giờ kết thúc
                     * thì không tạo
                     */
                    if (
                        movieEndMinutes >
                        endMinutes
                    ) {
                        errors.push({
                            movie_id:
                                Number(
                                    movie.movie_id
                                ),
                            movie_title:
                                movie.title,
                            room_id:
                                Number(
                                    room.room_id
                                ),
                            room_name:
                                room.room_name,
                            date:
                                dateString,
                            start_time:
                                slotTime,
                            reason:
                                `Phim dài ${duration} phút + ${gap} phút nghỉ, vượt quá giờ kết thúc ${end_time}.`
                        });

                        requested++;

                        break;
                    }

                    requested++;

                    /*-------------------------------------
                        CHECK QUÁ KHỨ
                    -------------------------------------*/

                    const isPast =
                        await ShowtimeRepository
                            .isPastTime(
                                startDateTime
                            );

                    if (isPast) {
                        errors.push({
                            movie_id:
                                Number(
                                    movie.movie_id
                                ),
                            movie_title:
                                movie.title,
                            room_id:
                                Number(
                                    room.room_id
                                ),
                            room_name:
                                room.room_name,
                            date:
                                dateString,
                            start_time:
                                slotTime,
                            reason:
                                "Thời gian chiếu đã ở trong quá khứ."
                        });

                        /*
                         * Vẫn tiến tới slot tiếp theo
                         */
                        currentSlotMinutes =
                            movieEndMinutes;

                        continue;
                    }

                    /*-------------------------------------
                        CHECK TRÙNG GIỜ
                    -------------------------------------*/

                    const conflict =
                        await ShowtimeRepository
                            .findConflict(
                                room.room_id,
                                startDateTime
                            );

                    if (conflict) {
                        errors.push({
                            movie_id:
                                Number(
                                    movie.movie_id
                                ),
                            movie_title:
                                movie.title,
                            room_id:
                                Number(
                                    room.room_id
                                ),
                            room_name:
                                room.room_name,
                            date:
                                dateString,
                            start_time:
                                slotTime,
                            reason:
                                "Phòng đã có suất chiếu đúng thời gian này."
                        });

                        currentSlotMinutes =
                            movieEndMinutes;

                        continue;
                    }

                    /*-------------------------------------
                        CHECK CHỒNG VỚI DB
                    -------------------------------------*/

                    const endDateTime =
                        buildDateTime(
                            dateString,
                            formatMinutesToTime(
                                movieEndMinutes
                            )
                        );

                    const overlap =
                        await ShowtimeRepository
                            .findTimeOverlap(
                                room.room_id,
                                startDateTime,
                                endDateTime
                            );

                    if (overlap) {
                        errors.push({
                            movie_id:
                                Number(
                                    movie.movie_id
                                ),
                            movie_title:
                                movie.title,
                            room_id:
                                Number(
                                    room.room_id
                                ),
                            room_name:
                                room.room_name,
                            date:
                                dateString,
                            start_time:
                                slotTime,
                            reason:
                                `Bị chồng với phim "${overlap.title}" đang chiếu lúc ${overlap.start_time}.`
                        });

                        currentSlotMinutes =
                            movieEndMinutes;

                        continue;
                    }

                    /*-------------------------------------
                        CHECK CHỒNG VỚI SUẤT ĐÃ TẠO
                        TRONG CHÍNH BULK REQUEST
                    -------------------------------------*/

                    const hasInternalOverlap =
                        showtimesToInsert.some(
                            item => {

                                const sameRoom =
                                    Number(
                                        item[2]
                                    ) ===
                                    Number(
                                        room.room_id
                                    );

                                if (!sameRoom) {
                                    return false;
                                }

                                const existingStart =
                                    item[3];

                                const existingMovie =
                                    movieMap.get(
                                        Number(
                                            item[0]
                                        )
                                    );

                                const existingDuration =
                                    Number(
                                        existingMovie?.duration || 0
                                    );

                                const existingStartMinutes =
                                    parseTimeToMinutes(
                                        existingStart.substring(
                                            11,
                                            16
                                        )
                                    );

                                const existingEnd =
                                    existingStartMinutes +
                                    existingDuration +
                                    gap;

                                const newStart =
                                    currentSlotMinutes;

                                return (
                                    newStart <
                                        existingEnd &&
                                    newStart +
                                        duration +
                                        gap >
                                        existingStartMinutes
                                );
                            }
                        );

                    if (
                        hasInternalOverlap
                    ) {
                        errors.push({
                            movie_id:
                                Number(
                                    movie.movie_id
                                ),
                            movie_title:
                                movie.title,
                            room_id:
                                Number(
                                    room.room_id
                                ),
                            room_name:
                                room.room_name,
                            date:
                                dateString,
                            start_time:
                                slotTime,
                            reason:
                                "Suất chiếu bị chồng với suất khác trong cùng đợt tạo hàng loạt."
                        });

                        currentSlotMinutes =
                            movieEndMinutes;

                        continue;
                    }

                    /*-------------------------------------
                        ADD INSERT
                    -------------------------------------*/

                    showtimesToInsert.push([
                        Number(
                            movie.movie_id
                        ),
                        cinema_id,
                        Number(
                            room.room_id
                        ),
                        startDateTime
                    ]);

                    /*-------------------------------------
                        NEXT MOVIE
                    -------------------------------------*/

                    currentSlotMinutes =
                        movieEndMinutes;
                }
            }
        }

        /*-------------------------------------------------
            12. INSERT
        -------------------------------------------------*/

        let inserted = 0;

        if (
            showtimesToInsert.length > 0
        ) {
            inserted =
                await ShowtimeRepository
                    .bulkInsert(
                        showtimesToInsert
                    );
        }

        /*-------------------------------------------------
            13. RETURN
        -------------------------------------------------*/

        return {
            requested,
            inserted,
            skipped:
                errors.length,
            errors,

            configuration: {
                cinema_id,
                movie_ids:
                    movieIdList,
                room_ids:
                    roomIdList,
                start_date,
                end_date,
                start_time,
                end_time,
                cleanup_minutes:
                    CLEANUP_MINUTES,
                custom_interval_minutes:
                    customInterval
            }
        };
    }
}

module.exports = new ShowtimeService();