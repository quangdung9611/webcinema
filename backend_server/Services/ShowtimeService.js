const ShowtimeRepository = require("../Repositories/ShowtimeRepository");

// ==========================================================
// CONSTANTS
// ==========================================================

const ALLOWED_ROOM_TYPES = ["2D", "3D", "VIP", "IMAX"];
const ALLOWED_DISTRIBUTIONS = ["hot", "normal", "cold"];

const TIME_SLOT_LABELS = {
    MORNING: "Sáng (6h-12h)",
    AFTERNOON: "Chiều (12h-17h)",
    EVENING: "Tối (17h-20h)",
    NIGHT: "Đêm (20h-24h)"
};

const DAY_TYPE_LABELS = {
    WEEKDAY: "Ngày thường (T2-T6)",
    WEEKEND: "Cuối tuần (T7-CN)"
};

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

const ROOM_ALLOCATION_PERCENTAGE = {
    hot: {
        roomTypes: ["2D", "3D", "VIP", "IMAX"],
        percentage: { "2D": 0.40, "3D": 0.30, "VIP": 0.20, "IMAX": 0.10 }
    },
    normal: {
        roomTypes: ["2D", "3D"],
        percentage: { "2D": 0.60, "3D": 0.40 }
    },
    cold: {
        roomTypes: ["2D"],
        percentage: { "2D": 0.50 }
    }
};

// ==========================================================
// HELPERS
// ==========================================================

const formatDateTime = (dateTime) => {
    if (!dateTime) return null;
    return String(dateTime).replace("T", " ").substring(0, 16);
};

const getTimeSlot = (startTime) => {
    if (!startTime) return "MORNING";
    const hour = parseInt(String(startTime).split(":")[0], 10);
    if (hour >= 6 && hour < 12) return "MORNING";
    if (hour >= 12 && hour < 17) return "AFTERNOON";
    if (hour >= 17 && hour < 20) return "EVENING";
    return "NIGHT";
};

const getDayType = (date) => {
    if (!date) return "WEEKDAY";
    const dayOfWeek = new Date(date).getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? "WEEKEND" : "WEEKDAY";
};

