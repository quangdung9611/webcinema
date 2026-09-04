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
// ROOM ALLOCATION
//
// % được tính trên TOÀN BỘ pool phòng cùng loại.
//
// HOT:
//   2D  = 40%
//   3D  = 30%
//   VIP = 20%
//   IMAX = 10%
//
// NORMAL:
//   2D = 60%
//   3D = 40%
//
// COLD:
//   2D = 50%
//
// LƯU Ý:
// - rooms = nhóm phòng ƯU TIÊN
// - pool  = TOÀN BỘ phòng cùng hạng
//
// Khi phòng ưu tiên bận, scheduler sẽ fallback
// sang các phòng còn lại trong pool.
// ==========================================================

const ROOM_ALLOCATION_PERCENTAGE = {
    hot: {
        roomTypes: ["2D", "3D", "VIP", "IMAX"],

        percentage: {
            "2D": 0.40,
            "3D": 0.30,
            "VIP": 0.20,
            "IMAX": 0.10
        }
    },

    normal: {
        roomTypes: ["2D", "3D"],

        percentage: {
            "2D": 0.60,
            "3D": 0.40
        }
    },

    cold: {
        roomTypes: ["2D"],

        percentage: {
            "2D": 0.50
        }
    }
};

// ==========================================================
// FORMAT DATETIME
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
// TIME SLOT
// ==========================================================

const getTimeSlot = (startTime) => {
    if (!startTime) {
        return "MORNING";
    }

    const hour = parseInt(
        String(startTime).split(":")[0],
        10
    );

    if (hour >= 6 && hour < 12) {
        return "MORNING";
    }

    if (hour >= 12 && hour < 17) {
        return "AFTERNOON";
    }

    if (hour >= 17 && hour < 20) {
        return "EVENING";
    }

    return "NIGHT";
};

// ==========================================================
// DAY TYPE
// ==========================================================

const getDayType = (date) => {
    if (!date) {
        return "WEEKDAY";
    }

    const dayOfWeek =
        new Date(date).getDay();

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

const normalizeRoomTypes = (roomTypes) => {
    if (!Array.isArray(roomTypes)) {
        return [];
    }

    return [
        ...new Set(
            roomTypes
                .map(type =>
                    String(type)
                        .trim()
                        .toUpperCase()
                )
                .filter(type =>
                    ALLOWED_ROOM_TYPES.includes(type)
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

    const match =
        value.match(
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
};

const formatDate = (date) => {
    return (
        `${date.getUTCFullYear()}-` +
        `${String(
            date.getUTCMonth() + 1
        ).padStart(2, "0")}-` +
        `${String(
            date.getUTCDate()
        ).padStart(2, "0")}`
    );
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
    const day =
        new Date(date).getUTCDay();

    return (
        day === 0 ||
        day === 6
    );
};

// ==========================================================
// TIME TO MINUTES
// ==========================================================

const timeToMinutes = (time) => {
    if (time === "24:00") {
        return 24 * 60;
    }

    const parts =
        String(time)
            .split(":")
            .map(Number);

    const hour =
        parts[0];

    const minute =
        parts[1];

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
    if (
        totalMinutes ===
        24 * 60
    ) {
        return "24:00";
    }

    const hour =
        Math.floor(
            totalMinutes / 60
        );

    const minute =
        totalMinutes % 60;

    return (
        `${String(hour).padStart(2, "0")}:` +
        `${String(minute).padStart(2, "0")}`
    );
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

        return (
            `${formatDate(nextDate)} ` +
            `${minutesToTime(overflow)}`
        );
    }

    return (
        `${date} ` +
        `${minutesToTime(minutes)}`
    );
};

// ==========================================================
// GET TIME RANGE
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
// MOVIE HOT LEVEL
// ==========================================================

const getMovieHotLevel = (
    movie,
    stats = {},
    config = SCHEDULER_CONFIG
) => {
    // ------------------------------------------------------
    // Ưu tiên distribution gửi từ frontend
    // ------------------------------------------------------

    if (
        movie &&
        movie.distribution &&
        ALLOWED_DISTRIBUTIONS.includes(
            String(
                movie.distribution
            ).toLowerCase()
        )
    ) {
        return String(
            movie.distribution
        ).toLowerCase();
    }

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
        config.hotThreshold
    ) {
        return "hot";
    }

    if (
        hotScore >=
        config.normalThreshold
    ) {
        return "normal";
    }

    return "cold";
};

// ==========================================================
// GET INTERVAL
// ==========================================================

const getInterval = (
    movie,
    stats = {},
    config = SCHEDULER_CONFIG
) => {
    const level =
        getMovieHotLevel(
            movie,
            stats,
            config
        );

    switch (level) {
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
};

// ==========================================================
// TÍNH ĐIỂM HOT
// ==========================================================

const calculateHotScore = (
    movie,
    stats = {}
) => {
    const movieStats =
        stats?.[
            movie.movie_id
        ] || {};

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

    return (
        ticketSold * 0.5 +
        viewCount * 0.3 +
        rating * 10
    );
};

// ==========================================================
// NATURAL ROOM SORT
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
                    sensitivity: "base"
                }
            );
        }
    );
};

// ==========================================================
// GET ROOM CURSOR FROM EXISTING SHOWTIMES
//
// 🔥 QUAN TRỌNG
//
// Khi scheduleShowtimes() được gọi nhiều lần:
//
// Lần 1:
// 2D01 → 02 → 03 → 04
//
// Lần 2:
// KHÔNG RESET 01
//
// Hệ thống xem room cuối cùng đã được sử dụng
// trong existingShowtimes rồi bắt đầu từ phòng kế tiếp.
//
// Ví dụ:
// DB đã có 2D04
// => cursor bắt đầu tại 2D05
//
// DB đã có 2D10
// => cursor quay về 2D01
// ==========================================================

