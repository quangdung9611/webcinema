/**
 * ============================================================
 * SHOWTIME SCHEDULER
 * GALAXY-STYLE SHOWTIME DISTRIBUTION
 * ============================================================
 *
 * LOGIC:
 *
 * 🔥 HOT
 * - Khoảng cách giữa các suất của CÙNG PHIM: 45 phút
 *
 * 🟡 NORMAL
 * - Khoảng cách giữa các suất của CÙNG PHIM: 75 phút
 *
 * ❄️ COLD
 * - Khoảng cách giữa các suất của CÙNG PHIM: 120 phút
 *
 * ============================================================
 *
 * ROOM TYPE:
 *
 * Admin chọn loại phòng:
 * - 2D
 * - 3D
 * - VIP
 * - IMAX
 *
 * Scheduler tự chọn room_id thực tế thuộc loại phòng đó.
 *
 * ============================================================
 *
 * QUAN TRỌNG:
 *
 * interval !== duration
 *
 * interval:
 *   khoảng cách giữa GIỜ BẮT ĐẦU các suất của cùng phim
 *
 * duration:
 *   thời lượng phim
 *
 * buffer:
 *   thời gian đệm giữa 2 suất trong cùng phòng
 *
 * ============================================================
 *
 * KHUNG GIỜ:
 *
 * Thứ 2 → Thứ 6:
 *   08:00 → 23:30
 *
 * Thứ 7 → Chủ nhật:
 *   08:00 → 24:00
 *
 * ============================================================
 */

class ShowtimeScheduler {

    /* ========================================================
       DEFAULT CONFIG
    ======================================================== */

    static DEFAULT_CONFIG = {

        // ----------------------------------------------------
        // KHUNG GIỜ
        // ----------------------------------------------------

        weekdayStart: "08:00",
        weekdayEnd: "23:30",

        weekendStart: "08:00",
        weekendEnd: "24:00",

        // ----------------------------------------------------
        // BUFFER GIỮA 2 SUẤT CÙNG PHÒNG
        // ----------------------------------------------------

        bufferMinutes: 15,

        // ----------------------------------------------------
        // INTERVAL THEO ĐỘ HOT
        // ----------------------------------------------------

        hotInterval: 45,
        normalInterval: 75,
        coldInterval: 120,

        // ----------------------------------------------------
        // GIỮ LẠI CÁC CONFIG CŨ ĐỂ TƯƠNG THÍCH
        // NHƯNG KHÔNG CÒN DÙNG ĐỂ ÉP PHÒNG
        // ----------------------------------------------------

        hotMaxRooms: 999,
        normalMaxRooms: 999,
        coldMaxRooms: 999,

        // ----------------------------------------------------
        // GIỮ LẠI CÁC CONFIG CŨ ĐỂ TƯƠNG THÍCH
        //
        // Scheduler mới KHÔNG dùng số này để giới hạn
        // số suất.
        // ----------------------------------------------------

        hotSlotsPerDay: 999,
        normalSlotsPerDay: 999,
        coldSlotsPerDay: 999,

        minSlotsPerDay: 0,
        maxSlotsPerDay: 999,

        // ----------------------------------------------------
        // HOT LEVEL
        // ----------------------------------------------------

        hotThreshold: 100,
        normalThreshold: 50
    };


    /* ========================================================
       DATE HELPERS
    ======================================================== */

