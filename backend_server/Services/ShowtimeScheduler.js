/**
 * ============================================================
 * SHOWTIME SCHEDULER V6 - PHÂN BỔ HỢP LÝ
 * ============================================================
 *
 * LOGIC PHÂN BỔ:
 * 
 * 1. PHIM HOT:
 *    - Tần suất: 30 phút/suất
 *    - Số phòng: Tất cả phòng
 *    - Số suất/ngày: Tối đa
 * 
 * 2. PHIM NORMAL:
 *    - Tần suất: 45 phút/suất
 *    - Số phòng: 50% số phòng (tối thiểu 1)
 *    - Số suất/ngày: Vừa phải (khoảng 8-12 suất)
 * 
 * 3. PHIM COLD:
 *    - Tần suất: 60 phút/suất
 *    - Số phòng: 1 phòng duy nhất
 *    - Số suất/ngày: Ít (khoảng 4-6 suất)
 *
 * ============================================================
 */

class ShowtimeScheduler {

    /* ========================================================
        DEFAULT CONFIG
    ======================================================== */

    static DEFAULT_CONFIG = {
        // Khung giờ
        weekdayStart: "08:00",
        weekdayEnd: "23:30",
        weekendStart: "08:00",
        weekendEnd: "24:00",

        // Buffer giữa các suất (phút)
        bufferMinutes: 15,

        // Tần suất theo độ hot
        hotInterval: 30,
        normalInterval: 45,
        coldInterval: 60,

        // Số phòng tối đa cho từng loại
        hotMaxRooms: 999,
        normalMaxRooms: 2,
        coldMaxRooms: 1,

        // Số suất tối thiểu/tối đa mỗi ngày
        minSlotsPerDay: 3,
        maxSlotsPerDay: 20,

        // Ngưỡng xác định độ hot
        hotThreshold: 100,
        normalThreshold: 50
    };


    /* ========================================================
        DATE HELPERS
    ======================================================== */