const buildInitialRoomCursors = ({
    roomsByType,
    existingShowtimes = []
}) => {
    const cursors = {};

    // ------------------------------------------------------
    // Khởi tạo cursor = 0
    // ------------------------------------------------------

    for (
        const type of Object.keys(
            roomsByType
        )
    ) {
        cursors[type] = 0;
    }

    // ------------------------------------------------------
    // Normalize existing
    // ------------------------------------------------------

    const normalizedExisting =
        existingShowtimes
            .map(item =>
                normalizeShowtime(item)
            )
            .filter(Boolean);

    // ------------------------------------------------------
    // Sort theo:
    //
    // date
    // startMinutes
    // showtime_id
    //
    // để xác định suất mới nhất.
    // ------------------------------------------------------

    normalizedExisting.sort(
        (a, b) => {
            const dateA =
                String(
                    a.date || ""
                );

            const dateB =
                String(
                    b.date || ""
                );

            if (
                dateA !== dateB
            ) {
                return dateA.localeCompare(
                    dateB
                );
            }

            const timeA =
                Number.isFinite(
                    a.startMinutes
                )
                    ? a.startMinutes
                    : -1;

            const timeB =
                Number.isFinite(
                    b.startMinutes
                )
                    ? b.startMinutes
                    : -1;

            if (
                timeA !== timeB
            ) {
                return (
                    timeA - timeB
                );
            }

            return (
                Number(
                    a.showtime_id || 0
                ) -
                Number(
                    b.showtime_id || 0
                )
            );
        }
    );

    // ------------------------------------------------------
    // Với mỗi type:
    // lấy room cuối cùng được sử dụng.
    // ------------------------------------------------------

    for (
        const [
            type,
            pool
        ]
        of Object.entries(
            roomsByType
        )
    ) {
        if (
            !Array.isArray(pool) ||
            pool.length === 0
        ) {
            continue;
        }

        const poolIds =
            pool.map(
                room =>
                    Number(
                        room.room_id
                    )
            );

        let lastRoomId =
            null;

        for (
            let i =
                normalizedExisting.length - 1;
            i >= 0;
            i--
        ) {
            const item =
                normalizedExisting[i];

            const room =
                pool.find(
                    candidate =>
                        Number(
                            candidate.room_id
                        ) ===
                        Number(
                            item.room_id
                        )
                );

            if (room) {
                lastRoomId =
                    Number(
                        room.room_id
                    );

                break;
            }
        }

        if (
            lastRoomId === null
        ) {
            cursors[type] = 0;
            continue;
        }

        const lastIndex =
            poolIds.indexOf(
                lastRoomId
            );

        if (
            lastIndex === -1
        ) {
            cursors[type] = 0;
        } else {
            cursors[type] =
                (
                    lastIndex + 1
                ) %
                pool.length;
        }
    }

    return cursors;
};

// ==========================================================
// ALLOCATE ROOMS BY PERCENTAGE
//
// 🔥 KHÔNG CHỈ LẤY PHÒNG ƯU TIÊN
//
// Mỗi allocation:
//
// {
//     count: 4,
//     rooms: [01,02,03,04],
//     pool:  [01,02,03,04,05,06,07,08,09,10]
// }
//
// rooms:
//   nhóm phòng ưu tiên theo %
//
// pool:
//   TOÀN BỘ phòng cùng hạng
//
// Khi phòng trong rooms bận,
// scheduler có thể fallback sang pool.
// ==========================================================

