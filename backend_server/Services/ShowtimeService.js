const ShowtimeRepository = require("../Repositories/ShowtimeRepository");
const ShowtimeScheduler = require("./ShowtimeScheduler");


// ==========================================================
// FORMAT DATETIME
// ==========================================================

const formatDateTime = (dateTime) => {
    if (!dateTime) return null;
    return String(dateTime).replace("T", " ").substring(0, 16);
};


// ==========================================================
// TIME SLOT HELPERS - KHỚP VỚI PRICECONFIG
// ==========================================================

const getTimeSlot = (startTime) => {
    if (!startTime) return 'MORNING';
    
    const hour = parseInt(startTime.split(':')[0]);
    
    if (hour >= 6 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 17) return 'AFTERNOON';
    if (hour >= 17 && hour < 20) return 'EVENING';
    return 'NIGHT';
};

const getDayType = (date) => {
    if (!date) return 'WEEKDAY';
    
    const dayOfWeek = new Date(date).getDay();
    return (dayOfWeek === 0 || dayOfWeek === 6) ? 'WEEKEND' : 'WEEKDAY';
};

const TIME_SLOT_LABELS = {
    'MORNING': 'Sáng (6h-12h)',
    'AFTERNOON': 'Chiều (12h-17h)',
    'EVENING': 'Tối (17h-20h)',
    'NIGHT': 'Đêm (20h-24h)'
};

