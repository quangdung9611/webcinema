const ShowtimeRepository = require("../Repositories/ShowtimeRepository");

// ==========================================================
// CONSTANTS
// ==========================================================

const ALLOWED_ROOM_TYPES = ["2D", "3D", "VIP", "IMAX"];

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
    const d = typeof date === 'string' ? new Date(date + 'T00:00:00Z') : new Date(date);
    const dayOfWeek = d.getUTCDay();
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
// FIND AVAILABLE ROOM
// ==========================================================

const findAvailableRoom = ({ preferredRooms = [], poolRooms = [], startMinutes, endMinutes, existingShowtimes = [], bufferMinutes = 15 }) => {
    const pool = Array.isArray(poolRooms) && poolRooms.length > 0 ? poolRooms : preferredRooms;
    if (!Array.isArray(pool) || pool.length === 0) return null;
    
    const sortedPool = sortRoomsNaturally(pool);
    
    for (const room of sortedPool) {
        const roomId = Number(room.room_id);
        if (!Number.isInteger(roomId) || roomId <= 0) continue;
        if (!hasRoomConflict({ roomId, startMinutes, endMinutes, existingShowtimes, bufferMinutes })) {
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
    // SCHEDULE SHOWTIMES - MAIN FUNCTION
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

        // Lấy giờ hoạt động của rạp từ database
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
        console.log(`📋 Rạp có các hạng phòng: ${allRoomTypes.join(", ")}`);

        // Lấy existing showtimes
        const schedulerRoomIds = rooms.map(room => Number(room.room_id));
        const existingShowtimes = await ShowtimeRepository.getExistingShowtimes({
            cinemaId,
            startDate: start_date,
            endDate: end_date,
            roomIds: schedulerRoomIds
        });
        console.log(`📚 Đã tải ${existingShowtimes?.length || 0} suất chiếu hiện tại`);

        // Lấy cấu hình suất chiếu từ bảng movie_showtime_config
        const manualConfigs = {};
        for (const movie of moviesData) {
            const config = await ShowtimeRepository.getMovieShowtimeConfig(movie.movie_id, cinemaId);
            if (config && Object.keys(config).length > 0) {
                manualConfigs[movie.movie_id] = config;
                console.log(`📋 CẤU HÌNH CHO PHIM "${movie.title}":`);
                for (const [slot, slots] of Object.entries(config)) {
                    for (const s of slots) {
                        console.log(`  ${slot}: ${s.slot_count} suất ${s.room_type}, cách ${s.interval_minutes} phút`);
                    }
                }
            } else {
                console.log(`⚠️ Phim "${movie.title}" chưa có cấu hình, bỏ qua!`);
            }
        }

        // Tạo lịch chiếu
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

        // Duyệt từng ngày
        let currentDate = parseDate(start_date);
        while (currentDate <= endDate) {
            const dateStr = formatDate(currentDate);
            const dayType = isWeekend(currentDate) ? 'WEEKEND' : 'WEEKDAY';
            const timeRange = getTimeRangeForDate(dateStr, {
                weekdayStart: operatingHours.weekday.open,
                weekdayEnd: operatingHours.weekday.close,
                weekendStart: operatingHours.weekend.open,
                weekendEnd: operatingHours.weekend.close
            });

            console.log(`\n📅 NGÀY ${dateStr} (${dayType}):`);
            console.log(`  Giờ hoạt động: ${minutesToTime(timeRange.startMinutes)} → ${minutesToTime(timeRange.endMinutes)}`);

            // Duyệt từng phim
            for (const movie of moviesData) {
                const movieId = movie.movie_id;
                const duration = Number(movie.duration);
                
                // Lấy cấu hình của phim này
                const manualConfig = manualConfigs[movieId];
                
                if (!manualConfig || Object.keys(manualConfig).length === 0) {
                    console.log(`⚠️ Phim "${movie.title}" chưa có cấu hình, bỏ qua!`);
                    continue;
                }

                // DÙNG CẤU HÌNH THỦ CÔNG
                for (const [timeSlotKey, slotConfigs] of Object.entries(manualConfig)) {
                    for (const slotConfig of slotConfigs) {
                        const { room_type, slot_count, interval_minutes } = slotConfig;
                        
                        // Tìm phòng theo room_type
                        const availableRooms = rooms.filter(r => r.room_type === room_type);
                        if (availableRooms.length === 0) {
                            console.warn(`⚠️ Không có phòng ${room_type} cho phim ${movie.title}`);
                            continue;
                        }

                        // Xác định giờ bắt đầu cho time slot
                        const timeSlotStart = {
                            'MORNING': timeRange.startMinutes,
                            'AFTERNOON': Math.max(timeRange.startMinutes, 12 * 60),
                            'EVENING': Math.max(timeRange.startMinutes, 17 * 60),
                            'NIGHT': Math.max(timeRange.startMinutes, 20 * 60)
                        };

                        let currentTime = timeSlotStart[timeSlotKey] || timeRange.startMinutes;
                        
                        // Giới hạn trong time range
                        if (currentTime < timeRange.startMinutes) currentTime = timeRange.startMinutes;
                        if (currentTime > timeRange.endMinutes) continue;

                        let slotsCreated = 0;
                        let roomIndex = 0;

                        while (slotsCreated < slot_count && currentTime + duration <= timeRange.endMinutes) {
                            const room = availableRooms[roomIndex % availableRooms.length];
                            const roomId = Number(room.room_id);
                            const endMinutes = currentTime + duration;

                            // Kiểm tra conflict
                            const isConflict = hasRoomConflict({
                                roomId,
                                startMinutes: currentTime,
                                endMinutes: endMinutes,
                                existingShowtimes: [...existingShowtimes, ...created],
                                bufferMinutes: 15
                            });

                            if (!isConflict) {
                                const startTimeStr = buildDateTime(dateStr, currentTime);
                                const endTimeStr = buildDateTime(dateStr, endMinutes);

                                // Kiểm tra quá khứ
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
                                        const dayTypeResult = getDayType(dateStr);

                                        const createdSlot = {
                                            showtime_id: showtimeId,
                                            movie_id: movieId,
                                            cinema_id: cinemaId,
                                            room_id: roomId,
                                            room_type: room.room_type,
                                            title: movie.title,
                                            start_time: startTimeStr,
                                            end_time: endTimeStr,
                                            duration: duration,
                                            time_slot: timeSlot,
                                            time_slot_label: TIME_SLOT_LABELS[timeSlot],
                                            day_type: dayTypeResult,
                                            day_type_label: DAY_TYPE_LABELS[dayTypeResult]
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

                                        console.log(`  ✅ ${movie.title} | ${startTimeStr} | ${room.room_type} | ${room.room_name}`);
                                    } catch (error) {
                                        conflicts.push({ ...movie, room_id: roomId, start_time: startTimeStr, reason: error.message });
                                    }
                                }
                            }

                            currentTime += interval_minutes;
                            roomIndex++;
                        }
                    }
                }
            }

            currentDate = addDays(currentDate, 1);
        }

        // Thống kê kết quả
        const summary = {
            cinemaId,
            roomCount: rooms.length,
            roomTypes: allRoomTypes,
            movieCount: moviesData.length,
            movieIds: moviesData.map(m => m.movie_id),
            movies: moviesData.map(m => ({
                movie_id: m.movie_id,
                title: m.title
            })),
            createdCount: created.length,
            conflictCount: conflicts.length,
            skippedPastCount: skippedPast.length,
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
                WEEKEND: dayTypeStats.WEEKEND.count
            },
            byMovie: created.reduce((acc, slot) => {
                const key = slot.movie_id;
                if (!acc[key]) acc[key] = { title: slot.title, count: 0 };
                acc[key].count++;
                return acc;
            }, {})
        };

        return {
            success: true,
            data: created,
            conflicts,
            skippedPast,
            summary,
            usedConfig: {
                operatingHours,
                manualConfigs
            }
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