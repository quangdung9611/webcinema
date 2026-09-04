const ShowtimeRepository = require("../Repositories/ShowtimeRepository");

// ==========================================================
// CONSTANTS
// ==========================================================

const ALLOWED_ROOM_TYPES = ["2D", "3D", "VIP", "IMAX"];
const ALLOWED_DISTRIBUTIONS = ["hot", "normal", "cold"];

// ==========================================================
// TIME SLOT LABELS
// ==========================================================

const TIME_SLOT_LABELS = {
    MORNING: "Sáng (6h-12h)",
    AFTERNOON: "Chiều (12h-17h)",
    EVENING: "Tối (17h-20h)",
    NIGHT: "Đêm (20h-24h)"
};

// ==========================================================
// DAY TYPE LABELS
// ==========================================================

const DAY_TYPE_LABELS = {
    WEEKDAY: "Ngày thường (T2-T6)",
    WEEKEND: "Cuối tuần (T7-CN)"
};

// ==========================================================
// AUTO SCHEDULER CONFIG
// ==========================================================

const SCHEDULER_CONFIG = {
    weekdayStart: "08:00",
    weekdayEnd: "23:30",
    weekendStart: "08:00",
    weekendEnd: "24:00",
    bufferMinutes: 15,
    hotInterval: 45,
    normalInterval: 75,
    coldInterval: 120,
    hotThreshold: 100,
    normalThreshold: 50
};

// ==========================================================
// CẤU HÌNH PHÂN BỔ PHÒNG THEO PHẦN TRĂM (FULL 3 MỨC)
// ==========================================================

const ROOM_ALLOCATION_PERCENTAGE = {
    hot: {
        roomTypes: ['2D', '3D', 'VIP', 'IMAX'],
        percentage: {
            '2D': 0.40,
            '3D': 0.30,
            'VIP': 0.20,
            'IMAX': 0.10
        }
    },
    normal: {
        roomTypes: ['2D', '3D'],
        percentage: {
            '2D': 0.60,
            '3D': 0.40
        }
    },
    cold: {
        roomTypes: ['2D'],
        percentage: {
            '2D': 0.50
        }
    }
};

// ==========================================================
// FORMAT DATETIME
// ==========================================================

const formatDateTime = (dateTime) => {
    if (!dateTime) return null;
    return String(dateTime).replace("T", " ").substring(0, 16);
};

// ==========================================================
// TIME SLOT
// ==========================================================

const getTimeSlot = (startTime) => {
    if (!startTime) return "MORNING";
    const hour = parseInt(String(startTime).split(":")[0], 10);
    if (hour >= 6 && hour < 12) return "MORNING";
    if (hour >= 12 && hour < 17) return "AFTERNOON";
    if (hour >= 17 && hour < 20) return "EVENING";
    return "NIGHT";
};

// ==========================================================
// DAY TYPE
// ==========================================================

const getDayType = (date) => {
    if (!date) return "WEEKDAY";
    const dayOfWeek = new Date(date).getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? "WEEKEND" : "WEEKDAY";
};

// ==========================================================
// NORMALIZE ROOM TYPES
// ==========================================================

const normalizeRoomTypes = (roomTypes) => {
    if (!Array.isArray(roomTypes)) return [];
    return [...new Set(
        roomTypes
            .map(type => String(type).trim().toUpperCase())
            .filter(type => ALLOWED_ROOM_TYPES.includes(type))
    )];
};

// ==========================================================
// VALIDATE SHOWTIME
// ==========================================================

const validateShowtime = (data) => {
    const { movie_id, cinema_id, room_id, start_time } = data;
    if (!movie_id || !cinema_id || !room_id || !start_time) {
        return "Vui lòng chọn đầy đủ: Phim, Rạp, Phòng và Thời gian chiếu";
    }
    return null;
};

// ==========================================================
// DATE HELPERS
// ==========================================================

const parseDate = (date) => {
    if (!date) throw new Error("Thiếu ngày.");
    const value = String(date).trim();
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error(`Ngày không hợp lệ: ${date}`);
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const result = new Date(Date.UTC(year, month - 1, day));
    if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 || result.getUTCDate() !== day) {
        throw new Error(`Ngày không hợp lệ: ${date}`);
    }
    return result;
};

const formatDate = (date) => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
};

const isWeekend = (date) => {
    const day = new Date(date).getUTCDay();
    return day === 0 || day === 6;
};

// ==========================================================
// TIME TO MINUTES
// ==========================================================

