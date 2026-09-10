const ShowtimeRepository = require("../Repositories/ShowtimeRepository");

// ==========================================================
// CONSTANTS
// ==========================================================

const ALLOWED_ROOM_TYPES = ["2D", "3D", "VIP", "IMAX"];

const TIME_SLOT_RANGES = {
    MORNING: { start: "08:00", end: "12:00" },
    AFTERNOON: { start: "12:00", end: "17:00" },
    EVENING: { start: "17:00", end: "20:00" },
    NIGHT: { start: "20:00", end: "24:00" }
};

const TIME_SLOT_LABELS = {
    MORNING: "Sáng (8h-12h)",
    AFTERNOON: "Chiều (12h-17h)",
    EVENING: "Tối (17h-20h)",
    NIGHT: "Đêm (20h-24h)"
};

const DAY_TYPE_LABELS = {
    WEEKDAY: "Ngày thường (T2-T6)",
    WEEKEND: "Cuối tuần (T7-CN)",
    MONDAY: "Thứ 2",
    TUESDAY: "Thứ 3",
    WEDNESDAY: "Thứ 4",
    THURSDAY: "Thứ 5",
    FRIDAY: "Thứ 6",
    SATURDAY: "Thứ 7",
    SUNDAY: "Chủ Nhật"
};

// ✅ MAP INTERVAL_TYPE → MINUTES
const INTERVAL_MINUTES_MAP = {
    'HOT': 45,
    'NORMAL': 75,
    'COOL': 120
};

const getIntervalMinutes = (intervalType) => {
    return INTERVAL_MINUTES_MAP[String(intervalType || 'NORMAL').toUpperCase()] || 75;
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
    if (hour >= 8 && hour < 12) return "MORNING";
    if (hour >= 12 && hour < 17) return "AFTERNOON";
    if (hour >= 17 && hour < 20) return "EVENING";
    return "NIGHT";
};

// 🆕 Lấy tên ngày trong tuần (MONDAY, TUESDAY, ...)
const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00Z');
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getUTCDay()];
};

const getDayType = (date) => {
    if (!date) return "WEEKDAY";
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00Z') : new Date(date);
    const dayOfWeek = d.getUTCDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? "WEEKEND" : "WEEKDAY";
};

