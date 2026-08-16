const ShowtimeRepository = require("../Repositories/ShowtimeRepository");
const db = require("../Config/db");


/*=========================================================
    CẤU HÌNH GIÁ VÉ
=========================================================*/
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
    THỜI GIAN DỌN PHÒNG

    KHÔNG dùng interval_minutes từ frontend.

    Backend tự cộng:
    duration phim + cleanup
=========================================================*/
const CLEANUP_MINUTES = 15;


/*=========================================================
    FORMAT DATE TIME
=========================================================*/
const formatDateTime = (value) => {

    if (!value) {
        return null;
    }

    return String(value)
        .replace("T", " ")
        .substring(0, 16);
};


/*=========================================================
    PARSE DATE
=========================================================*/
const parseDate = (value) => {

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
};


/*=========================================================
    FORMAT YYYY-MM-DD
=========================================================*/
const formatDate = (date) => {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
};


/*=========================================================
    ADD DAYS
=========================================================*/
const addDays = (date, days) => {

    const result = new Date(date);

    result.setDate(
        result.getDate() + days
    );

    return result;
};


/*=========================================================
    CREATE DATETIME
=========================================================*/
const combineDateTime = (
    date,
    time
) => {

    return `${formatDate(date)} ${time}`;
};


/*=========================================================
    MINUTES -> HH:mm
=========================================================*/
const minutesToTime = (minutes) => {

    const hour = Math.floor(
        minutes / 60
    );

    const minute = minutes % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};


/*=========================================================
    TIME -> MINUTES
=========================================================*/
const timeToMinutes = (time) => {

    const [hour, minute] =
        String(time)
            .split(":")
            .map(Number);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute)
    ) {
        return null;
    }

    return (
        hour * 60 +
        minute
    );
};