const DAY_TYPE_LABELS = {
    'WEEKDAY': 'Ngày thường (T2-T6)',
    'WEEKEND': 'Cuối tuần (T7-CN)'
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
// SERVICE
// ==========================================================

class ShowtimeService {

    /*=========================================================
        GET ALL SHOWTIMES - KHÔNG PHÂN TRANG
    =========================================================*/
    async getAllShowtimesAll(search = "") {
        return await ShowtimeRepository.findAllAll(search);
    }


    /*=========================================================
        GET ALL SHOWTIMES - CÓ PHÂN TRANG
    =========================================================*/
    async getAllShowtimesPaginated(page = 1, limit = 20, search = "") {
        return await ShowtimeRepository.findAll(page, limit, search);
    }


    /*=========================================================
        GET SHOWTIMES BY CINEMA + ROOM
    =========================================================*/
    async getShowtimesByCinemaAndRoom(cinema_id, room_id) {
        return await ShowtimeRepository.findByCinemaAndRoom(cinema_id, room_id);
    }


    /*=========================================================
        GET SHOWTIME DETAIL
    =========================================================*/
    async getShowtimeDetail(showtimeId) {
        const showtime = await ShowtimeRepository.findById(showtimeId);

        if (!showtime) {
            const err = new Error("Không tìm thấy suất chiếu");
            err.statusCode = 404;
            throw err;
        }

        return showtime;
    }


    /*=========================================================
        GET SHOWTIMES BY MOVIE
    =========================================================*/
    async getShowtimesByMovie(movieId) {
        return await ShowtimeRepository.findByMovie(movieId);
    }


    /*=========================================================
        GET SHOWTIMES FOR MOVIE DETAIL
        ❌ BỎ GIÁ - Frontend dùng PriceConfig
        ✅ THÊM TIME_SLOT và DAY_TYPE
    =========================================================*/
    async getShowtimesForMovieDetail(movieId, cinemaId, date) {
        const showtimes = await ShowtimeRepository.findByMovieCinemaDateForDetail(
            movieId,
            cinemaId,
            date
        );

        const enrichedShowtimes = showtimes.map((showtime) => {
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
            const key = item.room_type;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        return grouped;
    }


    /*=========================================================
        CREATE SHOWTIME - TẠO 1 SUẤT
    =========================================================*/
    async createShowtime(data) {
        let { movie_id, cinema_id, room_id, start_time } = data;

        start_time = formatDateTime(start_time);
        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        const validationError = validateShowtime({
            movie_id,
            cinema_id,
            room_id,
            start_time
        });

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

        return await ShowtimeRepository.create({
            movie_id,
            cinema_id,
            room_id,
            start_time
        });
    }


    /*=========================================================
        AUTO SCHEDULE SHOWTIMES - DÙNG SCHEDULER
        ❌ ĐÃ BỎ movieStats và getMovieTicketStats()
    =========================================================*/
    async scheduleShowtimes(data) {
        if (!data) {
            const err = new Error("Dữ liệu tạo lịch chiếu không hợp lệ");
            err.statusCode = 400;
            throw err;
        }

        const {
            movie_id,
            cinema_id,
            room_ids,
            start_date,
            end_date,
            start_hour,
            end_hour,
            distribution
        } = data;

        // NORMALIZE
        const movieId = Number(movie_id);
        const cinemaId = Number(cinema_id);

        // VALIDATE MOVIE
        if (!Number.isInteger(movieId) || movieId <= 0) {
            const err = new Error("Vui lòng chọn phim");
            err.statusCode = 400;
            err.field = "movie_id";
            throw err;
        }

        // VALIDATE CINEMA
        if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
            const err = new Error("Vui lòng chọn rạp");
            err.statusCode = 400;
            err.field = "cinema_id";
            throw err;
        }

        // VALIDATE ROOMS
        if (!Array.isArray(room_ids) || room_ids.length === 0) {
            const err = new Error("Vui lòng chọn ít nhất một phòng chiếu");
            err.statusCode = 400;
            err.field = "room_ids";
            throw err;
        }

        const normalizedRoomIds = [
            ...new Set(
                room_ids
                    .map(Number)
                    .filter((id) => Number.isInteger(id) && id > 0)
            )
        ];

        if (normalizedRoomIds.length === 0) {
            const err = new Error("Danh sách phòng chiếu không hợp lệ");
            err.statusCode = 400;
            err.field = "room_ids";
            throw err;
        }

        // VALIDATE DATES
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

        const startDate = new Date(`${start_date}T00:00:00`);
        const endDate = new Date(`${end_date}T00:00:00`);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            const err = new Error("Khoảng thời gian không hợp lệ");
            err.statusCode = 400;
            throw err;
        }

        if (endDate < startDate) {
            const err = new Error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
            err.statusCode = 400;
            err.field = "end_date";
            throw err;
        }

        // VALIDATE TIME
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

        const [startHour, startMinute] = scheduleStartHour.split(":").map(Number);
        const [endHour, endMinute] = scheduleEndHour.split(":").map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        if (endMinutes <= startMinutes) {
            const err = new Error("Giờ kết thúc phải lớn hơn giờ bắt đầu");
            err.statusCode = 400;
            err.field = "end_hour";
            throw err;
        }

        // VALIDATE DISTRIBUTION - hot, normal, cold
        const allowedDistribution = ["hot", "normal", "cold"];
        const scheduleDistribution = distribution || "normal";

        if (!allowedDistribution.includes(scheduleDistribution)) {
            const err = new Error("Mức độ phân bổ không hợp lệ. Chấp nhận: hot, normal, cold");
            err.statusCode = 400;
            err.field = "distribution";
            throw err;
        }

        // LẤY THÔNG TIN PHIM
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

        // LẤY DANH SÁCH PHÒNG
        const rooms = [];

        for (const roomId of normalizedRoomIds) {
            const room = await ShowtimeRepository.findRoomInCinema(roomId, cinemaId);

            if (!room) {
                const err = new Error(`Phòng ${roomId} không thuộc rạp đã chọn`);
                err.statusCode = 400;
                err.field = "room_ids";
                throw err;
            }

            rooms.push({
                room_id: room.room_id,
                room_name: room.room_name,
                room_type: room.room_type
            });
        }

        // LẤY SUẤT CHIẾU HIỆN CÓ
        const existingShowtimes = await ShowtimeRepository.getExistingShowtimes({
            cinemaId,
            startDate: start_date,
            endDate: end_date,
            roomIds: normalizedRoomIds
        });

        // ❌ KHÔNG CẦN movieStats NỮA - Admin đã chọn distribution
        // const movieStats = {};

        // CẤU HÌNH SCHEDULER
        const config = {
            weekdayStart: "08:00",
            weekdayEnd: "23:30",
            weekendStart: "08:00",
            weekendEnd: "24:00",
            bufferMinutes: 15,

            hotInterval: 30,
            normalInterval: 45,
            coldInterval: 60,

            hotMaxRooms: rooms.length,
            normalMaxRooms: Math.min(2, Math.ceil(rooms.length / 2)),
            coldMaxRooms: 1,

            hotThreshold: 100,
            normalThreshold: 50
        };

        const moviesForScheduler = [{
            movie_id: movieId,
            title: movie.title || `Phim ${movieId}`,
            duration: duration
        }];

        // GỌI SCHEDULER - KHÔNG truyền movieStats
        const generated = ShowtimeScheduler.generate({
            movies: moviesForScheduler,
            rooms: rooms,
            startDate: start_date,
            endDate: end_date,
            config: config,
            existingShowtimes: existingShowtimes
            // ❌ KHÔNG CÓ movieStats
        });

        // INSERT CÁC SUẤT HỢP LỆ
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

            const timeSlot = getTimeSlot(slotStartTime?.split(' ')[1] || '09:00');
            const dayType = getDayType(date);

            if (!Number.isInteger(roomId) || roomId <= 0 || !slotStartTime) {
                conflicts.push({
                    ...slot,
                    reason: "Suất chiếu không hợp lệ"
                });
                continue;
            }

            const isPast = await ShowtimeRepository.isPastTime(slotStartTime);

            if (isPast) {
                skippedPast.push({
                    ...slot,
                    reason: "Suất chiếu nằm trong quá khứ"
                });
                continue;
            }

            const conflict = await ShowtimeRepository.findConflict(
                roomId,
                slotStartTime,
                slotEndTime
            );

            if (conflict) {
                conflicts.push({
                    ...slot,
                    reason: "Phòng đã có suất chiếu bị trùng thời gian"
                });
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
                    start_time: slotStartTime,
                    end_time: slotEndTime,
                    duration: duration,
                    time_slot: timeSlot,
                    time_slot_label: TIME_SLOT_LABELS[timeSlot],
                    day_type: dayType,
                    day_type_label: DAY_TYPE_LABELS[dayType]
                };

                created.push(createdSlot);

                timeSlotStats[timeSlot].count++;
                timeSlotStats[timeSlot].slots.push(createdSlot);

                dayTypeStats[dayType].count++;
                dayTypeStats[dayType].slots.push(createdSlot);

            } catch (error) {
                conflicts.push({
                    ...slot,
                    reason: error.message || "Không thể tạo suất chiếu"
                });
            }
        }

        // RETURN
        return {
            success: true,
            data: created,
            conflicts,
            skippedPast,
            summary: {
                movieId: movieId,
                cinemaId: cinemaId,
                roomCount: rooms.length,
                generatedCount: generated.data.length,
                createdCount: created.length,
                conflictCount: conflicts.length,
                skippedPastCount: skippedPast.length,
                duration: duration,
                startDate: start_date,
                endDate: end_date,
                startTime: scheduleStartHour,
                endTime: scheduleEndHour,
                distribution: scheduleDistribution,
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
                timeSlotDetails: {
                    MORNING: {
                        label: TIME_SLOT_LABELS.MORNING,
                        count: timeSlotStats.MORNING.count,
                        slots: timeSlotStats.MORNING.slots.map(s => s.start_time)
                    },
                    AFTERNOON: {
                        label: TIME_SLOT_LABELS.AFTERNOON,
                        count: timeSlotStats.AFTERNOON.count,
                        slots: timeSlotStats.AFTERNOON.slots.map(s => s.start_time)
                    },
                    EVENING: {
                        label: TIME_SLOT_LABELS.EVENING,
                        count: timeSlotStats.EVENING.count,
                        slots: timeSlotStats.EVENING.slots.map(s => s.start_time)
                    },
                    NIGHT: {
                        label: TIME_SLOT_LABELS.NIGHT,
                        count: timeSlotStats.NIGHT.count,
                        slots: timeSlotStats.NIGHT.slots.map(s => s.start_time)
                    }
                },
                dayTypeDetails: {
                    WEEKDAY: {
                        label: DAY_TYPE_LABELS.WEEKDAY,
                        count: dayTypeStats.WEEKDAY.count
                    },
                    WEEKEND: {
                        label: DAY_TYPE_LABELS.WEEKEND,
                        count: dayTypeStats.WEEKEND.count
                    }
                }
            },
            schedulerStats: generated.stats || null,
            schedulerDistribution: generated.distribution || null
        };
    }


    /*=========================================================
        UPDATE SHOWTIME
    =========================================================*/
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

        const validationError = validateShowtime({
            movie_id,
            cinema_id,
            room_id,
            start_time
        });

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

        const conflict = await ShowtimeRepository.findConflict(
            room_id,
            start_time,
            showtimeId
        );

        if (conflict) {
            const err = new Error("Phòng này đã có lịch chiếu giờ đó");
            err.statusCode = 400;
            err.field = "start_time";
            throw err;
        }

        const affected = await ShowtimeRepository.update(showtimeId, {
            movie_id,
            cinema_id,
            room_id,
            start_time
        });

        if (affected === 0) {
            const err = new Error("Không thể cập nhật suất chiếu");
            err.statusCode = 500;
            throw err;
        }

        return true;
    }


    /*=========================================================
        DELETE SHOWTIME
    =========================================================*/
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


    /*=========================================================
        QUICK BOOKING DATA
    =========================================================*/
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


    /*=========================================================
        GET SHOWTIMES FOR BOOKING
    =========================================================*/
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


    /*=========================================================
        FILTER SHOWTIMES
    =========================================================*/
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