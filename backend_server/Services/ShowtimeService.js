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

    Sau khi phim kết thúc:
    + 15 phút
    rồi mới bắt đầu suất tiếp theo.
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

    if (!value) {
        return null;
    }

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
    MINUTES -> HH:mm
=========================================================*/

const minutesToTime = (minutes) => {

    /*
     * Cho phép 1440 = 24:00
     * để xử lý trường hợp người dùng
     * chọn khoảng 09:00 -> 00:00.
     */

    if (minutes === 1440) {
        return "00:00";
    }

    const hour = Math.floor(
        minutes / 60
    );

    const minute = minutes % 60;

    return (
        `${String(hour).padStart(2, "0")}:` +
        `${String(minute).padStart(2, "0")}`
    );
};


/*=========================================================
    TIME -> MINUTES

    00:00 có thể được hiểu là 24:00
    trong trường hợp dùng làm END TIME.
=========================================================*/

const timeToMinutes = (
    time,
    isEndTime = false
) => {

    if (!time) {
        return null;
    }

    const parts = String(time)
        .split(":")
        .map(Number);

    if (parts.length < 2) {
        return null;
    }

    const hour = parts[0];
    const minute = parts[1];

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute)
    ) {
        return null;
    }

    if (
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    /*
     * Khi END TIME = 00:00
     * hiểu là 24:00.
     *
     * Ví dụ:
     * 09:00 -> 00:00
     * = 09:00 -> 24:00
     */

    if (
        isEndTime &&
        hour === 0 &&
        minute === 0
    ) {
        return 1440;
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
        return (
            "Vui lòng chọn đầy đủ: " +
            "Phim, Rạp, Phòng và Thời gian chiếu"
        );
    }

    return null;
};


/*=========================================================
    CREATE DATETIME
=========================================================*/

const combineDateTime = (
    date,
    minutes
) => {

    /*
     * 1440 không được đưa vào DB
     * vì đây chỉ là mốc kết thúc.
     */

    const time = minutesToTime(minutes);

    return `${formatDate(date)} ${time}`;
};


