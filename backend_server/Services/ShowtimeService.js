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

    return String(dateTime)
        .replace("T", " ")
        .substring(0, 16);
};

const getTimeSlot = (startTime) => {
    if (!startTime) return "MORNING";

    const hour = parseInt(
        String(startTime).split(":")[0],
        10
    );

    if (hour >= 6 && hour < 12) return "MORNING";
    if (hour >= 12 && hour < 17) return "AFTERNOON";
    if (hour >= 17 && hour < 20) return "EVENING";

    return "NIGHT";
};

const getDayType = (date) => {
    if (!date) return "WEEKDAY";

    const d =
        typeof date === "string"
            ? new Date(`${date}T00:00:00Z`)
            : new Date(date);

    const dayOfWeek = d.getUTCDay();

    return dayOfWeek === 0 || dayOfWeek === 6
        ? "WEEKEND"
        : "WEEKDAY";
};

const normalizeRoomTypes = (roomTypes) => {
    if (!Array.isArray(roomTypes)) return [];

    return [
        ...new Set(
            roomTypes
                .map((type) =>
                    String(type)
                        .trim()
                        .toUpperCase()
                )
                .filter((type) =>
                    ALLOWED_ROOM_TYPES.includes(type)
                )
        )
    ];
};

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

// ==========================================================
// DATE HELPERS
// ==========================================================

const parseDate = (date) => {
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

    return new Date(
        Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        )
    );
};

const formatDate = (date) => {
    return `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getUTCDate()
    ).padStart(2, "0")}`;
};

const addDays = (date, days) => {
    const result = new Date(date);

    result.setUTCDate(
        result.getUTCDate() + days
    );

    return result;
};

const isWeekend = (date) => {
    const d =
        typeof date === "string"
            ? new Date(`${date}T00:00:00Z`)
            : new Date(date);

    const day = d.getUTCDay();

    return day === 0 || day === 6;
};

// ==========================================================
// TIME HELPERS
// ==========================================================

const timeToMinutes = (time) => {
    if (time === "24:00") {
        return 24 * 60;
    }

    const [hour, minute] = String(time)
        .split(":")
        .map(Number);

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

    return hour * 60 + minute;
};

const minutesToTime = (totalMinutes) => {
    if (totalMinutes === 24 * 60) {
        return "24:00";
    }

    const hour = Math.floor(
        totalMinutes / 60
    );

    const minute = totalMinutes % 60;

    return `${String(hour).padStart(
        2,
        "0"
    )}:${String(minute).padStart(2, "0")}`;
};

const buildDateTime = (date, minutes) => {
    if (minutes >= 24 * 60) {
        const overflow =
            minutes - 24 * 60;

        const nextDate = addDays(
            parseDate(date),
            1
        );

        return `${formatDate(
            nextDate
        )} ${minutesToTime(overflow)}`;
    }

    return `${date} ${minutesToTime(minutes)}`;
};

const getTimeRangeForDate = (
    date,
    config
) => {
    const weekend = isWeekend(date);

    const startTime = weekend
        ? config.weekendStart
        : config.weekdayStart;

    const endTime = weekend
        ? config.weekendEnd
        : config.weekdayEnd;

    return {
        startTime,
        endTime,
        startMinutes:
            timeToMinutes(startTime),
        endMinutes:
            timeToMinutes(endTime),
        isWeekend: weekend
    };
};

// ==========================================================
// ROOM HELPERS
// ==========================================================

const sortRoomsNaturally = (rooms) => {
    return [...rooms].sort((a, b) => {
        const nameA = String(
            a.room_name || a.room_id || ""
        );

        const nameB = String(
            b.room_name || b.room_id || ""
        );

        return nameA.localeCompare(
            nameB,
            undefined,
            {
                numeric: true,
                sensitivity: "base"
            }
        );
    });
};

const filterRoomsByType = (
    rooms,
    roomTypes = []
) => {
    if (!Array.isArray(rooms)) {
        return [];
    }

    if (
        !Array.isArray(roomTypes) ||
        roomTypes.length === 0
    ) {
        return rooms.filter((room) =>
            Number.isInteger(
                Number(room.room_id)
            )
        );
    }

    const normalizedTypes =
        normalizeRoomTypes(roomTypes);

    return rooms.filter((room) => {
        const roomType = String(
            room.room_type || ""
        )
            .trim()
            .toUpperCase();

        return (
            normalizedTypes.includes(
                roomType
            ) &&
            Number.isInteger(
                Number(room.room_id)
            )
        );
    });
};

// ==========================================================
// NORMALIZE SHOWTIME
// ==========================================================

