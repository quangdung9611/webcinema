const ShowtimeRepository = require("../Repositories/ShowtimeRepository");

// ==========================================================
// CONSTANTS
// ==========================================================

const ALLOWED_ROOM_TYPES = [
    "2D",
    "3D",
    "VIP",
    "IMAX"
];

// ==========================================================
// TIME SLOT
//
// Đây là KHUNG GIỜ LOGIC.
//
// MORNING   = 08:00 → 12:00
// AFTERNOON = 12:00 → 17:00
// EVENING   = 17:00 → 20:00
// NIGHT     = 20:00 → 24:00
//
// Giờ hoạt động thực tế của rạp sẽ được INTERSECT
// với các khung này.
//
// Ví dụ rạp mở 09:00:
// MORNING = 09:00 → 12:00
//
// Ví dụ rạp mở 08:00:
// MORNING = 08:00 → 12:00
// ==========================================================

const TIME_SLOT_RANGES = {
    MORNING: {
        start: "08:00",
        end: "12:00"
    },

    AFTERNOON: {
        start: "12:00",
        end: "17:00"
    },

    EVENING: {
        start: "17:00",
        end: "20:00"
    },

    NIGHT: {
        start: "20:00",
        end: "24:00"
    }
};

const TIME_SLOT_LABELS = {
    MORNING: "Sáng (8h-12h)",
    AFTERNOON: "Chiều (12h-17h)",
    EVENING: "Tối (17h-20h)",
    NIGHT: "Đêm (20h-24h)"
};

const TIME_SLOT_PREFIX = {
    MORNING: "Sáng",
    AFTERNOON: "Chiều",
    EVENING: "Tối",
    NIGHT: "Đêm"
};

const DAY_TYPE_LABELS = {
    WEEKDAY: "Ngày thường (T2-T6)",
    WEEKEND: "Cuối tuần (T7-CN)"
};

const TIME_SLOT_ORDER = [
    "MORNING",
    "AFTERNOON",
    "EVENING",
    "NIGHT"
];

const SHOWTIME_BUFFER_MINUTES = 15;

// ==========================================================
// HELPERS
// ==========================================================

const formatDateTime = (dateTime) => {
    if (!dateTime) {
        return null;
    }

    return String(dateTime)
        .replace("T", " ")
        .substring(0, 16);
};

// ==========================================================
// FORMAT MINUTES
// ==========================================================

const formatMinutesLabel = (minutes) => {
    const total = Number(minutes);

    if (!Number.isFinite(total)) {
        return "--:--";
    }

    if (total === 24 * 60) {
        return "24:00";
    }

    const hour = Math.floor(total / 60);
    const minute = total % 60;

    if (minute === 0) {
        return `${hour}h`;
    }

    return `${hour}h${String(minute).padStart(2, "0")}`;
};

// ==========================================================
// GET EFFECTIVE TIME SLOT LABEL
//
// Label dựa trên KHUNG GIỜ THỰC TẾ.
//
// Ví dụ:
//
// Rạp mở 08:00:
//
// MORNING → Sáng (8h-12h)
//
// Rạp mở 09:00:
//
// MORNING → Sáng (9h-12h)
//
// Rạp đóng 23:00:
//
// NIGHT → Đêm (20h-23h)
// ==========================================================

const getEffectiveTimeSlotLabel = (
    timeSlot,
    actualRange
) => {
    if (
        !actualRange ||
        actualRange.startMinutes >=
            actualRange.endMinutes
    ) {
        return (
            TIME_SLOT_LABELS[timeSlot] ||
            timeSlot
        );
    }

    const prefix =
        TIME_SLOT_PREFIX[timeSlot] ||
        timeSlot;

    return `${prefix} (${formatMinutesLabel(
        actualRange.startMinutes
    )}-${formatMinutesLabel(
        actualRange.endMinutes
    )})`;
};

// ==========================================================
// GET TIME SLOT
// ==========================================================

const getTimeSlot = (startTime) => {
    if (!startTime) {
        return "MORNING";
    }

    const raw = String(startTime)
        .replace("T", " ");

    const parts = raw.split(" ");

    const time = parts[1] || parts[0];

    const hour = parseInt(
        String(time).split(":")[0],
        10
    );

    if (
        Number.isFinite(hour) &&
        hour >= 8 &&
        hour < 12
    ) {
        return "MORNING";
    }

    if (
        Number.isFinite(hour) &&
        hour >= 12 &&
        hour < 17
    ) {
        return "AFTERNOON";
    }

    if (
        Number.isFinite(hour) &&
        hour >= 17 &&
        hour < 20
    ) {
        return "EVENING";
    }

    return "NIGHT";
};

// ==========================================================
// GET DAY TYPE
// ==========================================================

const getDayType = (date) => {
    if (!date) {
        return "WEEKDAY";
    }

    const d =
        typeof date === "string"
            ? new Date(`${date}T00:00:00Z`)
            : new Date(date);

    const dayOfWeek =
        d.getUTCDay();

    return (
        dayOfWeek === 0 ||
        dayOfWeek === 6
    )
        ? "WEEKEND"
        : "WEEKDAY";
};

// ==========================================================
// NORMALIZE ROOM TYPES
// ==========================================================

const normalizeRoomTypes = (
    roomTypes
) => {
    if (!Array.isArray(roomTypes)) {
        return [];
    }

    return [
        ...new Set(
            roomTypes
                .map((type) =>
                    String(type)
                        .trim()
                        .toUpperCase()
                )
                .filter((type) =>
                    ALLOWED_ROOM_TYPES.includes(
                        type
                    )
                )
        )
    ];
};

