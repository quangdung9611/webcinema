/**
 * ============================================================
 * SHOWTIME SCHEDULER
 * GALAXY-STYLE SHOWTIME DISTRIBUTION
 * ============================================================
 *
 * LOGIC:
 *
 * 🔥 HOT
 * - Khoảng cách giữa các suất của CÙNG PHIM: 30 phút
 * - Dùng tất cả phòng được admin chọn
 * - Xoay vòng phòng
 * - Mục tiêu: 15 suất/ngày
 *
 * 🟡 NORMAL
 * - Khoảng cách giữa các suất: 45 phút
 * - Dùng khoảng 50% số phòng
 * - Mục tiêu: 9 suất/ngày
 *
 * ❄️ COLD
 * - Khoảng cách giữa các suất: 60 phút
 * - Dùng 1 phòng
 * - Mục tiêu: 5 suất/ngày
 *
 * QUAN TRỌNG:
 *
 * interval !== duration
 *
 * interval:
 *   khoảng cách giữa GIỜ BẮT ĐẦU các suất
 *
 * duration:
 *   thời lượng phim
 *
 * buffer:
 *   thời gian đệm giữa 2 suất trong cùng phòng
 *
 * Ví dụ HOT:
 *
 * 08:00 P1
 * 08:30 P2
 * 09:00 P3
 * 09:30 P4
 * 10:00 P1
 * 10:30 P2
 *
 * Dù phim dài 120 phút vẫn hợp lệ vì các suất
 * được phân bổ sang các phòng khác nhau.
 *
 * ============================================================
 */

class ShowtimeScheduler {

    /* ========================================================
       DEFAULT CONFIG
    ======================================================== */