const allocateRoomsByPercentage = (
    movies,
    rooms,
    stats = {},
    existingShowtimes = []
) => {
    const roomsByType = {};

    // ------------------------------------------------------
    // GROUP ROOM BY TYPE
    // ------------------------------------------------------

    for (
        const room of rooms
    ) {
        const type =
            String(
                room.room_type || ""
            )
                .trim()
                .toUpperCase();

        if (
            !ALLOWED_ROOM_TYPES.includes(
                type
            )
        ) {
            continue;
        }

        if (
            !roomsByType[type]
        ) {
            roomsByType[type] = [];
        }

        roomsByType[type].push(
            room
        );
    }

    // ------------------------------------------------------
    // SORT ROOM
    // ------------------------------------------------------

    for (
        const type of Object.keys(
            roomsByType
        )
    ) {
        roomsByType[type] =
            sortRoomsNaturally(
                roomsByType[type]
            );
    }

    console.log(
        "📋 SỐ LƯỢNG PHÒNG THEO HẠNG:"
    );

    for (
        const [
            type,
            list
        ]
        of Object.entries(
            roomsByType
        )
    ) {
        console.log(
            `  ${type}: ${list.length} phòng`
        );
    }

    // ------------------------------------------------------
    // BUILD CURSOR
    //
    // 🔥 Không reset cứng về 0 nếu DB đã có lịch.
    // ------------------------------------------------------

    const startIndexMap =
        buildInitialRoomCursors({
            roomsByType,
            existingShowtimes
        });

    console.log(
        "🔄 CURSOR PHÒNG BAN ĐẦU:"
    );

    for (
        const [
            type,
            index
        ]
        of Object.entries(
            startIndexMap
        )
    ) {
        const pool =
            roomsByType[type] || [];

        const nextRoom =
            pool[index];

        console.log(
            `  ${type}: index=${index}` +
            ` → ${
                nextRoom?.room_name ||
                nextRoom?.room_id ||
                "N/A"
            }`
        );
    }

    // ------------------------------------------------------
    // SCORE MOVIES
    // ------------------------------------------------------

    const scoredMovies =
        movies.map(movie => {
            const level =
                getMovieHotLevel(
                    movie,
                    stats
                );

            return {
                ...movie,

                level,

                hotScore:
                    calculateHotScore(
                        movie,
                        stats
                    )
            };
        });

    // ------------------------------------------------------
    // HOT MOVIE FIRST
    // ------------------------------------------------------

    scoredMovies.sort(
        (a, b) =>
            b.hotScore -
            a.hotScore
    );

    // ------------------------------------------------------
    // ALLOCATE
    // ------------------------------------------------------

    const allocated =
        scoredMovies.map(movie => {
            const config =
                ROOM_ALLOCATION_PERCENTAGE[
                    movie.level
                ] ||
                ROOM_ALLOCATION_PERCENTAGE.normal;

            const allowedTypes =
                config.roomTypes;

            const percentages =
                config.percentage || {};

            let totalRoomsAllocated = 0;

            const roomAllocation = {};

            // ------------------------------------------------
            // Mỗi type
            // ------------------------------------------------

            for (
                const type
                of allowedTypes
            ) {
                const pool =
                    roomsByType[type] || [];

                if (
                    pool.length === 0
                ) {
                    roomAllocation[type] = {
                        count: 0,

                        rooms: [],

                        pool: []
                    };

                    continue;
                }

                const percent =
                    Number(
                        percentages[type] || 0
                    );

                // ------------------------------------------------
                // TÍNH SỐ PHÒNG
                // ------------------------------------------------

                let allocatedCount =
                    Math.round(
                        pool.length *
                        percent
                    );

                if (
                    allocatedCount === 0 &&
                    percent > 0
                ) {
                    allocatedCount = 1;
                }

                allocatedCount =
                    Math.min(
                        allocatedCount,
                        pool.length
                    );

                // ------------------------------------------------
                // CURSOR
                // ------------------------------------------------

                let startIndex =
                    Number(
                        startIndexMap[type] || 0
                    );

                startIndex =
                    (
                        startIndex %
                        pool.length +
                        pool.length
                    ) %
                    pool.length;

                // ------------------------------------------------
                // SELECT PREFERRED ROOMS
                // ------------------------------------------------

                const selectedRooms = [];

                for (
                    let i = 0;
                    i < allocatedCount;
                    i++
                ) {
                    const index =
                        (
                            startIndex +
                            i
                        ) %
                        pool.length;

                    selectedRooms.push(
                        pool[index]
                    );
                }

                // ------------------------------------------------
                // MOVE GLOBAL CURSOR
                //
                // Ví dụ 10 phòng:
                //
                // start 0 + 4
                // => next = 4
                //
                // start 4 + 4
                // => next = 8
                //
                // start 8 + 4
                // => next = 2
                // ------------------------------------------------

                startIndexMap[type] =
                    (
                        startIndex +
                        allocatedCount
                    ) %
                    pool.length;

                roomAllocation[type] = {
                    count:
                        selectedRooms.length,

                    // 🔥 PHÒNG ƯU TIÊN
                    rooms:
                        selectedRooms,

                    // 🔥 TOÀN BỘ POOL
                    pool:
                        pool
                };

                totalRoomsAllocated +=
                    selectedRooms.length;
            }

            return {
                ...movie,

                allocatedRooms:
                    totalRoomsAllocated,

                roomAllocation,

                allowedTypes
            };
        });

    // ------------------------------------------------------
    // LOG
    // ------------------------------------------------------

    console.log(
        "📊 PHÂN BỔ PHÒNG THEO % + ROUND ROBIN:"
    );

    for (
        const movie
        of allocated
    ) {
        console.log(
            `  🔹 ${movie.title} ` +
            `(${movie.level.toUpperCase()}) ` +
            `- ${movie.allocatedRooms} phòng`
        );

        for (
            const [
                type,
                data
            ]
            of Object.entries(
                movie.roomAllocation
            )
        ) {
            if (
                !data ||
                data.count <= 0
            ) {
                continue;
            }

            const preferredNames =
                data.rooms
                    .map(
                        room =>
                            room.room_name ||
                            room.room_id
                    )
                    .join(", ");

            const poolNames =
                data.pool
                    .map(
                        room =>
                            room.room_name ||
                            room.room_id
                    )
                    .join(", ");

            console.log(
                `      ${type}: ` +
                `${data.count} phòng ưu tiên ` +
                `(${preferredNames})`
            );

            console.log(
                `          Pool: ${poolNames}`
            );
        }
    }

    return allocated;
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
        showtime.date || null;

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
        existingRaw => {
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
// MERGE ROOM LIST
//
// preferredRooms:
//   phòng ưu tiên
//
// poolRooms:
//   toàn bộ phòng cùng hạng
//
// Kết quả:
//   ưu tiên phòng trong preferredRooms trước,
//   sau đó mới đến các phòng còn lại của pool.
//
// Tuy nhiên cursor quyết định điểm bắt đầu,
// nên vẫn có thể đi xuyên toàn bộ pool.
// ==========================================================

const buildRoomSearchList = ({
    preferredRooms = [],
    poolRooms = [],
    roomStartIndex = 0
}) => {
    const preferred =
        Array.isArray(
            preferredRooms
        )
            ? preferredRooms
            : [];

    const pool =
        Array.isArray(
            poolRooms
        )
            ? poolRooms
            : [];

    if (
        pool.length === 0 &&
        preferred.length === 0
    ) {
        return [];
    }

    // ------------------------------------------------------
    // Pool chuẩn
    // ------------------------------------------------------

    const normalizedPool =
        sortRoomsNaturally(
            [
                ...new Map(
                    [
                        ...pool,
                        ...preferred
                    ]
                        .map(room => [
                            Number(
                                room.room_id
                            ),
                            room
                        ])
                        .filter(
                            ([id]) =>
                                Number.isInteger(id) &&
                                id > 0
                        )
                ).values()
            ]
        );

    if (
        normalizedPool.length === 0
    ) {
        return [];
    }

    // ------------------------------------------------------
    // Tìm cursor theo room_id
    // ------------------------------------------------------

    let startIndex =
        Number(
            roomStartIndex
        ) || 0;

    startIndex =
        (
            startIndex %
            normalizedPool.length +
            normalizedPool.length
        ) %
        normalizedPool.length;

    // ------------------------------------------------------
    // Xoay pool từ cursor
    // ------------------------------------------------------

    const rotatedPool = [];

    for (
        let i = 0;
        i < normalizedPool.length;
        i++
    ) {
        const index =
            (
                startIndex +
                i
            ) %
            normalizedPool.length;

        rotatedPool.push(
            normalizedPool[index]
        );
    }

    // ------------------------------------------------------
    // Preferred IDs
    // ------------------------------------------------------

    const preferredIds =
        new Set(
            preferred
                .map(
                    room =>
                        Number(
                            room.room_id
                        )
                )
                .filter(
                    id =>
                        Number.isInteger(id) &&
                        id > 0
                )
        );

    // ------------------------------------------------------
    // Nếu cursor hiện tại rơi vào preferred,
    // preferred vẫn được ưu tiên.
    //
    // Nếu cursor đã đi sang phòng khác,
    // không quay ngược về 01 một cách vô lý.
    //
    // Ta dùng rotatedPool làm thứ tự chính.
    // ------------------------------------------------------

    const result = [];

    // ------------------------------------------------------
    // Tìm preferred gần cursor trước
    // ------------------------------------------------------

    for (
        const room
        of rotatedPool
    ) {
        const roomId =
            Number(
                room.room_id
            );

        if (
            preferredIds.has(
                roomId
            )
        ) {
            result.push(
                room
            );
        }
    }

    // ------------------------------------------------------
    // Sau preferred -> phần còn lại của pool
    // ------------------------------------------------------

    for (
        const room
        of rotatedPool
    ) {
        const roomId =
            Number(
                room.room_id
            );

        if (
            preferredIds.has(
                roomId
            )
        ) {
            continue;
        }

        result.push(
            room
        );
    }

    return result;
};

// ==========================================================
// FIND AVAILABLE ROOM
//
// 🔥 LOGIC CHỐNG PHÒNG BẬN
//
// 1. Ưu tiên allocation
// 2. Nếu allocation bận:
//      tìm tiếp trong FULL pool cùng hạng
//
// Ví dụ:
//
// preferred:
// 01 02 03 04
//
// pool:
// 01 02 03 04 05 06 07 08 09 10
//
// 01 bận
// 02 bận
// 03 bận
// 04 bận
// 05 trống
//
// => trả về 05
//
// Không dừng ở 04.
// ==========================================================

const findAvailableRoom = ({
    preferredRooms = [],
    poolRooms = [],
    roomStartIndex = 0,
    startMinutes,
    endMinutes,
    existingShowtimes = [],
    bufferMinutes = 15
}) => {
    const searchRooms =
        buildRoomSearchList({
            preferredRooms,
            poolRooms,
            roomStartIndex
        });

    if (
        searchRooms.length === 0
    ) {
        return null;
    }

    for (
        let index = 0;
        index < searchRooms.length;
        index++
    ) {
        const room =
            searchRooms[index];

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

                existingShowtimes,

                bufferMinutes
            });

        if (!conflict) {
            return {
                room,

                index,

                rooms:
                    searchRooms
            };
        }
    }

    return null;
};