// ==========================================================
// VALIDATE SHOWTIME
// ==========================================================

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

    const value =
        String(date).trim();

    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!match) {
        throw new Error(
            `Ngày không hợp lệ: ${date}`
        );
    }

    const year =
        Number(match[1]);

    const month =
        Number(match[2]);

    const day =
        Number(match[3]);

    const result =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

    // ======================================================
    // CHECK NGÀY THỰC SỰ HỢP LỆ
    // ======================================================

    if (
        result.getUTCFullYear() !==
            year ||
        result.getUTCMonth() !==
            month - 1 ||
        result.getUTCDate() !==
            day
    ) {
        throw new Error(
            `Ngày không hợp lệ: ${date}`
        );
    }

    return result;
};

const formatDate = (date) => {
    return `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getUTCDate()
    ).padStart(2, "0")}`;
};

const addDays = (
    date,
    days
) => {
    const result =
        new Date(date);

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

    const day =
        d.getUTCDay();

    return (
        day === 0 ||
        day === 6
    );
};

// ==========================================================
// TIME HELPERS
// ==========================================================

const timeToMinutes = (time) => {
    if (
        String(time).trim() ===
        "24:00"
    ) {
        return 24 * 60;
    }

    const [hour, minute] =
        String(time)
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

    return (
        hour * 60 +
        minute
    );
};

const minutesToTime = (
    totalMinutes
) => {
    const minutes =
        Number(totalMinutes);

    if (
        minutes ===
        24 * 60
    ) {
        return "24:00";
    }

    const hour =
        Math.floor(
            minutes / 60
        );

    const minute =
        minutes % 60;

    return `${String(hour).padStart(
        2,
        "0"
    )}:${String(minute).padStart(
        2,
        "0"
    )}`;
};

const buildDateTime = (
    date,
    minutes
) => {
    if (
        minutes >=
        24 * 60
    ) {
        const overflow =
            minutes -
            24 * 60;

        const nextDate =
            addDays(
                parseDate(date),
                1
            );

        return `${formatDate(
            nextDate
        )} ${minutesToTime(
            overflow
        )}`;
    }

    return `${date} ${minutesToTime(
        minutes
    )}`;
};

// ==========================================================
// GET OPERATING RANGE
// ==========================================================

const getTimeRangeForDate = (
    date,
    config
) => {
    const weekend =
        isWeekend(date);

    const startTime =
        weekend
            ? config.weekendStart
            : config.weekdayStart;

    const endTime =
        weekend
            ? config.weekendEnd
            : config.weekdayEnd;

    return {
        startTime,
        endTime,

        startMinutes:
            timeToMinutes(
                startTime
            ),

        endMinutes:
            timeToMinutes(
                endTime
            ),

        isWeekend:
            weekend
    };
};

// ==========================================================
// GET ACTUAL TIME SLOT RANGE
//
// Kết hợp:
// 1. Khung giờ logic
// 2. Giờ mở cửa thực tế
// 3. Giờ đóng cửa thực tế
// ==========================================================

const getActualTimeSlotRange = (
    timeSlot,
    timeRange
) => {
    const slotConfig =
        TIME_SLOT_RANGES[
            timeSlot
        ];

    if (!slotConfig) {
        return null;
    }

    const slotStart =
        timeToMinutes(
            slotConfig.start
        );

    const slotEnd =
        timeToMinutes(
            slotConfig.end
        );

    const actualStart =
        Math.max(
            slotStart,
            timeRange.startMinutes
        );

    const actualEnd =
        Math.min(
            slotEnd,
            timeRange.endMinutes
        );

    return {
        startMinutes:
            actualStart,

        endMinutes:
            actualEnd,

        startTime:
            minutesToTime(
                actualStart
            ),

        endTime:
            minutesToTime(
                actualEnd
            ),

        slotStartMinutes:
            slotStart,

        slotEndMinutes:
            slotEnd
    };
};

// ==========================================================
// CALCULATE MAX SLOTS PER ROOM
//
// QUAN TRỌNG:
//
// Không chỉ lấy:
//   (khung giờ - duration) / interval
//
// Vì hệ thống còn có BUFFER 15 phút giữa các suất.
//
// Ví dụ:
//
// 08:00 → 12:00
// Phim 120 phút
// Buffer 15 phút
// Interval 30 phút
//
// Một phòng có thể:
//
// 08:00 → 10:00
// 10:30 → 12:30 ❌
//
// => chỉ có 1 suất.
//
// Nếu có 2 phòng thì có thể:
// Phòng 1: 08:00
// Phòng 2: 08:30
//
// nên capacity phải tính theo số phòng.
// ==========================================================