    static parseDate(date) {
        if (!date) throw new Error("Thiếu ngày.");
        const value = String(date).trim();
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) throw new Error(`Ngày không hợp lệ: ${date}`);

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const result = new Date(Date.UTC(year, month - 1, day));
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
        result.setUTCDate(result.getUTCDate() + days);
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
        if (time === "24:00") return 24 * 60;
        const [hour, minute] = String(time).split(":").map(Number);
        return hour * 60 + minute;
    }

    static minutesToTime(totalMinutes) {
        if (totalMinutes === 24 * 60) return "24:00";
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    static buildDateTime(date, minutes) {
        return `${date} ${this.minutesToTime(minutes)}`;
    }


    /* ========================================================
        LẤY KHUNG GIỜ THEO NGÀY
    ======================================================== */

    static getTimeRangeForDate(date, config) {
        const isWeekend = this.isWeekend(date);
        const startTime = isWeekend ? config.weekendStart : config.weekdayStart;
        const endTime = isWeekend ? config.weekendEnd : config.weekdayEnd;

        return {
            startTime,
            endTime,
            startMinutes: this.timeToMinutes(startTime),
            endMinutes: this.timeToMinutes(endTime),
            isWeekend
        };
    }


    /* ========================================================
        XÁC ĐỊNH ĐỘ HOT CỦA PHIM
    ======================================================== */

    static getMovieHotLevel(movie, stats = {}) {
        const ticketSold = stats[movie.movie_id]?.ticketSold || 0;
        const viewCount = stats[movie.movie_id]?.viewCount || 0;
        const rating = stats[movie.movie_id]?.rating || 0;

        let hotScore = 0;
        hotScore += ticketSold * 0.5;
        hotScore += viewCount * 0.3;
        hotScore += rating * 10;

        if (hotScore >= this.DEFAULT_CONFIG.hotThreshold) {
            return "hot";
        } else if (hotScore >= this.DEFAULT_CONFIG.normalThreshold) {
            return "normal";
        } else {
            return "cold";
        }
    }


    /* ========================================================
        LẤY INTERVAL THEO ĐỘ HOT
    ======================================================== */

    static getInterval(movie, stats = {}) {
        const hotLevel = this.getMovieHotLevel(movie, stats);
        switch (hotLevel) {
            case "hot": return this.DEFAULT_CONFIG.hotInterval;
            case "normal": return this.DEFAULT_CONFIG.normalInterval;
            case "cold": return this.DEFAULT_CONFIG.coldInterval;
            default: return this.DEFAULT_CONFIG.normalInterval;
        }
    }


    /* ========================================================
        LẤY SỐ PHÒNG TỐI ĐA CHO TỪNG LOẠI PHIM
    ======================================================== */

    static getMaxRoomsForMovie(movie, stats = {}, totalRooms = 1) {
        const hotLevel = this.getMovieHotLevel(movie, stats);
        switch (hotLevel) {
            case "hot":
                return Math.min(totalRooms, this.DEFAULT_CONFIG.hotMaxRooms);
            case "normal":
                return Math.min(
                    Math.max(1, Math.ceil(totalRooms / 2)),
                    this.DEFAULT_CONFIG.normalMaxRooms
                );
            case "cold":
                return 1;
            default:
                return 1;
        }
    }


    /* ========================================================
        TÍNH SỐ SUẤT HỢP LÝ CHO 1 PHIM TRONG 1 NGÀY
    ======================================================== */

    static calculateOptimalSlotsPerDay(date, movie, config) {
        const timeRange = this.getTimeRangeForDate(date, config);
        const duration = movie.duration;
        const interval = this.getInterval(movie);
        const buffer = config.bufferMinutes;

        const availableMinutes = timeRange.endMinutes - timeRange.startMinutes;
        const slotDuration = duration + buffer;
        const maxSlots = Math.floor(availableMinutes / slotDuration);

        let optimalSlots;
        const hotLevel = this.getMovieHotLevel(movie);

        switch (hotLevel) {
            case "hot":
                optimalSlots = Math.min(maxSlots, 15);
                break;
            case "normal":
                optimalSlots = Math.min(Math.max(6, Math.floor(maxSlots * 0.5)), 12);
                break;
            case "cold":
                optimalSlots = Math.min(Math.max(3, Math.floor(maxSlots * 0.3)), 6);
                break;
            default:
                optimalSlots = Math.min(maxSlots, 8);
        }

        return Math.max(3, Math.min(optimalSlots, config.maxSlotsPerDay));
    }


    /* ========================================================
        TẠO SUẤT CHIẾU CHO 1 PHIM - PHÂN BỔ HỢP LÝ
    ======================================================== */

    static generateSlotsForMovie({
        date,
        movie,
        rooms,
        existingShowtimes = [],
        scheduledSlots = [],
        config
    }) {
        const timeRange = this.getTimeRangeForDate(date, config);
        const duration = movie.duration;
        const interval = this.getInterval(movie);
        const buffer = config.bufferMinutes;

        const slots = [];

        const allExisting = [
            ...existingShowtimes.filter(s => s.date === date),
            ...scheduledSlots.filter(s => s.date === date)
        ];

        const movieSlotsToday = allExisting.filter(
            s => s.movie_id === movie.movie_id
        ).length;

        const targetSlots = this.calculateOptimalSlotsPerDay(date, movie, config);

        if (movieSlotsToday >= targetSlots) {
            return slots;
        }

        const maxRooms = this.getMaxRoomsForMovie(movie, {}, rooms.length);
        const allowedRooms = rooms.slice(0, maxRooms);

        let currentTime;
        const lastSlot = allExisting
            .filter(s => s.movie_id === movie.movie_id)
            .sort((a, b) => b.startMinutes - a.startMinutes)[0];

        if (lastSlot) {
            currentTime = lastSlot.startMinutes + duration + buffer;
        } else {
            currentTime = Math.max(
                timeRange.startMinutes,
                this.timeToMinutes("08:00")
            );
        }

        let createdSlots = 0;
        let roomIndex = 0;

        while (
            currentTime + duration <= timeRange.endMinutes &&
            createdSlots < targetSlots - movieSlotsToday
        ) {
            const end = currentTime + duration;

            const room = allowedRooms[roomIndex % allowedRooms.length];
            const roomId = room.room_id;

            const isConflict = allExisting.some(existing => {
                if (existing.room_id !== roomId) return false;
                const existingStart = existing.startMinutes;
                const existingEnd = existing.startMinutes + existing.duration;
                return (currentTime < existingEnd && end > existingStart);
            });

            if (!isConflict) {
                slots.push({
                    room_id: roomId,
                    date: date,
                    movie_id: movie.movie_id,
                    start_time: this.buildDateTime(date, currentTime),
                    end_time: this.buildDateTime(date, end),
                    startMinutes: currentTime,
                    endMinutes: end,
                    duration: duration,
                    title: movie.title,
                    hotLevel: this.getMovieHotLevel(movie)
                });

                createdSlots++;
                roomIndex++;
            }

            currentTime += interval;
        }

        return slots;
    }


    /* ========================================================
        MAIN - TẠO LỊCH CHO TẤT CẢ PHIM
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
        // VALIDATE
        if (!movies || movies.length === 0) {
            throw new Error("Phải có ít nhất một phim.");
        }

        if (!rooms || rooms.length === 0) {
            throw new Error("Phải có ít nhất một phòng.");
        }

        if (!startDate || !endDate) {
            throw new Error("Thiếu ngày.");
        }

        const fromDate = this.parseDate(startDate);
        const toDate = this.parseDate(endDate);
        if (fromDate > toDate) {
            throw new Error("Ngày bắt đầu phải <= ngày kết thúc.");
        }

        // MERGE CONFIG
        const mergedConfig = {
            ...this.DEFAULT_CONFIG,
            ...config
        };

        // CHUẨN HÓA
        for (const movie of movies) {
            movie.duration = Number.parseInt(movie.duration, 10);
            if (!Number.isFinite(movie.duration) || movie.duration <= 0) {
                throw new Error(`Thời lượng phim "${movie.title}" không hợp lệ.`);
            }
        }

        for (const room of rooms) {
            room.room_id = Number.parseInt(room.room_id, 10);
            if (!Number.isInteger(room.room_id) || room.room_id <= 0) {
                throw new Error(`ID phòng không hợp lệ: ${room.room_id}`);
            }
        }

        // SẮP XẾP PHIM THEO ĐỘ HOT
        const sortedMovies = [...movies].sort((a, b) => {
            const hotA = this.getMovieHotLevel(a, movieStats);
            const hotB = this.getMovieHotLevel(b, movieStats);
            const priority = { hot: 3, normal: 2, cold: 1 };
            return priority[hotB] - priority[hotA];
        });

        // TẠO LỊCH
        const allResults = [];
        const dateList = [];

        let currentDate = this.parseDate(startDate);
        while (currentDate <= toDate) {
            dateList.push(this.formatDate(currentDate));
            currentDate = this.addDays(currentDate, 1);
        }

        for (const date of dateList) {
            const scheduledSlots = [];

            for (const movie of sortedMovies) {
                const slots = this.generateSlotsForMovie({
                    date,
                    movie,
                    rooms,
                    existingShowtimes,
                    scheduledSlots,
                    config: mergedConfig
                });

                for (const slot of slots) {
                    allResults.push(slot);
                    scheduledSlots.push(slot);
                }
            }
        }

        // SẮP XẾP THEO THỜI GIAN
        allResults.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            if (a.room_id !== b.room_id) return a.room_id - b.room_id;
            return a.startMinutes - b.startMinutes;
        });

        // THỐNG KÊ
        const stats = {
            totalMovies: movies.length,
            totalRooms: rooms.length,
            totalDays: dateList.length,
            totalGenerated: allResults.length,

            byMovie: {},
            byRoom: {},
            byDate: {},
            byHotLevel: {
                hot: { count: 0, movies: [] },
                normal: { count: 0, movies: [] },
                cold: { count: 0, movies: [] }
            },
            summary: {
                hot: { totalSlots: 0, avgPerDay: 0, avgPerMovie: 0 },
                normal: { totalSlots: 0, avgPerDay: 0, avgPerMovie: 0 },
                cold: { totalSlots: 0, avgPerDay: 0, avgPerMovie: 0 }
            }
        };

        for (const movie of movies) {
            const count = allResults.filter(s => s.movie_id === movie.movie_id).length;
            const hotLevel = this.getMovieHotLevel(movie, movieStats);
            
            stats.byMovie[movie.movie_id] = {
                title: movie.title,
                count,
                hotLevel,
                avgPerDay: (count / dateList.length).toFixed(1)
            };

            stats.byHotLevel[hotLevel].count += count;
            stats.byHotLevel[hotLevel].movies.push(movie.title);
            stats.summary[hotLevel].totalSlots += count;
        }

        for (const room of rooms) {
            const count = allResults.filter(s => s.room_id === room.room_id).length;
            stats.byRoom[room.room_id] = {
                name: room.room_name || `Phòng ${room.room_id}`,
                count,
                avgPerDay: (count / dateList.length).toFixed(1)
            };
        }

        for (const date of dateList) {
            const count = allResults.filter(s => s.date === date).length;
            stats.byDate[date] = count;
        }

        for (const level of ['hot', 'normal', 'cold']) {
            const movieCount = movies.filter(m => this.getMovieHotLevel(m, movieStats) === level).length;
            stats.summary[level].avgPerMovie = movieCount > 0 
                ? (stats.summary[level].totalSlots / movieCount).toFixed(1) 
                : 0;
            stats.summary[level].avgPerDay = dateList.length > 0
                ? (stats.summary[level].totalSlots / dateList.length).toFixed(1)
                : 0;
        }

        // RETURN
        return {
            data: allResults,
            stats,
            config: mergedConfig,
            dateRange: {
                startDate,
                endDate,
                totalDays: dateList.length
            },
            distribution: {
                hot: {
                    movies: movies.filter(m => this.getMovieHotLevel(m, movieStats) === 'hot').map(m => m.title),
                    interval: mergedConfig.hotInterval,
                    maxRooms: this.getMaxRoomsForMovie({}, {}, rooms.length),
                    targetSlotsPerDay: 12
                },
                normal: {
                    movies: movies.filter(m => this.getMovieHotLevel(m, movieStats) === 'normal').map(m => m.title),
                    interval: mergedConfig.normalInterval,
                    maxRooms: Math.min(2, Math.ceil(rooms.length / 2)),
                    targetSlotsPerDay: 8
                },
                cold: {
                    movies: movies.filter(m => this.getMovieHotLevel(m, movieStats) === 'cold').map(m => m.title),
                    interval: mergedConfig.coldInterval,
                    maxRooms: 1,
                    targetSlotsPerDay: 4
                }
            }
        };
    }
}

module.exports = ShowtimeScheduler;