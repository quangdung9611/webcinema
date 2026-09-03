const ShowtimeRepository = require("../Repositories/ShowtimeRepository");
const ShowtimeScheduler = require("./ShowtimeScheduler");


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
// TIME SLOT HELPERS
// KHỚP VỚI PRICECONFIG
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
// LABELS
// ==========================================================

const TIME_SLOT_LABELS = {

    MORNING:
        "Sáng (6h-12h)",

    AFTERNOON:
        "Chiều (12h-17h)",

    EVENING:
        "Tối (17h-20h)",

    NIGHT:
        "Đêm (20h-24h)"
};


const DAY_TYPE_LABELS = {

    WEEKDAY:
        "Ngày thường (T2-T6)",

    WEEKEND:
        "Cuối tuần (T7-CN)"
};


// ==========================================================
// ROOM TYPES
// ==========================================================

const ALLOWED_ROOM_TYPES = [
    "2D",
    "3D",
    "VIP",
    "IMAX"
];


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

        return (
            "Vui lòng chọn đầy đủ: " +
            "Phim, Rạp, Phòng và Thời gian chiếu"
        );
    }

    return null;
};


// ==========================================================
// SERVICE
// ==========================================================

class ShowtimeService {


    // ========================================================
    // GET ALL SHOWTIMES - KHÔNG PHÂN TRANG
    // ========================================================

    async getAllShowtimesAll(search = "") {

        return await ShowtimeRepository.findAllAll(
            search
        );
    }


    // ========================================================
    // GET ALL SHOWTIMES - CÓ PHÂN TRANG
    // ========================================================

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


    // ========================================================
    // GET SHOWTIMES BY CINEMA + ROOM
    // ========================================================

    async getShowtimesByCinemaAndRoom(
        cinema_id,
        room_id
    ) {

        return await ShowtimeRepository
            .findByCinemaAndRoom(
                cinema_id,
                room_id
            );
    }


    // ========================================================
    // GET SHOWTIME DETAIL
    // ========================================================