const calculateMaxSlotsPerRoom = ({
    startMinutes,
    endMinutes,
    duration,
    intervalMinutes,
    bufferMinutes =
        SHOWTIME_BUFFER_MINUTES
}) => {
    if (
        !Number.isFinite(
            startMinutes
        ) ||
        !Number.isFinite(
            endMinutes
        ) ||
        !Number.isFinite(
            duration
        ) ||
        !Number.isFinite(
            intervalMinutes
        )
    ) {
        return 0;
    }

    if (
        startMinutes >=
            endMinutes ||
        duration <= 0 ||
        intervalMinutes <= 0
    ) {
        return 0;
    }

    let currentTime =
        startMinutes;

    let count = 0;

    let lastOccupiedUntil =
        -Infinity;

    let safety = 0;

    while (
        currentTime +
            duration <=
            endMinutes
    ) {
        safety++;

        if (safety > 10000) {
            break;
        }

        // ==================================================
        // Nếu thời gian hiện tại còn nằm trong vùng
        // phim trước + buffer thì nhảy tới start tiếp theo.
        // ==================================================

        if (
            currentTime <
            lastOccupiedUntil
        ) {
            const difference =
                lastOccupiedUntil -
                currentTime;

            const jump =
                Math.max(
                    1,
                    Math.ceil(
                        difference /
                            intervalMinutes
                    )
                );

            currentTime +=
                jump *
                intervalMinutes;

            continue;
        }

        count++;

        lastOccupiedUntil =
            currentTime +
            duration +
            bufferMinutes;

        currentTime +=
            intervalMinutes;
    }

    return count;
};

// ==========================================================
// CALCULATE MAX SLOTS
//
// Capacity = capacity mỗi phòng × số phòng.
//
// Đây là capacity lý thuyết của config.
//
// Chưa trừ:
// - showtime cũ
// - conflict
// - suất đã bán
// - thời gian quá khứ
// ==========================================================

const calculateMaxSlots = ({
    startMinutes,
    endMinutes,
    duration,
    intervalMinutes,
    roomCount = 1,
    bufferMinutes =
        SHOWTIME_BUFFER_MINUTES
}) => {
    if (
        !Number.isFinite(
            roomCount
        ) ||
        roomCount <= 0
    ) {
        return 0;
    }

    const perRoom =
        calculateMaxSlotsPerRoom({
            startMinutes,
            endMinutes,
            duration,
            intervalMinutes,
            bufferMinutes
        });

    return (
        perRoom *
        Math.floor(roomCount)
    );
};

// ==========================================================
// VALIDATE SLOT CAPACITY
//
// Nếu cấu hình:
// slot_count > capacity
//
// → KHÔNG tạo một phần.
//
// → trả warning cho admin.
// ==========================================================

const validateSlotCapacity = ({
    timeSlot,
    roomType,
    slotCount,
    duration,
    intervalMinutes,
    roomCount,
    actualRange
}) => {
    if (!actualRange) {
        return {
            valid: false,
            maxSlots: 0,
            reason:
                "Không xác định được khung giờ."
        };
    }

    const maxSlots =
        calculateMaxSlots({
            startMinutes:
                actualRange.startMinutes,

            endMinutes:
                actualRange.endMinutes,

            duration,

            intervalMinutes,

            roomCount,

            bufferMinutes:
                SHOWTIME_BUFFER_MINUTES
        });

    if (
        slotCount >
        maxSlots
    ) {
        return {
            valid: false,

            maxSlots,

            reason:
                `Cấu hình ${timeSlot} - ${roomType} yêu cầu ${slotCount} suất nhưng khung giờ ${actualRange.startTime} → ${actualRange.endTime} chỉ đáp ứng tối đa ${maxSlots} suất với ${roomCount} phòng ${roomType}, phim ${duration} phút, khoảng cách ${intervalMinutes} phút và buffer ${SHOWTIME_BUFFER_MINUTES} phút giữa các suất. Vui lòng giảm số suất hoặc điều chỉnh cấu hình.`
        };
    }

    return {
        valid: true,
        maxSlots,
        reason: null
    };
};

// ==========================================================
// ROOM HELPERS
// ==========================================================

const sortRoomsNaturally = (
    rooms
) => {
    return [...rooms].sort(
        (a, b) => {
            const nameA =
                String(
                    a.room_name ||
                        a.room_id ||
                        ""
                );

            const nameB =
                String(
                    b.room_name ||
                        b.room_id ||
                        ""
                );

            return nameA.localeCompare(
                nameB,
                undefined,
                {
                    numeric: true,
                    sensitivity:
                        "base"
                }
            );
        }
    );
};