const timeToMinutes = (time) => {
    if (time === "24:00") return 24 * 60;
    const parts = String(time).split(":").map(Number);
    const hour = parts[0], minute = parts[1];
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Giờ không hợp lệ: ${time}`);
    }
    return hour * 60 + minute;
};

const minutesToTime = (totalMinutes) => {
    if (totalMinutes === 24 * 60) return "24:00";
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const buildDateTime = (date, minutes) => {
    if (minutes >= 24 * 60) {
        const overflow = minutes - 24 * 60;
        const nextDate = addDays(parseDate(date), 1);
        return `${formatDate(nextDate)} ${minutesToTime(overflow)}`;
    }
    return `${date} ${minutesToTime(minutes)}`;
};

// ==========================================================
// GET TIME RANGE
// ==========================================================

const getTimeRangeForDate = (date, config) => {
    const weekend = isWeekend(date);
    const startTime = weekend ? config.weekendStart : config.weekdayStart;
    const endTime = weekend ? config.weekendEnd : config.weekdayEnd;
    return {
        startTime,
        endTime,
        startMinutes: timeToMinutes(startTime),
        endMinutes: timeToMinutes(endTime),
        isWeekend: weekend
    };
};

// ==========================================================
// MOVIE HOT LEVEL - GIỮ NGUYÊN LOGIC CŨ
// ==========================================================

const getMovieHotLevel = (movie, stats = {}, config = SCHEDULER_CONFIG) => {
    if (movie && movie.distribution && ALLOWED_DISTRIBUTIONS.includes(String(movie.distribution).toLowerCase())) {
        return String(movie.distribution).toLowerCase();
    }

    const movieId = movie?.movie_id;
    const movieStats = stats?.[movieId] || {};
    const ticketSold = Number(movieStats.ticketSold || 0);
    const viewCount = Number(movieStats.viewCount || 0);
    const rating = Number(movieStats.rating || 0);

    let hotScore = 0;
    hotScore += ticketSold * 0.5;
    hotScore += viewCount * 0.3;
    hotScore += rating * 10;

    if (hotScore >= config.hotThreshold) return "hot";
    if (hotScore >= config.normalThreshold) return "normal";
    return "cold";
};

// ==========================================================
// GET INTERVAL - GIỮ NGUYÊN
// ==========================================================

const getInterval = (movie, stats = {}, config = SCHEDULER_CONFIG) => {
    const level = getMovieHotLevel(movie, stats, config);
    switch (level) {
        case "hot": return 45;
        case "normal": return 75;
        case "cold": return 120;
        default: return 75;
    }
};

// ==========================================================
// TÍNH ĐIỂM HOT
// ==========================================================

const calculateHotScore = (movie, stats = {}) => {
    const movieStats = stats?.[movie.movie_id] || {};
    const ticketSold = Number(movieStats.ticketSold || 0);
    const viewCount = Number(movieStats.viewCount || 0);
    const rating = Number(movieStats.rating || 0);
    return ticketSold * 0.5 + viewCount * 0.3 + rating * 10;
};

// ==========================================================
// PHÂN BỔ PHÒNG THEO PHẦN TRĂM
// ==========================================================

const allocateRoomsByPercentage = (movies, rooms, stats = {}) => {
    const roomsByType = {};
    for (const room of rooms) {
        const type = String(room.room_type || '').trim().toUpperCase();
        if (!roomsByType[type]) roomsByType[type] = [];
        roomsByType[type].push(room);
    }

    console.log('📋 SỐ LƯỢNG PHÒNG THEO HẠNG:');
    for (const [type, list] of Object.entries(roomsByType)) {
        console.log(`  ${type}: ${list.length} phòng`);
    }

    const scoredMovies = movies.map(movie => {
        const level = getMovieHotLevel(movie, stats);
        return {
            ...movie,
            level,
            hotScore: calculateHotScore(movie, stats)
        };
    });

    scoredMovies.sort((a, b) => b.hotScore - a.hotScore);

    const allocated = scoredMovies.map(movie => {
        const config = ROOM_ALLOCATION_PERCENTAGE[movie.level] || ROOM_ALLOCATION_PERCENTAGE.normal;
        const allowedTypes = config.roomTypes;
        const percentages = config.percentage || {};

        let totalRoomsAllocated = 0;
        const roomAllocation = {};

        for (const type of allowedTypes) {
            const availableRooms = roomsByType[type] || [];
            const percent = percentages[type] || 0.3;
            
            let allocatedCount = Math.round(availableRooms.length * percent);
            if (allocatedCount === 0 && availableRooms.length > 0 && percent > 0) {
                allocatedCount = 1;
            }
            
            roomAllocation[type] = {
                count: allocatedCount,
                rooms: availableRooms.slice(0, allocatedCount)
            };
            totalRoomsAllocated += allocatedCount;
        }

        return {
            ...movie,
            allocatedRooms: totalRoomsAllocated,
            roomAllocation: roomAllocation,
            allowedTypes: allowedTypes
        };
    });

    console.log('📊 PHÂN BỔ PHÒNG THEO PHẦN TRĂM:');
    for (const movie of allocated) {
        console.log(`  🔹 ${movie.title} (${movie.level.toUpperCase()}) - ${movie.allocatedRooms} phòng:`);
        for (const [type, data] of Object.entries(movie.roomAllocation)) {
            if (data.count > 0) {
                const total = roomsByType[type]?.length || 0;
                const percent = total > 0 ? Math.round((data.count / total) * 100) : 0;
                console.log(`      ${type}: ${data.count}/${total} phòng (${percent}%)`);
            }
        }
        if (movie.allocatedRooms === 0) {
            console.log(`      ⚠️ Không có phòng nào được phân bổ!`);
        }
    }

    return allocated;
};

// ==========================================================
// NORMALIZE SHOWTIME
// ==========================================================

const normalizeShowtime = (showtime) => {
    if (!showtime) return null;
    let date = showtime.date || null;
    let startMinutes = Number(showtime.startMinutes);
    let duration = Number(showtime.duration);

    if (!Number.isFinite(startMinutes) && showtime.start_time) {
        const raw = String(showtime.start_time).replace("T", " ");
        const parts = raw.split(" ");
        if (!date && parts[0]) date = parts[0];
        const time = parts[1] || "00:00";
        startMinutes = timeToMinutes(time.substring(0, 5));
    }

    if (!Number.isFinite(duration)) duration = Number(showtime.movie_duration);
    if (!Number.isFinite(duration)) duration = 0;

    return {
        ...showtime,
        date,
        room_id: Number(showtime.room_id),
        movie_id: Number(showtime.movie_id),
        startMinutes,
        duration
    };
};

// ==========================================================
// ROOM CONFLICT
// ==========================================================

const hasRoomConflict = ({ roomId, startMinutes, endMinutes, existingShowtimes = [], bufferMinutes = 15 }) => {
    return existingShowtimes.some(existingRaw => {
        const existing = normalizeShowtime(existingRaw);
        if (!existing) return false;
        if (Number(existing.room_id) !== Number(roomId)) return false;
        if (!Number.isFinite(existing.startMinutes)) return false;
        const existingStart = existing.startMinutes;
        const existingEnd = existingStart + existing.duration + Number(bufferMinutes || 0);
        return startMinutes < existingEnd && endMinutes > existingStart;
    });
};

// ==========================================================
// FIND AVAILABLE ROOM
// ==========================================================

const findAvailableRoom = ({ rooms, roomStartIndex = 0, startMinutes, endMinutes, existingShowtimes = [], bufferMinutes = 15 }) => {
    if (!Array.isArray(rooms) || rooms.length === 0) return null;
    const totalRooms = rooms.length;

    for (let offset = 0; offset < totalRooms; offset++) {
        const index = (roomStartIndex + offset) % totalRooms;
        const room = rooms[index];
        const roomId = Number(room.room_id);

        if (!Number.isInteger(roomId) || roomId <= 0) continue;

        const conflict = hasRoomConflict({
            roomId,
            startMinutes,
            endMinutes,
            existingShowtimes,
            bufferMinutes
        });

        if (!conflict) {
            return { room, index };
        }
    }
    return null;
};

// ==========================================================
// FILTER ROOMS BY TYPE
// ==========================================================

const filterRoomsByType = (rooms, roomTypes = []) => {
    if (!Array.isArray(rooms)) return [];
    if (!Array.isArray(roomTypes) || roomTypes.length === 0) {
        return rooms.filter(room => Number.isInteger(Number(room.room_id)));
    }

    const normalizedTypes = normalizeRoomTypes(roomTypes);
    return rooms.filter(room => {
        const roomType = String(room.room_type || "").trim().toUpperCase();
        return normalizedTypes.includes(roomType) && Number.isInteger(Number(room.room_id));
    });
};

// ==========================================================
// GENERATE SLOTS FOR ONE MOVIE / ONE DAY
// ==========================================================

const generateSlotsForMovie = ({ date, movie, rooms, roomTypes = [], existingShowtimes = [], scheduledSlots = [], config = {}, movieStats = {}, maxRoomsPerMovie = 4 }) => {
    const mergedConfig = { ...SCHEDULER_CONFIG, ...config };
    const timeRange = getTimeRangeForDate(date, mergedConfig);
    const duration = Number(movie.duration);
    if (!Number.isFinite(duration) || duration <= 0) return [];

    const interval = getInterval(movie, movieStats, mergedConfig);
    const buffer = Number(mergedConfig.bufferMinutes) || 15;

    let allowedRooms = filterRoomsByType(rooms, roomTypes);
    if (allowedRooms.length === 0) return [];

    // Giới hạn số phòng cho phim này
    const movieRooms = allowedRooms.slice(0, maxRoomsPerMovie);

    const allExisting = [...existingShowtimes, ...scheduledSlots].map(item => normalizeShowtime(item)).filter(Boolean);
    const existingToday = allExisting.filter(item => item.date === date);

    let currentTime = timeRange.startMinutes;
    const slots = [];
    let roomStartIndex = 0;
    let safetyCounter = 0;
    const maxIterations = Math.ceil((timeRange.endMinutes - timeRange.startMinutes) / Math.max(interval, 1)) + 20;

    while (currentTime + duration <= timeRange.endMinutes && safetyCounter < maxIterations) {
        safetyCounter++;
        const endMinutes = currentTime + duration;

        const availableRoom = findAvailableRoom({
            rooms: movieRooms,
            roomStartIndex,
            startMinutes: currentTime,
            endMinutes,
            existingShowtimes: allExisting,
            bufferMinutes: buffer
        });

        if (availableRoom) {
            const room = availableRoom.room;
            const roomId = Number(room.room_id);
            const slot = {
                room_id: roomId,
                room_name: room.room_name || null,
                room_type: room.room_type || null,
                date,
                movie_id: Number(movie.movie_id),
                start_time: buildDateTime(date, currentTime),
                end_time: buildDateTime(date, endMinutes),
                startMinutes: currentTime,
                endMinutes,
                duration,
                title: movie.title,
                hotLevel: getMovieHotLevel(movie, movieStats, mergedConfig)
            };

            slots.push(slot);
            allExisting.push(normalizeShowtime(slot));
            roomStartIndex = (availableRoom.index + 1) % movieRooms.length;
        }

        currentTime += interval;
    }

    return slots;
};

// ==========================================================
// AUTO SCHEDULER MAIN - ĐÃ SỬA LỖI LẤY PHÒNG 🆕
// ==========================================================

const generateSchedule = ({ movies = [], rooms = [], startDate, endDate, config = {}, movieStats = {}, existingShowtimes = [], roomTypes = [] }) => {
    if (!Array.isArray(movies) || movies.length === 0) throw new Error("Phải có ít nhất một phim.");
    if (!Array.isArray(rooms) || rooms.length === 0) throw new Error("Phải có ít nhất một phòng.");
    if (!startDate || !endDate) throw new Error("Thiếu ngày.");

    const fromDate = parseDate(startDate);
    const toDate = parseDate(endDate);
    if (fromDate > toDate) throw new Error("Ngày bắt đầu phải <= ngày kết thúc.");

    const mergedConfig = { ...SCHEDULER_CONFIG, ...config };
    mergedConfig.bufferMinutes = Number(mergedConfig.bufferMinutes) || 15;

    const normalizedMovies = movies.map(movie => {
        const normalized = { ...movie };
        normalized.movie_id = Number(normalized.movie_id);
        normalized.duration = Number.parseInt(normalized.duration, 10);
        if (!Number.isInteger(normalized.movie_id) || normalized.movie_id <= 0) {
            throw new Error(`ID phim không hợp lệ: ${movie.movie_id}`);
        }
        if (!Number.isFinite(normalized.duration) || normalized.duration <= 0) {
            throw new Error(`Thời lượng phim "${movie.title}" không hợp lệ.`);
        }
        return normalized;
    });

    const normalizedRooms = rooms.map(room => {
        const normalized = { ...room };
        normalized.room_id = Number(normalized.room_id);
        if (!Number.isInteger(normalized.room_id) || normalized.room_id <= 0) {
            throw new Error(`ID phòng không hợp lệ: ${room.room_id}`);
        }
        normalized.room_type = normalized.room_type ? String(normalized.room_type).trim().toUpperCase() : null;
        return normalized;
    });

    const normalizedRoomTypes = normalizeRoomTypes(roomTypes);
    const eligibleRooms = filterRoomsByType(normalizedRooms, normalizedRoomTypes);

    if (eligibleRooms.length === 0) {
        throw new Error(
            normalizedRoomTypes.length > 0
                ? `Không có phòng thuộc loại: ${normalizedRoomTypes.join(", ")}`
                : "Không có phòng chiếu hợp lệ."
        );
    }

    // 🔥 PHÂN BỔ PHÒNG THEO PHẦN TRĂM
    const allocation = allocateRoomsByPercentage(normalizedMovies, eligibleRooms, movieStats);
    
    // Tạo map để tra cứu nhanh
    const allocationMap = {};
    for (const item of allocation) {
        allocationMap[item.movie_id] = item;
    }

    // Sắp xếp phim theo điểm HOT
    const sortedMovies = [...normalizedMovies].sort((a, b) => {
        const scoreA = calculateHotScore(a, movieStats);
        const scoreB = calculateHotScore(b, movieStats);
        return scoreB - scoreA;
    });

    // Date list
    const dateList = [];
    let currentDate = parseDate(startDate);
    while (currentDate <= toDate) {
        dateList.push(formatDate(currentDate));
        currentDate = addDays(currentDate, 1);
    }

    // Generate
    const allResults = [];

    for (const date of dateList) {
        const scheduledSlots = [];

        for (const movie of sortedMovies) {
            const movieId = movie.movie_id;
            const alloc = allocationMap[movieId];
            
            // 🔥 Lấy danh sách phòng từ phân bổ chi tiết (THEO HẠNG)
            let movieRooms = [];
            if (alloc && alloc.roomAllocation) {
                for (const [type, data] of Object.entries(alloc.roomAllocation)) {
                    if (data.rooms && data.rooms.length > 0) {
                        movieRooms.push(...data.rooms);
                    }
                }
            }
            
            // Nếu không có phòng nào được phân bổ, bỏ qua
            if (movieRooms.length === 0) {
                console.warn(`⚠️ ${movie.title}: không có phòng nào được phân bổ!`);
                continue;
            }

            const slots = generateSlotsForMovie({
                date,
                movie,
                rooms: movieRooms, // 👈 ĐÃ SỬA: truyền danh sách phòng từ phân bổ
                roomTypes: normalizedRoomTypes,
                existingShowtimes,
                scheduledSlots,
                config: mergedConfig,
                movieStats,
                maxRoomsPerMovie: movieRooms.length
            });

            for (const slot of slots) {
                allResults.push(slot);
                scheduledSlots.push(slot);
            }
        }
    }

    // Sort
    allResults.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
        return Number(a.room_id) - Number(b.room_id);
    });

    // Stats
    const stats = {
        totalMovies: normalizedMovies.length,
        totalRooms: normalizedRooms.length,
        eligibleRooms: eligibleRooms.length,
        totalDays: dateList.length,
        totalGenerated: allResults.length,
        byMovie: {},
        byRoom: {},
        byDate: {},
        byHotLevel: { hot: { count: 0, movies: [] }, normal: { count: 0, movies: [] }, cold: { count: 0, movies: [] } },
        allocation: allocation.map(item => ({
            movie_id: item.movie_id,
            title: item.title,
            hotScore: item.hotScore,
            allocatedRooms: item.allocatedRooms,
            roomAllocation: item.roomAllocation
        }))
    };

    for (const movie of normalizedMovies) {
        const count = allResults.filter(slot => Number(slot.movie_id) === Number(movie.movie_id)).length;
        const hotLevel = getMovieHotLevel(movie, movieStats, mergedConfig);
        stats.byMovie[movie.movie_id] = {
            title: movie.title,
            count,
            hotLevel,
            avgPerDay: dateList.length > 0 ? (count / dateList.length).toFixed(1) : "0.0"
        };
        stats.byHotLevel[hotLevel].count += count;
        stats.byHotLevel[hotLevel].movies.push(movie.title);
    }

    for (const room of normalizedRooms) {
        const count = allResults.filter(slot => Number(slot.room_id) === Number(room.room_id)).length;
        stats.byRoom[room.room_id] = {
            name: room.room_name || `Phòng ${room.room_id}`,
            roomType: room.room_type || null,
            count,
            avgPerDay: dateList.length > 0 ? (count / dateList.length).toFixed(1) : "0.0"
        };
    }

    for (const date of dateList) {
        stats.byDate[date] = allResults.filter(slot => slot.date === date).length;
    }

    return {
        data: allResults,
        stats,
        config: mergedConfig,
        roomTypes: normalizedRoomTypes,
        eligibleRoomCount: eligibleRooms.length,
        dateRange: { startDate, endDate, totalDays: dateList.length },
        allocation: allocation
    };
};

// ==========================================================
// SERVICE CLASS
// ==========================================================

class ShowtimeService {

    async getAllShowtimesAll(search = "") {
        return await ShowtimeRepository.findAllAll(search);
    }

    async getAllShowtimesPaginated(page = 1, limit = 20, search = "") {
        return await ShowtimeRepository.findAll(page, limit, search);
    }

    async getShowtimesByCinemaAndRoom(cinema_id, room_id) {
        return await ShowtimeRepository.findByCinemaAndRoom(cinema_id, room_id);
    }

    async getShowtimeDetail(showtimeId) {
        const showtime = await ShowtimeRepository.findById(showtimeId);
        if (!showtime) {
            const err = new Error("Không tìm thấy suất chiếu");
            err.statusCode = 404;
            throw err;
        }
        return showtime;
    }

    async getShowtimesByMovie(movieId) {
        return await ShowtimeRepository.findByMovie(movieId);
    }

    async getShowtimesForMovieDetail(movieId, cinemaId, date) {
        const showtimes = await ShowtimeRepository.findByMovieCinemaDateForDetail(movieId, cinemaId, date);
        const enrichedShowtimes = showtimes.map(showtime => {
            const timeSlot = getTimeSlot(showtime.start_time);
            const dayType = getDayType(date);
            return {
                ...showtime,
                time_slot: timeSlot,
                time_slot_label: TIME_SLOT_LABELS[timeSlot] || timeSlot,
                day_type: dayType,
                day_type_label: DAY_TYPE_LABELS[dayType] || dayType
            };
        });
        const grouped = enrichedShowtimes.reduce((acc, item) => {
            const key = item.room_type || "UNKNOWN";
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
        return grouped;
    }

    async createShowtime(data) {
        let { movie_id, cinema_id, room_id, start_time } = data;
        start_time = formatDateTime(start_time);
        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        const validationError = validateShowtime({ movie_id, cinema_id, room_id, start_time });
        if (validationError) {
            const err = new Error(validationError);
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

    async scheduleShowtimes(data) {
        if (!data) {
            const err = new Error("Dữ liệu tạo lịch chiếu không hợp lệ");
            err.statusCode = 400;
            throw err;
        }

        const { movie_id, cinema_id, room_types, roomTypes, room_ids, start_date, end_date, start_hour, end_hour, distribution } = data;

        const movieId = Number(movie_id);
        const cinemaId = Number(cinema_id);

        const requestedRoomTypes = Array.isArray(room_types) ? room_types : Array.isArray(roomTypes) ? roomTypes : [];
        const normalizedRoomTypes = normalizeRoomTypes(requestedRoomTypes);

        if (requestedRoomTypes.length > 0 && normalizedRoomTypes.length === 0) {
            const err = new Error("Loại phòng không hợp lệ. Chấp nhận: 2D, 3D, VIP, IMAX");
            err.statusCode = 400;
            err.field = "room_types";
            throw err;
        }

        if (!Number.isInteger(movieId) || movieId <= 0) {
            const err = new Error("Vui lòng chọn phim");
            err.statusCode = 400;
            err.field = "movie_id";
            throw err;
        }

        if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
            const err = new Error("Vui lòng chọn rạp");
            err.statusCode = 400;
            err.field = "cinema_id";
            throw err;
        }

        if (normalizedRoomTypes.length === 0) {
            const err = new Error("Vui lòng chọn ít nhất một loại phòng chiếu");
            err.statusCode = 400;
            err.field = "room_types";
            throw err;
        }

        if (!start_date) {
            const err = new Error("Vui lòng chọn ngày bắt đầu");
            err.statusCode = 400;
            err.field = "start_date";
            throw err;
        }

        if (!end_date) {
            const err = new Error("Vui lòng chọn ngày kết thúc");
            err.statusCode = 400;
            err.field = "end_date";
            throw err;
        }

        const startDate = parseDate(start_date);
        const endDate = parseDate(end_date);
        if (endDate < startDate) {
            const err = new Error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
            err.statusCode = 400;
            err.field = "end_date";
            throw err;
        }

        const scheduleStartHour = start_hour || "08:00";
        const scheduleEndHour = end_hour || "23:30";
        const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

        if (!timeRegex.test(scheduleStartHour)) {
            const err = new Error("Giờ bắt đầu không hợp lệ");
            err.statusCode = 400;
            err.field = "start_hour";
            throw err;
        }

        if (!timeRegex.test(scheduleEndHour)) {
            const err = new Error("Giờ kết thúc không hợp lệ");
            err.statusCode = 400;
            err.field = "end_hour";
            throw err;
        }

        const startMinutes = timeToMinutes(scheduleStartHour);
        const endMinutes = timeToMinutes(scheduleEndHour);
        if (endMinutes <= startMinutes) {
            const err = new Error("Giờ kết thúc phải lớn hơn giờ bắt đầu");
            err.statusCode = 400;
            err.field = "end_hour";
            throw err;
        }

        const scheduleDistribution = String(distribution || "normal").toLowerCase();
        if (!ALLOWED_DISTRIBUTIONS.includes(scheduleDistribution)) {
            const err = new Error("Mức độ phân bổ không hợp lệ. Chấp nhận: hot, normal, cold");
            err.statusCode = 400;
            err.field = "distribution";
            throw err;
        }

        const movie = await ShowtimeRepository.getMovieDuration(movieId);
        if (!movie) {
            const err = new Error("Không tìm thấy phim");
            err.statusCode = 404;
            err.field = "movie_id";
            throw err;
        }

        const duration = Number(movie.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
            const err = new Error("Thời lượng phim không hợp lệ");
            err.statusCode = 400;
            err.field = "movie_id";
            throw err;
        }

        let rooms = [];
        if (typeof ShowtimeRepository.findRoomsByCinema === "function") {
            rooms = await ShowtimeRepository.findRoomsByCinema(cinemaId);
        } else {
            if (Array.isArray(room_ids) && room_ids.length > 0) {
                const normalizedRoomIds = [...new Set(room_ids.map(Number).filter(id => Number.isInteger(id) && id > 0))];
                for (const roomId of normalizedRoomIds) {
                    const room = await ShowtimeRepository.findRoomInCinema(roomId, cinemaId);
                    if (room) {
                        rooms.push({
                            room_id: Number(room.room_id),
                            room_name: room.room_name,
                            room_type: String(room.room_type || "").trim().toUpperCase()
                        });
                    }
                }
            }
        }

        rooms = rooms.map(room => ({
            ...room,
            room_id: Number(room.room_id),
            room_type: String(room.room_type || "").trim().toUpperCase()
        })).filter(room => Number.isInteger(room.room_id) && room.room_id > 0);

        rooms = filterRoomsByType(rooms, normalizedRoomTypes);

        if (rooms.length === 0) {
            const err = new Error("Rạp không có phòng thuộc loại đã chọn: " + normalizedRoomTypes.join(", "));
            err.statusCode = 400;
            err.field = "room_types";
            throw err;
        }

        const schedulerRoomIds = rooms.map(room => Number(room.room_id));

        const existingShowtimes = await ShowtimeRepository.getExistingShowtimes({
            cinemaId,
            startDate: start_date,
            endDate: end_date,
            roomIds: schedulerRoomIds
        });

        const config = {
            ...SCHEDULER_CONFIG,
            weekdayStart: scheduleStartHour,
            weekdayEnd: scheduleEndHour,
            weekendStart: scheduleStartHour,
            weekendEnd: scheduleEndHour,
            bufferMinutes: 15,
            hotInterval: 45,
            normalInterval: 75,
            coldInterval: 120,
            roomTypes: normalizedRoomTypes
        };

        const moviesForScheduler = [{
            movie_id: movieId,
            title: movie.title || `Phim ${movieId}`,
            duration,
            distribution: scheduleDistribution,
            roomTypes: normalizedRoomTypes
        }];

        const generated = generateSchedule({
            movies: moviesForScheduler,
            rooms,
            roomTypes: normalizedRoomTypes,
            startDate: start_date,
            endDate: end_date,
            config,
            existingShowtimes,
            movieStats: {}
        });

        const created = [];
        const conflicts = [];
        const skippedPast = [];

        const timeSlotStats = {
            MORNING: { count: 0, slots: [] },
            AFTERNOON: { count: 0, slots: [] },
            EVENING: { count: 0, slots: [] },
            NIGHT: { count: 0, slots: [] }
        };

        const dayTypeStats = {
            WEEKDAY: { count: 0, slots: [] },
            WEEKEND: { count: 0, slots: [] }
        };

        for (const slot of generated.data) {
            const roomId = Number(slot.room_id);
            const slotStartTime = formatDateTime(slot.start_time);
            const slotEndTime = formatDateTime(slot.end_time);
            const date = slot.date;
            const timeSlot = getTimeSlot(slotStartTime?.split(" ")[1] || "09:00");
            const dayType = getDayType(date);
            const roomInfo = rooms.find(room => Number(room.room_id) === roomId);
            const roomType = slot.room_type || roomInfo?.room_type || null;

            if (!Number.isInteger(roomId) || roomId <= 0 || !slotStartTime) {
                conflicts.push({ ...slot, reason: "Suất chiếu không hợp lệ" });
                continue;
            }

            const isPast = await ShowtimeRepository.isPastTime(slotStartTime);
            if (isPast) {
                skippedPast.push({ ...slot, room_type: roomType, reason: "Suất chiếu nằm trong quá khứ" });
                continue;
            }

            const conflict = await ShowtimeRepository.findConflict(roomId, slotStartTime, slotEndTime);
            if (conflict) {
                conflicts.push({ ...slot, room_type: roomType, reason: "Phòng đã có suất chiếu bị trùng thời gian" });
                continue;
            }

            try {
                const showtimeId = await ShowtimeRepository.create({
                    movie_id: movieId,
                    cinema_id: cinemaId,
                    room_id: roomId,
                    start_time: slotStartTime
                });

                const createdSlot = {
                    showtime_id: showtimeId,
                    movie_id: movieId,
                    cinema_id: cinemaId,
                    room_id: roomId,
                    room_type: roomType,
                    start_time: slotStartTime,
                    end_time: slotEndTime,
                    duration,
                    time_slot: timeSlot,
                    time_slot_label: TIME_SLOT_LABELS[timeSlot],
                    day_type: dayType,
                    day_type_label: DAY_TYPE_LABELS[dayType]
                };

                created.push(createdSlot);
                if (timeSlotStats[timeSlot]) {
                    timeSlotStats[timeSlot].count++;
                    timeSlotStats[timeSlot].slots.push(createdSlot);
                }
                if (dayTypeStats[dayType]) {
                    dayTypeStats[dayType].count++;
                    dayTypeStats[dayType].slots.push(createdSlot);
                }

            } catch (error) {
                conflicts.push({ ...slot, room_type: roomType, reason: error.message || "Không thể tạo suất chiếu" });
            }
        }

        return {
            success: true,
            data: created,
            conflicts,
            skippedPast,
            summary: {
                movieId,
                cinemaId,
                roomCount: rooms.length,
                roomTypes: normalizedRoomTypes,
                roomIds: rooms.map(room => room.room_id),
                generatedCount: generated.data.length,
                createdCount: created.length,
                conflictCount: conflicts.length,
                skippedPastCount: skippedPast.length,
                duration,
                startDate: start_date,
                endDate: end_date,
                startTime: scheduleStartHour,
                endTime: scheduleEndHour,
                distribution: scheduleDistribution,
                byRoomType: created.reduce((acc, slot) => {
                    const type = slot.room_type || "UNKNOWN";
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {}),
                byTimeSlot: {
                    MORNING: timeSlotStats.MORNING.count,
                    AFTERNOON: timeSlotStats.AFTERNOON.count,
                    EVENING: timeSlotStats.EVENING.count,
                    NIGHT: timeSlotStats.NIGHT.count
                },
                byDayType: {
                    WEEKDAY: dayTypeStats.WEEKDAY.count,
                    WEEKEND: dayTypeStats.WEEKEND.count
                },
                allocation: generated.allocation || []
            },
            schedulerStats: generated.stats || null,
            schedulerDistribution: generated.distribution || null,
            roomTypes: normalizedRoomTypes
        };
    }

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

        const validationError = validateShowtime({ movie_id, cinema_id, room_id, start_time });
        if (validationError) {
            const err = new Error(validationError);
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

    async getShowtimesForBooking(movie_id, cinema_id, date) {
        if (!movie_id || !cinema_id || !date) {
            const err = new Error("Vui lòng chọn phim, rạp và ngày");
            err.statusCode = 400;
            throw err;
        }

        const showtimes = await ShowtimeRepository.getShowtimesForBooking(movie_id, cinema_id, date);
        return showtimes.map(showtime => {
            const timeSlot = getTimeSlot(showtime.start_time);
            const dayType = getDayType(date);
            return {
                ...showtime,
                time_slot: timeSlot,
                time_slot_label: TIME_SLOT_LABELS[timeSlot],
                day_type: dayType,
                day_type_label: DAY_TYPE_LABELS[dayType]
            };
        });
    }

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