/*=========================================================
    CLASS
=========================================================*/

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

        ⭐ SMART BULK SHOWTIME ENGINE

        INPUT:

        {
            movie_ids: [],
            cinema_ids: [],
            room_ids: [],

            start_date: "2026-08-20",
            end_date: "2026-08-25",

            start_time: "09:00",
            end_time: "00:00"
        }

        BACKEND TỰ:

        duration phim
        +
        cleanup 15 phút

        để tạo lịch.
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

        if (
            !Array.isArray(movie_ids) ||
            movie_ids.length === 0
        ) {

            const err = new Error(
                "Vui lòng chọn ít nhất một bộ phim"
            );

            err.statusCode = 400;

            throw err;
        }


        if (
            !Array.isArray(cinema_ids) ||
            cinema_ids.length === 0
        ) {

            const err = new Error(
                "Vui lòng chọn ít nhất một rạp"
            );

            err.statusCode = 400;

            throw err;
        }


        if (
            !Array.isArray(room_ids) ||
            room_ids.length === 0
        ) {

            const err = new Error(
                "Vui lòng chọn ít nhất một phòng"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            2. NORMALIZE IDS
        =====================================================*/

        movie_ids = [
            ...new Set(
                movie_ids
                    .map(Number)
                    .filter(Number.isInteger)
                    .filter(id => id > 0)
            )
        ];

        cinema_ids = [
            ...new Set(
                cinema_ids
                    .map(Number)
                    .filter(Number.isInteger)
                    .filter(id => id > 0)
            )
        ];

        room_ids = [
            ...new Set(
                room_ids
                    .map(Number)
                    .filter(Number.isInteger)
                    .filter(id => id > 0)
            )
        ];


        /*=====================================================
            3. VALIDATE DATE
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
            4. VALIDATE TIME
        =====================================================*/

        const startMinutes =
            timeToMinutes(
                start_time,
                false
            );

        const endMinutes =
            timeToMinutes(
                end_time,
                true
            );


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


        if (
            startMinutes >= endMinutes
        ) {

            const err = new Error(
                "Giờ bắt đầu phải nhỏ hơn giờ kết thúc"
            );

            err.statusCode = 400;

            throw err;
        }


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
            6. VALIDATE MOVIE DURATION
        =====================================================*/

        const validMovies =
            movies.filter(movie => {

                const duration =
                    Number(movie.duration);

                return (
                    Number.isFinite(duration) &&
                    duration > 0
                );
            });


        if (!validMovies.length) {

            const err = new Error(
                "Các phim đã chọn không có thời lượng hợp lệ"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            7. LOAD ROOMS
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
            8. VALIDATE ROOM ↔ CINEMA

            Ví dụ:

            Cinema A
                Room A1
                Room A2

            Cinema B
                Room B1

            Nếu user chọn:

            cinema_ids:
                A, B

            room_ids:
                A1, B1

            => hợp lệ.

            Nếu chọn:

            cinema_ids:
                A

            room_ids:
                B1

            => loại.
        =====================================================*/

        const selectedCinemaSet =
            new Set(
                cinema_ids.map(Number)
            );


        const validRooms =
            rooms.filter(room => {

                return selectedCinemaSet.has(
                    Number(room.cinema_id)
                );
            });


        if (!validRooms.length) {

            const err = new Error(
                "Không có phòng nào thuộc các rạp đã chọn"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            9. SMART MOVIE ORDER

            Sắp xếp phim theo thời lượng.

            Phim ngắn được ưu tiên trước.

            Ví dụ:

            Thỏ Ơi      90 phút
            Phim B     110 phút
            Phim C     125 phút

            => 90
            => 110
            => 125

            Sau đó lặp lại.
        =====================================================*/

        const sortedMovies =
            [...validMovies]
                .sort(
                    (a, b) =>
                        Number(a.duration) -
                        Number(b.duration)
                );


        /*=====================================================
            10. GENERATE

            Mỗi ROOM có một lịch độc lập.

            Ví dụ:

            Phòng A1

            09:00
            Thỏ Ơi 90p
            ↓
            10:30
            cleanup 15p
            ↓
            10:45
            Phim B 120p
            ↓
            12:45
            cleanup 15p
            ↓
            13:00
            Thỏ Ơi
        =====================================================*/

        const generated = [];


        let currentDate =
            new Date(startDate);


        while (
            currentDate <= endDate
        ) {

            const dateString =
                formatDate(currentDate);


            /*=================================================
                MỖI ROOM TỰ CHẠY LỊCH RIÊNG
            =================================================*/

            for (
                const room of validRooms
            ) {

                let currentMinutes =
                    startMinutes;


                let movieIndex = 0;


                /*
                 * Chống vòng lặp vô hạn
                 */
                let safetyCounter = 0;

                const maxIterations = 500;


                while (
                    currentMinutes < endMinutes &&
                    safetyCounter < maxIterations
                ) {

                    safetyCounter++;


                    /*=========================================
                        TÌM PHIM TIẾP THEO PHÙ HỢP
                    =========================================*/

                    let selectedMovie = null;


                    /*
                     * Tìm từ movieIndex trở đi.
                     */

                    for (
                        let offset = 0;
                        offset < sortedMovies.length;
                        offset++
                    ) {

                        const index =
                            (
                                movieIndex +
                                offset
                            ) %
                            sortedMovies.length;


                        const movie =
                            sortedMovies[index];


                        const duration =
                            Number(
                                movie.duration
                            );


                        const movieEnd =
                            currentMinutes +
                            duration;


                        /*
                         * Phim phải kết thúc
                         * trong khung giờ cho phép.
                         */

                        if (
                            movieEnd <=
                            endMinutes
                        ) {

                            selectedMovie = {
                                movie,
                                index,
                                duration,
                                movieEnd
                            };

                            break;
                        }
                    }


                    /*=========================================
                        KHÔNG CÒN PHIM NÀO FIT
                    =========================================*/

                    if (!selectedMovie) {
                        break;
                    }


                    const {
                        movie,
                        index,
                        duration,
                        movieEnd
                    } = selectedMovie;


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
                            fullEnd,

                        duration,

                        cleanupMinutes:
                            CLEANUP_MINUTES
                    });


                    /*=========================================
                        SUẤT TIẾP THEO

                        movie end
                        +
                        cleanup 15 phút
                    =========================================*/

                    currentMinutes =
                        movieEnd +
                        CLEANUP_MINUTES;


                    /*
                     * Chuyển sang phim kế tiếp.
                     */

                    movieIndex =
                        (
                            index + 1
                        ) %
                        sortedMovies.length;
                }
            }


            currentDate =
                addDays(
                    currentDate,
                    1
                );
        }


        /*=====================================================
            11. KHÔNG CÓ SUẤT
        =====================================================*/

        if (!generated.length) {

            const err = new Error(
                "Không thể tạo suất chiếu trong khoảng thời gian đã chọn. Hãy kiểm tra thời lượng phim và khung giờ."
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            12. LOẠI TRÙNG NỘI BỘ

            Cùng room + cùng start_time
            chỉ được phép tồn tại 1 suất.
        =====================================================*/

        const uniqueMap =
            new Map();


        for (
            const item of generated
        ) {

            const key =
                `${item.room_id}_${item.start_time}`;


            if (
                !uniqueMap.has(key)
            ) {

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
            13. KIỂM TRA SUẤT TRONG QUÁ KHỨ
        =====================================================*/

        const now =
            new Date();


        const futureShowtimes =
            uniqueShowtimes.filter(
                item => {

                    const itemDate =
                        new Date(
                            item.start_time
                                .replace(
                                    " ",
                                    "T"
                                )
                        );

                    return (
                        itemDate > now
                    );
                }
            );


        if (
            !futureShowtimes.length
        ) {

            const err = new Error(
                "Không có suất chiếu nào nằm trong thời gian tương lai"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            14. CHECK DATABASE CONFLICT

            Không được để:

            existing:
            09:00 -> 10:30

            new:
            10:00 -> 11:30

            Vì bị overlap.

            Đồng thời:

            existing:
            09:00 -> 10:30

            new:
            10:45 -> 12:15

            => OK.
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
            15. KHÔNG CÒN SUẤT HỢP LỆ
        =====================================================*/

        if (
            !finalShowtimes.length
        ) {

            const err = new Error(
                "Tất cả suất chiếu tạo ra đều bị trùng với lịch hiện tại"
            );

            err.statusCode = 400;

            throw err;
        }


        /*=====================================================
            16. INSERT DATABASE

            Chỉ gửi các field thực sự tồn tại
            trong bảng showtimes.
        =====================================================*/

        const insertData =
            finalShowtimes.map(
                item => ({

                    movie_id:
                        item.movie_id,

                    cinema_id:
                        item.cinema_id,

                    room_id:
                        item.room_id,

                    start_time:
                        item.start_time
                })
            );


        const result =
            await ShowtimeRepository
                .bulkCreate(
                    insertData
                );


        /*=====================================================
            17. RETURN RESULT
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
                CLEANUP_MINUTES,

            roomsProcessed:
                validRooms.length,

            moviesProcessed:
                sortedMovies.length,

            startDate:
                start_date,

            endDate:
                end_date,

            startTime:
                start_time,

            endTime:
                end_time
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
            formatDateTime(
                start_time
            );


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


        /*=====================================================
            KIỂM TRA ROOM CÓ THUỘC CINEMA
        =====================================================*/

        const rooms =
            await ShowtimeRepository
                .findRoomsForBulk([
                    room_id
                ]);


        const room =
            rooms[0];


        if (!room) {

            const err = new Error(
                "Không tìm thấy phòng chiếu"
            );

            err.statusCode = 400;

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
            err.field = "room_id";

            throw err;
        }


        /*=====================================================
            KIỂM TRA QUÁ KHỨ
        =====================================================*/

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


        /*=====================================================
            KIỂM TRA MOVIE
        =====================================================*/

        const movies =
            await ShowtimeRepository
                .findMoviesForBulk([
                    movie_id
                ]);


        if (!movies.length) {

            const err = new Error(
                "Không tìm thấy phim"
            );

            err.statusCode = 400;
            err.field = "movie_id";

            throw err;
        }


        const duration =
            Number(
                movies[0].duration
            );


        if (
            !duration ||
            duration <= 0
        ) {

            const err = new Error(
                "Phim không có thời lượng hợp lệ"
            );

            err.statusCode = 400;
            err.field = "movie_id";

            throw err;
        }


        /*=====================================================
            CHECK OVERLAP THẬT SỰ

            start
            +
            duration
            +
            cleanup
        =====================================================*/

        const startDate =
            new Date(
                start_time.replace(
                    " ",
                    "T"
                )
            );


        const endDate =
            new Date(
                startDate.getTime() +
                (
                    duration +
                    CLEANUP_MINUTES
                ) *
                60 *
                1000
            );


        const mysqlEnd =
            `${endDate.getFullYear()}-` +
            `${String(
                endDate.getMonth() + 1
            ).padStart(2, "0")}-` +
            `${String(
                endDate.getDate()
            ).padStart(2, "0")} ` +
            `${String(
                endDate.getHours()
            ).padStart(2, "0")}:` +
            `${String(
                endDate.getMinutes()
            ).padStart(2, "0")}`;


        const conflict =
            await ShowtimeRepository
                .findOverlappingShowtime(
                    room_id,
                    start_time,
                    mysqlEnd,
                    showtimeId
                );


        if (conflict) {

            const err = new Error(
                "Phòng này đã có suất chiếu bị trùng thời gian"
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }


        /*=====================================================
            UPDATE
        =====================================================*/

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

    async deleteShowtime(
        showtimeId
    ) {

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