const filterRoomsByType = (
    rooms,
    roomTypes = []
) => {
    if (!Array.isArray(rooms)) {
        return [];
    }

    if (
        !Array.isArray(
            roomTypes
        ) ||
        roomTypes.length === 0
    ) {
        return rooms.filter(
            (room) =>
                Number.isInteger(
                    Number(
                        room.room_id
                    )
                )
        );
    }

    const normalizedTypes =
        normalizeRoomTypes(
            roomTypes
        );

    return rooms.filter(
        (room) => {
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
};

// ==========================================================
// NORMALIZE SHOWTIME
// ==========================================================

const normalizeShowtime = (
    showtime
) => {
    if (!showtime) {
        return null;
    }

    let date =
        showtime.date ||
        null;

    let startMinutes =
        Number(
            showtime.startMinutes
        );

    let duration =
        Number(
            showtime.duration
        );

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
            date =
                parts[0];
        }

        const time =
            parts[1] ||
            "00:00";

        startMinutes =
            timeToMinutes(
                time.substring(
                    0,
                    5
                )
            );
    }

    if (
        !Number.isFinite(
            duration
        )
    ) {
        duration =
            Number(
                showtime.movie_duration
            ) || 0;
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
};

// ==========================================================
// NORMALIZE DATE ONLY
// ==========================================================

const normalizeDateOnly = (
    value
) => {
    if (!value) {
        return null;
    }

    return String(value)
        .replace("T", " ")
        .substring(0, 10);
};

// ==========================================================
// ROOM CONFLICT
//
// QUAN TRỌNG:
//
// Conflict phải xét:
// 1. Cùng phòng
// 2. Cùng ngày
// 3. Thời gian giao nhau
// 4. Buffer 15 phút
// ==========================================================

const hasRoomConflict = ({
    roomId,
    startMinutes,
    endMinutes,
    date = null,
    existingShowtimes = [],
    bufferMinutes =
        SHOWTIME_BUFFER_MINUTES
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
                ) !==
                Number(roomId)
            ) {
                return false;
            }

            // ==================================================
            // KHÁC NGÀY => KHÔNG CONFLICT
            // ==================================================

            if (date) {
                const existingDate =
                    normalizeDateOnly(
                        existing.date ||
                            existing.start_time
                    );

                const targetDate =
                    normalizeDateOnly(
                        date
                    );

                if (
                    existingDate &&
                    targetDate &&
                    existingDate !==
                        targetDate
                ) {
                    return false;
                }
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
    date = null,
    existingShowtimes = [],
    bufferMinutes =
        SHOWTIME_BUFFER_MINUTES
}) => {
    const pool =
        Array.isArray(
            poolRooms
        ) &&
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
        sortRoomsNaturally(
            pool
        );

    for (
        const room of sortedPool
    ) {
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
            hasRoomConflict({
                roomId,

                startMinutes,

                endMinutes,

                date,

                existingShowtimes,

                bufferMinutes
            });

        if (!conflict) {
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
            const err =
                new Error(
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

    // ======================================================
    // MOVIE DETAIL
    // ======================================================

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
                        getDayType(
                            date
                        );

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

                    acc[key].push(
                        item
                    );

                    return acc;
                },
                {}
            );

        return grouped;
    }

    // ======================================================
    // CREATE MANUAL SHOWTIME
    // ======================================================

    async createShowtime(
        data
    ) {
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

        movie_id =
            Number(movie_id);

        cinema_id =
            Number(cinema_id);

        room_id =
            Number(room_id);

        const validationError =
            validateShowtime({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });

        if (validationError) {
            const err =
                new Error(
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
            const err =
                new Error(
                    "Không thể tạo suất chiếu trong quá khứ"
                );

            err.statusCode = 400;
            err.field =
                "start_time";

            throw err;
        }

        const conflict =
            await ShowtimeRepository.findConflict(
                room_id,
                start_time
            );

        if (conflict) {
            const err =
                new Error(
                    "Phòng này đã có lịch chiếu vào giờ đó"
                );

            err.statusCode = 400;
            err.field =
                "start_time";

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

    async scheduleShowtimes(
        data
    ) {

        // ======================================================
        // 1. VALIDATE INPUT
        // ======================================================

        if (!data) {
            const err =
                new Error(
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
            const err =
                new Error(
                    "Vui lòng chọn rạp"
                );

            err.statusCode = 400;
            err.field =
                "cinema_id";

            throw err;
        }

        if (
            !start_date ||
            !end_date
        ) {
            const err =
                new Error(
                    "Vui lòng chọn ngày"
                );

            err.statusCode = 400;
            err.field =
                "start_date";

            throw err;
        }

        const startDate =
            parseDate(
                start_date
            );

        const endDate =
            parseDate(
                end_date
            );

        if (
            endDate <
            startDate
        ) {
            const err =
                new Error(
                    "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
                );

            err.statusCode = 400;
            err.field =
                "end_date";

            throw err;
        }

        // ======================================================
        // 2. GET OPERATING HOURS
        // ======================================================

        const operatingHours =
            await ShowtimeRepository.getOperatingHours(
                cinemaId
            );

        if (
            !operatingHours ||
            !operatingHours.weekday ||
            !operatingHours.weekend
        ) {
            const err =
                new Error(
                    "Không lấy được giờ hoạt động của rạp."
                );

            err.statusCode = 400;
            err.field =
                "cinema_id";

            throw err;
        }

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
            for (
                const item of movies
            ) {
                const movieId =
                    Number(
                        item.movie_id
                    );

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
                Array.isArray(
                    allMovies
                )
                    ? allMovies
                    : [];
        }

        if (
            moviesData.length === 0
        ) {
            const err =
                new Error(
                    "Không có phim nào để tạo lịch"
                );

            err.statusCode = 400;
            err.field =
                "movies";

            throw err;
        }

        console.log(
            `📋 DANH SÁCH PHIM (${moviesData.length} phim):`
        );

        for (
            const movie of moviesData
        ) {
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

        rooms =
            Array.isArray(rooms)
                ? rooms
                      .map(
                          (room) => ({
                              ...room,

                              room_id:
                                  Number(
                                      room.room_id
                                  ),

                              room_type:
                                  String(
                                      room.room_type ||
                                          ""
                                  )
                                      .trim()
                                      .toUpperCase()
                          })
                      )
                      .filter(
                          (room) =>
                              Number.isInteger(
                                  room.room_id
                              ) &&
                              room.room_id >
                                  0 &&
                              ALLOWED_ROOM_TYPES.includes(
                                  room.room_type
                              )
                      )
                : [];

        if (
            rooms.length === 0
        ) {
            const err =
                new Error(
                    "Rạp không có phòng chiếu hợp lệ."
                );

            err.statusCode = 400;
            err.field =
                "cinema_id";

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

        for (
            const room of sortRoomsNaturally(
                rooms
            )
        ) {
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
            rooms.map(
                (room) =>
                    Number(
                        room.room_id
                    )
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
            existingShowtimes =
                [];
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

        const skippedOutsideHours =
            [];

        const skippedInvalidConfig =
            [];

        const skippedExcessConfig =
            [];

        const partialConfigWarnings =
            [];

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
        // 8. CONFIG CACHE
        // ======================================================

        const manualConfigs = {};

        // ======================================================
        // 9. LOOP EACH DATE
        // ======================================================

        let currentDate =
            parseDate(
                start_date
            );

        while (
            currentDate <=
            endDate
        ) {

            const dateStr =
                formatDate(
                    currentDate
                );

            const dayType =
                getDayType(
                    dateStr
                );

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
            // CHECK OPERATING RANGE
            // ==================================================

            if (
                timeRange.startMinutes >=
                timeRange.endMinutes
            ) {
                console.warn(
                    `⚠️ ${dateStr}: giờ hoạt động không hợp lệ`
                );

                currentDate =
                    addDays(
                        currentDate,
                        1
                    );

                continue;
            }

            // ==================================================
            // 10. LOOP MOVIES
            // ==================================================

            for (
                const movie of moviesData
            ) {

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
                // 11. GET CONFIG THEO DAY TYPE
                // ==================================================

                const manualConfig =
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

                if (
                    !manualConfigs[
                        movieId
                    ]
                ) {
                    manualConfigs[
                        movieId
                    ] = {};
                }

                manualConfigs[
                    movieId
                ][dayType] =
                    manualConfig;

                console.log(
                    `📋 CONFIG ${movie.title} | ${dateStr} | ${dayType}`
                );

                // ==================================================
                // 12. LOOP TIME SLOT
                // ==================================================

                for (
                    const timeSlotKey of TIME_SLOT_ORDER
                ) {

                    const slotConfigs =
                        manualConfig[
                            timeSlotKey
                        ];

                    if (
                        !Array.isArray(
                            slotConfigs
                        ) ||
                        slotConfigs.length ===
                            0
                    ) {
                        continue;
                    }

                    // ==================================================
                    // 12.1 ACTUAL SLOT RANGE
                    // ==================================================

                    const actualSlotRange =
                        getActualTimeSlotRange(
                            timeSlotKey,
                            timeRange
                        );

                    const actualSlotLabel =
                        getEffectiveTimeSlotLabel(
                            timeSlotKey,
                            actualSlotRange
                        );

                    if (
                        !actualSlotRange ||
                        actualSlotRange.startMinutes >=
                            actualSlotRange.endMinutes
                    ) {

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

                                    time_slot_label:
                                        TIME_SLOT_LABELS[
                                            timeSlotKey
                                        ],

                                    room_type:
                                        roomType,

                                    reason:
                                        `Khung ${TIME_SLOT_LABELS[timeSlotKey]} nằm ngoài giờ hoạt động của rạp`
                                }
                            );
                        }

                        continue;
                    }

                    console.log(
                        `  ⏰ ${actualSlotLabel}: ${actualSlotRange.startTime} → ${actualSlotRange.endTime}`
                    );

                    // ==================================================
                    // 13. LOOP ROOM TYPE CONFIG
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
                        // VALIDATE ROOM TYPE
                        // ==================================================

                        if (
                            !ALLOWED_ROOM_TYPES.includes(
                                roomType
                            )
                        ) {
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

                                    time_slot_label:
                                        actualSlotLabel,

                                    room_type:
                                        roomType,

                                    reason:
                                        "Room type không hợp lệ"
                                }
                            );

                            continue;
                        }

                        // ==================================================
                        // VALIDATE SLOT COUNT
                        // ==================================================

                        if (
                            !Number.isFinite(
                                slotCount
                            ) ||
                            slotCount <= 0 ||
                            !Number.isInteger(
                                slotCount
                            )
                        ) {
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

                                    time_slot_label:
                                        actualSlotLabel,

                                    room_type:
                                        roomType,

                                    requested_slots:
                                        slotCount,

                                    reason:
                                        "slot_count phải là số nguyên lớn hơn 0"
                                }
                            );

                            continue;
                        }

                        // ==================================================
                        // VALIDATE INTERVAL
                        // ==================================================

                        if (
                            !Number.isFinite(
                                intervalMinutes
                            ) ||
                            intervalMinutes <= 0 ||
                            !Number.isInteger(
                                intervalMinutes
                            )
                        ) {
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

                                    time_slot_label:
                                        actualSlotLabel,

                                    room_type:
                                        roomType,

                                    interval_minutes:
                                        intervalMinutes,

                                    reason:
                                        "interval_minutes phải là số nguyên lớn hơn 0"
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
                                [
                                    roomType
                                ]
                            );

                        if (
                            availableRooms.length ===
                            0
                        ) {
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

                                    time_slot_label:
                                        actualSlotLabel,

                                    room_type:
                                        roomType,

                                    reason:
                                        `Không có phòng ${roomType}`
                                }
                            );

                            continue;
                        }

                        // ==================================================
                        // 15. CHECK CAPACITY
                        //
                        // Đây là phần QUAN TRỌNG NHẤT.
                        //
                        // Nếu:
                        //
                        // slotCount = 5
                        // capacity = 3
                        //
                        // => KHÔNG tạo 3.
                        //
                        // => BỎ QUA CONFIG
                        // => báo admin cấu hình lại.
                        // ==================================================

                        const capacity =
                            validateSlotCapacity(
                                {
                                    timeSlot:
                                        timeSlotKey,

                                    roomType,

                                    slotCount,

                                    duration,

                                    intervalMinutes,

                                    roomCount:
                                        availableRooms.length,

                                    actualRange:
                                        actualSlotRange
                                }
                            );

                        if (
                            !capacity.valid
                        ) {

                            console.warn(
                                ""
                            );

                            console.warn(
                                "=========================================================="
                            );

                            console.warn(
                                "⚠️ CONFIG VƯỢT KHUNG GIỜ"
                            );

                            console.warn(
                                "=========================================================="
                            );

                            console.warn(
                                `🎬 Phim: ${movie.title}`
                            );

                            console.warn(
                                `📅 Ngày: ${dateStr}`
                            );

                            console.warn(
                                `⏰ Slot: ${actualSlotLabel}`
                            );

                            console.warn(
                                `🏠 Room type: ${roomType}`
                            );

                            console.warn(
                                `🎯 Yêu cầu: ${slotCount} suất`
                            );

                            console.warn(
                                `📐 Tối đa: ${capacity.maxSlots} suất`
                            );

                            console.warn(
                                `⏱️ Phim: ${duration} phút`
                            );

                            console.warn(
                                `⏳ Interval: ${intervalMinutes} phút`
                            );

                            console.warn(
                                `🏠 Số phòng: ${availableRooms.length}`
                            );

                            console.warn(
                                `💬 ${capacity.reason}`
                            );

                            console.warn(
                                "=========================================================="
                            );

                            skippedExcessConfig.push(
                                {
                                    movie_id:
                                        movieId,

                                    title:
                                        movie.title,

                                    date:
                                        dateStr,

                                    day_type:
                                        dayType,

                                    day_type_label:
                                        DAY_TYPE_LABELS[
                                            dayType
                                        ],

                                    time_slot:
                                        timeSlotKey,

                                    time_slot_label:
                                        actualSlotLabel,

                                    room_type:
                                        roomType,

                                    requested_slots:
                                        slotCount,

                                    max_possible_slots:
                                        capacity.maxSlots,

                                    duration,

                                    interval_minutes:
                                        intervalMinutes,

                                    room_count:
                                        availableRooms.length,

                                    slot_start:
                                        actualSlotRange.startTime,

                                    slot_end:
                                        actualSlotRange.endTime,

                                    reason:
                                        capacity.reason
                                }
                            );

                            // ==================================================
                            // KHÔNG TẠO MỘT PHẦN
                            // ==================================================

                            continue;
                        }

                        console.log(
                            `  🎬 ${movie.title} | ${actualSlotLabel} | ${roomType} | ${slotCount} suất | mỗi ${intervalMinutes} phút`
                        );

                        console.log(
                            `     📐 Khả năng tối đa: ${capacity.maxSlots} suất`
                        );

                        // ==================================================
                        // 16. START TIME
                        // ==================================================

                        let currentTime =
                            actualSlotRange.startMinutes;

                        // ==================================================
                        // 17. CREATE SLOTS
                        // ==================================================

                        let slotsCreated =
                            0;

                        let attempts =
                            0;

                        const maxAttempts =
                            Math.max(
                                slotCount *
                                    100,
                                100
                            );

                        while (
                            slotsCreated <
                                slotCount &&
                            attempts <
                                maxAttempts
                        ) {

                            attempts++;

                            // ==================================================
                            // PHẢI NẰM TRONG SLOT
                            // ==================================================

                            if (
                                currentTime >=
                                actualSlotRange.endMinutes
                            ) {
                                break;
                            }

                            const endMinutes =
                                currentTime +
                                duration;

                            // ==================================================
                            // PHIM VƯỢT QUÁ KHUNG SLOT
                            //
                            // KHÔNG CHO CHẠY SANG SLOT KHÁC.
                            // ==================================================

                            if (
                                endMinutes >
                                actualSlotRange.endMinutes
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

                                        time_slot_label:
                                            actualSlotLabel,

                                        room_type:
                                            roomType,

                                        start_time:
                                            buildDateTime(
                                                dateStr,
                                                currentTime
                                            ),

                                        reason:
                                            `Suất chiếu vượt quá khung ${actualSlotLabel}`
                                    }
                                );

                                break;
                            }

                            // ==================================================
                            // 18. FIND AVAILABLE ROOM
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

                                        date:
                                            dateStr,

                                        existingShowtimes:
                                            allCurrentShowtimes,

                                        bufferMinutes:
                                            SHOWTIME_BUFFER_MINUTES
                                    }
                                );

                            // ==================================================
                            // 19. NO ROOM
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

                                        time_slot_label:
                                            actualSlotLabel,

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
                            // 20. CHECK PAST
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

                                        time_slot:
                                            timeSlotKey,

                                        time_slot_label:
                                            actualSlotLabel,

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
                            // 21. FINAL CONFLICT CHECK
                            // ==================================================

                            const finalConflict =
                                hasRoomConflict(
                                    {
                                        roomId,

                                        startMinutes:
                                            currentTime,

                                        endMinutes:
                                            endMinutes,

                                        date:
                                            dateStr,

                                        existingShowtimes:
                                            [
                                                ...existingShowtimes,
                                                ...created
                                            ],

                                        bufferMinutes:
                                            SHOWTIME_BUFFER_MINUTES
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

                                        time_slot:
                                            timeSlotKey,

                                        time_slot_label:
                                            actualSlotLabel,

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
                            // 22. INSERT DATABASE
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

                                // ==================================================
                                // LUÔN CLASSIFY THEO START TIME THỰC TẾ
                                // ==================================================

                                const timeSlot =
                                    getTimeSlot(
                                        startTimeStr
                                            .split(
                                                " "
                                            )[1] ||
                                            "09:00"
                                    );

                                const dayTypeResult =
                                    getDayType(
                                        dateStr
                                    );

                                // ==================================================
                                // LABEL THỰC TẾ
                                //
                                // Vì scheduler đang biết timeRange
                                // nên dùng label chính xác.
                                // ==================================================

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

                                        date:
                                            dateStr,

                                        start_time:
                                            startTimeStr,

                                        end_time:
                                            endTimeStr,

                                        duration:
                                            duration,

                                        time_slot:
                                            timeSlot,

                                        time_slot_label:
                                            getEffectiveTimeSlotLabel(
                                                timeSlot,
                                                actualSlotRange
                                            ),

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

                                        time_slot:
                                            timeSlotKey,

                                        time_slot_label:
                                            actualSlotLabel,

                                        start_time:
                                            startTimeStr,

                                        reason:
                                            error.message
                                    }
                                );
                            }

                            // ==================================================
                            // 23. NEXT SLOT
                            // ==================================================

                            currentTime +=
                                intervalMinutes;
                        }

                        // ==================================================
                        // 24. PARTIAL RESULT
                        //
                        // Trường hợp:
                        //
                        // Config = 5
                        // Capacity lý thuyết = 5
                        //
                        // nhưng vì showtime cũ/conflict/quá khứ
                        // chỉ tạo được 3.
                        //
                        // => KHÔNG gọi là config vượt khung.
                        // => báo riêng cho admin.
                        // ==================================================

                        if (
                            slotsCreated <
                                slotCount
                        ) {

                            const warning =
                                {
                                    movie_id:
                                        movieId,

                                    title:
                                        movie.title,

                                    date:
                                        dateStr,

                                    day_type:
                                        dayType,

                                    time_slot:
                                        timeSlotKey,

                                    time_slot_label:
                                        actualSlotLabel,

                                    room_type:
                                        roomType,

                                    requested_slots:
                                        slotCount,

                                    created_slots:
                                        slotsCreated,

                                    max_possible_slots:
                                        capacity.maxSlots,

                                    reason:
                                        `Cấu hình yêu cầu ${slotCount} suất nhưng thực tế chỉ tạo được ${slotsCreated} suất do conflict, phòng đang bận hoặc thời gian không còn phù hợp.`
                                };

                            partialConfigWarnings.push(
                                warning
                            );

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

            // ======================================================
            // NEXT DATE
            // ======================================================

            currentDate =
                addDays(
                    currentDate,
                    1
                );
        }

        // ======================================================
        // 25. SUMMARY
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
                            movie.title,

                        duration:
                            Number(
                                movie.duration
                            )
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

            skippedExcessConfigCount:
                skippedExcessConfig.length,

            partialConfigWarningCount:
                partialConfigWarnings.length,

            byRoomType:
                created.reduce(
                    (acc, slot) => {
                        const type =
                            slot.room_type ||
                            "UNKNOWN";

                        acc[type] =
                            (acc[type] ||
                                0) + 1;

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

                        if (
                            !acc[key]
                        ) {
                            acc[key] = {
                                title:
                                    slot.title,

                                count:
                                    0
                            };
                        }

                        acc[key].count++;

                        return acc;
                    },
                    {}
                )
        };

        // ======================================================
        // WARNINGS
        // ======================================================

        const warnings = [];

        // ======================================================
        // EXCESS CONFIG WARNINGS
        // ======================================================

        for (
            const item of skippedExcessConfig
        ) {
            warnings.push(
                {
                    type:
                        "EXCESS_CONFIG",

                    movie_id:
                        item.movie_id,

                    title:
                        item.title,

                    date:
                        item.date,

                    day_type:
                        item.day_type,

                    time_slot:
                        item.time_slot,

                    time_slot_label:
                        item.time_slot_label,

                    room_type:
                        item.room_type,

                    requested_slots:
                        item.requested_slots,

                    max_possible_slots:
                        item.max_possible_slots,

                    duration:
                        item.duration,

                    interval_minutes:
                        item.interval_minutes,

                    room_count:
                        item.room_count,

                    slot_start:
                        item.slot_start,

                    slot_end:
                        item.slot_end,

                    message:
                        item.reason
                }
            );
        }

        // ======================================================
        // PARTIAL CONFIG WARNINGS
        // ======================================================

        for (
            const item of partialConfigWarnings
        ) {
            warnings.push(
                {
                    type:
                        "PARTIAL_CONFIG",

                    movie_id:
                        item.movie_id,

                    title:
                        item.title,

                    date:
                        item.date,

                    day_type:
                        item.day_type,

                    time_slot:
                        item.time_slot,

                    time_slot_label:
                        item.time_slot_label,

                    room_type:
                        item.room_type,

                    requested_slots:
                        item.requested_slots,

                    created_slots:
                        item.created_slots,

                    max_possible_slots:
                        item.max_possible_slots,

                    message:
                        item.reason
                }
            );
        }

        // ======================================================
        // 26. LOG FINAL
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
            `🚨 Config vượt khung: ${skippedExcessConfig.length}`
        );

        console.log(
            `⚠️ Config tạo thiếu: ${partialConfigWarnings.length}`
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

        // ======================================================
        // LOG EXCESS CONFIG
        // ======================================================

        if (
            skippedExcessConfig.length >
            0
        ) {
            console.log("");

            console.log(
                "🚨 CÁC CONFIG VƯỢT KHẢ NĂNG:"
            );

            for (
                const item of skippedExcessConfig
            ) {
                console.log(
                    `   ❌ ${item.title} | ${item.date} | ${item.time_slot} | ${item.room_type}: ${item.requested_slots} → tối đa ${item.max_possible_slots}`
                );
            }
        }

        console.log(
            "=========================================================="
        );

        // ======================================================
        // 27. NO SHOWTIME CREATED
        // ======================================================

        if (
            created.length === 0
        ) {

            let message =
                "Không tạo được suất chiếu nào.";

            // ==================================================
            // ƯU TIÊN CONFIG VƯỢT KHUNG
            // ==================================================

            if (
                skippedExcessConfig.length >
                0
            ) {

                const first =
                    skippedExcessConfig[0];

                message =
                    `Không tạo được suất chiếu phù hợp với cấu hình. ${first.title} ngày ${first.date}, ${first.time_slot_label}, phòng ${first.room_type}: yêu cầu ${first.requested_slots} suất nhưng tối đa chỉ ${first.max_possible_slots} suất. Vui lòng điều chỉnh cấu hình.`;

            } else if (
                skippedInvalidConfig.length >
                0
            ) {

                message =
                    "Không tạo được suất chiếu vì cấu hình suất chiếu không hợp lệ. Vui lòng kiểm tra số suất, room type và khoảng cách giữa các suất.";

            } else if (
                skippedPast.length >
                    0 &&
                conflicts.length ===
                    0
            ) {

                message =
                    "Không tạo được suất chiếu vì các thời gian được tính đều đã ở quá khứ.";

            } else if (
                skippedNoRoom.length >
                    0 &&
                conflicts.length ===
                    0
            ) {

                message =
                    "Không tạo được suất chiếu vì không có phòng phù hợp.";

            } else if (
                conflicts.length >
                0
            ) {

                message =
                    "Không tạo được suất chiếu vì các phòng đều bị trùng lịch hoặc không còn khung giờ phù hợp.";

            } else if (
                skippedOutsideHours.length >
                0
            ) {

                message =
                    "Không tạo được suất chiếu vì thời lượng phim vượt quá giờ hoạt động hoặc khung giờ đã cấu hình.";
            }

            return {
                success: false,

                message,

                data: [],

                warnings,

                conflicts,

                skippedPast,

                skippedNoRoom,

                skippedOutsideHours,

                skippedInvalidConfig,

                skippedExcessConfig,

                partialConfigWarnings,

                summary,

                usedConfig: {
                    operatingHours,

                    manualConfigs
                }
            };
        }

        // ======================================================
        // 28. SUCCESS MESSAGE
        // ======================================================

        let message =
            `Đã tạo thành công ${created.length} suất chiếu.`;

        // ======================================================
        // CONFIG VƯỢT KHUNG
        // ======================================================

        if (
            skippedExcessConfig.length >
            0
        ) {

            const first =
                skippedExcessConfig[0];

            message +=
                ` ⚠️ Có ${skippedExcessConfig.length} cấu hình vượt khả năng khung giờ và đã được bỏ qua. Ví dụ: ${first.title} ngày ${first.date}, ${first.time_slot_label}, ${first.room_type} yêu cầu ${first.requested_slots} suất nhưng tối đa ${first.max_possible_slots} suất. Vui lòng điều chỉnh cấu hình.`;
        }

        // ======================================================
        // CONFIG LỖI
        // ======================================================

        if (
            skippedInvalidConfig.length >
            0
        ) {
            message +=
                ` Có ${skippedInvalidConfig.length} cấu hình không hợp lệ.`;
        }

        // ======================================================
        // PARTIAL
        // ======================================================

        if (
            partialConfigWarnings.length >
            0
        ) {
            message +=
                ` Có ${partialConfigWarnings.length} cấu hình không tạo đủ số suất do conflict/phòng/quá khứ.`;
        }

        // ======================================================
        // OUTSIDE HOURS
        // ======================================================

        if (
            skippedOutsideHours.length >
            0
        ) {
            message +=
                ` Có ${skippedOutsideHours.length} suất bị bỏ qua vì vượt khung giờ.`;
        }

        // ======================================================
        // 29. SUCCESS
        // ======================================================

        return {
            success: true,

            message,

            data:
                created,

            warnings,

            conflicts,

            skippedPast,

            skippedNoRoom,

            skippedOutsideHours,

            skippedInvalidConfig,

            skippedExcessConfig,

            partialConfigWarnings,

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
            const err =
                new Error(
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

        const validationError =
            validateShowtime({
                movie_id,
                cinema_id,
                room_id,
                start_time
            });

        if (validationError) {
            const err =
                new Error(
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
            const err =
                new Error(
                    "Không thể cập nhật suất chiếu trong quá khứ"
                );

            err.statusCode = 400;
            err.field =
                "start_time";

            throw err;
        }

        const conflict =
            await ShowtimeRepository.findConflict(
                room_id,
                start_time,
                showtimeId
            );

        if (conflict) {
            const err =
                new Error(
                    "Phòng này đã có lịch chiếu giờ đó"
                );

            err.statusCode = 400;
            err.field =
                "start_time";

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

        if (
            affected === 0
        ) {
            const err =
                new Error(
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
            const err =
                new Error(
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
            const err =
                new Error(
                    "Suất chiếu này đã có vé bán, không thể xóa"
                );

            err.statusCode = 400;

            throw err;
        }

        const affected =
            await ShowtimeRepository.delete(
                showtimeId
            );

        if (
            affected === 0
        ) {
            const err =
                new Error(
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
            const err =
                new Error(
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
                    getDayType(
                        date
                    );

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
            const err =
                new Error(
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