// ==========================================================
// FILTER ROOMS BY TYPE
// ==========================================================

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
            room =>
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
        room => {
            const roomType =
                String(
                    room.room_type || ""
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
// BUILD ROOM TYPE SEQUENCE
//
// 🔥 MỤC ĐÍCH:
//
// Không để 2D chiếm toàn bộ suất chỉ vì
// generateSlotsForMovie() duyệt 2D đầu tiên.
//
// Ví dụ HOT:
//
// 2D = 40%
// 3D = 30%
// VIP = 20%
// IMAX = 10%
//
// Sequence sẽ cố gắng phản ánh tỷ lệ
// số phòng đã allocation.
//
// Ví dụ allocation:
//
// 2D: 4
// 3D: 3
// VIP: 2
// IMAX: 1
//
// Sequence:
//
// 2D 2D 2D 2D
// 3D 3D 3D
// VIP VIP
// IMAX
//
// rồi lặp lại.
//
// ==========================================================

const buildRoomTypeSequence = (
    roomAllocation
) => {
    const weightedTypes = [];

    for (
        const [
            type,
            allocation
        ]
        of Object.entries(
            roomAllocation
        )
    ) {
        if (
            !allocation ||
            !Array.isArray(
                allocation.pool
            ) ||
            allocation.pool.length === 0
        ) {
            continue;
        }

        const count =
            Number(
                allocation.count || 0
            );

        if (
            count <= 0
        ) {
            continue;
        }

        for (
            let i = 0;
            i < count;
            i++
        ) {
            weightedTypes.push(
                type
            );
        }
    }

    return weightedTypes;
};

// ==========================================================
// GENERATE SLOTS FOR ONE MOVIE / ONE DAY
//
// 🔥 ĐIỂM QUAN TRỌNG NHẤT
//
// roomAllocation[type] có:
//
// rooms = phòng ưu tiên
// pool  = toàn bộ phòng cùng hạng
//
// Khi phòng ưu tiên bận,
// tìm tiếp trong pool.
//
// Đồng thời các loại phòng được xoay theo
// allocation count để không cho 2D chiếm hết.
// ==========================================================

const generateSlotsForMovie = ({
    date,
    movie,
    roomAllocation = {},
    existingShowtimes = [],
    scheduledSlots = [],
    config = {},
    movieStats = {},
    initialRoomCursors = {}
}) => {
    const mergedConfig = {
        ...SCHEDULER_CONFIG,
        ...config
    };

    const timeRange =
        getTimeRangeForDate(
            date,
            mergedConfig
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
        return [];
    }

    const interval =
        getInterval(
            movie,
            movieStats,
            mergedConfig
        );

    const buffer =
        Number(
            mergedConfig.bufferMinutes
        ) || 15;

    // ------------------------------------------------------
    // ROOM TYPES
    // ------------------------------------------------------

    const roomTypes =
        Object.keys(
            roomAllocation
        ).filter(
            type => {
                const allocation =
                    roomAllocation[type];

                return (
                    allocation &&
                    Array.isArray(
                        allocation.pool
                    ) &&
                    allocation.pool.length > 0
                );
            }
        );

    if (
        roomTypes.length === 0
    ) {
        return [];
    }

    // ------------------------------------------------------
    // ROOM TYPE WEIGHTED SEQUENCE
    // ------------------------------------------------------

    const roomTypeSequence =
        buildRoomTypeSequence(
            roomAllocation
        );

    if (
        roomTypeSequence.length === 0
    ) {
        return [];
    }

    // ------------------------------------------------------
    // CURSOR RIÊNG TỪNG HẠNG
    // ------------------------------------------------------

    const roomCursor = {};

    for (
        const type of roomTypes
    ) {
        roomCursor[type] =
            Number(
                initialRoomCursors[type] || 0
            );
    }

    // ------------------------------------------------------
    // EXISTING
    // ------------------------------------------------------

    const allExisting = [
        ...existingShowtimes,
        ...scheduledSlots
    ]
        .map(item =>
            normalizeShowtime(item)
        )
        .filter(Boolean);

    const existingToday =
        allExisting.filter(
            item =>
                item.date === date
        );

    // ------------------------------------------------------
    // START
    // ------------------------------------------------------

    let currentTime =
        timeRange.startMinutes;

    const slots = [];

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
        ) + 100;

    let typeSequenceIndex = 0;

    // ======================================================
    // GENERATE
    // ======================================================

    while (
        currentTime + duration <=
            timeRange.endMinutes &&
        safetyCounter <
            maxIterations
    ) {
        safetyCounter++;

        const endMinutes =
            currentTime +
            duration;

        let selectedRoom = null;

        let selectedType = null;

        let selectedSearchResult = null;

        // --------------------------------------------------
        // Thử tất cả room types theo weighted sequence
        // bắt đầu từ vị trí hiện tại.
        //
        // Nếu type đầu tiên hết phòng / tất cả bận,
        // thử type tiếp theo.
        // --------------------------------------------------

        const sequenceLength =
            roomTypeSequence.length;

        for (
            let offset = 0;
            offset < sequenceLength;
            offset++
        ) {
            const sequencePosition =
                (
                    typeSequenceIndex +
                    offset
                ) %
                sequenceLength;

            const type =
                roomTypeSequence[
                    sequencePosition
                ];

            if (
                selectedType === type &&
                selectedRoom
            ) {
                continue;
            }

            const allocation =
                roomAllocation[type];

            if (!allocation) {
                continue;
            }

            const preferredRooms =
                Array.isArray(
                    allocation.rooms
                )
                    ? allocation.rooms
                    : [];

            const poolRooms =
                Array.isArray(
                    allocation.pool
                )
                    ? allocation.pool
                    : preferredRooms;

            if (
                poolRooms.length === 0
            ) {
                continue;
            }

            const result =
                findAvailableRoom({
                    preferredRooms,

                    poolRooms,

                    roomStartIndex:
                        roomCursor[type] || 0,

                    startMinutes:
                        currentTime,

                    endMinutes,

                    existingShowtimes: [
                        ...existingToday,
                        ...slots
                    ],

                    bufferMinutes:
                        buffer
                });

            if (result) {
                selectedRoom =
                    result.room;

                selectedType =
                    type;

                selectedSearchResult =
                    result;

                // ------------------------------------------
                // Cursor tiếp tục theo POOL THẬT
                //
                // result.rooms là search list đã xoay.
                // Tìm index của room trong pool thật.
                // ------------------------------------------

                const poolIds =
                    poolRooms.map(
                        room =>
                            Number(
                                room.room_id
                            )
                    );

                const selectedRoomId =
                    Number(
                        result.room.room_id
                    );

                const actualIndex =
                    poolIds.indexOf(
                        selectedRoomId
                    );

                if (
                    actualIndex >= 0
                ) {
                    roomCursor[type] =
                        (
                            actualIndex +
                            1
                        ) %
                        poolRooms.length;
                } else {
                    roomCursor[type] =
                        (
                            Number(
                                roomCursor[type]
                            ) + 1
                        ) %
                        poolRooms.length;
                }

                // ------------------------------------------
                // Sequence tiếp theo bắt đầu sau type vừa dùng
                // ------------------------------------------

                typeSequenceIndex =
                    (
                        sequencePosition +
                        1
                    ) %
                    sequenceLength;

                break;
            }
        }

        // --------------------------------------------------
        // Không có phòng nào trống
        // --------------------------------------------------

        if (
            !selectedRoom ||
            !selectedType
        ) {
            currentTime += interval;
            continue;
        }

        // --------------------------------------------------
        // CREATE SLOT
        // --------------------------------------------------

        const room =
            selectedRoom;

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
                selectedType,

            date,

            movie_id:
                Number(
                    movie.movie_id
                ),

            start_time:
                buildDateTime(
                    date,
                    currentTime
                ),

            end_time:
                buildDateTime(
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
                getMovieHotLevel(
                    movie,
                    movieStats,
                    mergedConfig
                )
        };

        slots.push(
            slot
        );

        console.log(
            `🎬 ${movie.title} | ` +
            `${date} ${minutesToTime(currentTime)} | ` +
            `${selectedType} | ` +
            `${room.room_name || roomId}`
        );

        // --------------------------------------------------
        // NEXT TIME
        // --------------------------------------------------

        currentTime +=
            interval;
    }

    return slots;
};

// ==========================================================
// AUTO SCHEDULER MAIN
// ==========================================================

const generateSchedule = ({
    movies = [],
    rooms = [],
    startDate,
    endDate,
    config = {},
    movieStats = {},
    existingShowtimes = [],
    roomTypes = []
}) => {
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
        parseDate(
            startDate
        );

    const toDate =
        parseDate(
            endDate
        );

    if (
        fromDate > toDate
    ) {
        throw new Error(
            "Ngày bắt đầu phải <= ngày kết thúc."
        );
    }

    const mergedConfig = {
        ...SCHEDULER_CONFIG,
        ...config
    };

    mergedConfig.bufferMinutes =
        Number(
            mergedConfig.bufferMinutes
        ) || 15;

    // ======================================================
    // NORMALIZE MOVIES
    // ======================================================

    const normalizedMovies =
        movies.map(movie => {
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

    // ======================================================
    // NORMALIZE ROOMS
    // ======================================================

    const normalizedRooms =
        rooms.map(room => {
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
                    `ID phòng không hợp lệ: ${room.room_id}`
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
        });

    // ======================================================
    // ROOM TYPES
    // ======================================================

    const normalizedRoomTypes =
        normalizeRoomTypes(
            roomTypes
        );

    const eligibleRooms =
        filterRoomsByType(
            normalizedRooms,
            normalizedRoomTypes
        );

    if (
        eligibleRooms.length === 0
    ) {
        throw new Error(
            normalizedRoomTypes.length > 0
                ? `Không có phòng thuộc loại: ${normalizedRoomTypes.join(", ")}`
                : "Không có phòng chiếu hợp lệ."
        );
    }

    // ======================================================
    // ALLOCATE
    //
    // 🔥 Truyền existingShowtimes để cursor
    // không reset về 0.
    // ======================================================

    const allocation =
        allocateRoomsByPercentage(
            normalizedMovies,
            eligibleRooms,
            movieStats,
            existingShowtimes
        );

    const allocationMap = {};

    for (
        const item
        of allocation
    ) {
        allocationMap[
            item.movie_id
        ] = item;
    }

    // ======================================================
    // SORT MOVIES
    // ======================================================

    const sortedMovies =
        [...normalizedMovies].sort(
            (a, b) => {
                const scoreA =
                    calculateHotScore(
                        a,
                        movieStats
                    );

                const scoreB =
                    calculateHotScore(
                        b,
                        movieStats
                    );

                return (
                    scoreB -
                    scoreA
                );
            }
        );

    // ======================================================
    // DATE LIST
    // ======================================================

    const dateList = [];

    let currentDate =
        parseDate(
            startDate
        );

    while (
        currentDate <= toDate
    ) {
        dateList.push(
            formatDate(
                currentDate
            )
        );

        currentDate =
            addDays(
                currentDate,
                1
            );
    }

    // ======================================================
    // ALL RESULTS
    // ======================================================

    const allResults = [];

    // ======================================================
    // GENERATE EACH DAY
    // ======================================================

    for (
        const date
        of dateList
    ) {
        const scheduledSlots = [];

        // --------------------------------------------------
        // Mỗi phim
        // --------------------------------------------------

        for (
            const movie
            of sortedMovies
        ) {
            const movieId =
                movie.movie_id;

            const alloc =
                allocationMap[
                    movieId
                ];

            if (
                !alloc ||
                !alloc.roomAllocation
            ) {
                console.warn(
                    `⚠️ ${movie.title}: không có allocation`
                );

                continue;
            }

            // ------------------------------------------------
            // CURSOR BAN ĐẦU CHO TỪNG TYPE
            //
            // Allocation đã có cursor theo existingShowtimes.
            //
            // Không reset phòng về 01.
            // ------------------------------------------------

            const initialRoomCursors = {};

            for (
                const [
                    type,
                    data
                ]
                of Object.entries(
                    alloc.roomAllocation
                )
            ) {
                if (
                    !data ||
                    !Array.isArray(
                        data.pool
                    ) ||
                    data.pool.length === 0
                ) {
                    continue;
                }

                const poolIds =
                    data.pool.map(
                        room =>
                            Number(
                                room.room_id
                            )
                    );

                // --------------------------------------------
                // Tìm room cuối cùng của type trong existing
                // --------------------------------------------

                let lastIndex = -1;

                const normalizedExisting =
                    [
                        ...existingShowtimes,
                        ...scheduledSlots
                    ]
                        .map(item =>
                            normalizeShowtime(
                                item
                            )
                        )
                        .filter(Boolean)
                        .sort(
                            (a, b) => {
                                const dateA =
                                    String(
                                        a.date || ""
                                    );

                                const dateB =
                                    String(
                                        b.date || ""
                                    );

                                if (
                                    dateA !== dateB
                                ) {
                                    return dateA.localeCompare(
                                        dateB
                                    );
                                }

                                return (
                                    Number(
                                        a.startMinutes || 0
                                    ) -
                                    Number(
                                        b.startMinutes || 0
                                    )
                                );
                            }
                        );

                for (
                    let i =
                        normalizedExisting.length - 1;
                    i >= 0;
                    i--
                ) {
                    const item =
                        normalizedExisting[i];

                    const index =
                        poolIds.indexOf(
                            Number(
                                item.room_id
                            )
                        );

                    if (
                        index >= 0
                    ) {
                        lastIndex =
                            index;

                        break;
                    }
                }

                if (
                    lastIndex >= 0
                ) {
                    initialRoomCursors[type] =
                        (
                            lastIndex +
                            1
                        ) %
                        data.pool.length;
                } else {
                    initialRoomCursors[type] =
                        0;
                }
            }

            // ------------------------------------------------
            // GENERATE
            // ------------------------------------------------

            const slots =
                generateSlotsForMovie({
                    date,

                    movie,

                    roomAllocation:
                        alloc.roomAllocation,

                    existingShowtimes,

                    scheduledSlots,

                    config:
                        mergedConfig,

                    movieStats,

                    initialRoomCursors
                });

            // ------------------------------------------------
            // PUSH
            // ------------------------------------------------

            for (
                const slot
                of slots
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

    // ======================================================
    // SORT RESULTS
    // ======================================================

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
                Number(a.room_id) -
                Number(b.room_id)
            );
        }
    );

    // ======================================================
    // STATS
    // ======================================================

    const stats = {
        totalMovies:
            normalizedMovies.length,

        totalRooms:
            normalizedRooms.length,

        eligibleRooms:
            eligibleRooms.length,

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

        allocation:
            allocation.map(
                item => ({
                    movie_id:
                        item.movie_id,

                    title:
                        item.title,

                    hotScore:
                        item.hotScore,

                    allocatedRooms:
                        item.allocatedRooms,

                    roomAllocation:
                        item.roomAllocation
                })
            )
    };

    // ======================================================
    // BY MOVIE
    // ======================================================

    for (
        const movie
        of normalizedMovies
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
            getMovieHotLevel(
                movie,
                movieStats,
                mergedConfig
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
    }

    // ======================================================
    // BY ROOM
    // ======================================================

    for (
        const room
        of normalizedRooms
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

    // ======================================================
    // BY DATE
    // ======================================================

    for (
        const date
        of dateList
    ) {
        stats.byDate[
            date
        ] =
            allResults.filter(
                slot =>
                    slot.date ===
                    date
            ).length;
    }

    // ======================================================
    // RETURN
    // ======================================================

    return {
        data:
            allResults,

        stats,

        config:
            mergedConfig,

        roomTypes:
            normalizedRoomTypes,

        eligibleRoomCount:
            eligibleRooms.length,

        dateRange: {
            startDate,
            endDate,

            totalDays:
                dateList.length
        },

        allocation
    };
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

    // ======================================================
    // GET PAGINATED
    // ======================================================

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

    // ======================================================
    // GET BY CINEMA + ROOM
    // ======================================================

    async getShowtimesByCinemaAndRoom(
        cinema_id,
        room_id
    ) {
        return await ShowtimeRepository.findByCinemaAndRoom(
            cinema_id,
            room_id
        );
    }

    // ======================================================
    // GET DETAIL
    // ======================================================

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

    // ======================================================
    // GET BY MOVIE
    // ======================================================

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
                showtime => {
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
                (
                    acc,
                    item
                ) => {
                    const key =
                        item.room_type ||
                        "UNKNOWN";

                    if (
                        !acc[key]
                    ) {
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
    // CREATE SHOWTIME
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
            Number(
                movie_id
            );

        cinema_id =
            Number(
                cinema_id
            );

        room_id =
            Number(
                room_id
            );

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
            err.field = "start_time";

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

    // ======================================================
    // AUTO SCHEDULE SHOWTIMES
    // ======================================================

    async scheduleShowtimes(
        data
    ) {
        if (!data) {
            const err =
                new Error(
                    "Dữ liệu tạo lịch chiếu không hợp lệ"
                );

            err.statusCode = 400;

            throw err;
        }

        const {
            movie_id,
            cinema_id,
            start_date,
            end_date,
            distribution
        } = data;

        const movieId =
            Number(
                movie_id
            );

        const cinemaId =
            Number(
                cinema_id
            );

        // ==================================================
        // VALIDATE MOVIE
        // ==================================================

        if (
            !Number.isInteger(
                movieId
            ) ||
            movieId <= 0
        ) {
            const err =
                new Error(
                    "Vui lòng chọn phim"
                );

            err.statusCode = 400;
            err.field = "movie_id";

            throw err;
        }

        // ==================================================
        // VALIDATE CINEMA
        // ==================================================

        if (
            !Number.isInteger(
                cinemaId
            ) ||
            cinemaId <= 0
        ) {
            const err =
                new Error(
                    "Vui lòng chọn rạp"
                );

            err.statusCode = 400;
            err.field = "cinema_id";

            throw err;
        }

        // ==================================================
        // VALIDATE DATE
        // ==================================================

        if (!start_date) {
            const err =
                new Error(
                    "Vui lòng chọn ngày bắt đầu"
                );

            err.statusCode = 400;
            err.field = "start_date";

            throw err;
        }

        if (!end_date) {
            const err =
                new Error(
                    "Vui lòng chọn ngày kết thúc"
                );

            err.statusCode = 400;
            err.field = "end_date";

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
            endDate < startDate
        ) {
            const err =
                new Error(
                    "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
                );

            err.statusCode = 400;
            err.field = "end_date";

            throw err;
        }

        // ==================================================
        // DISTRIBUTION
        // ==================================================

        const scheduleDistribution =
            String(
                distribution ||
                "normal"
            ).toLowerCase();

        if (
            !ALLOWED_DISTRIBUTIONS.includes(
                scheduleDistribution
            )
        ) {
            const err =
                new Error(
                    "Mức độ phân bổ không hợp lệ. Chấp nhận: hot, normal, cold"
                );

            err.statusCode = 400;
            err.field = "distribution";

            throw err;
        }

        // ==================================================
        // GET MOVIE
        // ==================================================

        const movie =
            await ShowtimeRepository.getMovieDuration(
                movieId
            );

        if (!movie) {
            const err =
                new Error(
                    "Không tìm thấy phim"
                );

            err.statusCode = 404;
            err.field = "movie_id";

            throw err;
        }

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
            const err =
                new Error(
                    "Thời lượng phim không hợp lệ"
                );

            err.statusCode = 400;
            err.field = "movie_id";

            throw err;
        }

        // ==================================================
        // GET ROOMS
        // ==================================================

        let rooms = [];

        if (
            typeof ShowtimeRepository.findRoomsByCinema ===
            "function"
        ) {
            rooms =
                await ShowtimeRepository.findRoomsByCinema(
                    cinemaId
                );
        }

        rooms =
            rooms
                .map(
                    room => ({
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
                    room =>
                        Number.isInteger(
                            room.room_id
                        ) &&
                        room.room_id > 0
                );

        if (
            rooms.length === 0
        ) {
            const err =
                new Error(
                    "Rạp không có phòng chiếu nào."
                );

            err.statusCode = 400;
            err.field = "cinema_id";

            throw err;
        }

        // ==================================================
        // ALL ROOM TYPES
        // ==================================================

        const allRoomTypes = [
            ...new Set(
                rooms.map(
                    room =>
                        room.room_type
                )
            )
        ].filter(
            type =>
                ALLOWED_ROOM_TYPES.includes(
                    type
                )
        );

        console.log(
            `📋 Rạp có các hạng phòng: ${allRoomTypes.join(", ")}`
        );

        // ==================================================
        // ROOM IDS
        // ==================================================

        const schedulerRoomIds =
            rooms.map(
                room =>
                    Number(
                        room.room_id
                    )
            );

        // ==================================================
        // EXISTING SHOWTIMES
        //
        // 🔥 RẤT QUAN TRỌNG
        //
        // Dữ liệu này được dùng để:
        //
        // 1. kiểm tra phòng bận
        // 2. xác định cursor round-robin
        // 3. tránh quay lại 2D01 vô lý
        // ==================================================

        const existingShowtimes =
            await ShowtimeRepository.getExistingShowtimes({
                cinemaId,

                startDate:
                    start_date,

                endDate:
                    end_date,

                roomIds:
                    schedulerRoomIds
            });

        console.log(
            `📚 Đã tải ${
                existingShowtimes?.length || 0
            } suất chiếu hiện tại để kiểm tra xung đột.`
        );

        // ==================================================
        // CONFIG
        // ==================================================

        const config = {
            ...SCHEDULER_CONFIG,

            weekdayStart:
                "08:00",

            weekdayEnd:
                "23:30",

            weekendStart:
                "08:00",

            weekendEnd:
                "24:00",

            bufferMinutes:
                15,

            hotInterval:
                45,

            normalInterval:
                75,

            coldInterval:
                120,

            roomTypes:
                allRoomTypes
        };

        // ==================================================
        // MOVIE FOR SCHEDULER
        // ==================================================

        const moviesForScheduler = [
            {
                movie_id:
                    movieId,

                title:
                    movie.title ||
                    `Phim ${movieId}`,

                duration,

                distribution:
                    scheduleDistribution,

                roomTypes:
                    allRoomTypes
            }
        ];

        // ==================================================
        // GENERATE
        // ==================================================

        const generated =
            generateSchedule({
                movies:
                    moviesForScheduler,

                rooms,

                roomTypes:
                    allRoomTypes,

                startDate:
                    start_date,

                endDate:
                    end_date,

                config,

                existingShowtimes,

                movieStats: {}
            });

        // ==================================================
        // RESULT ARRAYS
        // ==================================================

        const created = [];

        const conflicts = [];

        const skippedPast = [];

        // ==================================================
        // TIME SLOT STATS
        // ==================================================

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

        // ==================================================
        // DAY TYPE STATS
        // ==================================================

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

        // ==================================================
        // CREATE GENERATED SHOWTIMES
        // ==================================================

        for (
            const slot
            of generated.data
        ) {
            const roomId =
                Number(
                    slot.room_id
                );

            const slotStartTime =
                formatDateTime(
                    slot.start_time
                );

            const slotEndTime =
                formatDateTime(
                    slot.end_time
                );

            const date =
                slot.date;

            const timeSlot =
                getTimeSlot(
                    slotStartTime
                        ?.split(" ")[1] ||
                    "09:00"
                );

            const dayType =
                getDayType(
                    date
                );

            const roomInfo =
                rooms.find(
                    room =>
                        Number(
                            room.room_id
                        ) ===
                        roomId
                );

            const roomType =
                slot.room_type ||
                roomInfo?.room_type ||
                null;

            // ==================================================
            // INVALID
            // ==================================================

            if (
                !Number.isInteger(
                    roomId
                ) ||
                roomId <= 0 ||
                !slotStartTime
            ) {
                conflicts.push({
                    ...slot,

                    reason:
                        "Suất chiếu không hợp lệ"
                });

                continue;
            }

            // ==================================================
            // PAST
            // ==================================================

            const isPast =
                await ShowtimeRepository.isPastTime(
                    slotStartTime
                );

            if (isPast) {
                skippedPast.push({
                    ...slot,

                    room_type:
                        roomType,

                    reason:
                        "Suất chiếu nằm trong quá khứ"
                });

                continue;
            }

            // ==================================================
            // DB CONFLICT
            // ==================================================

            const conflict =
                await ShowtimeRepository.findConflict(
                    roomId,
                    slotStartTime,
                    slotEndTime
                );

            if (conflict) {
                conflicts.push({
                    ...slot,

                    room_type:
                        roomType,

                    reason:
                        "Phòng đã có suất chiếu bị trùng thời gian"
                });

                continue;
            }

            // ==================================================
            // CREATE
            // ==================================================

            try {
                const showtimeId =
                    await ShowtimeRepository.create({
                        movie_id:
                            movieId,

                        cinema_id:
                            cinemaId,

                        room_id:
                            roomId,

                        start_time:
                            slotStartTime
                    });

                const createdSlot = {
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

                    start_time:
                        slotStartTime,

                    end_time:
                        slotEndTime,

                    duration,

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

                created.push(
                    createdSlot
                );

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
                        dayType
                    ]
                ) {
                    dayTypeStats[
                        dayType
                    ].count++;

                    dayTypeStats[
                        dayType
                    ].slots.push(
                        createdSlot
                    );
                }

            } catch (error) {
                conflicts.push({
                    ...slot,

                    room_type:
                        roomType,

                    reason:
                        error.message ||
                        "Không thể tạo suất chiếu"
                });
            }
        }

        // ==================================================
        // RETURN
        // ==================================================

        return {
            success: true,

            data:
                created,

            conflicts,

            skippedPast,

            summary: {
                movieId,

                cinemaId,

                roomCount:
                    rooms.length,

                roomTypes:
                    allRoomTypes,

                roomIds:
                    rooms.map(
                        room =>
                            room.room_id
                    ),

                generatedCount:
                    generated.data.length,

                createdCount:
                    created.length,

                conflictCount:
                    conflicts.length,

                skippedPastCount:
                    skippedPast.length,

                duration,

                startDate:
                    start_date,

                endDate:
                    end_date,

                startTime:
                    "08:00",

                endTime:
                    "23:30",

                distribution:
                    scheduleDistribution,

                byRoomType:
                    created.reduce(
                        (
                            acc,
                            slot
                        ) => {
                            const type =
                                slot.room_type ||
                                "UNKNOWN";

                            acc[type] =
                                (
                                    acc[type] ||
                                    0
                                ) + 1;

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

                allocation:
                    generated.allocation ||
                    []
            },

            schedulerStats:
                generated.stats ||
                null,

            schedulerDistribution:
                generated.distribution ||
                null,

            roomTypes:
                allRoomTypes
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
            Number(
                movie_id
            );

        cinema_id =
            Number(
                cinema_id
            );

        room_id =
            Number(
                room_id
            );

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
            const err =
                new Error(
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
    // QUICK BOOKING DATA
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
    // SHOWTIMES FOR BOOKING
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
            showtime => {
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