/*=========================================================
    VALIDATE BASIC SHOWTIME
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


class ShowtimeService {


    /*=========================================================
        GET ALL - KHÔNG PHÂN TRANG
    =========================================================*/
    async getAllShowtimesAll(search = "") {

        return await ShowtimeRepository.findAllAll(
            search
        );
    }


    /*=========================================================
        GET ALL - PHÂN TRANG
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
        GET BY CINEMA + ROOM
    =========================================================*/
    async getShowtimesByCinemaAndRoom(
        cinemaId,
        roomId
    ) {

        return await ShowtimeRepository
            .findByCinemaAndRoom(
                cinemaId,
                roomId
            );
    }


    /*=========================================================
        GET DETAIL
    =========================================================*/
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


    /*=========================================================
        GET BY MOVIE
    =========================================================*/
    async getShowtimesByMovie(movieId) {

        return await ShowtimeRepository.findByMovie(
            movieId
        );
    }


    /*=========================================================
        MOVIE DETAIL
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
            showtimes.map(showtime => {

                const roomType =
                    showtime.room_type;

                const price =
                    ROOM_CONFIG[roomType]
                        ?.defaultPrice || 0;

                return {
                    ...showtime,

                    price,

                    priceDisplay:
                        price.toLocaleString("vi-VN") +
                        "đ"
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
        CREATE BULK SHOWTIMES
        ⭐ LOGIC CHÍNH CHO SHOWTIME PAGE
    =========================================================*/
    async createBulkShowtimes(data) {

        let {
            movie_ids,
            cinema_ids,
            room_ids,
            start_date,
            end_date,
            start_time,
            end_time
        } = data;


        /*=====================================================
            1. VALIDATE ARRAY
        =====================================================*/

        if (!Array.isArray(movie_ids) ||
            movie_ids.length === 0) {

            const err = new Error(
                "Vui lòng chọn ít nhất một bộ phim"
            );

            err.statusCode = 400;

            throw err;
        }


        if (!Array.isArray(cinema_ids) ||
            cinema_ids.length === 0) {

            const err = new Error(
                "Vui lòng chọn ít nhất một rạp"
            );

            err.statusCode = 400;

            throw err;
        }


        if (!Array.isArray(room_ids) ||
            room_ids.length === 0) {

            const err = new Error(
                "Vui lòng chọn ít nhất một phòng"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            2. VALIDATE DATE
        =====================================================*/

        if (
            !start_date ||
            !end_date
        ) {

            const err = new Error(
                "Vui lòng chọn khoảng ngày chiếu"
            );

            err.statusCode = 400;

            throw err;
        }


        const startDate =
            parseDate(start_date);

        const endDate =
            parseDate(end_date);


        if (
            !startDate ||
            !endDate
        ) {

            const err = new Error(
                "Ngày bắt đầu hoặc ngày kết thúc không hợp lệ"
            );

            err.statusCode = 400;

            throw err;
        }


        if (startDate > endDate) {

            const err = new Error(
                "Ngày bắt đầu không được lớn hơn ngày kết thúc"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            3. VALIDATE TIME
        =====================================================*/

        const startMinutes =
            timeToMinutes(start_time);

        const endMinutes =
            timeToMinutes(end_time);


        if (
            startMinutes === null ||
            endMinutes === null
        ) {

            const err = new Error(
                "Khoảng giờ chiếu không hợp lệ"
            );

            err.statusCode = 400;

            throw err;
        }


        if (startMinutes >= endMinutes) {

            const err = new Error(
                "Giờ bắt đầu phải nhỏ hơn giờ kết thúc"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            4. NORMALIZE IDS
        =====================================================*/

        movie_ids = [
            ...new Set(
                movie_ids
                    .map(Number)
                    .filter(Boolean)
            )
        ];

        cinema_ids = [
            ...new Set(
                cinema_ids
                    .map(Number)
                    .filter(Boolean)
            )
        ];

        room_ids = [
            ...new Set(
                room_ids
                    .map(Number)
                    .filter(Boolean)
            )
        ];


        /*=====================================================
            5. LOAD MOVIES
        =====================================================*/

        const movies =
            await ShowtimeRepository
                .findMoviesForBulk(
                    movie_ids
                );


        if (
            movies.length !==
            movie_ids.length
        ) {

            const err = new Error(
                "Một hoặc nhiều bộ phim không tồn tại"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            6. LOAD ROOMS
        =====================================================*/

        const rooms =
            await ShowtimeRepository
                .findRoomsForBulk(
                    room_ids
                );


        if (
            rooms.length !==
            room_ids.length
        ) {

            const err = new Error(
                "Một hoặc nhiều phòng không tồn tại"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            7. CHỈ CHO PHÉP ROOM THUỘC CINEMA ĐƯỢC CHỌN
        =====================================================*/

        const selectedCinemaSet =
            new Set(cinema_ids);


        const validRooms =
            rooms.filter(room =>
                selectedCinemaSet.has(
                    Number(room.cinema_id)
                )
            );


        if (!validRooms.length) {

            const err = new Error(
                "Các phòng đã chọn không thuộc những rạp đã chọn"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            8. GENERATE SHOWTIMES
        =====================================================*/

        const generated = [];

        let currentDate =
            new Date(startDate);


        while (
            currentDate <= endDate
        ) {

            const dateString =
                formatDate(currentDate);


            /*
             * Mỗi ROOM sẽ có lịch riêng.
             *
             * Không dùng interval_minutes.
             *
             * Mỗi movie:
             *
             * start
             * +
             * duration
             * +
             * cleanup 15 phút
             *
             * = suất tiếp theo
             */

            for (
                const room
                of validRooms
            ) {

                let currentMinutes =
                    startMinutes;


                while (
                    currentMinutes < endMinutes
                ) {

                    let createdAny =
                        false;


                    for (
                        const movie
                        of movies
                    ) {

                        const duration =
                            Number(
                                movie.duration
                            );


                        if (
                            !duration ||
                            duration <= 0
                        ) {
                            continue;
                        }


                        const movieEnd =
                            currentMinutes +
                            duration;


                        /*
                         * Suất phim phải kết thúc
                         * trước hoặc bằng end_time.
                         */

                        if (
                            movieEnd >
                            endMinutes
                        ) {
                            continue;
                        }


                        const startTime =
                            minutesToTime(
                                currentMinutes
                            );


                        const endTime =
                            minutesToTime(
                                movieEnd
                            );


                        const fullStart =
                            `${dateString} ${startTime}`;


                        const fullEnd =
                            `${dateString} ${endTime}`;


                        generated.push({

                            movie_id:
                                movie.movie_id,

                            cinema_id:
                                room.cinema_id,

                            room_id:
                                room.room_id,

                            start_time:
                                fullStart,

                            end_time:
                                fullEnd
                        });


                        createdAny = true;


                        /*
                         * Sau khi phim kết thúc:
                         *
                         * duration
                         * +
                         * cleanup
                         */

                        currentMinutes =
                            movieEnd +
                            CLEANUP_MINUTES;


                        break;
                    }


                    if (!createdAny) {
                        break;
                    }
                }
            }


            currentDate =
                addDays(
                    currentDate,
                    1
                );
        }


        /*=====================================================
            9. KHÔNG CÓ SUẤT NÀO
        =====================================================*/

        if (!generated.length) {

            const err = new Error(
                "Không thể tạo suất chiếu trong khoảng thời gian đã chọn. Hãy kiểm tra thời lượng phim và khoảng giờ."
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            10. LOẠI CÁC SUẤT TRÙNG NỘI BỘ
        =====================================================*/

        const uniqueMap =
            new Map();

        for (
            const item
            of generated
        ) {

            const key =
                `${item.room_id}_${item.start_time}`;

            if (!uniqueMap.has(key)) {
                uniqueMap.set(
                    key,
                    item
                );
            }
        }


        const uniqueShowtimes =
            Array.from(
                uniqueMap.values()
            );


        /*=====================================================
            11. KIỂM TRA QUÁ KHỨ
        =====================================================*/

        const now =
            new Date();


        const futureShowtimes =
            uniqueShowtimes.filter(item => {

                const date =
                    new Date(
                        item.start_time.replace(
                            " ",
                            "T"
                        )
                    );

                return date > now;
            });


        if (!futureShowtimes.length) {

            const err = new Error(
                "Không có suất chiếu nào nằm trong thời gian hợp lệ"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            12. KIỂM TRA TRÙNG VỚI DATABASE
        =====================================================*/

        const finalShowtimes = [];


        for (
            const item
            of futureShowtimes
        ) {

            const conflict =
                await ShowtimeRepository
                    .findOverlappingShowtime(
                        item.room_id,
                        item.start_time,
                        item.end_time
                    );


            if (conflict) {

                continue;
            }


            finalShowtimes.push(
                item
            );
        }


        /*=====================================================
            13. KHÔNG CÒN SUẤT HỢP LỆ
        =====================================================*/

        if (!finalShowtimes.length) {

            const err = new Error(
                "Tất cả suất chiếu tạo ra đều bị trùng với lịch hiện tại"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            14. INSERT DATABASE
        =====================================================*/

        const insertData =
            finalShowtimes.map(item => ({
                movie_id:
                    item.movie_id,

                cinema_id:
                    item.cinema_id,

                room_id:
                    item.room_id,

                start_time:
                    item.start_time
            }));


        const result =
            await ShowtimeRepository.bulkCreate(
                insertData
            );


        /*=====================================================
            15. RETURN RESULT
        =====================================================*/

        return {

            created:
                result.affectedRows,

            requested:
                generated.length,

            skipped:
                generated.length -
                result.affectedRows,

            cleanupMinutes:
                CLEANUP_MINUTES
        };
    }


    /*=========================================================
        QUICK BOOKING
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
        BOOKING
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

            const err = new Error(
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
        FILTER LEGACY
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

            const err = new Error(
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


        const error =
            validateShowtime({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });


        if (error) {

            const err =
                new Error(error);

            err.statusCode = 400;

            throw err;
        }


        const isPast =
            await ShowtimeRepository
                .isPastTime(
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


        const conflict =
            await ShowtimeRepository.findConflict(
                room_id,
                start_time,
                showtimeId
            );


        if (conflict) {

            const err = new Error(
                "Phòng này đã có lịch chiếu vào giờ đó"
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


    /*=========================================================
        DELETE
    =========================================================*/
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
}


module.exports = new ShowtimeService();