const normalizeShowtime = (
    showtime
) => {
    if (!showtime) return null;

    let date = showtime.date || null;

    let startMinutes = Number(
        showtime.startMinutes
    );

    let duration = Number(
        showtime.duration
    );

    if (
        !Number.isFinite(
            startMinutes
        ) &&
        showtime.start_time
    ) {
        const raw = String(
            showtime.start_time
        ).replace("T", " ");

        const parts = raw.split(" ");

        if (!date && parts[0]) {
            date = parts[0];
        }

        const time =
            parts[1] || "00:00";

        startMinutes = timeToMinutes(
            time.substring(0, 5)
        );
    }

    if (!Number.isFinite(duration)) {
        duration =
            Number(
                showtime.movie_duration
            ) || 0;
    }

    return {
        ...showtime,
        date,
        room_id: Number(
            showtime.room_id
        ),
        movie_id: Number(
            showtime.movie_id
        ),
        startMinutes,
        duration
    };
};

// ==========================================================
// ROOM CONFLICT
// ==========================================================

const hasRoomConflict = ({
    roomId,
    startMinutes,
    endMinutes,
    existingShowtimes = [],
    bufferMinutes = 15
}) => {
    return existingShowtimes.some(
        (existingRaw) => {
            const existing =
                normalizeShowtime(
                    existingRaw
                );

            if (!existing) {
                return false;
            }

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

            const existingEnd =
                existingStart +
                existing.duration +
                Number(
                    bufferMinutes || 0
                );

            return (
                startMinutes <
                    existingEnd &&
                endMinutes >
                    existingStart
            );
        }
    );
};

// ==========================================================
// FIND AVAILABLE ROOM
// ==========================================================

const findAvailableRoom = ({
    preferredRooms = [],
    poolRooms = [],
    startMinutes,
    endMinutes,
    existingShowtimes = [],
    bufferMinutes = 15
}) => {
    const pool =
        Array.isArray(poolRooms) &&
        poolRooms.length > 0
            ? poolRooms
            : preferredRooms;

    if (
        !Array.isArray(pool) ||
        pool.length === 0
    ) {
        return null;
    }

    const sortedPool =
        sortRoomsNaturally(pool);

    for (const room of sortedPool) {
        const roomId = Number(
            room.room_id
        );

        if (
            !Number.isInteger(roomId) ||
            roomId <= 0
        ) {
            continue;
        }

        if (
            !hasRoomConflict({
                roomId,
                startMinutes,
                endMinutes,
                existingShowtimes,
                bufferMinutes
            })
        ) {
            return {
                room
            };
        }
    }

    return null;
};

// ==========================================================
// SERVICE CLASS
// ==========================================================

class ShowtimeService {

    // ======================================================
    // GET ALL
    // ======================================================

    async getAllShowtimesAll(
        search = ""
    ) {
        return await ShowtimeRepository.findAllAll(
            search
        );
    }

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

    async getShowtimesByCinemaAndRoom(
        cinema_id,
        room_id
    ) {
        return await ShowtimeRepository.findByCinemaAndRoom(
            cinema_id,
            room_id
        );
    }