const normalizeRoomTypes = (roomTypes) => {
    if (!Array.isArray(roomTypes)) return [];
    return [...new Set(
        roomTypes.map(type => String(type).trim().toUpperCase()).filter(type => ALLOWED_ROOM_TYPES.includes(type))
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
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
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
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00Z') : new Date(date);
    const day = d.getUTCDay();
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

// ==========================================================
// GET OPERATING RANGE
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
// GET ACTUAL TIME SLOT RANGE
// ==========================================================

const getActualTimeSlotRange = (timeSlot, timeRange) => {
    const slotConfig = TIME_SLOT_RANGES[timeSlot];
    if (!slotConfig) return null;

    const slotStart = timeToMinutes(slotConfig.start);
    const slotEnd = timeToMinutes(slotConfig.end);

    const actualStart = Math.max(slotStart, timeRange.startMinutes);
    const actualEnd = Math.min(slotEnd, timeRange.endMinutes);

    return {
        startMinutes: actualStart,
        endMinutes: actualEnd,
        startTime: minutesToTime(actualStart),
        endTime: minutesToTime(actualEnd)
    };
};

// ==========================================================
// CALCULATE MAX SLOTS - CHỈ TÍNH THEO INTERVAL
// ==========================================================

const calculateMaxSlots = ({ startMinutes, endMinutes, intervalMinutes }) => {
    if (startMinutes >= endMinutes || intervalMinutes <= 0) return 0;
    return Math.floor((endMinutes - startMinutes) / intervalMinutes);
};

// ==========================================================
// VALIDATE SLOT CAPACITY - BỎ QUA DURATION
// ==========================================================

const validateSlotCapacity = ({ timeSlot, roomType, slotCount, intervalMinutes, actualRange }) => {
    if (!actualRange) {
        return { valid: false, maxSlots: 0, reason: "Không xác định được khung giờ" };
    }

    const maxSlots = calculateMaxSlots({
        startMinutes: actualRange.startMinutes,
        endMinutes: actualRange.endMinutes,
        intervalMinutes: intervalMinutes
    });

    if (slotCount > maxSlots) {
        return {
            valid: false,
            maxSlots,
            reason: `Cấu hình ${timeSlot} - ${roomType} yêu cầu ${slotCount} suất nhưng khung giờ ${actualRange.startTime} → ${actualRange.endTime} chỉ đáp ứng tối đa ${maxSlots} suất với khoảng cách ${intervalMinutes} phút.`
        };
    }

    return { valid: true, maxSlots, reason: null };
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

const hasRoomConflict = ({ roomId, startMinutes, endMinutes, date = null, existingShowtimes = [], bufferMinutes = 15 }) => {
    return existingShowtimes.some(existingRaw => {
        const existing = normalizeShowtime(existingRaw);
        if (!existing) return false;
        if (Number(existing.room_id) !== Number(roomId)) return false;
        if (date && existing.date && String(existing.date).substring(0, 10) !== String(date).substring(0, 10)) {
            return false;
        }
        if (!Number.isFinite(existing.startMinutes)) return false;
        const existingStart = existing.startMinutes;
        const existingEnd = existingStart + existing.duration + Number(bufferMinutes || 0);
        return startMinutes < existingEnd && endMinutes > existingStart;
    });
};

// ==========================================================
// FIND AVAILABLE ROOM
// ==========================================================

const findAvailableRoom = ({ preferredRooms = [], poolRooms = [], startMinutes, endMinutes, date = null, existingShowtimes = [], bufferMinutes = 15 }) => {
    const pool = Array.isArray(poolRooms) && poolRooms.length > 0 ? poolRooms : preferredRooms;
    if (!Array.isArray(pool) || pool.length === 0) return null;
    
    const sortedPool = sortRoomsNaturally(pool);
    
    for (const room of sortedPool) {
        const roomId = Number(room.room_id);
        if (!Number.isInteger(roomId) || roomId <= 0) continue;
        if (!hasRoomConflict({ roomId, startMinutes, endMinutes, date, existingShowtimes, bufferMinutes })) {
            return { room };
        }
    }
    return null;
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

    // ==========================================================
    // SCHEDULE SHOWTIMES - HỖ TRỢ TỪNG NGÀY
    // ✅ ĐÃ ĐỔI interval_minutes → interval_type
    // ==========================================================

    async scheduleShowtimes(data) {
        if (!data) {
            const err = new Error("Dữ liệu tạo lịch chiếu không hợp lệ");
            err.statusCode = 400;
            throw err;
        }

        const { movies, cinema_id, start_date, end_date } = data;
        const cinemaId = Number(cinema_id);
        
        if (!cinemaId || cinemaId <= 0) {
            const err = new Error("Vui lòng chọn rạp");
            err.statusCode = 400;
            err.field = "cinema_id";
            throw err;
        }

        if (!start_date || !end_date) {
            const err = new Error("Vui lòng chọn ngày");
            err.statusCode = 400;
            err.field = "start_date";
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

        // Lấy giờ hoạt động của rạp
        const operatingHours = await ShowtimeRepository.getOperatingHours(cinemaId);
        console.log(`📋 GIỜ HOẠT ĐỘNG CỦA RẠP ${cinemaId}:`);
        console.log(`  Ngày thường: ${operatingHours.weekday.open} → ${operatingHours.weekday.close}`);
        console.log(`  Cuối tuần: ${operatingHours.weekend.open} → ${operatingHours.weekend.close}`);

        // Xây dựng danh sách phim
        let moviesData = [];
        if (Array.isArray(movies) && movies.length > 0) {
            for (const item of movies) {
                const movieId = Number(item.movie_id);
                const movie = await ShowtimeRepository.getMovieDuration(movieId);
                if (movie) {
                    moviesData.push(movie);
                } else {
                    console.warn(`⚠️ Không tìm thấy phim với ID: ${movieId}`);
                }
            }
        } else {
            const allMovies = await ShowtimeRepository.getActiveMovies();
            moviesData = allMovies;
        }

        if (moviesData.length === 0) {
            const err = new Error("Không có phim nào để tạo lịch");
            err.statusCode = 400;
            err.field = "movies";
            throw err;
        }

        console.log(`📋 DANH SÁCH PHIM (${moviesData.length} phim):`);
        for (const movie of moviesData) {
            console.log(`  🎬 ${movie.title} (${movie.movie_id})`);
        }

        // Lấy phòng của rạp
        let rooms = await ShowtimeRepository.findRoomsByCinema(cinemaId);
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
        console.log(`📋 Rạp có ${rooms.length} phòng:`, rooms.map(r => `${r.room_name} (${r.room_type})`).join(', '));

        // Lấy existing showtimes
        const schedulerRoomIds = rooms.map(room => Number(room.room_id));
        const existingShowtimes = await ShowtimeRepository.getExistingShowtimes({
            cinemaId,
            startDate: start_date,
            endDate: end_date,
            roomIds: schedulerRoomIds
        });
        console.log(`📚 Đã tải ${existingShowtimes?.length || 0} suất chiếu hiện tại`);

        // Lấy cấu hình từ database
        const manualConfigs = {};

        for (const movie of moviesData) {
            const movieId = movie.movie_id;
            manualConfigs[movieId] = {};
        }

        // Tạo lịch chiếu
        const created = [], conflicts = [], skippedPast = [];
        const skippedNoRoom = [];
        const skippedOutsideHours = [];
        const skippedInvalidConfig = [];

        const timeSlotStats = {
            MORNING: { count: 0, slots: [] },
            AFTERNOON: { count: 0, slots: [] },
            EVENING: { count: 0, slots: [] },
            NIGHT: { count: 0, slots: [] }
        };
        const dayTypeStats = {
            WEEKDAY: { count: 0, slots: [] },
            WEEKEND: { count: 0, slots: [] },
            MONDAY: { count: 0, slots: [] },
            TUESDAY: { count: 0, slots: [] },
            WEDNESDAY: { count: 0, slots: [] },
            THURSDAY: { count: 0, slots: [] },
            FRIDAY: { count: 0, slots: [] },
            SATURDAY: { count: 0, slots: [] },
            SUNDAY: { count: 0, slots: [] }
        };

        // Duyệt từng ngày
        let currentDate = parseDate(start_date);
        while (currentDate <= endDate) {
            const dateStr = formatDate(currentDate);
            const dayOfWeek = getDayOfWeek(dateStr);
            const dayType = isWeekend(currentDate) ? 'WEEKEND' : 'WEEKDAY';
            const timeRange = getTimeRangeForDate(dateStr, {
                weekdayStart: operatingHours.weekday.open,
                weekdayEnd: operatingHours.weekday.close,
                weekendStart: operatingHours.weekend.open,
                weekendEnd: operatingHours.weekend.close
            });

            console.log(`\n📅 NGÀY ${dateStr} (${dayOfWeek} - ${dayType}):`);
            console.log(`  Giờ hoạt động: ${minutesToTime(timeRange.startMinutes)} → ${minutesToTime(timeRange.endMinutes)}`);

            // Duyệt từng phim
            for (const movie of moviesData) {
                const movieId = movie.movie_id;
                const duration = Number(movie.duration);
                
                // Lấy config theo thứ tự ưu tiên
                let config = await ShowtimeRepository.getMovieShowtimeConfig(movieId, cinemaId, dayOfWeek);
                
                if (!config || Object.keys(config).length === 0) {
                    console.log(`⚠️ Không có config cho ${dayOfWeek}, thử ${dayType}`);
                    config = await ShowtimeRepository.getMovieShowtimeConfig(movieId, cinemaId, dayType);
                }
                
                if (!config || Object.keys(config).length === 0) {
                    console.log(`⚠️ Không có config cho ${dayType}, thử ALL`);
                    config = await ShowtimeRepository.getMovieShowtimeConfig(movieId, cinemaId, 'ALL');
                }
                
                if (config && Object.keys(config).length > 0) {
                    manualConfigs[movieId] = config;
                    console.log(`📋 CẤU HÌNH CHO PHIM "${movie.title}" (${dayOfWeek}):`);
                    for (const [slot, slots] of Object.entries(config)) {
                        for (const s of slots) {
                            // ✅ ĐỔI: Lấy minutes từ interval_type
                            const minutes = getIntervalMinutes(s.interval_type);
                            console.log(`  ${slot}: ${s.slot_count} suất ${s.room_type}, ${s.interval_type} (${minutes} phút)`);
                        }
                    }
                } else {
                    console.log(`⚠️ Phim "${movie.title}" chưa có cấu hình cho ${dayOfWeek}, bỏ qua!`);
                    continue;
                }

                // Duyệt từng time slot
                for (const [timeSlotKey, slotConfigs] of Object.entries(config)) {
                    for (const slotConfig of slotConfigs) {
                        // ✅ ĐỔI: Dùng interval_type thay vì interval_minutes
                        const { room_type, slot_count, interval_type } = slotConfig;
                        
                        // ✅ TÍNH interval_minutes TỪ interval_type
                        const interval_minutes = getIntervalMinutes(interval_type);
                        
                        // Tìm phòng theo room_type
                        const availableRooms = rooms.filter(r => r.room_type === room_type);
                        if (availableRooms.length === 0) {
                            console.warn(`⚠️ Không có phòng ${room_type} cho phim ${movie.title}`);
                            skippedNoRoom.push({
                                movie_id: movieId,
                                title: movie.title,
                                date: dateStr,
                                time_slot: timeSlotKey,
                                room_type: room_type,
                                reason: `Không có phòng ${room_type}`
                            });
                            continue;
                        }

                        // Xác định khung giờ thực tế
                        const actualSlotRange = getActualTimeSlotRange(timeSlotKey, timeRange);
                        if (!actualSlotRange || actualSlotRange.startMinutes >= actualSlotRange.endMinutes) {
                            skippedOutsideHours.push({
                                movie_id: movieId,
                                title: movie.title,
                                date: dateStr,
                                time_slot: timeSlotKey,
                                room_type: room_type,
                                reason: `Khung ${TIME_SLOT_LABELS[timeSlotKey]} nằm ngoài giờ hoạt động`
                            });
                            continue;
                        }

                        console.log(`  ⏰ ${timeSlotKey}: ${actualSlotRange.startTime} → ${actualSlotRange.endTime}`);

                        // KIỂM TRA SỐ SUẤT - BỎ QUA DURATION
                        const capacity = validateSlotCapacity({
                            timeSlot: timeSlotKey,
                            roomType: room_type,
                            slotCount: slot_count,
                            intervalMinutes: interval_minutes,
                            actualRange: actualSlotRange
                        });

                        if (!capacity.valid) {
                            console.warn(`⚠️ ${movie.title} | ${dateStr} | ${timeSlotKey} | ${room_type}`);
                            console.warn(`   → Yêu cầu: ${slot_count} suất`);
                            console.warn(`   → Tối đa: ${capacity.maxSlots} suất`);
                            
                            skippedInvalidConfig.push({
                                movie_id: movieId,
                                title: movie.title,
                                date: dateStr,
                                time_slot: timeSlotKey,
                                room_type: room_type,
                                requested_slots: slot_count,
                                max_possible_slots: capacity.maxSlots,
                                interval_type: interval_type,
                                interval_minutes: interval_minutes,
                                slot_start: actualSlotRange.startTime,
                                slot_end: actualSlotRange.endTime,
                                reason: capacity.reason
                            });
                            continue;
                        }

                        console.log(`  🎬 ${movie.title} | ${timeSlotKey} | ${room_type} | ${slot_count} suất | ${interval_type} (mỗi ${interval_minutes} phút)`);
                        console.log(`     📐 Khả năng tối đa: ${capacity.maxSlots} suất`);

                        // Tạo các suất chiếu
                        let currentTime = actualSlotRange.startMinutes;
                        let slotsCreated = 0;
                        let roomIndex = 0;

                        while (slotsCreated < slot_count) {
                            const room = availableRooms[roomIndex % availableRooms.length];
                            const roomId = Number(room.room_id);
                            
                            // CHỈ CHECK GIỜ BẮT ĐẦU, KHÔNG CHECK DURATION
                            if (currentTime >= actualSlotRange.endMinutes) {
                                break;
                            }

                            const startTimeStr = buildDateTime(dateStr, currentTime);
                            const endMinutes = currentTime + interval_minutes;
                            const endTimeStr = buildDateTime(dateStr, endMinutes);

                            // Kiểm tra conflict
                            const isConflict = hasRoomConflict({
                                roomId,
                                startMinutes: currentTime,
                                endMinutes: endMinutes,
                                date: dateStr,
                                existingShowtimes: [...existingShowtimes, ...created],
                                bufferMinutes: 15
                            });

                            if (!isConflict) {
                                const isPast = await ShowtimeRepository.isPastTime(startTimeStr);
                                if (isPast) {
                                    skippedPast.push({ ...movie, room_id: roomId, start_time: startTimeStr, reason: "Quá khứ" });
                                } else {
                                    try {
                                        const showtimeId = await ShowtimeRepository.create({
                                            movie_id: movieId,
                                            cinema_id: cinemaId,
                                            room_id: roomId,
                                            start_time: startTimeStr
                                        });

                                        const timeSlot = getTimeSlot(startTimeStr.split(" ")[1] || "09:00");
                                        const dayTypeResult = dayOfWeek;

                                        const createdSlot = {
                                            showtime_id: showtimeId,
                                            movie_id: movieId,
                                            cinema_id: cinemaId,
                                            room_id: roomId,
                                            room_type: room.room_type,
                                            room_name: room.room_name,
                                            title: movie.title,
                                            start_time: startTimeStr,
                                            end_time: endTimeStr,
                                            duration: duration,
                                            time_slot: timeSlot,
                                            time_slot_label: TIME_SLOT_LABELS[timeSlot],
                                            day_type: dayTypeResult,
                                            day_type_label: DAY_TYPE_LABELS[dayTypeResult] || dayTypeResult,
                                            // ✅ THÊM INTERVAL_TYPE VÀO KẾT QUẢ
                                            interval_type: interval_type,
                                            interval_minutes: interval_minutes
                                        };

                                        created.push(createdSlot);
                                        slotsCreated++;
                                        
                                        if (timeSlotStats[timeSlot]) {
                                            timeSlotStats[timeSlot].count++;
                                            timeSlotStats[timeSlot].slots.push(createdSlot);
                                        }
                                        if (dayTypeStats[dayTypeResult]) {
                                            dayTypeStats[dayTypeResult].count++;
                                            dayTypeStats[dayTypeResult].slots.push(createdSlot);
                                        }

                                        console.log(`  ✅ ${movie.title} | ${startTimeStr} → ${endTimeStr} | ${room.room_type} | ${room.room_name}`);
                                    } catch (error) {
                                        conflicts.push({ ...movie, room_id: roomId, start_time: startTimeStr, reason: error.message });
                                    }
                                }
                            } else {
                                conflicts.push({ ...movie, room_id: roomId, start_time: startTimeStr, reason: "Trùng lịch" });
                            }

                            currentTime += interval_minutes;
                            roomIndex++;
                        }

                        if (slotsCreated < slot_count) {
                            console.log(`  ⚠️ ${movie.title} | ${timeSlotKey} | ${room_type}: tạo ${slotsCreated}/${slot_count} suất`);
                        } else {
                            console.log(`  ✅ ${movie.title} | ${timeSlotKey} | ${room_type}: đủ ${slotsCreated}/${slot_count} suất`);
                        }
                    }
                }
            }

            currentDate = addDays(currentDate, 1);
        }

        // SUMMARY
        const summary = {
            cinemaId,
            roomCount: rooms.length,
            roomTypes: allRoomTypes,
            movieCount: moviesData.length,
            movieIds: moviesData.map(m => m.movie_id),
            movies: moviesData.map(m => ({ movie_id: m.movie_id, title: m.title })),
            createdCount: created.length,
            conflictCount: conflicts.length,
            skippedPastCount: skippedPast.length,
            skippedNoRoomCount: skippedNoRoom.length,
            skippedOutsideHoursCount: skippedOutsideHours.length,
            skippedInvalidConfigCount: skippedInvalidConfig.length,
            startDate: start_date,
            endDate: end_date,
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
                WEEKEND: dayTypeStats.WEEKEND.count,
                MONDAY: dayTypeStats.MONDAY.count,
                TUESDAY: dayTypeStats.TUESDAY.count,
                WEDNESDAY: dayTypeStats.WEDNESDAY.count,
                THURSDAY: dayTypeStats.THURSDAY.count,
                FRIDAY: dayTypeStats.FRIDAY.count,
                SATURDAY: dayTypeStats.SATURDAY.count,
                SUNDAY: dayTypeStats.SUNDAY.count
            },
            byMovie: created.reduce((acc, slot) => {
                const key = slot.movie_id;
                if (!acc[key]) acc[key] = { title: slot.title, count: 0 };
                acc[key].count++;
                return acc;
            }, {})
        };

        console.log("\n========================================================");
        console.log("🎯 KẾT QUẢ TẠO LỊCH");
        console.log("========================================================");
        console.log(`🏢 Rạp: ${cinemaId}`);
        console.log(`🎬 Số phim: ${moviesData.length}`);
        console.log(`🏠 Số phòng: ${rooms.length}`);
        console.log(`📅 Từ ngày: ${start_date}`);
        console.log(`📅 Đến ngày: ${end_date}`);
        console.log(`✅ Đã tạo: ${created.length}`);
        console.log(`⚠️ Conflict: ${conflicts.length}`);
        console.log(`⏮️ Quá khứ: ${skippedPast.length}`);
        console.log(`🏠 Không có phòng: ${skippedNoRoom.length}`);
        console.log(`⏰ Ngoài giờ: ${skippedOutsideHours.length}`);
        console.log(`❌ Config lỗi: ${skippedInvalidConfig.length}`);
        console.log("========================================================");

        if (created.length === 0) {
            let message = "Không tạo được suất chiếu nào.";
            
            if (skippedInvalidConfig.length > 0) {
                message = skippedInvalidConfig[0].reason || "Cấu hình không phù hợp với khung giờ.";
            } else if (skippedPast.length > 0 && conflicts.length === 0) {
                message = "Không tạo được suất chiếu vì các thời gian được tính đều đã ở quá khứ.";
            } else if (skippedNoRoom.length > 0) {
                message = `Không tạo được suất chiếu vì không có phòng ${skippedNoRoom[0].room_type}.`;
            } else if (conflicts.length > 0) {
                message = "Không tạo được suất chiếu vì các phòng đều bị trùng lịch.";
            } else if (skippedOutsideHours.length > 0) {
                message = "Không tạo được suất chiếu vì thời gian vượt quá giờ hoạt động của rạp.";
            }

            return {
                success: false,
                message,
                data: [],
                conflicts,
                skippedPast,
                skippedNoRoom,
                skippedOutsideHours,
                skippedInvalidConfig,
                summary,
                usedConfig: { operatingHours, manualConfigs }
            };
        }

        let message = `Đã tạo thành công ${created.length} suất chiếu.`;
        if (skippedInvalidConfig.length > 0) {
            message += ` Có ${skippedInvalidConfig.length} cấu hình không phù hợp với khung giờ và đã được bỏ qua.`;
        }

        return {
            success: true,
            message,
            data: created,
            conflicts,
            skippedPast,
            skippedNoRoom,
            skippedOutsideHours,
            skippedInvalidConfig,
            summary,
            usedConfig: { operatingHours, manualConfigs }
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