const normalizeRoomTypes = (roomTypes) => {
    if (!Array.isArray(roomTypes)) return [];
    return [...new Set(
        roomTypes
            .map(type => String(type).trim().toUpperCase())
            .filter(type => ALLOWED_ROOM_TYPES.includes(type))
    )];
};

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
    const result = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (result.getUTCFullYear() !== Number(match[1]) || result.getUTCMonth() !== Number(match[2]) - 1 || result.getUTCDate() !== Number(match[3])) {
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
// TIME HELPERS
// ==========================================================

const timeToMinutes = (time) => {
    if (time === "24:00") return 24 * 60;
    const [hour, minute] = String(time).split(":").map(Number);
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
// MOVIE HOT LEVEL
// ==========================================================

const getMovieHotLevel = (movie, stats = {}, config = SCHEDULER_CONFIG) => {
    if (movie && movie.distribution && ALLOWED_DISTRIBUTIONS.includes(String(movie.distribution).toLowerCase())) {
        return String(movie.distribution).toLowerCase();
    }
    const movieStats = stats?.[movie?.movie_id] || {};
    const hotScore = (movieStats.ticketSold || 0) * 0.5 + (movieStats.viewCount || 0) * 0.3 + (movieStats.rating || 0) * 10;
    if (hotScore >= config.hotThreshold) return "hot";
    if (hotScore >= config.normalThreshold) return "normal";
    return "cold";
};

const getInterval = (movie, stats = {}, config = SCHEDULER_CONFIG) => {
    const level = getMovieHotLevel(movie, stats, config);
    if (level === "hot") return config.hotInterval;
    if (level === "cold") return config.coldInterval;
    return config.normalInterval;
};

const calculateHotScore = (movie, stats = {}) => {
    const s = stats?.[movie.movie_id] || {};
    return (s.ticketSold || 0) * 0.5 + (s.viewCount || 0) * 0.3 + (s.rating || 0) * 10;
};

// ==========================================================
// ROOM HELPERS
// ==========================================================

const sortRoomsNaturally = (rooms) => {
    return [...rooms].sort((a, b) => {
        const nameA = String(a.room_name || a.room_id || "");
        const nameB = String(b.room_name || b.room_id || "");
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
    });
};

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
    if (!Number.isFinite(duration)) duration = Number(showtime.movie_duration) || 0;
    return { ...showtime, date, room_id: Number(showtime.room_id), movie_id: Number(showtime.movie_id), startMinutes, duration };
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
// ROOM POOLS
// ==========================================================

const buildRoomsByType = (rooms) => {
    const roomsByType = {};
    for (const room of rooms) {
        const type = String(room.room_type || "").trim().toUpperCase();
        if (!ALLOWED_ROOM_TYPES.includes(type)) continue;
        if (!roomsByType[type]) roomsByType[type] = [];
        roomsByType[type].push(room);
    }
    for (const type of Object.keys(roomsByType)) {
        roomsByType[type] = sortRoomsNaturally(roomsByType[type]);
    }
    return roomsByType;
};

// ==========================================================
// FIND NEXT ROOM INDEX
// ==========================================================

const getLastRoomIndexForRound = ({ pool, existingShowtimes = [], date, startMinutes }) => {
    if (!Array.isArray(pool) || pool.length === 0) return -1;
    const poolIds = pool.map(room => Number(room.room_id));
    const sameRound = existingShowtimes
        .map(item => normalizeShowtime(item))
        .filter(Boolean)
        .filter(item => item.date === date && Number(item.startMinutes) === Number(startMinutes));
    if (sameRound.length === 0) return -1;
    let lastIndex = -1;
    for (const item of sameRound) {
        const index = poolIds.indexOf(Number(item.room_id));
        if (index >= 0) lastIndex = Math.max(lastIndex, index);
    }
    return lastIndex;
};

// ==========================================================
// BUILD INITIAL ROOM CURSORS
// ==========================================================

const buildInitialRoomCursors = ({ roomsByType, existingShowtimes = [], date = null, startMinutes = null }) => {
    const cursors = {};
    for (const type of Object.keys(roomsByType)) {
        cursors[type] = 0;
        const pool = roomsByType[type];
        if (!Array.isArray(pool) || pool.length === 0) continue;
        if (date !== null && startMinutes !== null) {
            const sameRoundLastIndex = getLastRoomIndexForRound({ pool, existingShowtimes, date, startMinutes });
            if (sameRoundLastIndex >= 0) {
                cursors[type] = (sameRoundLastIndex + 1) % pool.length;
                continue;
            }
        }
        const poolIds = pool.map(room => Number(room.room_id));
        const normalizedExisting = existingShowtimes
            .map(item => normalizeShowtime(item))
            .filter(Boolean)
            .filter(item => item.date === date || date === null)
            .sort((a, b) => {
                if (Number(a.startMinutes) !== Number(b.startMinutes)) return Number(a.startMinutes) - Number(b.startMinutes);
                return Number(a.showtime_id || 0) - Number(b.showtime_id || 0);
            });
        let lastRoomId = null;
        for (let i = normalizedExisting.length - 1; i >= 0; i--) {
            const item = normalizedExisting[i];
            if (pool.some(room => Number(room.room_id) === Number(item.room_id))) {
                lastRoomId = Number(item.room_id);
                break;
            }
        }
        if (lastRoomId !== null) {
            const lastIndex = poolIds.indexOf(lastRoomId);
            if (lastIndex >= 0) {
                cursors[type] = (lastIndex + 1) % pool.length;
            }
        }
    }
    return cursors;
};

// ==========================================================
// BUILD ROOM SEARCH LIST
// ==========================================================

const buildRoomSearchList = ({ preferredRooms = [], poolRooms = [], roomStartIndex = 0 }) => {
    const preferred = Array.isArray(preferredRooms) ? preferredRooms : [];
    const pool = Array.isArray(poolRooms) ? poolRooms : [];
    if (pool.length === 0 && preferred.length === 0) return [];
    const normalizedPool = sortRoomsNaturally([
        ...new Map(
            [...pool, ...preferred]
                .map(room => [Number(room.room_id), room])
                .filter(([id]) => Number.isInteger(id) && id > 0)
        ).values()
    ]);
    if (normalizedPool.length === 0) return [];
    let startIndex = (Number(roomStartIndex) % normalizedPool.length + normalizedPool.length) % normalizedPool.length;
    const rotatedPool = [];
    for (let i = 0; i < normalizedPool.length; i++) {
        rotatedPool.push(normalizedPool[(startIndex + i) % normalizedPool.length]);
    }
    const preferredIds = new Set(preferred.map(room => Number(room.room_id)).filter(id => Number.isInteger(id) && id > 0));
    const result = [];
    for (const room of rotatedPool) {
        if (preferredIds.has(Number(room.room_id))) result.push(room);
    }
    for (const room of rotatedPool) {
        if (!preferredIds.has(Number(room.room_id))) result.push(room);
    }
    return result;
};

// ==========================================================
// FIND AVAILABLE ROOM
// ==========================================================

const findAvailableRoom = ({ preferredRooms = [], poolRooms = [], roomStartIndex = 0, startMinutes, endMinutes, existingShowtimes = [], bufferMinutes = 15 }) => {
    const searchRooms = buildRoomSearchList({ preferredRooms, poolRooms, roomStartIndex });
    if (searchRooms.length === 0) return null;
    for (let index = 0; index < searchRooms.length; index++) {
        const room = searchRooms[index];
        const roomId = Number(room.room_id);
        if (!Number.isInteger(roomId) || roomId <= 0) continue;
        if (!hasRoomConflict({ roomId, startMinutes, endMinutes, existingShowtimes, bufferMinutes })) {
            return { room, index, rooms: searchRooms };
        }
    }
    return null;
};

// ==========================================================
// CALCULATE PREFERRED ROOM COUNT
// ==========================================================

const calculatePreferredRoomCount = ({ poolLength, percentage }) => {
    if (!Number.isFinite(poolLength) || poolLength <= 0) return 0;
    const percent = Number(percentage || 0);
    if (percent <= 0) return 0;
    let count = Math.round(poolLength * percent);
    if (count === 0) count = 1;
    return Math.min(count, poolLength);
};

// ==========================================================
// GET ROTATING PREFERRED ROOMS
// ==========================================================

const getRotatingRooms = ({ pool, startIndex, count }) => {
    if (!Array.isArray(pool) || pool.length === 0 || count <= 0) return [];
    const result = [];
    const normalizedStart = (Number(startIndex || 0) % pool.length + pool.length) % pool.length;
    for (let i = 0; i < count; i++) {
        result.push(pool[(normalizedStart + i) % pool.length]);
    }
    return result;
};

// ==========================================================
// ALLOCATE ROOMS BY PERCENTAGE
// ==========================================================

const allocateRoomsByPercentage = (movies, rooms, stats = {}, existingShowtimes = []) => {
    const roomsByType = buildRoomsByType(rooms);
    console.log("📋 SỐ LƯỢNG PHÒNG THEO HẠNG:");
    for (const [type, list] of Object.entries(roomsByType)) {
        console.log(`  ${type}: ${list.length} phòng`);
    }
    const startIndexMap = buildInitialRoomCursors({ roomsByType, existingShowtimes });
    console.log("🔄 CURSOR PHÒNG BAN ĐẦU:");
    for (const [type, index] of Object.entries(startIndexMap)) {
        const pool = roomsByType[type] || [];
        console.log(`  ${type}: index=${index} → ${pool[index]?.room_name || pool[index]?.room_id || "N/A"}`);
    }
    const orderedMovies = movies.map((movie, index) => ({
        ...movie,
        _schedulerOrder: Number.isFinite(Number(movie._schedulerOrder)) ? Number(movie._schedulerOrder) : index
    }));
    orderedMovies.sort((a, b) => a._schedulerOrder - b._schedulerOrder);
    const allocated = orderedMovies.map(movie => {
        const level = getMovieHotLevel(movie, stats);
        const config = ROOM_ALLOCATION_PERCENTAGE[level] || ROOM_ALLOCATION_PERCENTAGE.normal;
        const allowedTypes = config.roomTypes;
        const percentages = config.percentage || {};
        const roomAllocation = {};
        let totalRoomsAllocated = 0;
        for (const type of allowedTypes) {
            const pool = roomsByType[type] || [];
            if (pool.length === 0) {
                roomAllocation[type] = { count: 0, rooms: [], pool: [] };
                continue;
            }
            const percentage = Number(percentages[type] || 0);
            const allocatedCount = calculatePreferredRoomCount({ poolLength: pool.length, percentage });
            const startIndex = Number(startIndexMap[type] || 0);
            const selectedRooms = getRotatingRooms({ pool, startIndex, count: allocatedCount });
            startIndexMap[type] = (startIndex + allocatedCount) % pool.length;
            roomAllocation[type] = { count: selectedRooms.length, rooms: selectedRooms, pool };
            totalRoomsAllocated += selectedRooms.length;
        }
        return { ...movie, level, hotScore: calculateHotScore(movie, stats), allocatedRooms: totalRoomsAllocated, roomAllocation, allowedTypes };
    });
    console.log("📊 PHÂN BỔ PHÒNG THEO % + SHARED ROUND ROBIN:");
    for (const movie of allocated) {
        console.log(`  🎬 ${movie.title} (${movie.level.toUpperCase()})`);
        for (const [type, data] of Object.entries(movie.roomAllocation)) {
            if (!data || data.count <= 0) continue;
            const names = data.rooms.map(r => r.room_name || r.room_id).join(", ");
            console.log(`      ${type}: ${data.count} phòng ưu tiên → ${names}`);
        }
    }
    return allocated;
};

// ==========================================================
// BUILD ROOM TYPE SEQUENCE
// ==========================================================

const buildRoomTypeSequence = (roomAllocation) => {
    const weightedTypes = [];
    for (const [type, allocation] of Object.entries(roomAllocation)) {
        if (!allocation || !Array.isArray(allocation.pool) || allocation.pool.length === 0) continue;
        const count = Number(allocation.count || 0);
        if (count <= 0) continue;
        for (let i = 0; i < count; i++) weightedTypes.push(type);
    }
    return weightedTypes;
};

// ==========================================================
// DETERMINE START CURSOR FOR MOVIE
// ==========================================================

const buildMovieRoundCursors = ({ date, startMinutes, roomAllocation, existingShowtimes = [], scheduledSlots = [] }) => {
    const cursors = {};
    const allExisting = [...existingShowtimes, ...scheduledSlots];
    for (const [type, allocation] of Object.entries(roomAllocation)) {
        if (!allocation || !Array.isArray(allocation.pool) || allocation.pool.length === 0) continue;
        const pool = allocation.pool;
        const lastIndex = getLastRoomIndexForRound({ pool, existingShowtimes: allExisting, date, startMinutes });
        cursors[type] = lastIndex >= 0 ? (lastIndex + 1) % pool.length : 0;
    }
    return cursors;
};

// ==========================================================
// GENERATE SLOTS FOR ONE MOVIE / ONE DAY
// ==========================================================

const generateSlotsForMovie = ({ date, movie, roomAllocation = {}, existingShowtimes = [], scheduledSlots = [], config = {}, movieStats = {}, initialRoomCursors = {} }) => {
    const mergedConfig = { ...SCHEDULER_CONFIG, ...config };
    const timeRange = getTimeRangeForDate(date, mergedConfig);
    const duration = Number(movie.duration);
    if (!Number.isFinite(duration) || duration <= 0) return [];
    const interval = getInterval(movie, movieStats, mergedConfig);
    const buffer = Number(mergedConfig.bufferMinutes) || 15;
    const roomTypes = Object.keys(roomAllocation).filter(type => {
        const allocation = roomAllocation[type];
        return allocation && Array.isArray(allocation.pool) && allocation.pool.length > 0;
    });
    if (roomTypes.length === 0) return [];
    const roomTypeSequence = buildRoomTypeSequence(roomAllocation);
    if (roomTypeSequence.length === 0) return [];
    const roomCursor = {};
    for (const type of roomTypes) {
        roomCursor[type] = Number(initialRoomCursors[type] || 0);
    }
    const allExisting = [...existingShowtimes, ...scheduledSlots].map(item => normalizeShowtime(item)).filter(Boolean);
    const existingToday = allExisting.filter(item => item.date === date);
    let currentTime = timeRange.startMinutes;
    const slots = [];
    let safetyCounter = 0;
    const maxIterations = Math.ceil((timeRange.endMinutes - timeRange.startMinutes) / Math.max(interval, 1)) + 100;
    let typeSequenceIndex = 0;
    while (currentTime + duration <= timeRange.endMinutes && safetyCounter < maxIterations) {
        safetyCounter++;
        const endMinutes = currentTime + duration;
        let selectedRoom = null, selectedType = null, selectedSearchResult = null;
        const sequenceLength = roomTypeSequence.length;
        for (let offset = 0; offset < sequenceLength; offset++) {
            const sequencePosition = (typeSequenceIndex + offset) % sequenceLength;
            const type = roomTypeSequence[sequencePosition];
            const allocation = roomAllocation[type];
            if (!allocation) continue;
            const preferredRooms = Array.isArray(allocation.rooms) ? allocation.rooms : [];
            const poolRooms = Array.isArray(allocation.pool) ? allocation.pool : preferredRooms;
            if (poolRooms.length === 0) continue;
            const result = findAvailableRoom({
                preferredRooms,
                poolRooms,
                roomStartIndex: roomCursor[type] || 0,
                startMinutes: currentTime,
                endMinutes,
                existingShowtimes: [...existingToday, ...slots],
                bufferMinutes: buffer
            });
            if (!result) continue;
            selectedRoom = result.room;
            selectedType = type;
            selectedSearchResult = result;
            const poolIds = poolRooms.map(r => Number(r.room_id));
            const selectedRoomId = Number(result.room.room_id);
            const actualIndex = poolIds.indexOf(selectedRoomId);
            roomCursor[type] = actualIndex >= 0 ? (actualIndex + 1) % poolRooms.length : (Number(roomCursor[type]) + 1) % poolRooms.length;
            typeSequenceIndex = (sequencePosition + 1) % sequenceLength;
            break;
        }
        if (!selectedRoom || !selectedType) {
            currentTime += interval;
            continue;
        }
        const room = selectedRoom;
        const roomId = Number(room.room_id);
        const slot = {
            room_id: roomId,
            room_name: room.room_name || null,
            room_type: room.room_type || selectedType,
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
        console.log(`🎬 ${movie.title} | ${date} ${minutesToTime(currentTime)} | ${selectedType} | ${room.room_name || roomId}`);
        currentTime += interval;
    }
    return slots;
};

// ==========================================================
// SORT MOVIES BY CREATION ORDER
// ==========================================================

const sortMoviesByCreationOrder = (movies) => {
    return movies.map((movie, index) => ({
        ...movie,
        _schedulerOrder: Number.isFinite(Number(movie._schedulerOrder)) ? Number(movie._schedulerOrder)
            : Number.isFinite(Number(movie.created_order)) ? Number(movie.created_order)
            : movie.createdAt ? new Date(movie.createdAt).getTime()
            : movie.created_at ? new Date(movie.created_at).getTime()
            : index
    })).sort((a, b) => a._schedulerOrder - b._schedulerOrder);
};

// ==========================================================
// AUTO SCHEDULER MAIN
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
    const allocation = allocateRoomsByPercentage(normalizedMovies, eligibleRooms, movieStats, existingShowtimes);
    const allocationMap = {};
    for (const item of allocation) allocationMap[item.movie_id] = item;
    const sortedMovies = sortMoviesByCreationOrder(normalizedMovies);
    const dateList = [];
    let currentDate = parseDate(startDate);
    while (currentDate <= toDate) {
        dateList.push(formatDate(currentDate));
        currentDate = addDays(currentDate, 1);
    }
    const allResults = [];
    for (const date of dateList) {
        const scheduledSlots = [];
        const roomsByType = buildRoomsByType(eligibleRooms);
        const sharedRoomCursors = buildInitialRoomCursors({
            roomsByType,
            existingShowtimes: [...existingShowtimes, ...scheduledSlots],
            date
        });
        const movieStates = sortedMovies.map((movie, movieIndex) => {
            const alloc = allocationMap[movie.movie_id];
            const range = getTimeRangeForDate(date, mergedConfig);
            return {
                movie,
                movieIndex,
                allocation: alloc,
                interval: getInterval(movie, movieStats, mergedConfig),
                nextTime: range.startMinutes,
                finished: false
            };
        });
        let safetyCounter = 0;
        const maxRoundIterations = 5000;
        while (safetyCounter < maxRoundIterations) {
            safetyCounter++;
            const activeStates = movieStates.filter(state => !state.finished);
            if (activeStates.length === 0) break;
            activeStates.sort((a, b) => {
                if (a.nextTime !== b.nextTime) return a.nextTime - b.nextTime;
                return a.movieIndex - b.movieIndex;
            });
            const state = activeStates[0];
            const movie = state.movie;
            const range = getTimeRangeForDate(date, mergedConfig);
            if (state.nextTime + Number(movie.duration) > range.endMinutes) {
                state.finished = true;
                continue;
            }
            const currentTime = state.nextTime;
            const duration = Number(movie.duration);
            const endMinutes = currentTime + duration;
            const alloc = state.allocation;
            if (!alloc || !alloc.roomAllocation) {
                console.warn(`⚠️ ${movie.title}: không có allocation`);
                state.finished = true;
                continue;
            }
            const roomTypeSequence = buildRoomTypeSequence(alloc.roomAllocation);
            if (roomTypeSequence.length === 0) {
                state.finished = true;
                continue;
            }
            const roundNumber = Math.floor((currentTime - range.startMinutes) / Math.max(state.interval, 1));
            const typeStartIndex = (movie._schedulerOrder + roundNumber) % roomTypeSequence.length;
            let selectedRoom = null, selectedType = null;
            for (let offset = 0; offset < roomTypeSequence.length; offset++) {
                const type = roomTypeSequence[(typeStartIndex + offset) % roomTypeSequence.length];
                const roomData = alloc.roomAllocation[type];
                if (!roomData) continue;
                const pool = Array.isArray(roomData.pool) ? roomData.pool : [];
                if (pool.length === 0) continue;
                const preferred = Array.isArray(roomData.rooms) ? roomData.rooms : [];
                let roomStartIndex = Number(sharedRoomCursors[type] || 0);
                const roundLastIndex = getLastRoomIndexForRound({
                    pool,
                    existingShowtimes: [...existingShowtimes, ...scheduledSlots],
                    date,
                    startMinutes: currentTime
                });
                if (roundLastIndex >= 0) {
                    roomStartIndex = (roundLastIndex + 1) % pool.length;
                }
                const result = findAvailableRoom({
                    preferredRooms: preferred,
                    poolRooms: pool,
                    roomStartIndex,
                    startMinutes: currentTime,
                    endMinutes,
                    existingShowtimes: [...existingShowtimes, ...scheduledSlots],
                    bufferMinutes: mergedConfig.bufferMinutes
                });
                if (!result) continue;
                selectedRoom = result.room;
                selectedType = type;
                const poolIds = pool.map(r => Number(r.room_id));
                const actualIndex = poolIds.indexOf(Number(selectedRoom.room_id));
                if (actualIndex >= 0) {
                    sharedRoomCursors[type] = (actualIndex + 1) % pool.length;
                }
                break;
            }
            if (!selectedRoom || !selectedType) {
                state.nextTime += state.interval;
                continue;
            }
            const slot = {
                room_id: Number(selectedRoom.room_id),
                room_name: selectedRoom.room_name || null,
                room_type: selectedRoom.room_type || selectedType,
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
            scheduledSlots.push(slot);
            allResults.push(slot);
            console.log(`🎬 ROUND | ${date} ${minutesToTime(currentTime)} | ${movie.title} | ${selectedType} | ${selectedRoom.room_name || selectedRoom.room_id}`);
            state.nextTime += state.interval;
        }
    }
    allResults.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
        return Number(a.room_id) - Number(b.room_id);
    });
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
        allocation
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
        const { movie_id, cinema_id, start_date, end_date, distribution } = data;
        const movieId = Number(movie_id);
        const cinemaId = Number(cinema_id);
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
        }
        rooms = rooms.map(room => ({
            ...room,
            room_id: Number(room.room_id),
            room_type: String(room.room_type || "").trim().toUpperCase()
        })).filter(room => Number.isInteger(room.room_id) && room.room_id > 0);
        if (rooms.length === 0) {
            const err = new Error("Rạp không có phòng chiếu nào.");
            err.statusCode = 400;
            err.field = "cinema_id";
            throw err;
        }
        const allRoomTypes = [...new Set(rooms.map(r => r.room_type).filter(type => ALLOWED_ROOM_TYPES.includes(type)))];
        console.log(`📋 Rạp có các hạng phòng: ${allRoomTypes.join(", ")}`);
        const schedulerRoomIds = rooms.map(room => Number(room.room_id));
        const existingShowtimes = await ShowtimeRepository.getExistingShowtimes({
            cinemaId,
            startDate: start_date,
            endDate: end_date,
            roomIds: schedulerRoomIds
        });
        console.log(`📚 Đã tải ${existingShowtimes?.length || 0} suất chiếu hiện tại để kiểm tra xung đột.`);
        const config = {
            ...SCHEDULER_CONFIG,
            weekdayStart: "08:00",
            weekdayEnd: "23:30",
            weekendStart: "08:00",
            weekendEnd: "24:00",
            bufferMinutes: 15,
            hotInterval: 45,
            normalInterval: 75,
            coldInterval: 120,
            roomTypes: allRoomTypes
        };
        const moviesForScheduler = [{
            movie_id: movieId,
            title: movie.title || `Phim ${movieId}`,
            duration,
            distribution: scheduleDistribution,
            roomTypes: allRoomTypes,
            _schedulerOrder: Number(movie.created_order || 0)
        }];
        const generated = generateSchedule({
            movies: moviesForScheduler,
            rooms,
            roomTypes: allRoomTypes,
            startDate: start_date,
            endDate: end_date,
            config,
            existingShowtimes,
            movieStats: {}
        });
        const created = [], conflicts = [], skippedPast = [];
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
            const roomInfo = rooms.find(r => Number(r.room_id) === roomId);
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
                roomTypes: allRoomTypes,
                roomIds: rooms.map(r => r.room_id),
                generatedCount: generated.data.length,
                createdCount: created.length,
                conflictCount: conflicts.length,
                skippedPastCount: skippedPast.length,
                duration,
                startDate: start_date,
                endDate: end_date,
                startTime: "08:00",
                endTime: "23:30",
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
            roomTypes: allRoomTypes
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
        if (!movie_id && !cinema_id && !date) return await ShowtimeRepository.getQuickBookingMovies();
        if (movie_id && !cinema_id && !date) return await ShowtimeRepository.getQuickBookingCinemas(movie_id);
        if (movie_id && cinema_id && !date) return await ShowtimeRepository.getQuickBookingDates(movie_id, cinema_id);
        if (movie_id && cinema_id && date) return await ShowtimeRepository.getQuickBookingTimes(movie_id, cinema_id, date);
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
            return { ...showtime, time_slot: timeSlot, time_slot_label: TIME_SLOT_LABELS[timeSlot], day_type: dayType, day_type_label: DAY_TYPE_LABELS[dayType] };
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