    static DEFAULT_CONFIG = {

        // ====================================================
        // KHUNG GIỜ MẶC ĐỊNH
        // ====================================================

        weekdayStart: "08:00",
        weekdayEnd: "23:30",

        weekendStart: "08:00",
        weekendEnd: "24:00",

        // ====================================================
        // BUFFER
        // ====================================================

        bufferMinutes: 15,

        // ====================================================
        // INTERVAL
        // ====================================================

        hotInterval: 30,
        normalInterval: 45,
        coldInterval: 60,

        // ====================================================
        // SỐ PHÒNG
        // ====================================================

        hotMaxRooms: 999,
        normalMaxRooms: 2,
        coldMaxRooms: 1,

        // ====================================================
        // SỐ SUẤT MỤC TIÊU / NGÀY
        //
        // Đây là điểm thay đổi quan trọng.
        //
        // Không còn:
        // 80% x số interval trong ngày
        //
        // Mà dùng target cố định.
        // ====================================================

        hotSlotsPerDay: 15,
        normalSlotsPerDay: 9,
        coldSlotsPerDay: 5,

        // ====================================================
        // FALLBACK
        // ====================================================

        minSlotsPerDay: 3,
        maxSlotsPerDay: 30,

        // ====================================================
        // HOT LEVEL
        // ====================================================

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

        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (!match) {
            throw new Error(`Ngày không hợp lệ: ${date}`);
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const result = new Date(
            Date.UTC(year, month - 1, day)
        );

        if (
            result.getUTCFullYear() !== year ||
            result.getUTCMonth() !== month - 1 ||
            result.getUTCDate() !== day
        ) {
            throw new Error(`Ngày không hợp lệ: ${date}`);
        }

        return result;
    }


    static formatDate(date) {

        return (
            `${date.getUTCFullYear()}-` +
            `${String(date.getUTCMonth() + 1).padStart(2, "0")}-` +
            `${String(date.getUTCDate()).padStart(2, "0")}`
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

        const day = new Date(date).getUTCDay();

        return day === 0 || day === 6;
    }


    /* ========================================================
       TIME HELPERS
    ======================================================== */

    static timeToMinutes(time) {

        if (time === "24:00") {
            return 24 * 60;
        }

        const [hour, minute] = String(time)
            .split(":")
            .map(Number);

        return hour * 60 + minute;
    }


    static minutesToTime(totalMinutes) {

        if (totalMinutes === 24 * 60) {
            return "24:00";
        }

        const hour = Math.floor(totalMinutes / 60);

        const minute = totalMinutes % 60;

        return (
            `${String(hour).padStart(2, "0")}:` +
            `${String(minute).padStart(2, "0")}`
        );
    }


    static buildDateTime(date, minutes) {

        return `${date} ${this.minutesToTime(minutes)}`;
    }


    /* ========================================================
       TIME RANGE
    ======================================================== */

    static getTimeRangeForDate(date, config) {

        const isWeekend = this.isWeekend(date);

        const startTime = isWeekend
            ? config.weekendStart
            : config.weekdayStart;

        const endTime = isWeekend
            ? config.weekendEnd
            : config.weekdayEnd;

        return {

            startTime,

            endTime,

            startMinutes:
                this.timeToMinutes(startTime),

            endMinutes:
                this.timeToMinutes(endTime),

            isWeekend
        };
    }


    /* ========================================================
       HOT LEVEL
    ======================================================== */

    static getMovieHotLevel(movie, stats = {}) {

        // ----------------------------------------------------
        // Ưu tiên distribution do Admin chọn
        // ----------------------------------------------------

        if (
            movie &&
            movie.distribution &&
            ["hot", "normal", "cold"]
                .includes(movie.distribution)
        ) {
            return movie.distribution;
        }

        // ----------------------------------------------------
        // Fallback tính từ statistics
        // ----------------------------------------------------

        const movieId = movie?.movie_id;

        const ticketSold =
            stats[movieId]?.ticketSold || 0;

        const viewCount =
            stats[movieId]?.viewCount || 0;

        const rating =
            stats[movieId]?.rating || 0;

        let hotScore = 0;

        hotScore += ticketSold * 0.5;

        hotScore += viewCount * 0.3;

        hotScore += rating * 10;

        if (
            hotScore >= this.DEFAULT_CONFIG.hotThreshold
        ) {
            return "hot";
        }

        if (
            hotScore >= this.DEFAULT_CONFIG.normalThreshold
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
            this.getMovieHotLevel(movie, stats);

        switch (hotLevel) {

            case "hot":
                return Number(config.hotInterval);

            case "normal":
                return Number(config.normalInterval);

            case "cold":
                return Number(config.coldInterval);

            default:
                return Number(config.normalInterval);
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

        const hotLevel =
            this.getMovieHotLevel(movie, stats);

        switch (hotLevel) {

            case "hot":

                return Math.min(
                    totalRooms,
                    Number(config.hotMaxRooms)
                );

            case "normal":

                return Math.min(
                    Math.max(
                        1,
                        Math.ceil(totalRooms / 2)
                    ),
                    Number(config.normalMaxRooms)
                );

            case "cold":

                return Math.min(
                    1,
                    Number(config.coldMaxRooms)
                );

            default:

                return 1;
        }
    }


    /* ========================================================
       TARGET SLOTS / DAY
    ======================================================== */

    static getTargetSlotsPerDay(
        movie,
        config = this.DEFAULT_CONFIG
    ) {

        const hotLevel =
            this.getMovieHotLevel(movie);

        let target;

        switch (hotLevel) {

            case "hot":
                target =
                    Number(config.hotSlotsPerDay);
                break;

            case "normal":
                target =
                    Number(config.normalSlotsPerDay);
                break;

            case "cold":
                target =
                    Number(config.coldSlotsPerDay);
                break;

            default:
                target =
                    Number(config.normalSlotsPerDay);
        }

        target = Math.max(
            Number(config.minSlotsPerDay),
            target
        );

        target = Math.min(
            Number(config.maxSlotsPerDay),
            target
        );

        return target;
    }


    /* ========================================================
       NORMALIZE EXISTING SHOWTIME
    ======================================================== */

    static normalizeShowtime(showtime) {

        if (!showtime) {
            return null;
        }

        let date =
            showtime.date ||
            null;

        let startMinutes =
            Number(showtime.startMinutes);

        let duration =
            Number(showtime.duration);

        // ----------------------------------------------------
        // Nếu startMinutes chưa có thì lấy start_time
        // ----------------------------------------------------

        if (
            !Number.isFinite(startMinutes) &&
            showtime.start_time
        ) {

            const raw =
                String(showtime.start_time)
                    .replace("T", " ");

            const parts =
                raw.split(" ");

            if (!date && parts[0]) {
                date = parts[0];
            }

            const time =
                parts[1] || "00:00";

            startMinutes =
                this.timeToMinutes(
                    time.substring(0, 5)
                );
        }

        // ----------------------------------------------------
        // Nếu duration chưa có thì thử duration phim
        // ----------------------------------------------------

        if (!Number.isFinite(duration)) {

            duration =
                Number(showtime.movie_duration);
        }

        if (!Number.isFinite(duration)) {
            duration = 0;
        }

        return {

            ...showtime,

            date,

            room_id:
                Number(showtime.room_id),

            movie_id:
                Number(showtime.movie_id),

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
        existingShowtimes = []
    }) {

        return existingShowtimes.some(existingRaw => {

            const existing =
                this.normalizeShowtime(
                    existingRaw
                );

            if (!existing) {
                return false;
            }

            if (
                Number(existing.room_id) !==
                Number(roomId)
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

            const existingEnd =
                existingStart +
                existing.duration;

            return (
                startMinutes < existingEnd &&
                endMinutes > existingStart
            );
        });
    }


    /* ========================================================
       FIND AVAILABLE ROOM
       
       Quan trọng:
       Không cố định roomIndex rồi skip.
       
       Mỗi candidate time sẽ thử TẤT CẢ allowed rooms.
       
       Nhờ vậy:
       
       08:00 P1
       08:30 P2
       09:00 P3
       09:30 P4
       
       Nếu P2 bận lúc 08:30,
       scheduler sẽ tìm P3/P4/P1 thay vì bỏ luôn
       candidate 08:30.
    ======================================================== */

    static findAvailableRoom({
        rooms,
        roomStartIndex,
        startMinutes,
        endMinutes,
        existingShowtimes
    }) {

        if (
            !Array.isArray(rooms) ||
            rooms.length === 0
        ) {
            return null;
        }

        const totalRooms = rooms.length;

        // ----------------------------------------------------
        // Thử từ roomStartIndex để phân bổ round-robin
        // ----------------------------------------------------

        for (
            let offset = 0;
            offset < totalRooms;
            offset++
        ) {

            const index =
                (roomStartIndex + offset) %
                totalRooms;

            const room =
                rooms[index];

            const roomId =
                Number(room.room_id);

            if (
                !Number.isInteger(roomId) ||
                roomId <= 0
            ) {
                continue;
            }

            const conflict =
                this.hasRoomConflict({

                    roomId,

                    startMinutes,

                    endMinutes,

                    existingShowtimes
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
       GENERATE SLOTS FOR ONE MOVIE / ONE DAY
    ======================================================== */

    static generateSlotsForMovie({
        date,
        movie,
        rooms,
        existingShowtimes = [],
        scheduledSlots = [],
        config = {}
    }) {

        const mergedConfig = {

            ...this.DEFAULT_CONFIG,

            ...config
        };

        const timeRange =
            this.getTimeRangeForDate(
                date,
                mergedConfig
            );

        const duration =
            Number(movie.duration);

        const buffer =
            Number(mergedConfig.bufferMinutes);

        const interval =
            this.getInterval(
                movie,
                {},
                mergedConfig
            );

        const targetSlots =
            this.getTargetSlotsPerDay(
                movie,
                mergedConfig
            );

        const slots = [];

        // ----------------------------------------------------
        // Gộp lịch DB + lịch vừa generate
        // ----------------------------------------------------

        const allExisting = [

            ...existingShowtimes,

            ...scheduledSlots

        ]

            .map(item =>
                this.normalizeShowtime(item)
            )

            .filter(Boolean)

            .filter(item =>
                item.date === date
            );

        // ----------------------------------------------------
        // Số suất phim đã tồn tại
        // ----------------------------------------------------

        const movieSlotsToday =
            allExisting.filter(item =>
                Number(item.movie_id) ===
                Number(movie.movie_id)
            ).length;

        // ----------------------------------------------------
        // Đã đủ suất thì không tạo nữa
        // ----------------------------------------------------

        if (
            movieSlotsToday >=
            targetSlots
        ) {

            console.log(
                `ℹ️ ${movie.title} - ${date}: ` +
                `đã đủ ${movieSlotsToday}/${targetSlots} suất`
            );

            return slots;
        }

        // ----------------------------------------------------
        // Lấy số phòng
        // ----------------------------------------------------

        const maxRooms =
            this.getMaxRoomsForMovie(
                movie,
                {},
                rooms.length,
                mergedConfig
            );

        const allowedRooms =
            rooms
                .slice(0, maxRooms)
                .filter(room =>
                    Number.isInteger(
                        Number(room.room_id)
                    )
                );

        if (allowedRooms.length === 0) {

            console.warn(
                `⚠️ ${movie.title}: ` +
                `không có phòng hợp lệ`
            );

            return slots;
        }

        // ----------------------------------------------------
        // Số suất cần tạo
        // ----------------------------------------------------

        const remainingSlots =
            targetSlots -
            movieSlotsToday;

        // ----------------------------------------------------
        // Bắt đầu từ giờ mở cửa
        //
        // Không lấy "lastSlot + duration + buffer"
        // như logic cũ.
        //
        // Vì HOT phải tạo chuỗi giờ:
        //
        // 08:00
        // 08:30
        // 09:00
        // 09:30
        //
        // trên toàn rạp.
        // ----------------------------------------------------

        let currentTime =
            timeRange.startMinutes;

        let createdSlots = 0;

        // ----------------------------------------------------
        // Round-robin room
        // ----------------------------------------------------

        let roomStartIndex = 0;

        // ----------------------------------------------------
        // Guard chống loop vô hạn
        // ----------------------------------------------------

        let safetyCounter = 0;

        const maxIterations =
            Math.ceil(
                (
                    timeRange.endMinutes -
                    timeRange.startMinutes
                ) / Math.max(interval, 1)
            ) + 10;

        // ----------------------------------------------------
        // GENERATE
        // ----------------------------------------------------

        while (

            currentTime +
                duration <=
                timeRange.endMinutes &&

            createdSlots <
                remainingSlots &&

            safetyCounter <
                maxIterations

        ) {

            safetyCounter++;

            const endMinutes =
                currentTime +
                duration;

            // ------------------------------------------------
            // Tìm phòng còn trống
            // ------------------------------------------------

            const availableRoom =
                this.findAvailableRoom({

                    rooms: allowedRooms,

                    roomStartIndex,

                    startMinutes:
                        currentTime,

                    endMinutes,

                    existingShowtimes:
                        allExisting
                });

            // ------------------------------------------------
            // Có phòng
            // ------------------------------------------------

            if (availableRoom) {

                const room =
                    availableRoom.room;

                const roomId =
                    Number(room.room_id);

                const slot = {

                    room_id:
                        roomId,

                    date,

                    movie_id:
                        Number(movie.movie_id),

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
                            movie
                        )
                };

                slots.push(slot);

                allExisting.push(
                    this.normalizeShowtime(slot)
                );

                createdSlots++;

                // ------------------------------------------------
                // Slot tiếp theo ưu tiên room kế tiếp
                // ------------------------------------------------

                roomStartIndex =
                    (
                        availableRoom.index +
                        1
                    ) %
                    allowedRooms.length;

                console.log(
                    `🎬 [${slot.hotLevel?.toUpperCase()}] ` +
                    `${movie.title} | ` +
                    `${slot.start_time} | ` +
                    `P${roomId}`
                );
            }

            // ------------------------------------------------
            // DÙ CÓ HAY KHÔNG CÓ PHÒNG
            //
            // candidate time vẫn tăng interval.
            //
            // Đây chính là:
            //
            // HOT     = 30 phút
            // NORMAL  = 45 phút
            // COLD    = 60 phút
            // ------------------------------------------------

            currentTime += interval;
        }

        // ----------------------------------------------------
        // Log
        // ----------------------------------------------------

        console.log(
            `📊 ${movie.title} - ${date}: ` +
            `target=${targetSlots}, ` +
            `existing=${movieSlotsToday}, ` +
            `created=${slots.length}, ` +
            `interval=${interval}m, ` +
            `rooms=${allowedRooms.length}`
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

        existingShowtimes = []

    }) {

        // ====================================================
        // VALIDATE
        // ====================================================

        if (
            !movies ||
            movies.length === 0
        ) {
            throw new Error(
                "Phải có ít nhất một phim."
            );
        }

        if (
            !rooms ||
            rooms.length === 0
        ) {
            throw new Error(
                "Phải có ít nhất một phòng."
            );
        }

        if (!startDate || !endDate) {
            throw new Error(
                "Thiếu ngày."
            );
        }

        const fromDate =
            this.parseDate(startDate);

        const toDate =
            this.parseDate(endDate);

        if (fromDate > toDate) {
            throw new Error(
                "Ngày bắt đầu phải <= ngày kết thúc."
            );
        }

        // ====================================================
        // MERGE CONFIG
        // ====================================================

        const mergedConfig = {

            ...this.DEFAULT_CONFIG,

            ...config
        };

        // ====================================================
        // NORMALIZE MOVIES
        // ====================================================

        const normalizedMovies =
            movies.map(movie => {

                const normalized = {
                    ...movie
                };

                normalized.movie_id =
                    Number(normalized.movie_id);

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
                        `ID phim không hợp lệ: ${movie.movie_id}`
                    );
                }

                if (
                    !Number.isFinite(
                        normalized.duration
                    ) ||
                    normalized.duration <= 0
                ) {
                    throw new Error(
                        `Thời lượng phim "${movie.title}" không hợp lệ.`
                    );
                }

                return normalized;
            });

        // ====================================================
        // NORMALIZE ROOMS
        // ====================================================

        const normalizedRooms =
            rooms.map(room => {

                const normalized = {
                    ...room
                };

                normalized.room_id =
                    Number(normalized.room_id);

                if (
                    !Number.isInteger(
                        normalized.room_id
                    ) ||
                    normalized.room_id <= 0
                ) {
                    throw new Error(
                        `ID phòng không hợp lệ: ${room.room_id}`
                    );
                }

                return normalized;
            });

        // ====================================================
        // SORT MOVIES BY HOT LEVEL
        //
        // HOT trước để được ưu tiên phòng/khung giờ.
        // ====================================================

        const priority = {

            hot: 3,

            normal: 2,

            cold: 1
        };

        const sortedMovies =
            [...normalizedMovies].sort(
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

        // ====================================================
        // DATE LIST
        // ====================================================

        const dateList = [];

        let currentDate =
            this.parseDate(startDate);

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

        // ====================================================
        // GENERATE
        // ====================================================

        const allResults = [];

        for (
            const date of dateList
        ) {

            // ------------------------------------------------
            // Lịch vừa tạo trong ngày
            // ------------------------------------------------

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

                        existingShowtimes,

                        scheduledSlots,

                        config:
                            mergedConfig
                    });

                for (
                    const slot of slots
                ) {

                    allResults.push(slot);

                    scheduledSlots.push(slot);
                }
            }
        }

        // ====================================================
        // SORT RESULT
        // ====================================================

        allResults.sort(
            (a, b) => {

                if (
                    a.date !== b.date
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
                    a.room_id -
                    b.room_id
                );
            }
        );

        // ====================================================
        // STATS
        // ====================================================

        const stats = {

            totalMovies:
                normalizedMovies.length,

            totalRooms:
                normalizedRooms.length,

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

        // ====================================================
        // BY MOVIE
        // ====================================================

        for (
            const movie of normalizedMovies
        ) {

            const count =
                allResults.filter(
                    slot =>
                        Number(slot.movie_id) ===
                        Number(movie.movie_id)
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
                    (
                        count /
                        dateList.length
                    ).toFixed(1)
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

        // ====================================================
        // BY ROOM
        // ====================================================

        for (
            const room of normalizedRooms
        ) {

            const count =
                allResults.filter(
                    slot =>
                        Number(slot.room_id) ===
                        Number(room.room_id)
                ).length;

            stats.byRoom[
                room.room_id
            ] = {

                name:
                    room.room_name ||
                    `Phòng ${room.room_id}`,

                count,

                avgPerDay:
                    (
                        count /
                        dateList.length
                    ).toFixed(1)
            };
        }

        // ====================================================
        // BY DATE
        // ====================================================

        for (
            const date of dateList
        ) {

            stats.byDate[date] =
                allResults.filter(
                    slot =>
                        slot.date === date
                ).length;
        }

        // ====================================================
        // SUMMARY
        // ====================================================

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
                    : 0;

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
                    : 0;
        }

        // ====================================================
        // DISTRIBUTION INFO
        // ====================================================

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

        // ====================================================
        // RETURN
        // ====================================================

        return {

            data:
                allResults,

            stats,

            config:
                mergedConfig,

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

                    maxRooms:
                        Math.min(
                            normalizedRooms.length,
                            mergedConfig.hotMaxRooms
                        ),

                    targetSlotsPerDay:
                        mergedConfig.hotSlotsPerDay
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
                        Math.min(
                            mergedConfig.normalMaxRooms,
                            Math.max(
                                1,
                                Math.ceil(
                                    normalizedRooms.length /
                                    2
                                )
                            )
                        ),

                    targetSlotsPerDay:
                        mergedConfig.normalSlotsPerDay
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
                        1,

                    targetSlotsPerDay:
                        mergedConfig.coldSlotsPerDay
                }
            }
        };
    }
}


module.exports = ShowtimeScheduler;