    async getShowtimeDetail(showtimeId) {

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


    // ========================================================
    // GET SHOWTIMES BY MOVIE
    // ========================================================

    async getShowtimesByMovie(movieId) {

        return await ShowtimeRepository.findByMovie(
            movieId
        );
    }


    // ========================================================
    // GET SHOWTIMES FOR MOVIE DETAIL
    // ========================================================

    async getShowtimesForMovieDetail(
        movieId,
        cinemaId,
        date
    ) {

        const showtimes =
            await ShowtimeRepository
                .findByMovieCinemaDateForDetail(
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
                            ] || timeSlot,

                        day_type:
                            dayType,

                        day_type_label:
                            DAY_TYPE_LABELS[
                                dayType
                            ] || dayType
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


    // ========================================================
    // CREATE SHOWTIME
    // TẠO 1 SUẤT THỦ CÔNG
    // ========================================================

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


    // ========================================================
    // AUTO SCHEDULE SHOWTIMES
    //
    // GALAXY-STYLE
    //
    // ROOM TYPE:
    // 2D / 3D / VIP / IMAX
    //
    // INTERVAL:
    // HOT    = 45 phút
    // NORMAL = 75 phút
    // COLD   = 120 phút
    //
    // BUFFER:
    // 15 phút
    // ========================================================

    async scheduleShowtimes(data) {

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

            room_ids,

            room_types,

            roomTypes,

            start_date,

            end_date,

            start_hour,

            end_hour,

            distribution

        } = data;


        // ====================================================
        // NORMALIZE ID
        // ====================================================

        const movieId =
            Number(movie_id);

        const cinemaId =
            Number(cinema_id);


        // ====================================================
        // NORMALIZE ROOM TYPES
        //
        // Hỗ trợ:
        //
        // room_types
        // hoặc
        // roomTypes
        // ====================================================

        const requestedRoomTypes =
            Array.isArray(room_types)
                ? room_types
                : Array.isArray(roomTypes)
                    ? roomTypes
                    : [];


        const normalizedRoomTypes =
            normalizeRoomTypes(
                requestedRoomTypes
            );


        // ====================================================
        // VALIDATE MOVIE
        // ====================================================

        if (
            !Number.isInteger(movieId) ||
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


        // ====================================================
        // VALIDATE CINEMA
        // ====================================================

        if (
            !Number.isInteger(cinemaId) ||
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


        // ====================================================
        // VALIDATE ROOM IDS
        //
        // Giữ lại để tương thích frontend hiện tại.
        // ====================================================

        if (
            !Array.isArray(room_ids) ||
            room_ids.length === 0
        ) {

            const err =
                new Error(
                    "Vui lòng chọn ít nhất một phòng chiếu"
                );

            err.statusCode = 400;

            err.field = "room_ids";

            throw err;
        }


        const normalizedRoomIds = [

            ...new Set(

                room_ids

                    .map(Number)

                    .filter(
                        id =>
                            Number.isInteger(id) &&
                            id > 0
                    )
            )
        ];


        if (
            normalizedRoomIds.length === 0
        ) {

            const err =
                new Error(
                    "Danh sách phòng chiếu không hợp lệ"
                );

            err.statusCode = 400;

            err.field = "room_ids";

            throw err;
        }


        // ====================================================
        // VALIDATE ROOM TYPES
        // ====================================================

        if (
            requestedRoomTypes.length > 0 &&
            normalizedRoomTypes.length === 0
        ) {

            const err =
                new Error(
                    "Loại phòng không hợp lệ. " +
                    "Chấp nhận: 2D, 3D, VIP, IMAX"
                );

            err.statusCode = 400;

            err.field = "room_types";

            throw err;
        }


        // ====================================================
        // VALIDATE DATES
        // ====================================================

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
            new Date(
                `${start_date}T00:00:00`
            );

        const endDate =
            new Date(
                `${end_date}T00:00:00`
            );


        if (
            Number.isNaN(
                startDate.getTime()
            ) ||
            Number.isNaN(
                endDate.getTime()
            )
        ) {

            const err =
                new Error(
                    "Khoảng thời gian không hợp lệ"
                );

            err.statusCode = 400;

            throw err;
        }


        if (endDate < startDate) {

            const err =
                new Error(
                    "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu"
                );

            err.statusCode = 400;

            err.field = "end_date";

            throw err;
        }


        // ====================================================
        // VALIDATE TIME
        // ====================================================

        const scheduleStartHour =
            start_hour || "08:00";

        const scheduleEndHour =
            end_hour || "23:30";


        const timeRegex =
            /^(?:[01]\d|2[0-3]):[0-5]\d$/;


        if (
            !timeRegex.test(
                scheduleStartHour
            )
        ) {

            const err =
                new Error(
                    "Giờ bắt đầu không hợp lệ"
                );

            err.statusCode = 400;

            err.field = "start_hour";

            throw err;
        }


        if (
            !timeRegex.test(
                scheduleEndHour
            )
        ) {

            const err =
                new Error(
                    "Giờ kết thúc không hợp lệ"
                );

            err.statusCode = 400;

            err.field = "end_hour";

            throw err;
        }


        const [
            startHour,
            startMinute
        ] =
            scheduleStartHour
                .split(":")
                .map(Number);


        const [
            endHour,
            endMinute
        ] =
            scheduleEndHour
                .split(":")
                .map(Number);


        const startMinutes =
            startHour * 60 +
            startMinute;


        const endMinutes =
            endHour * 60 +
            endMinute;


        if (
            endMinutes <= startMinutes
        ) {

            const err =
                new Error(
                    "Giờ kết thúc phải lớn hơn giờ bắt đầu"
                );

            err.statusCode = 400;

            err.field = "end_hour";

            throw err;
        }


        // ====================================================
        // VALIDATE DISTRIBUTION
        // ====================================================

        const allowedDistribution = [

            "hot",

            "normal",

            "cold"
        ];


        const scheduleDistribution =
            String(
                distribution || "normal"
            ).toLowerCase();


        if (
            !allowedDistribution.includes(
                scheduleDistribution
            )
        ) {

            const err =
                new Error(
                    "Mức độ phân bổ không hợp lệ. " +
                    "Chấp nhận: hot, normal, cold"
                );

            err.statusCode = 400;

            err.field = "distribution";

            throw err;
        }


        // ====================================================
        // GET MOVIE
        // ====================================================

        const movie =
            await ShowtimeRepository
                .getMovieDuration(
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
            Number(movie.duration);


        if (
            !Number.isFinite(duration) ||
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


        // ====================================================
        // GET ROOMS
        //
        // room_ids vẫn là danh sách phòng được frontend
        // chọn.
        //
        // room_types tiếp tục lọc danh sách này.
        // ====================================================

        let rooms = [];


        for (
            const roomId of normalizedRoomIds
        ) {

            const room =
                await ShowtimeRepository
                    .findRoomInCinema(
                        roomId,
                        cinemaId
                    );


            if (!room) {

                const err =
                    new Error(
                        `Phòng ${roomId} không thuộc rạp đã chọn`
                    );

                err.statusCode = 400;

                err.field = "room_ids";

                throw err;
            }


            const roomType =
                String(
                    room.room_type || ""
                )
                    .trim()
                    .toUpperCase();


            // ------------------------------------------------
            // Nếu frontend có truyền room_types
            // thì chỉ giữ room đúng loại.
            // ------------------------------------------------

            if (
                normalizedRoomTypes.length > 0 &&
                !normalizedRoomTypes.includes(
                    roomType
                )
            ) {

                continue;
            }


            rooms.push({

                room_id:
                    Number(room.room_id),

                room_name:
                    room.room_name,

                room_type:
                    roomType
            });
        }


        // ====================================================
        // CHECK ROOM AFTER FILTER
        // ====================================================

        if (rooms.length === 0) {

            const err =
                new Error(

                    normalizedRoomTypes.length > 0

                        ? (
                            "Không có phòng nào thuộc loại: " +
                            normalizedRoomTypes.join(", ")
                        )

                        : "Không có phòng chiếu hợp lệ"
                );

            err.statusCode = 400;

            err.field =
                normalizedRoomTypes.length > 0
                    ? "room_types"
                    : "room_ids";

            throw err;
        }


        // ====================================================
        // ROOM IDS SAU KHI FILTER
        //
        // Rất quan trọng:
        // ExistingShowtimes phải dùng đúng danh sách room
        // mà Scheduler thực sự được phép dùng.
        // ====================================================

        const schedulerRoomIds =
            rooms.map(
                room =>
                    Number(room.room_id)
            );


        // ====================================================
        // GET EXISTING SHOWTIMES
        // ====================================================

        const existingShowtimes =
            await ShowtimeRepository
                .getExistingShowtimes({

                    cinemaId,

                    startDate:
                        start_date,

                    endDate:
                        end_date,

                    roomIds:
                        schedulerRoomIds
                });


        // ====================================================
        // CONFIG
        //
        // Operating hours:
        // frontend truyền vào.
        //
        // Buffer:
        // 15 phút.
        //
        // Interval:
        // HOT    = 45
        // NORMAL = 75
        // COLD   = 120
        //
        // Không giới hạn số phòng.
        // Không giới hạn target slots/day.
        // ====================================================

        const config = {

            // ------------------------------------------------
            // Operating hours
            // ------------------------------------------------

            weekdayStart:
                scheduleStartHour,

            weekdayEnd:
                scheduleEndHour,

            weekendStart:
                scheduleStartHour,

            weekendEnd:
                scheduleEndHour,


            // ------------------------------------------------
            // Buffer
            // ------------------------------------------------

            bufferMinutes: 15,


            // ------------------------------------------------
            // Interval
            // ------------------------------------------------

            hotInterval: 45,

            normalInterval: 75,

            coldInterval: 120,


            // ------------------------------------------------
            // Rooms
            //
            // Scheduler được phép sử dụng toàn bộ rooms
            // sau khi đã lọc room_type.
            // ------------------------------------------------

            hotMaxRooms:
                rooms.length,

            normalMaxRooms:
                rooms.length,

            coldMaxRooms:
                rooms.length,


            // ------------------------------------------------
            // Không ép số suất/ngày
            // ------------------------------------------------

            hotSlotsPerDay:
                Infinity,

            normalSlotsPerDay:
                Infinity,

            coldSlotsPerDay:
                Infinity,

            minSlotsPerDay: 0,

            maxSlotsPerDay:
                Infinity,


            // ------------------------------------------------
            // Legacy thresholds
            // ------------------------------------------------

            hotThreshold: 100,

            normalThreshold: 50,


            // ------------------------------------------------
            // ROOM TYPES
            // ------------------------------------------------

            roomTypes:
                normalizedRoomTypes
        };


        // ====================================================
        // MOVIE FOR SCHEDULER
        // ====================================================

        const moviesForScheduler = [{

            movie_id:
                movieId,

            title:
                movie.title ||
                `Phim ${movieId}`,

            duration,

            distribution:
                scheduleDistribution,

            roomTypes:
                normalizedRoomTypes
        }];


        // ====================================================
        // GENERATE
        // ====================================================

        const generated =
            ShowtimeScheduler.generate({

                movies:
                    moviesForScheduler,

                rooms,

                roomTypes:
                    normalizedRoomTypes,

                startDate:
                    start_date,

                endDate:
                    end_date,

                config,

                existingShowtimes
            });


        // ====================================================
        // RESULT ARRAYS
        // ====================================================

        const created = [];

        const conflicts = [];

        const skippedPast = [];


        // ====================================================
        // TIME SLOT STATS
        // ====================================================

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


        // ====================================================
        // DAY TYPE STATS
        // ====================================================

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


        // ====================================================
        // INSERT LOOP
        // ====================================================

        for (
            const slot of generated.data
        ) {

            const roomId =
                Number(slot.room_id);


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
                getDayType(date);


            // =================================================
            // GET ROOM TYPE
            // =================================================

            const roomInfo =
                rooms.find(
                    room =>
                        Number(room.room_id) ===
                        roomId
                );


            const roomType =
                slot.room_type ||
                roomInfo?.room_type ||
                null;


            // =================================================
            // VALIDATE GENERATED SLOT
            // =================================================

            if (
                !Number.isInteger(roomId) ||
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


            // =================================================
            // CHECK PAST
            // =================================================

            const isPast =
                await ShowtimeRepository
                    .isPastTime(
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


            // =================================================
            // FINAL DATABASE CONFLICT CHECK
            // =================================================

            const conflict =
                await ShowtimeRepository
                    .findConflict(
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


            // =================================================
            // CREATE
            // =================================================

            try {

                const showtimeId =
                    await ShowtimeRepository
                        .create({

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


                // =================================================
                // TIME SLOT STATS
                // =================================================

                if (
                    timeSlotStats[timeSlot]
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


                // =================================================
                // DAY TYPE STATS
                // =================================================

                if (
                    dayTypeStats[dayType]
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


        // ====================================================
        // RETURN
        // ====================================================

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
                    normalizedRoomTypes,

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
                    scheduleStartHour,

                endTime:
                    scheduleEndHour,

                distribution:
                    scheduleDistribution,


                // --------------------------------------------
                // ROOM TYPE SUMMARY
                // --------------------------------------------

                byRoomType:
                    created.reduce(
                        (acc, slot) => {

                            const type =
                                slot.room_type ||
                                "UNKNOWN";

                            acc[type] =
                                (acc[type] || 0) + 1;

                            return acc;

                        },
                        {}
                    ),


                // --------------------------------------------
                // TIME SLOT SUMMARY
                // --------------------------------------------

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


                // --------------------------------------------
                // DAY TYPE SUMMARY
                // --------------------------------------------

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


                // --------------------------------------------
                // DETAILED TIME SLOTS
                // --------------------------------------------

                timeSlotDetails: {

                    MORNING: {

                        label:
                            TIME_SLOT_LABELS
                                .MORNING,

                        count:
                            timeSlotStats
                                .MORNING
                                .count,

                        slots:
                            timeSlotStats
                                .MORNING
                                .slots
                                .map(
                                    s =>
                                        s.start_time
                                )
                    },


                    AFTERNOON: {

                        label:
                            TIME_SLOT_LABELS
                                .AFTERNOON,

                        count:
                            timeSlotStats
                                .AFTERNOON
                                .count,

                        slots:
                            timeSlotStats
                                .AFTERNOON
                                .slots
                                .map(
                                    s =>
                                        s.start_time
                                )
                    },


                    EVENING: {

                        label:
                            TIME_SLOT_LABELS
                                .EVENING,

                        count:
                            timeSlotStats
                                .EVENING
                                .count,

                        slots:
                            timeSlotStats
                                .EVENING
                                .slots
                                .map(
                                    s =>
                                        s.start_time
                                )
                    },


                    NIGHT: {

                        label:
                            TIME_SLOT_LABELS
                                .NIGHT,

                        count:
                            timeSlotStats
                                .NIGHT
                                .count,

                        slots:
                            timeSlotStats
                                .NIGHT
                                .slots
                                .map(
                                    s =>
                                        s.start_time
                                )
                    }
                },


                // --------------------------------------------
                // DAY DETAILS
                // --------------------------------------------

                dayTypeDetails: {

                    WEEKDAY: {

                        label:
                            DAY_TYPE_LABELS
                                .WEEKDAY,

                        count:
                            dayTypeStats
                                .WEEKDAY
                                .count
                    },


                    WEEKEND: {

                        label:
                            DAY_TYPE_LABELS
                                .WEEKEND,

                        count:
                            dayTypeStats
                                .WEEKEND
                                .count
                    }
                }
            },


            // =================================================
            // SCHEDULER STATS
            // =================================================

            schedulerStats:
                generated.stats || null,


            schedulerDistribution:
                generated.distribution || null,


            // =================================================
            // ROOM TYPES
            // =================================================

            roomTypes:
                normalizedRoomTypes
        };
    }


    // ========================================================
    // UPDATE SHOWTIME
    // ========================================================

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
            await ShowtimeRepository
                .findById(
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
            await ShowtimeRepository
                .isPastTime(
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
            await ShowtimeRepository
                .findConflict(
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


        if (affected === 0) {

            const err =
                new Error(
                    "Không thể cập nhật suất chiếu"
                );

            err.statusCode = 500;

            throw err;
        }


        return true;
    }


    // ========================================================
    // DELETE SHOWTIME
    // ========================================================

    async deleteShowtime(
        showtimeId
    ) {

        const existing =
            await ShowtimeRepository
                .findById(
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
            await ShowtimeRepository
                .hasTickets(
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


        if (affected === 0) {

            const err =
                new Error(
                    "Không thể xóa suất chiếu"
                );

            err.statusCode = 500;

            throw err;
        }


        return true;
    }


    // ========================================================
    // QUICK BOOKING DATA
    // ========================================================

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

            return await ShowtimeRepository
                .getQuickBookingMovies();
        }


        if (
            movie_id &&
            !cinema_id &&
            !date
        ) {

            return await ShowtimeRepository
                .getQuickBookingCinemas(
                    movie_id
                );
        }


        if (
            movie_id &&
            cinema_id &&
            !date
        ) {

            return await ShowtimeRepository
                .getQuickBookingDates(
                    movie_id,
                    cinema_id
                );
        }


        if (
            movie_id &&
            cinema_id &&
            date
        ) {

            return await ShowtimeRepository
                .getQuickBookingTimes(
                    movie_id,
                    cinema_id,
                    date
                );
        }


        return [];
    }


    // ========================================================
    // GET SHOWTIMES FOR BOOKING
    // ========================================================

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
            await ShowtimeRepository
                .getShowtimesForBooking(
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


    // ========================================================
    // FILTER SHOWTIMES
    // ========================================================

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


        return await ShowtimeRepository
            .filterShowtimes(
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