    async getShowtimeDetail(
        showtimeId
    ) {
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

    async getShowtimesByMovie(
        movieId
    ) {
        return await ShowtimeRepository.findByMovie(
            movieId
        );
    }

    async getShowtimesForMovieDetail(
        movieId,
        cinemaId,
        date
    ) {
        const showtimes =
            await ShowtimeRepository.findByMovieCinemaDateForDetail(
                movieId,
                cinemaId,
                date
            );

        const enrichedShowtimes =
            showtimes.map(
                (showtime) => {
                    const timeSlot =
                        getTimeSlot(
                            showtime.start_time
                        );

                    const dayType =
                        getDayType(date);

                    return {
                        ...showtime,
                        time_slot:
                            timeSlot,
                        time_slot_label:
                            TIME_SLOT_LABELS[
                                timeSlot
                            ] ||
                            timeSlot,
                        day_type:
                            dayType,
                        day_type_label:
                            DAY_TYPE_LABELS[
                                dayType
                            ] ||
                            dayType
                    };
                }
            );

        const grouped =
            enrichedShowtimes.reduce(
                (acc, item) => {
                    const key =
                        item.room_type ||
                        "UNKNOWN";

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

    // ======================================================
    // CREATE MANUAL SHOWTIME
    // ======================================================

    async createShowtime(data) {
        let {
            movie_id,
            cinema_id,
            room_id,
            start_time
        } = data;

        start_time =
            formatDateTime(
                start_time
            );

        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        const validationError =
            validateShowtime({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });

        if (validationError) {
            const err = new Error(
                validationError
            );

            err.statusCode = 400;

            throw err;
        }

        const isPast =
            await ShowtimeRepository.isPastTime(
                start_time
            );

        if (isPast) {
            const err = new Error(
                "Không thể tạo suất chiếu trong quá khứ"
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }

        const conflict =
            await ShowtimeRepository.findConflict(
                room_id,
                start_time
            );

        if (conflict) {
            const err = new Error(
                "Phòng này đã có lịch chiếu vào giờ đó"
            );

            err.statusCode = 400;
            err.field = "start_time";

            throw err;
        }

        return await ShowtimeRepository.create(
            {
                movie_id,
                cinema_id,
                room_id,
                start_time
            }
        );
    }

    // ==========================================================
    // SCHEDULE SHOWTIMES
    // ==========================================================

    async scheduleShowtimes(data) {

        // ======================================================
        // 1. VALIDATE INPUT
        // ======================================================

        if (!data) {
            const err = new Error(
                "Dữ liệu tạo lịch chiếu không hợp lệ"
            );

            err.statusCode = 400;

            throw err;
        }

        const {
            movies,
            cinema_id,
            start_date,
            end_date
        } = data;

        const cinemaId =
            Number(cinema_id);

        if (
            !cinemaId ||
            cinemaId <= 0
        ) {
            const err = new Error(
                "Vui lòng chọn rạp"
            );

            err.statusCode = 400;
            err.field = "cinema_id";

            throw err;
        }

        if (
            !start_date ||
            !end_date
        ) {
            const err = new Error(
                "Vui lòng chọn ngày"
            );

            err.statusCode = 400;
            err.field = "start_date";

            throw err;
        }

        const startDate =
            parseDate(start_date);

        const endDate =
            parseDate(end_date);

        if (endDate < startDate) {
            const err = new Error(
                "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
            );

            err.statusCode = 400;
            err.field = "end_date";

            throw err;
        }

        // ======================================================
        // 2. GET OPERATING HOURS
        // ======================================================

        const operatingHours =
            await ShowtimeRepository.getOperatingHours(
                cinemaId
            );

        console.log(
            `📋 GIỜ HOẠT ĐỘNG CỦA RẠP ${cinemaId}:`
        );

        console.log(
            `  Ngày thường: ${operatingHours.weekday.open} → ${operatingHours.weekday.close}`
        );

        console.log(
            `  Cuối tuần: ${operatingHours.weekend.open} → ${operatingHours.weekend.close}`
        );

        // ======================================================
        // 3. BUILD MOVIE LIST
        // ======================================================

        let moviesData = [];

        if (
            Array.isArray(movies) &&
            movies.length > 0
        ) {
            for (const item of movies) {

                const movieId =
                    Number(item.movie_id);

                if (
                    !Number.isInteger(
                        movieId
                    ) ||
                    movieId <= 0
                ) {
                    console.warn(
                        `⚠️ Movie ID không hợp lệ: ${item.movie_id}`
                    );

                    continue;
                }

                const movie =
                    await ShowtimeRepository.getMovieDuration(
                        movieId
                    );

                if (movie) {
                    moviesData.push(
                        movie
                    );
                } else {
                    console.warn(
                        `⚠️ Không tìm thấy phim với ID: ${movieId}`
                    );
                }
            }
        } else {

            const allMovies =
                await ShowtimeRepository.getActiveMovies();

            moviesData =
                Array.isArray(allMovies)
                    ? allMovies
                    : [];
        }

        if (
            moviesData.length === 0
        ) {
            const err = new Error(
                "Không có phim nào để tạo lịch"
            );

            err.statusCode = 400;
            err.field = "movies";

            throw err;
        }

        console.log(
            `📋 DANH SÁCH PHIM (${moviesData.length} phim):`
        );

        for (const movie of moviesData) {
            console.log(
                `  🎬 ${movie.title} (${movie.movie_id}) - ${movie.duration} phút`
            );
        }

        // ======================================================
        // 4. GET ROOMS
        // ======================================================

        let rooms =
            await ShowtimeRepository.findRoomsByCinema(
                cinemaId
            );

        rooms = Array.isArray(rooms)
            ? rooms
                  .map((room) => ({
                      ...room,
                      room_id: Number(
                          room.room_id
                      ),
                      room_type:
                          String(
                              room.room_type ||
                                  ""
                          )
                              .trim()
                              .toUpperCase()
                  }))
                  .filter(
                      (room) =>
                          Number.isInteger(
                              room.room_id
                          ) &&
                          room.room_id > 0 &&
                          ALLOWED_ROOM_TYPES.includes(
                              room.room_type
                          )
                  )
            : [];

        if (rooms.length === 0) {
            const err = new Error(
                "Rạp không có phòng chiếu hợp lệ."
            );

            err.statusCode = 400;
            err.field = "cinema_id";

            throw err;
        }

        const allRoomTypes = [
            ...new Set(
                rooms.map(
                    (room) =>
                        room.room_type
                )
            )
        ];

        console.log(
            `📋 Rạp có ${rooms.length} phòng:`
        );

        for (const room of sortRoomsNaturally(
            rooms
        )) {
            console.log(
                `  🎥 ${room.room_name} | ${room.room_type} | ID ${room.room_id}`
            );
        }

        console.log(
            `📋 Hạng phòng: ${allRoomTypes.join(
                ", "
            )}`
        );

        // ======================================================
        // 5. GET EXISTING SHOWTIMES
        // ======================================================

        const schedulerRoomIds =
            rooms.map((room) =>
                Number(room.room_id)
            );

        let existingShowtimes =
            await ShowtimeRepository.getExistingShowtimes(
                {
                    cinemaId,
                    startDate:
                        start_date,
                    endDate:
                        end_date,
                    roomIds:
                        schedulerRoomIds
                }
            );

        if (
            !Array.isArray(
                existingShowtimes
            )
        ) {
            existingShowtimes = [];
        }

        console.log(
            `📚 Đã tải ${existingShowtimes.length} suất chiếu hiện tại`
        );

        // ======================================================
        // 6. RESULT ARRAYS
        // ======================================================

        const created = [];
        const conflicts = [];
        const skippedPast = [];
        const skippedNoRoom = [];
        const skippedOutsideHours = [];
        const skippedInvalidConfig = [];

        // ======================================================
        // 7. STATISTICS
        // ======================================================

        const timeSlotStats = {
            MORNING: {
                count: 0,
                slots: []
            },

            AFTERNOON: {
                count: 0,
                slots: []
            },

            EVENING: {
                count: 0,
                slots: []
            },

            NIGHT: {
                count: 0,
                slots: []
            }
        };

        const dayTypeStats = {
            WEEKDAY: {
                count: 0,
                slots: []
            },

            WEEKEND: {
                count: 0,
                slots: []
            }
        };

        // ======================================================
        // 8. MANUAL CONFIG CACHE
        //
        // QUAN TRỌNG:
        // KHÔNG lấy config ALL một lần nữa.
        //
        // Mỗi ngày sẽ lấy:
        // WEEKDAY => WEEKDAY + ALL
        // WEEKEND => WEEKEND + ALL
        // ======================================================

        const manualConfigs = {};

        // ======================================================
        // 9. LOOP EACH DATE
        // ======================================================

        let currentDate =
            parseDate(start_date);

        while (
            currentDate <= endDate
        ) {

            const dateStr =
                formatDate(
                    currentDate
                );

            const dayType =
                getDayType(dateStr);

            const timeRange =
                getTimeRangeForDate(
                    dateStr,
                    {
                        weekdayStart:
                            operatingHours
                                .weekday
                                .open,

                        weekdayEnd:
                            operatingHours
                                .weekday
                                .close,

                        weekendStart:
                            operatingHours
                                .weekend
                                .open,

                        weekendEnd:
                            operatingHours
                                .weekend
                                .close
                    }
                );

            console.log("");
            console.log(
                `📅 NGÀY ${dateStr} (${dayType})`
            );

            console.log(
                `  ⏰ Giờ hoạt động: ${minutesToTime(
                    timeRange.startMinutes
                )} → ${minutesToTime(
                    timeRange.endMinutes
                )}`
            );

            // ==================================================
            // 10. LOOP EACH MOVIE
            // ==================================================

            for (const movie of moviesData) {

                const movieId =
                    Number(
                        movie.movie_id
                    );

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
                        `⚠️ Phim "${movie.title}" có thời lượng không hợp lệ: ${movie.duration}`
                    );

                    skippedInvalidConfig.push(
                        {
                            movie_id:
                                movieId,

                            title:
                                movie.title,

                            date:
                                dateStr,

                            reason:
                                "Thời lượng phim không hợp lệ"
                        }
                    );

                    continue;
                }

                // ==================================================
                // 11. GET CONFIG ĐÚNG DAY TYPE
                // ==================================================

                let manualConfig =
                    await ShowtimeRepository.getMovieShowtimeConfig(
                        movieId,
                        cinemaId,
                        dayType
                    );

                if (
                    !manualConfig ||
                    Object.keys(
                        manualConfig
                    ).length === 0
                ) {
                    console.log(
                        `⚠️ ${movie.title} (${dateStr}) không có cấu hình ${dayType}`
                    );

                    continue;
                }

                // Cache lại để response trả về frontend
                if (!manualConfigs[movieId]) {
                    manualConfigs[movieId] =
                        {};
                }

                manualConfigs[movieId][
                    dayType
                ] = manualConfig;

                console.log(
                    `📋 CONFIG ${movie.title} | ${dateStr} | ${dayType}`
                );

                // ==================================================
                // 12. LOOP TIME SLOT
                // ==================================================

                const timeSlotOrder = [
                    "MORNING",
                    "AFTERNOON",
                    "EVENING",
                    "NIGHT"
                ];

                for (const timeSlotKey of timeSlotOrder) {

                    const slotConfigs =
                        manualConfig[
                            timeSlotKey
                        ];

                    if (
                        !Array.isArray(
                            slotConfigs
                        ) ||
                        slotConfigs.length === 0
                    ) {
                        continue;
                    }

                    // ==================================================
                    // TIME SLOT START
                    // ==================================================

                    const timeSlotStart = {
                        MORNING:
                            timeRange.startMinutes,

                        AFTERNOON:
                            Math.max(
                                timeRange.startMinutes,
                                12 * 60
                            ),

                        EVENING:
                            Math.max(
                                timeRange.startMinutes,
                                17 * 60
                            ),

                        NIGHT:
                            Math.max(
                                timeRange.startMinutes,
                                20 * 60
                            )
                    };

                    const slotStart =
                        timeSlotStart[
                            timeSlotKey
                        ] ??
                        timeRange.startMinutes;

                    // ==================================================
                    // 13. LOOP CONFIG ROOM TYPE
                    // ==================================================

                    for (
                        const slotConfig of slotConfigs
                    ) {

                        const roomType =
                            String(
                                slotConfig.room_type ||
                                    ""
                            )
                                .trim()
                                .toUpperCase();

                        const slotCount =
                            Number(
                                slotConfig.slot_count
                            );

                        const intervalMinutes =
                            Number(
                                slotConfig.interval_minutes
                            );

                        // ==================================================
                        // VALIDATE CONFIG
                        // ==================================================

                        if (
                            !ALLOWED_ROOM_TYPES.includes(
                                roomType
                            )
                        ) {
                            console.warn(
                                `⚠️ Room type không hợp lệ: ${slotConfig.room_type}`
                            );

                            skippedInvalidConfig.push(
                                {
                                    movie_id:
                                        movieId,

                                    title:
                                        movie.title,

                                    date:
                                        dateStr,

                                    time_slot:
                                        timeSlotKey,

                                    room_type:
                                        roomType,

                                    reason:
                                        "Room type không hợp lệ"
                                }
                            );

                            continue;
                        }

                        if (
                            !Number.isFinite(
                                slotCount
                            ) ||
                            slotCount <= 0
                        ) {
                            console.warn(
                                `⚠️ slot_count không hợp lệ: ${slotCount}`
                            );

                            skippedInvalidConfig.push(
                                {
                                    movie_id:
                                        movieId,

                                    title:
                                        movie.title,

                                    date:
                                        dateStr,

                                    time_slot:
                                        timeSlotKey,

                                    room_type:
                                        roomType,

                                    reason:
                                        "slot_count không hợp lệ"
                                }
                            );

                            continue;
                        }

                        if (
                            !Number.isFinite(
                                intervalMinutes
                            ) ||
                            intervalMinutes <= 0
                        ) {
                            console.warn(
                                `⚠️ interval_minutes không hợp lệ: ${intervalMinutes}`
                            );

                            skippedInvalidConfig.push(
                                {
                                    movie_id:
                                        movieId,

                                    title:
                                        movie.title,

                                    date:
                                        dateStr,

                                    time_slot:
                                        timeSlotKey,

                                    room_type:
                                        roomType,

                                    reason:
                                        "interval_minutes không hợp lệ"
                                }
                            );

                            continue;
                        }

                        // ==================================================
                        // 14. FIND ROOMS BY TYPE
                        // ==================================================

                        const availableRooms =
                            filterRoomsByType(
                                rooms,
                                [roomType]
                            );

                        if (
                            availableRooms.length === 0
                        ) {
                            console.warn(
                                `⚠️ Không có phòng ${roomType} cho phim "${movie.title}"`
                            );

                            skippedNoRoom.push(
                                {
                                    movie_id:
                                        movieId,

                                    title:
                                        movie.title,

                                    date:
                                        dateStr,

                                    time_slot:
                                        timeSlotKey,

                                    room_type:
                                        roomType,

                                    reason:
                                        `Không có phòng ${roomType}`
                                }
                            );

                            continue;
                        }

                        console.log(
                            `  🎬 ${movie.title} | ${timeSlotKey} | ${roomType} | ${slotCount} suất | mỗi ${intervalMinutes} phút`
                        );

                        // ==================================================
                        // 15. IMPORTANT
                        //
                        // Mỗi room_type bắt đầu độc lập từ đầu time slot.
                        // ==================================================

                        let currentTime =
                            slotStart;

                        if (
                            currentTime <
                            timeRange.startMinutes
                        ) {
                            currentTime =
                                timeRange.startMinutes;
                        }

                        // Nếu slot bắt đầu sau giờ đóng cửa
                        if (
                            currentTime >=
                            timeRange.endMinutes
                        ) {
                            skippedOutsideHours.push(
                                {
                                    movie_id:
                                        movieId,

                                    title:
                                        movie.title,

                                    date:
                                        dateStr,

                                    time_slot:
                                        timeSlotKey,

                                    room_type:
                                        roomType,

                                    reason:
                                        "Time slot nằm ngoài giờ hoạt động"
                                }
                            );

                            continue;
                        }

                        let slotsCreated = 0;

                        let attempts = 0;

                        const maxAttempts =
                            Math.max(
                                slotCount * 50,
                                50
                            );

                        // ==================================================
                        // 16. CREATE SLOTS
                        // ==================================================

                        while (
                            slotsCreated <
                                slotCount &&
                            attempts <
                                maxAttempts
                        ) {

                            attempts++;

                            const endMinutes =
                                currentTime +
                                duration;

                            // ==================================================
                            // Nếu phim không thể kết thúc trước giờ đóng
                            // thì thử time tiếp theo.
                            // ==================================================

                            if (
                                endMinutes >
                                timeRange.endMinutes
                            ) {
                                skippedOutsideHours.push(
                                    {
                                        movie_id:
                                            movieId,

                                        title:
                                            movie.title,

                                        date:
                                            dateStr,

                                        time_slot:
                                            timeSlotKey,

                                        room_type:
                                            roomType,

                                        start_time:
                                            buildDateTime(
                                                dateStr,
                                                currentTime
                                            ),

                                        reason:
                                            "Suất chiếu vượt quá giờ đóng cửa"
                                    }
                                );

                                break;
                            }

                            // ==================================================
                            // 17. FIND AVAILABLE ROOM
                            // ==================================================

                            const allCurrentShowtimes =
                                [
                                    ...existingShowtimes,
                                    ...created
                                ];

                            const availableRoom =
                                findAvailableRoom(
                                    {
                                        poolRooms:
                                            availableRooms,

                                        startMinutes:
                                            currentTime,

                                        endMinutes:
                                            endMinutes,

                                        existingShowtimes:
                                            allCurrentShowtimes,

                                        bufferMinutes:
                                            15
                                    }
                                );

                            // ==================================================
                            // 18. NO ROOM AVAILABLE
                            // ==================================================

                            if (
                                !availableRoom
                            ) {

                                conflicts.push(
                                    {
                                        movie_id:
                                            movieId,

                                        title:
                                            movie.title,

                                        date:
                                            dateStr,

                                        time_slot:
                                            timeSlotKey,

                                        room_type:
                                            roomType,

                                        start_time:
                                            buildDateTime(
                                                dateStr,
                                                currentTime
                                            ),

                                        reason:
                                            "Tất cả phòng loại này đang bị trùng lịch"
                                    }
                                );

                                // Thử thời gian tiếp theo
                                currentTime +=
                                    intervalMinutes;

                                continue;
                            }

                            const room =
                                availableRoom.room;

                            const roomId =
                                Number(
                                    room.room_id
                                );

                            const startTimeStr =
                                buildDateTime(
                                    dateStr,
                                    currentTime
                                );

                            const endTimeStr =
                                buildDateTime(
                                    dateStr,
                                    endMinutes
                                );

                            // ==================================================
                            // 19. CHECK PAST
                            // ==================================================

                            const isPast =
                                await ShowtimeRepository.isPastTime(
                                    startTimeStr
                                );

                            if (isPast) {

                                skippedPast.push(
                                    {
                                        movie_id:
                                            movieId,

                                        title:
                                            movie.title,

                                        date:
                                            dateStr,

                                        room_id:
                                            roomId,

                                        room_type:
                                            roomType,

                                        start_time:
                                            startTimeStr,

                                        reason:
                                            "Suất chiếu nằm trong quá khứ"
                                    }
                                );

                                currentTime +=
                                    intervalMinutes;

                                continue;
                            }

                            // ==================================================
                            // 20. FINAL CONFLICT CHECK
                            // ==================================================

                            const finalConflict =
                                hasRoomConflict(
                                    {
                                        roomId,
                                        startMinutes:
                                            currentTime,
                                        endMinutes:
                                            endMinutes,
                                        existingShowtimes:
                                            [
                                                ...existingShowtimes,
                                                ...created
                                            ],
                                        bufferMinutes:
                                            15
                                    }
                                );

                            if (
                                finalConflict
                            ) {

                                conflicts.push(
                                    {
                                        movie_id:
                                            movieId,

                                        title:
                                            movie.title,

                                        date:
                                            dateStr,

                                        room_id:
                                            roomId,

                                        room_type:
                                            roomType,

                                        start_time:
                                            startTimeStr,

                                        reason:
                                            "Phòng bị trùng lịch"
                                    }
                                );

                                currentTime +=
                                    intervalMinutes;

                                continue;
                            }

                            // ==================================================
                            // 21. INSERT DATABASE
                            // ==================================================

                            try {

                                const showtimeId =
                                    await ShowtimeRepository.create(
                                        {
                                            movie_id:
                                                movieId,

                                            cinema_id:
                                                cinemaId,

                                            room_id:
                                                roomId,

                                            start_time:
                                                startTimeStr
                                        }
                                    );

                                const timeSlot =
                                    getTimeSlot(
                                        startTimeStr.split(
                                            " "
                                        )[1] ||
                                            "09:00"
                                    );

                                const dayTypeResult =
                                    getDayType(
                                        dateStr
                                    );

                                const createdSlot =
                                    {
                                        showtime_id:
                                            showtimeId,

                                        movie_id:
                                            movieId,

                                        cinema_id:
                                            cinemaId,

                                        room_id:
                                            roomId,

                                        room_type:
                                            roomType,

                                        room_name:
                                            room.room_name,

                                        title:
                                            movie.title,

                                        start_time:
                                            startTimeStr,

                                        end_time:
                                            endTimeStr,

                                        duration:
                                            duration,

                                        time_slot:
                                            timeSlot,

                                        time_slot_label:
                                            TIME_SLOT_LABELS[
                                                timeSlot
                                            ],

                                        day_type:
                                            dayTypeResult,

                                        day_type_label:
                                            DAY_TYPE_LABELS[
                                                dayTypeResult
                                            ]
                                    };

                                created.push(
                                    createdSlot
                                );

                                slotsCreated++;

                                // ==================================================
                                // STATISTICS
                                // ==================================================

                                if (
                                    timeSlotStats[
                                        timeSlot
                                    ]
                                ) {
                                    timeSlotStats[
                                        timeSlot
                                    ].count++;

                                    timeSlotStats[
                                        timeSlot
                                    ].slots.push(
                                        createdSlot
                                    );
                                }

                                if (
                                    dayTypeStats[
                                        dayTypeResult
                                    ]
                                ) {
                                    dayTypeStats[
                                        dayTypeResult
                                    ].count++;

                                    dayTypeStats[
                                        dayTypeResult
                                    ].slots.push(
                                        createdSlot
                                    );
                                }

                                console.log(
                                    `  ✅ TẠO: ${movie.title} | ${startTimeStr} → ${endTimeStr} | ${roomType} | ${room.room_name} | ID=${showtimeId}`
                                );

                            } catch (
                                error
                            ) {

                                console.error(
                                    `  ❌ INSERT SHOWTIME FAILED:`,
                                    error.message
                                );

                                conflicts.push(
                                    {
                                        movie_id:
                                            movieId,

                                        title:
                                            movie.title,

                                        date:
                                            dateStr,

                                        room_id:
                                            roomId,

                                        room_type:
                                            roomType,

                                        start_time:
                                            startTimeStr,

                                        reason:
                                            error.message
                                    }
                                );
                            }

                            // ==================================================
                            // 22. NEXT SLOT
                            // ==================================================

                            currentTime +=
                                intervalMinutes;
                        }

                        if (
                            slotsCreated <
                            slotCount
                        ) {
                            console.log(
                                `  ⚠️ ${movie.title} | ${timeSlotKey} | ${roomType}: tạo ${slotsCreated}/${slotCount} suất`
                            );
                        } else {
                            console.log(
                                `  ✅ ${movie.title} | ${timeSlotKey} | ${roomType}: đủ ${slotsCreated}/${slotCount} suất`
                            );
                        }
                    }
                }
            }

            // ==================================================
            // NEXT DATE
            // ==================================================

            currentDate =
                addDays(
                    currentDate,
                    1
                );
        }

        // ======================================================
        // 23. SUMMARY
        // ======================================================

        const summary = {
            cinemaId,

            roomCount:
                rooms.length,

            roomTypes:
                allRoomTypes,

            movieCount:
                moviesData.length,

            movieIds:
                moviesData.map(
                    (movie) =>
                        Number(
                            movie.movie_id
                        )
                ),

            movies:
                moviesData.map(
                    (movie) => ({
                        movie_id:
                            Number(
                                movie.movie_id
                            ),

                        title:
                            movie.title
                    })
                ),

            startDate:
                start_date,

            endDate:
                end_date,

            createdCount:
                created.length,

            conflictCount:
                conflicts.length,

            skippedPastCount:
                skippedPast.length,

            skippedNoRoomCount:
                skippedNoRoom.length,

            skippedOutsideHoursCount:
                skippedOutsideHours.length,

            skippedInvalidConfigCount:
                skippedInvalidConfig.length,

            byRoomType:
                created.reduce(
                    (acc, slot) => {
                        const type =
                            slot.room_type ||
                            "UNKNOWN";

                        acc[type] =
                            (acc[type] || 0) +
                            1;

                        return acc;
                    },
                    {}
                ),

            byTimeSlot: {
                MORNING:
                    timeSlotStats
                        .MORNING
                        .count,

                AFTERNOON:
                    timeSlotStats
                        .AFTERNOON
                        .count,

                EVENING:
                    timeSlotStats
                        .EVENING
                        .count,

                NIGHT:
                    timeSlotStats
                        .NIGHT
                        .count
            },

            byDayType: {
                WEEKDAY:
                    dayTypeStats
                        .WEEKDAY
                        .count,

                WEEKEND:
                    dayTypeStats
                        .WEEKEND
                        .count
            },

            byMovie:
                created.reduce(
                    (acc, slot) => {
                        const key =
                            slot.movie_id;

                        if (!acc[key]) {
                            acc[key] = {
                                title:
                                    slot.title,
                                count: 0
                            };
                        }

                        acc[key].count++;

                        return acc;
                    },
                    {}
                )
        };

        // ======================================================
        // 24. LOG FINAL
        // ======================================================

        console.log("");
        console.log(
            "=========================================================="
        );

        console.log(
            "🎯 KẾT QUẢ TẠO LỊCH"
        );

        console.log(
            "=========================================================="
        );

        console.log(
            `🏢 Rạp: ${cinemaId}`
        );

        console.log(
            `🎬 Số phim: ${moviesData.length}`
        );

        console.log(
            `🏠 Số phòng: ${rooms.length}`
        );

        console.log(
            `📅 Từ ngày: ${start_date}`
        );

        console.log(
            `📅 Đến ngày: ${end_date}`
        );

        console.log(
            `✅ Đã tạo: ${created.length}`
        );

        console.log(
            `⚠️ Conflict: ${conflicts.length}`
        );

        console.log(
            `⏮️ Quá khứ: ${skippedPast.length}`
        );

        console.log(
            `🏠 Không có phòng: ${skippedNoRoom.length}`
        );

        console.log(
            `⏰ Ngoài giờ hoạt động: ${skippedOutsideHours.length}`
        );

        console.log(
            `❌ Config lỗi: ${skippedInvalidConfig.length}`
        );

        console.log(
            `📊 Theo phòng:`,
            summary.byRoomType
        );

        console.log(
            `📊 Theo khung giờ:`,
            summary.byTimeSlot
        );

        console.log(
            `📊 Theo ngày:`,
            summary.byDayType
        );

        console.log(
            "=========================================================="
        );

        // ======================================================
        // 25. QUAN TRỌNG
        //
        // Nếu KHÔNG tạo được record nào thì success = false.
        // Frontend sẽ không còn báo "thành công" giả.
        // ======================================================

        if (created.length === 0) {

            let message =
                "Không tạo được suất chiếu nào.";

            if (
                skippedPast.length > 0 &&
                conflicts.length === 0
            ) {
                message =
                    "Không tạo được suất chiếu vì các thời gian được tính đều đã ở quá khứ.";
            } else if (
                skippedNoRoom.length > 0 &&
                conflicts.length === 0
            ) {
                message =
                    "Không tạo được suất chiếu vì không có phòng phù hợp.";
            } else if (
                conflicts.length > 0
            ) {
                message =
                    "Không tạo được suất chiếu vì các phòng đều bị trùng lịch hoặc không còn khung giờ phù hợp.";
            } else if (
                skippedInvalidConfig.length >
                0
            ) {
                message =
                    "Không tạo được suất chiếu vì cấu hình suất chiếu không hợp lệ.";
            } else if (
                skippedOutsideHours.length >
                0
            ) {
                message =
                    "Không tạo được suất chiếu vì thời lượng phim vượt quá giờ hoạt động của rạp.";
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

                usedConfig: {
                    operatingHours,
                    manualConfigs
                }
            };
        }

        // ======================================================
        // 26. SUCCESS
        // ======================================================

        return {
            success: true,

            message: `Đã tạo thành công ${created.length} suất chiếu.`,

            data: created,

            conflicts,

            skippedPast,

            skippedNoRoom,

            skippedOutsideHours,

            skippedInvalidConfig,

            summary,

            usedConfig: {
                operatingHours,
                manualConfigs
            }
        };
    }

    // ======================================================
    // UPDATE SHOWTIME
    // ======================================================

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

        movie_id = Number(movie_id);
        cinema_id = Number(cinema_id);
        room_id = Number(room_id);

        const validationError =
            validateShowtime({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });

        if (validationError) {
            const err = new Error(
                validationError
            );

            err.statusCode = 400;

            throw err;
        }

        const isPast =
            await ShowtimeRepository.isPastTime(
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
                "Phòng này đã có lịch chiếu giờ đó"
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

    // ======================================================
    // DELETE SHOWTIME
    // ======================================================

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

    // ======================================================
    // QUICK BOOKING
    // ======================================================

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
            return await ShowtimeRepository.getQuickBookingMovies();
        }

        if (
            movie_id &&
            !cinema_id &&
            !date
        ) {
            return await ShowtimeRepository.getQuickBookingCinemas(
                movie_id
            );
        }

        if (
            movie_id &&
            cinema_id &&
            !date
        ) {
            return await ShowtimeRepository.getQuickBookingDates(
                movie_id,
                cinema_id
            );
        }

        if (
            movie_id &&
            cinema_id &&
            date
        ) {
            return await ShowtimeRepository.getQuickBookingTimes(
                movie_id,
                cinema_id,
                date
            );
        }

        return [];
    }

    // ======================================================
    // GET SHOWTIMES FOR BOOKING
    // ======================================================

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

        const showtimes =
            await ShowtimeRepository.getShowtimesForBooking(
                movie_id,
                cinema_id,
                date
            );

        return showtimes.map(
            (showtime) => {
                const timeSlot =
                    getTimeSlot(
                        showtime.start_time
                    );

                const dayType =
                    getDayType(date);

                return {
                    ...showtime,

                    time_slot:
                        timeSlot,

                    time_slot_label:
                        TIME_SLOT_LABELS[
                            timeSlot
                        ],

                    day_type:
                        dayType,

                    day_type_label:
                        DAY_TYPE_LABELS[
                            dayType
                        ]
                };
            }
        );
    }

    // ======================================================
    // FILTER SHOWTIMES
    // ======================================================

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

        return await ShowtimeRepository.filterShowtimes(
            movie_id,
            room_id,
            date
        );
    }
}

// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    new ShowtimeService();