    static parseDate(date) {

        if (!date) {
            throw new Error("Thiếu ngày.");
        }

        const value = String(date).trim();

        const match = value.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (!match) {
            throw new Error(
                `Ngày không hợp lệ: ${date}`
            );
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const result = new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

        if (
            result.getUTCFullYear() !== year ||
            result.getUTCMonth() !== month - 1 ||
            result.getUTCDate() !== day
        ) {
            throw new Error(
                `Ngày không hợp lệ: ${date}`
            );
        }

        return result;
    }


    static formatDate(date) {

        return (
            `${date.getUTCFullYear()}-` +
            `${String(
                date.getUTCMonth() + 1
            ).padStart(2, "0")}-` +
            `${String(
                date.getUTCDate()
            ).padStart(2, "0")}`
        );
    }


    static addDays(date, days) {

        const result = new Date(date);

        result.setUTCDate(
            result.getUTCDate() + days
        );

        return result;
    }


    static isWeekend(date) {

        const day =
            new Date(date).getUTCDay();

        return (
            day === 0 ||
            day === 6
        );
    }


    /* ========================================================
       TIME HELPERS
    ======================================================== */

    static timeToMinutes(time) {

        if (time === "24:00") {
            return 24 * 60;
        }

        const parts =
            String(time)
                .split(":")
                .map(Number);

        const hour = parts[0];
        const minute = parts[1];

        if (
            !Number.isInteger(hour) ||
            !Number.isInteger(minute) ||
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59
        ) {
            throw new Error(
                `Giờ không hợp lệ: ${time}`
            );
        }

        return (
            hour * 60 +
            minute
        );
    }


    static minutesToTime(totalMinutes) {

        if (totalMinutes === 24 * 60) {
            return "24:00";
        }

        const hour =
            Math.floor(totalMinutes / 60);

        const minute =
            totalMinutes % 60;

        return (
            `${String(hour).padStart(2, "0")}:` +
            `${String(minute).padStart(2, "0")}`
        );
    }


    static buildDateTime(date, minutes) {

        /*
         * Nếu vượt qua 24:00 thì chuyển sang ngày kế tiếp.
         *
         * Ví dụ:
         * 24:00 => ngày hôm sau 00:00
         */

        if (minutes >= 24 * 60) {

            const overflow =
                minutes - 24 * 60;

            const nextDate =
                this.addDays(
                    this.parseDate(date),
                    1
                );

            return (
                `${this.formatDate(nextDate)} ` +
                `${this.minutesToTime(overflow)}`
            );
        }

        return (
            `${date} ` +
            `${this.minutesToTime(minutes)}`
        );
    }


    /* ========================================================
       TIME RANGE
    ======================================================== */

    static getTimeRangeForDate(
        date,
        config
    ) {

        const isWeekend =
            this.isWeekend(date);

        const startTime =
            isWeekend
                ? config.weekendStart
                : config.weekdayStart;

        const endTime =
            isWeekend
                ? config.weekendEnd
                : config.weekdayEnd;

        return {

            startTime,

            endTime,

            startMinutes:
                this.timeToMinutes(
                    startTime
                ),

            endMinutes:
                this.timeToMinutes(
                    endTime
                ),

            isWeekend
        };
    }


    /* ========================================================
       HOT LEVEL
    ======================================================== */

    static getMovieHotLevel(
        movie,
        stats = {}
    ) {

        /*
         * Ưu tiên distribution do Admin truyền xuống.
         */

        if (
            movie &&
            movie.distribution &&
            [
                "hot",
                "normal",
                "cold"
            ].includes(
                String(
                    movie.distribution
                ).toLowerCase()
            )
        ) {

            return String(
                movie.distribution
            ).toLowerCase();
        }


        /*
         * Nếu không có distribution,
         * tự tính từ statistics.
         */

        const movieId =
            movie?.movie_id;

        const movieStats =
            stats?.[movieId] || {};

        const ticketSold =
            Number(
                movieStats.ticketSold || 0
            );

        const viewCount =
            Number(
                movieStats.viewCount || 0
            );

        const rating =
            Number(
                movieStats.rating || 0
            );

        let hotScore = 0;

        hotScore +=
            ticketSold * 0.5;

        hotScore +=
            viewCount * 0.3;

        hotScore +=
            rating * 10;


        if (
            hotScore >=
            this.DEFAULT_CONFIG.hotThreshold
        ) {
            return "hot";
        }


        if (
            hotScore >=
            this.DEFAULT_CONFIG.normalThreshold
        ) {
            return "normal";
        }


        return "cold";
    }


    /* ========================================================
       INTERVAL
    ======================================================== */

    static getInterval(
        movie,
        stats = {},
        config = this.DEFAULT_CONFIG
    ) {

        const hotLevel =
            this.getMovieHotLevel(
                movie,
                stats
            );

        switch (hotLevel) {

            case "hot":
                return Number(
                    config.hotInterval
                );

            case "normal":
                return Number(
                    config.normalInterval
                );

            case "cold":
                return Number(
                    config.coldInterval
                );

            default:
                return Number(
                    config.normalInterval
                );
        }
    }


    /* ========================================================
       MAX ROOMS
    ======================================================== */

    static getMaxRoomsForMovie(
        movie,
        stats = {},
        totalRooms = 1,
        config = this.DEFAULT_CONFIG
    ) {

        /*
         * Scheduler mới KHÔNG giới hạn số phòng
         * theo HOT / NORMAL / COLD.
         *
         * Room thực tế được quyết định bởi:
         *
         * roomTypes
         *
         * và room nào đang rảnh.
         */

        return Math.max(
            0,
            Number(totalRooms) || 0
        );
    }


    /* ========================================================
       TARGET SLOTS / DAY
    ======================================================== */

    static getTargetSlotsPerDay(
        movie,
        config = this.DEFAULT_CONFIG
    ) {

        /*
         * Không còn target cố định:
         *
         * HOT    = 15
         * NORMAL = 9
         * COLD   = 5
         *
         * Scheduler chạy xuyên suốt khung giờ
         * và tự dừng khi:
         *
         * start + duration > closing
         */

        return Infinity;
    }


    /* ========================================================
       NORMALIZE SHOWTIME
    ======================================================== */

    static normalizeShowtime(
        showtime
    ) {

        if (!showtime) {
            return null;
        }

        let date =
            showtime.date || null;

        let startMinutes =
            Number(
                showtime.startMinutes
            );

        let duration =
            Number(
                showtime.duration
            );


        /*
         * Nếu chưa có startMinutes,
         * lấy từ start_time.
         */

        if (
            !Number.isFinite(
                startMinutes
            ) &&
            showtime.start_time
        ) {

            const raw =
                String(
                    showtime.start_time
                ).replace(
                    "T",
                    " "
                );

            const parts =
                raw.split(" ");

            if (
                !date &&
                parts[0]
            ) {
                date = parts[0];
            }

            const time =
                parts[1] || "00:00";

            startMinutes =
                this.timeToMinutes(
                    time.substring(0, 5)
                );
        }


        /*
         * Nếu chưa có duration,
         * lấy duration của phim.
         */

        if (
            !Number.isFinite(
                duration
            )
        ) {

            duration =
                Number(
                    showtime.movie_duration
                );
        }


        if (
            !Number.isFinite(
                duration
            )
        ) {
            duration = 0;
        }


        return {

            ...showtime,

            date,

            room_id:
                Number(
                    showtime.room_id
                ),

            movie_id:
                Number(
                    showtime.movie_id
                ),

            startMinutes,

            duration
        };
    }


    /* ========================================================
       CHECK ROOM CONFLICT
    ======================================================== */

    static hasRoomConflict({
        roomId,
        startMinutes,
        endMinutes,
        existingShowtimes = [],
        bufferMinutes = 15
    }) {

        return existingShowtimes.some(
            existingRaw => {

                const existing =
                    this.normalizeShowtime(
                        existingRaw
                    );

                if (!existing) {
                    return false;
                }


                /*
                 * Không cùng phòng
                 * => không conflict.
                 */

                if (
                    Number(
                        existing.room_id
                    ) !== Number(roomId)
                ) {
                    return false;
                }


                if (
                    !Number.isFinite(
                        existing.startMinutes
                    )
                ) {
                    return false;
                }


                const existingStart =
                    existing.startMinutes;

                /*
                 * Quan trọng:
                 *
                 * existingEnd = thời điểm phim kết thúc
                 *
                 * + buffer 15 phút
                 *
                 * để phòng không bị dùng lại quá sớm.
                 */

                const existingEnd =
                    existingStart +
                    existing.duration +
                    Number(
                        bufferMinutes || 0
                    );


                /*
                 * Candidate bị conflict nếu
                 * khoảng thời gian của nó giao
                 * với khoảng thời gian phòng đang bận.
                 */

                return (
                    startMinutes <
                        existingEnd &&
                    endMinutes >
                        existingStart
                );
            }
        );
    }


    /* ========================================================
       FIND AVAILABLE ROOM
    ======================================================== */

    static findAvailableRoom({
        rooms,
        roomStartIndex = 0,
        startMinutes,
        endMinutes,
        existingShowtimes = [],
        bufferMinutes = 15
    }) {

        if (
            !Array.isArray(rooms) ||
            rooms.length === 0
        ) {
            return null;
        }


        const totalRooms =
            rooms.length;


        /*
         * Round-robin:
         *
         * Không cố định room đầu tiên.
         *
         * Mỗi lần tạo suất sẽ ưu tiên
         * phòng kế tiếp.
         */

        for (
            let offset = 0;
            offset < totalRooms;
            offset++
        ) {

            const index =
                (
                    roomStartIndex +
                    offset
                ) % totalRooms;

            const room =
                rooms[index];

            const roomId =
                Number(
                    room.room_id
                );


            if (
                !Number.isInteger(
                    roomId
                ) ||
                roomId <= 0
            ) {
                continue;
            }


            const conflict =
                this.hasRoomConflict({

                    roomId,

                    startMinutes,

                    endMinutes,

                    existingShowtimes,

                    bufferMinutes
                });


            if (!conflict) {

                return {

                    room,

                    index
                };
            }
        }


        return null;
    }


    /* ========================================================
       FILTER ROOMS BY TYPE
    ======================================================== */

    static filterRoomsByType(
        rooms,
        roomTypes = []
    ) {

        if (
            !Array.isArray(rooms)
        ) {
            return [];
        }


        /*
         * Không truyền roomTypes
         * => cho phép toàn bộ phòng.
         */

        if (
            !Array.isArray(
                roomTypes
            ) ||
            roomTypes.length === 0
        ) {

            return rooms.filter(
                room =>
                    Number.isInteger(
                        Number(
                            room.room_id
                        )
                    )
            );
        }


        const normalizedTypes =
            roomTypes
                .map(type =>
                    String(type)
                        .trim()
                        .toUpperCase()
                )
                .filter(Boolean);


        return rooms.filter(
            room => {

                const roomType =
                    String(
                        room.room_type ||
                        ""
                    )
                    .trim()
                    .toUpperCase();

                return (
                    normalizedTypes.includes(
                        roomType
                    ) &&
                    Number.isInteger(
                        Number(
                            room.room_id
                        )
                    )
                );
            }
        );
    }


    /* ========================================================
       GENERATE SLOTS
       ONE MOVIE / ONE DAY
    ======================================================== */

    static generateSlotsForMovie({

        date,

        movie,

        rooms,

        roomTypes = [],

        existingShowtimes = [],

        scheduledSlots = [],

        config = {},

        movieStats = {}
    }) {

        const mergedConfig = {

            ...this.DEFAULT_CONFIG,

            ...config
        };


        /*
         * Time range
         */

        const timeRange =
            this.getTimeRangeForDate(
                date,
                mergedConfig
            );


        /*
         * Duration
         */

        const duration =
            Number(
                movie.duration
            );


        if (
            !Number.isFinite(
                duration
            ) ||
            duration <= 0
        ) {

            console.warn(
                `⚠️ ${movie.title}: ` +
                `duration không hợp lệ`
            );

            return [];
        }


        /*
         * Buffer
         */

        const buffer =
            Number(
                mergedConfig.bufferMinutes
            ) || 0;


        /*
         * Interval
         */

        const interval =
            this.getInterval(
                movie,
                movieStats,
                mergedConfig
            );


        if (
            !Number.isFinite(
                interval
            ) ||
            interval <= 0
        ) {

            console.warn(
                `⚠️ ${movie.title}: ` +
                `interval không hợp lệ`
            );

            return [];
        }


        /*
         * ====================================================
         * FILTER ROOM THEO ROOM TYPE
         * ====================================================
         */

        const allowedRooms =
            this.filterRoomsByType(
                rooms,
                roomTypes
            );


        if (
            allowedRooms.length === 0
        ) {

            console.warn(
                `⚠️ ${movie.title}: ` +
                `không có phòng phù hợp ` +
                `roomTypes=${JSON.stringify(
                    roomTypes
                )}`
            );

            return [];
        }


        /*
         * ====================================================
         * GỘP LỊCH DB + LỊCH VỪA GENERATE
         * ====================================================
         */

        const allExisting = [

            ...existingShowtimes,

            ...scheduledSlots

        ]
            .map(item =>
                this.normalizeShowtime(
                    item
                )
            )
            .filter(Boolean);


        /*
         * ====================================================
         * CHỈ LẤY LỊCH TRONG NGÀY ĐANG XỬ LÝ
         * ====================================================
         */

        const existingToday =
            allExisting.filter(
                item =>
                    item.date === date
            );


        /*
         * ====================================================
         * PHIM ĐÃ CÓ BAO NHIÊU SUẤT
         * ====================================================
         */

        const movieSlotsToday =
            existingToday.filter(
                item =>
                    Number(
                        item.movie_id
                    ) ===
                    Number(
                        movie.movie_id
                    )
            ).length;


        /*
         * ====================================================
         * BẮT ĐẦU TỪ GIỜ MỞ CỬA
         * ====================================================
         */

        let currentTime =
            timeRange.startMinutes;


        const slots = [];


        /*
         * ====================================================
         * ROUND ROBIN ROOM
         * ====================================================
         */

        let roomStartIndex = 0;


        /*
         * ====================================================
         * SAFETY GUARD
         * ====================================================
         */

        let safetyCounter = 0;

        const maxIterations =
            Math.ceil(
                (
                    timeRange.endMinutes -
                    timeRange.startMinutes
                ) /
                Math.max(
                    interval,
                    1
                )
            ) + 20;


        /*
         * ====================================================
         * GENERATE
         * ====================================================
         *
         * Ví dụ HOT:
         *
         * 08:00
         * 08:45
         * 09:30
         * 10:15
         * 11:00
         * ...
         *
         * Nếu 08:45 phòng đang bận:
         *
         * 08:45 vẫn được thử.
         *
         * Scheduler tìm phòng khác.
         *
         * Nếu toàn bộ phòng đều bận:
         *
         * bỏ candidate 08:45
         * và chuyển sang 09:30.
         *
         * ====================================================
         */

        while (

            currentTime +
                duration <=
                timeRange.endMinutes &&

            safetyCounter <
                maxIterations

        ) {

            safetyCounter++;


            const endMinutes =
                currentTime +
                duration;


            /*
             * =================================================
             * TÌM PHÒNG TRỐNG
             * =================================================
             */

            const availableRoom =
                this.findAvailableRoom({

                    rooms:
                        allowedRooms,

                    roomStartIndex,

                    startMinutes:
                        currentTime,

                    endMinutes,

                    existingShowtimes:
                        allExisting,

                    bufferMinutes:
                        buffer
                });


            /*
             * =================================================
             * NẾU CÓ PHÒNG
             * =================================================
             */

            if (
                availableRoom
            ) {

                const room =
                    availableRoom.room;

                const roomId =
                    Number(
                        room.room_id
                    );


                const slot = {

                    room_id:
                        roomId,

                    room_name:
                        room.room_name ||
                        null,

                    room_type:
                        room.room_type ||
                        null,

                    date,

                    movie_id:
                        Number(
                            movie.movie_id
                        ),

                    start_time:
                        this.buildDateTime(
                            date,
                            currentTime
                        ),

                    end_time:
                        this.buildDateTime(
                            date,
                            endMinutes
                        ),

                    startMinutes:
                        currentTime,

                    endMinutes,

                    duration,

                    title:
                        movie.title,

                    hotLevel:
                        this.getMovieHotLevel(
                            movie,
                            movieStats
                        )
                };


                /*
                 * Thêm vào danh sách kết quả.
                 */

                slots.push(
                    slot
                );


                /*
                 * Thêm vào allExisting
                 * để các candidate tiếp theo
                 * biết phòng này đã được sử dụng.
                 */

                allExisting.push(
                    this.normalizeShowtime(
                        slot
                    )
                );


                /*
                 * =================================================
                 * ROUND ROBIN
                 * =================================================
                 */

                roomStartIndex =
                    (
                        availableRoom.index +
                        1
                    ) %
                    allowedRooms.length;


                console.log(
                    `🎬 [` +
                    `${slot.hotLevel?.toUpperCase()}` +
                    `] ` +
                    `${movie.title} | ` +
                    `${slot.start_time} → ` +
                    `${slot.end_time} | ` +
                    `${room.room_name || `P${roomId}`} ` +
                    `(${room.room_type || "N/A"})`
                );
            }


            /*
             * =================================================
             * CANDIDATE TIME TIẾP THEO
             * =================================================
             *
             * Dù có phòng hay không,
             * candidate time vẫn tăng interval.
             */

            currentTime +=
                interval;
        }


        /*
         * ====================================================
         * LOG
         * ====================================================
         */

        console.log(

            `📊 ${movie.title} - ${date}: ` +

            `existing=${movieSlotsToday}, ` +

            `created=${slots.length}, ` +

            `interval=${interval}m, ` +

            `duration=${duration}m, ` +

            `buffer=${buffer}m, ` +

            `rooms=${allowedRooms.length}, ` +

            `roomTypes=${
                roomTypes.length
                    ? roomTypes.join(", ")
                    : "ALL"
            }`
        );


        return slots;
    }


    /* ========================================================
       MAIN GENERATE
    ======================================================== */

    static generate({

        movies = [],

        rooms = [],

        startDate,

        endDate,

        config = {},

        movieStats = {},

        existingShowtimes = [],

        roomTypes = []
    }) {

        /* ====================================================
           VALIDATE
        ==================================================== */

        if (
            !Array.isArray(movies) ||
            movies.length === 0
        ) {

            throw new Error(
                "Phải có ít nhất một phim."
            );
        }


        if (
            !Array.isArray(rooms) ||
            rooms.length === 0
        ) {

            throw new Error(
                "Phải có ít nhất một phòng."
            );
        }


        if (
            !startDate ||
            !endDate
        ) {

            throw new Error(
                "Thiếu ngày."
            );
        }


        const fromDate =
            this.parseDate(
                startDate
            );

        const toDate =
            this.parseDate(
                endDate
            );


        if (
            fromDate > toDate
        ) {

            throw new Error(
                "Ngày bắt đầu phải <= ngày kết thúc."
            );
        }


        /* ====================================================
           MERGE CONFIG
        ==================================================== */

        const mergedConfig = {

            ...this.DEFAULT_CONFIG,

            ...config
        };


        /*
         * Ép đúng interval mới.
         *
         * Nếu Service gửi config cũ,
         * scheduler vẫn ưu tiên logic mới.
         */

        mergedConfig.hotInterval =
            45;

        mergedConfig.normalInterval =
            75;

        mergedConfig.coldInterval =
            120;

        mergedConfig.bufferMinutes =
            Number(
                mergedConfig.bufferMinutes
            ) || 15;


        /* ====================================================
           NORMALIZE MOVIES
        ==================================================== */

        const normalizedMovies =
            movies.map(
                movie => {

                    const normalized = {
                        ...movie
                    };


                    normalized.movie_id =
                        Number(
                            normalized.movie_id
                        );


                    normalized.duration =
                        Number.parseInt(
                            normalized.duration,
                            10
                        );


                    if (
                        !Number.isInteger(
                            normalized.movie_id
                        ) ||
                        normalized.movie_id <= 0
                    ) {

                        throw new Error(
                            `ID phim không hợp lệ: ` +
                            `${movie.movie_id}`
                        );
                    }


                    if (
                        !Number.isFinite(
                            normalized.duration
                        ) ||
                        normalized.duration <= 0
                    ) {

                        throw new Error(
                            `Thời lượng phim ` +
                            `"${movie.title}" ` +
                            `không hợp lệ.`
                        );
                    }


                    return normalized;
                }
            );


        /* ====================================================
           NORMALIZE ROOMS
        ==================================================== */

        const normalizedRooms =
            rooms.map(
                room => {

                    const normalized = {
                        ...room
                    };


                    normalized.room_id =
                        Number(
                            normalized.room_id
                        );


                    if (
                        !Number.isInteger(
                            normalized.room_id
                        ) ||
                        normalized.room_id <= 0
                    ) {

                        throw new Error(
                            `ID phòng không hợp lệ: ` +
                            `${room.room_id}`
                        );
                    }


                    normalized.room_type =
                        normalized.room_type
                            ? String(
                                normalized.room_type
                            )
                                .trim()
                                .toUpperCase()
                            : null;


                    return normalized;
                }
            );


        /* ====================================================
           NORMALIZE ROOM TYPES
        ==================================================== */

        const normalizedRoomTypes =
            Array.isArray(roomTypes)
                ? roomTypes
                    .map(type =>
                        String(type)
                            .trim()
                            .toUpperCase()
                    )
                    .filter(Boolean)
                : [];


        /*
         * Nếu admin truyền roomTypes,
         * kiểm tra có ít nhất một phòng phù hợp.
         */

        if (
            normalizedRoomTypes.length > 0
        ) {

            const eligibleRooms =
                this.filterRoomsByType(
                    normalizedRooms,
                    normalizedRoomTypes
                );


            if (
                eligibleRooms.length === 0
            ) {

                throw new Error(
                    `Không có phòng thuộc ` +
                    `loại: ` +
                    `${normalizedRoomTypes.join(", ")}`
                );
            }
        }


        /* ====================================================
           SORT MOVIES BY HOT LEVEL
        ==================================================== */

        const priority = {

            hot: 3,

            normal: 2,

            cold: 1
        };


        const sortedMovies =
            [...normalizedMovies]
                .sort(
                    (a, b) => {

                        const hotA =
                            this.getMovieHotLevel(
                                a,
                                movieStats
                            );

                        const hotB =
                            this.getMovieHotLevel(
                                b,
                                movieStats
                            );


                        return (
                            priority[hotB] -
                            priority[hotA]
                        );
                    }
                );


        /* ====================================================
           DATE LIST
        ==================================================== */

        const dateList = [];


        let currentDate =
            this.parseDate(
                startDate
            );


        while (
            currentDate <= toDate
        ) {

            dateList.push(
                this.formatDate(
                    currentDate
                )
            );


            currentDate =
                this.addDays(
                    currentDate,
                    1
                );
        }


        /* ====================================================
           GENERATE
        ==================================================== */

        const allResults = [];


        for (
            const date of dateList
        ) {

            /*
             * Những slot vừa được scheduler
             * tạo trong ngày này.
             */

            const scheduledSlots = [];


            for (
                const movie of sortedMovies
            ) {

                const slots =
                    this.generateSlotsForMovie({

                        date,

                        movie,

                        rooms:
                            normalizedRooms,

                        roomTypes:
                            normalizedRoomTypes,

                        existingShowtimes,

                        scheduledSlots,

                        config:
                            mergedConfig,

                        movieStats
                    });


                for (
                    const slot of slots
                ) {

                    allResults.push(
                        slot
                    );

                    scheduledSlots.push(
                        slot
                    );
                }
            }
        }


        /* ====================================================
           SORT RESULT
        ==================================================== */

        allResults.sort(
            (a, b) => {

                if (
                    a.date !==
                    b.date
                ) {

                    return a.date.localeCompare(
                        b.date
                    );
                }


                if (
                    a.startMinutes !==
                    b.startMinutes
                ) {

                    return (
                        a.startMinutes -
                        b.startMinutes
                    );
                }


                return (
                    Number(a.room_id) -
                    Number(b.room_id)
                );
            }
        );


        /* ====================================================
           STATS
        ==================================================== */

        const stats = {

            totalMovies:
                normalizedMovies.length,

            totalRooms:
                normalizedRooms.length,

            eligibleRooms:
                this.filterRoomsByType(
                    normalizedRooms,
                    normalizedRoomTypes
                ).length,

            totalDays:
                dateList.length,

            totalGenerated:
                allResults.length,

            byMovie: {},

            byRoom: {},

            byDate: {},

            byHotLevel: {

                hot: {
                    count: 0,
                    movies: []
                },

                normal: {
                    count: 0,
                    movies: []
                },

                cold: {
                    count: 0,
                    movies: []
                }
            },

            summary: {

                hot: {
                    totalSlots: 0,
                    avgPerDay: 0,
                    avgPerMovie: 0
                },

                normal: {
                    totalSlots: 0,
                    avgPerDay: 0,
                    avgPerMovie: 0
                },

                cold: {
                    totalSlots: 0,
                    avgPerDay: 0,
                    avgPerMovie: 0
                }
            }
        };


        /* ====================================================
           BY MOVIE
        ==================================================== */

        for (
            const movie of normalizedMovies
        ) {

            const count =
                allResults.filter(
                    slot =>
                        Number(
                            slot.movie_id
                        ) ===
                        Number(
                            movie.movie_id
                        )
                ).length;


            const hotLevel =
                this.getMovieHotLevel(
                    movie,
                    movieStats
                );


            stats.byMovie[
                movie.movie_id
            ] = {

                title:
                    movie.title,

                count,

                hotLevel,

                avgPerDay:
                    dateList.length > 0
                        ? (
                            count /
                            dateList.length
                        ).toFixed(1)
                        : "0.0"
            };


            stats.byHotLevel[
                hotLevel
            ].count += count;


            stats.byHotLevel[
                hotLevel
            ].movies.push(
                movie.title
            );


            stats.summary[
                hotLevel
            ].totalSlots += count;
        }


        /* ====================================================
           BY ROOM
        ==================================================== */

        for (
            const room of normalizedRooms
        ) {

            const count =
                allResults.filter(
                    slot =>
                        Number(
                            slot.room_id
                        ) ===
                        Number(
                            room.room_id
                        )
                ).length;


            stats.byRoom[
                room.room_id
            ] = {

                name:
                    room.room_name ||
                    `Phòng ${room.room_id}`,

                roomType:
                    room.room_type ||
                    null,

                count,

                avgPerDay:
                    dateList.length > 0
                        ? (
                            count /
                            dateList.length
                        ).toFixed(1)
                        : "0.0"
            };
        }


        /* ====================================================
           BY DATE
        ==================================================== */

        for (
            const date of dateList
        ) {

            stats.byDate[
                date
            ] =
                allResults.filter(
                    slot =>
                        slot.date === date
                ).length;
        }


        /* ====================================================
           SUMMARY
        ==================================================== */

        for (
            const level of [
                "hot",
                "normal",
                "cold"
            ]
        ) {

            const movieCount =
                normalizedMovies.filter(
                    movie =>
                        this.getMovieHotLevel(
                            movie,
                            movieStats
                        ) === level
                ).length;


            stats.summary[
                level
            ].avgPerMovie =
                movieCount > 0
                    ? (
                        stats.summary[
                            level
                        ].totalSlots /
                        movieCount
                    ).toFixed(1)
                    : "0.0";


            stats.summary[
                level
            ].avgPerDay =
                dateList.length > 0
                    ? (
                        stats.summary[
                            level
                        ].totalSlots /
                        dateList.length
                    ).toFixed(1)
                    : "0.0";
        }


        /* ====================================================
           DISTRIBUTION INFO
        ==================================================== */

        const hotMovies =
            normalizedMovies.filter(
                movie =>
                    this.getMovieHotLevel(
                        movie,
                        movieStats
                    ) === "hot"
            );


        const normalMovies =
            normalizedMovies.filter(
                movie =>
                    this.getMovieHotLevel(
                        movie,
                        movieStats
                    ) === "normal"
            );


        const coldMovies =
            normalizedMovies.filter(
                movie =>
                    this.getMovieHotLevel(
                        movie,
                        movieStats
                    ) === "cold"
            );


        const eligibleRoomCount =
            this.filterRoomsByType(
                normalizedRooms,
                normalizedRoomTypes
            ).length;


        /* ====================================================
           RETURN
        ==================================================== */

        return {

            data:
                allResults,

            stats,

            config:
                mergedConfig,

            roomTypes:
                normalizedRoomTypes,

            eligibleRoomCount,

            dateRange: {

                startDate,

                endDate,

                totalDays:
                    dateList.length
            },

            distribution: {

                hot: {

                    movies:
                        hotMovies.map(
                            movie =>
                                movie.title
                        ),

                    interval:
                        mergedConfig.hotInterval,

                    /*
                     * Không còn giới hạn phòng.
                     */

                    maxRooms:
                        eligibleRoomCount,

                    /*
                     * Không còn target cố định.
                     */

                    targetSlotsPerDay:
                        null,

                    scheduling:
                        "FULL_OPERATING_HOURS"
                },


                normal: {

                    movies:
                        normalMovies.map(
                            movie =>
                                movie.title
                        ),

                    interval:
                        mergedConfig.normalInterval,

                    maxRooms:
                        eligibleRoomCount,

                    targetSlotsPerDay:
                        null,

                    scheduling:
                        "FULL_OPERATING_HOURS"
                },


                cold: {

                    movies:
                        coldMovies.map(
                            movie =>
                                movie.title
                        ),

                    interval:
                        mergedConfig.coldInterval,

                    maxRooms:
                        eligibleRoomCount,

                    targetSlotsPerDay:
                        null,

                    scheduling:
                        "FULL_OPERATING_HOURS"
                }
            }
        };
    }
}


/* ============================================================
   EXPORT
============================================================ */

module.exports =
    ShowtimeScheduler;