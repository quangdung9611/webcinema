/**
 * ============================================================
 * SHOWTIME SCHEDULER
 * ============================================================
 *
 * NHIỆM VỤ:
 * - Tự động tính lịch chiếu.
 * - 1 phim.
 * - 1 rạp.
 * - Nhiều phòng.
 * - Nhiều ngày.
 * - Khung giờ mặc định: 09:00 -> 24:00.
 * - Tự tính slot theo duration phim.
 * - Có buffer giữa 2 suất.
 * - Có mức phân bổ:
 *      low
 *      medium
 *      high
 *
 * QUAN TRỌNG:
 * - File này KHÔNG truy cập database.
 * - File này KHÔNG INSERT database.
 * - File này chỉ tạo lịch đề xuất.
 *
 * FLOW:
 *
 * ShowtimeService
 *       ↓
 * ShowtimeScheduler
 *       ↓
 * lịch đề xuất
 *       ↓
 * ShowtimeRepository
 *       ↓
 * kiểm tra lịch hiện tại trong DB
 *       ↓
 * loại suất bị trùng
 *       ↓
 * INSERT suất hợp lệ
 *
 * ============================================================
 */

class ShowtimeScheduler {

    /* ========================================================
        DEFAULT CONFIG
    ======================================================== */

    static DEFAULT_CONFIG = {
        startTime: "09:00",
        endTime: "24:00",

        // Khoảng nghỉ tối thiểu giữa 2 suất
        bufferMinutes: 15,

        // Mức phân bổ mặc định
        distributionLevel: "medium"
    };


    /* ========================================================
        DISTRIBUTION RATIO
    ========================================================

        Đây là TỶ LỆ sử dụng slot khả dụng.

        low:
            khoảng 40%

        medium:
            khoảng 70%

        high:
            khoảng 90%

        Không phải số suất cố định.

    ======================================================== */

    static DISTRIBUTION_RATIO = {
        low: 0.40,
        medium: 0.70,
        high: 0.90
    };


    /* ========================================================
        NORMALIZE CONFIG
    ======================================================== */

    static normalizeConfig(config = {}) {

        const merged = {
            ...this.DEFAULT_CONFIG,
            ...config
        };

        const startTime = this.normalizeTime(
            merged.startTime
        );

        const endTime = this.normalizeTime(
            merged.endTime
        );

        const startMinutes =
            this.timeToMinutes(startTime);

        const endMinutes =
            endTime === "24:00"
                ? 24 * 60
                : this.timeToMinutes(endTime);

        let bufferMinutes = Number.parseInt(
            merged.bufferMinutes,
            10
        );

        if (
            !Number.isFinite(bufferMinutes) ||
            bufferMinutes < 0
        ) {
            bufferMinutes =
                this.DEFAULT_CONFIG.bufferMinutes;
        }

        let distributionLevel = String(
            merged.distributionLevel || "medium"
        )
            .trim()
            .toLowerCase();

        if (
            !Object.prototype.hasOwnProperty.call(
                this.DISTRIBUTION_RATIO,
                distributionLevel
            )
        ) {
            distributionLevel = "medium";
        }

        if (endMinutes <= startMinutes) {
            throw new Error(
                "Khung giờ chiếu không hợp lệ: giờ kết thúc phải lớn hơn giờ bắt đầu."
            );
        }

        return {
            startTime,
            endTime,
            startMinutes,
            endMinutes,
            bufferMinutes,
            distributionLevel
        };
    }


    /* ========================================================
        NORMALIZE TIME
    ======================================================== */

    static normalizeTime(value) {

        if (!value) {
            return "00:00";
        }

        const text = String(value).trim();

        if (text === "24:00") {
            return "24:00";
        }

        const match = text.match(
            /^(\d{1,2}):(\d{2})$/
        );

        if (!match) {
            throw new Error(
                `Thời gian không hợp lệ: ${value}`
            );
        }

        const hour = Number(match[1]);
        const minute = Number(match[2]);

        if (
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59
        ) {
            throw new Error(
                `Thời gian không hợp lệ: ${value}`
            );
        }

        return (
            `${String(hour).padStart(2, "0")}:` +
            `${String(minute).padStart(2, "0")}`
        );
    }


    /* ========================================================
        TIME -> MINUTES
    ======================================================== */

    static timeToMinutes(time) {

        if (time === "24:00") {
            return 24 * 60;
        }

        const [hour, minute] =
            String(time)
                .split(":")
                .map(Number);

        return hour * 60 + minute;
    }


    /* ========================================================
        MINUTES -> TIME
    ======================================================== */

    static minutesToTime(totalMinutes) {

        if (totalMinutes === 24 * 60) {
            return "24:00";
        }

        const hour = Math.floor(
            totalMinutes / 60
        );

        const minute =
            totalMinutes % 60;

        return (
            `${String(hour).padStart(2, "0")}:` +
            `${String(minute).padStart(2, "0")}`
        );
    }


    /* ========================================================
        DATE HELPERS
    ======================================================== */

    static parseDate(date) {

        if (!date) {
            throw new Error(
                "Thiếu ngày."
            );
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

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

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
    }


    static formatDate(date) {

        return (
            `${date.getUTCFullYear()}-` +
            `${String(
                date.getUTCMonth() + 1
            ).padStart(2, "0")}-` +
            `${String(
                date.getUTCDate()
            ).padStart(2, "0")}`
        );
    }


    static addDays(date, days) {

        const result =
            new Date(date);

        result.setUTCDate(
            result.getUTCDate() + days
        );

        return result;
    }


    /* ========================================================
        BUILD DATETIME
    ======================================================== */

    static buildDateTime(
        date,
        minutes
    ) {

        return (
            `${date} ` +
            this.minutesToTime(minutes)
        );
    }


    /* ========================================================
        DATETIME -> MINUTES
    ======================================================== */

    static dateTimeToMinutes(value) {

        if (!value) {
            return null;
        }

        const text =
            String(value)
                .trim()
                .replace("T", " ");

        const parts =
            text.split(" ");

        if (parts.length < 2) {
            return null;
        }

        const time =
            parts[1].substring(0, 5);

        return this.timeToMinutes(time);
    }


    /* ========================================================
        CALCULATE DAILY CAPACITY
    ========================================================

        Ví dụ:

        09:00 -> 24:00
        duration = 120
        buffer = 15

        Mỗi chu kỳ:

            120 phút phim
            +
            15 phút buffer

            = 135 phút

    ======================================================== */

    static calculateDailyCapacity(
        duration,
        config
    ) {

        duration =
            Number.parseInt(
                duration,
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {
            throw new Error(
                "Duration phim không hợp lệ."
            );
        }

        const availableMinutes =
            config.endMinutes -
            config.startMinutes;

        if (availableMinutes <= 0) {
            throw new Error(
                "Khung giờ chiếu không hợp lệ."
            );
        }

        /*
         * Suất cuối cùng chỉ cần:
         *
         * start + duration <= end
         *
         * Buffer chỉ dùng để tính
         * thời điểm bắt đầu suất tiếp theo.
         */

        let count = 0;
        let current =
            config.startMinutes;

        while (
            current + duration <=
            config.endMinutes
        ) {
            count++;

            current +=
                duration +
                config.bufferMinutes;
        }

        return count;
    }


    /* ========================================================
        CALCULATE TARGET COUNT
    ======================================================== */

    static calculateTargetCount(
        capacity,
        distributionLevel
    ) {

        if (capacity <= 0) {
            return 0;
        }

        const ratio =
            this.DISTRIBUTION_RATIO[
                distributionLevel
            ] ?? 0.70;

        /*
         * Luôn có ít nhất 1 suất
         * nếu phòng có thể chứa suất.
         */

        return Math.max(
            1,
            Math.floor(
                capacity * ratio
            )
        );
    }


    /* ========================================================
        GENERATE ALL CANDIDATE SLOTS
    ========================================================

        Ví dụ:

        Phim 120 phút
        buffer 15

        09:00
        11:15
        13:30
        15:45
        18:00
        ...

    ======================================================== */

    static generateCandidateSlots({
        date,
        duration,
        config
    }) {

        duration =
            Number.parseInt(
                duration,
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {
            throw new Error(
                "Duration phim không hợp lệ."
            );
        }

        const slots = [];

        let current =
            config.startMinutes;

        while (
            current + duration <=
            config.endMinutes
        ) {

            const end =
                current + duration;

            slots.push({
                date,

                startMinutes:
                    current,

                endMinutes:
                    end,

                start_time:
                    this.buildDateTime(
                        date,
                        current
                    ),

                end_time:
                    this.buildDateTime(
                        date,
                        end
                    ),

                duration,

                buffer_minutes:
                    config.bufferMinutes
            });

            current +=
                duration +
                config.bufferMinutes;
        }

        return slots;
    }


    /* ========================================================
        APPLY DISTRIBUTION
    ========================================================

        Không random.

        Scheduler cố gắng trải đều
        các suất trong cả ngày.

    ======================================================== */

    static applyDistribution(
        slots,
        distributionLevel
    ) {

        if (
            !Array.isArray(slots) ||
            !slots.length
        ) {
            return [];
        }

        const targetCount =
            this.calculateTargetCount(
                slots.length,
                distributionLevel
            );

        if (
            targetCount >= slots.length
        ) {
            return [...slots];
        }

        if (targetCount === 1) {

            return [
                slots[
                    Math.floor(
                        slots.length / 2
                    )
                ]
            ];
        }

        const selected = [];

        const step =
            (slots.length - 1) /
            (targetCount - 1);

        const usedIndexes =
            new Set();

        for (
            let i = 0;
            i < targetCount;
            i++
        ) {

            let index =
                Math.round(
                    i * step
                );

            while (
                usedIndexes.has(index) &&
                index < slots.length - 1
            ) {
                index++;
            }

            if (
                !usedIndexes.has(index)
            ) {

                usedIndexes.add(index);

                selected.push(
                    slots[index]
                );
            }
        }

        return selected.sort(
            (a, b) =>
                a.startMinutes -
                b.startMinutes
        );
    }


    /* ========================================================
        GENERATE ONE ROOM / ONE DAY
    ======================================================== */

    static generateForRoomAndDate({
        date,
        roomId,
        movieId,
        duration,
        config
    }) {

        const candidates =
            this.generateCandidateSlots({
                date,
                duration,
                config
            });

        const selected =
            this.applyDistribution(
                candidates,
                config.distributionLevel
            );

        return selected.map(
            slot => ({
                movie_id:
                    Number(movieId),

                room_id:
                    Number(roomId),

                date,

                start_time:
                    slot.start_time,

                end_time:
                    slot.end_time,

                duration:
                    slot.duration,

                buffer_minutes:
                    slot.buffer_minutes,

                distribution_level:
                    config.distributionLevel
            })
        );
    }


    /* ========================================================
        CHECK SINGLE OVERLAP
    ========================================================

        Hai khoảng thời gian overlap khi:

            newStart < oldEnd
            &&
            newEnd > oldStart

    ======================================================== */

    static isOverlap(
        newStart,
        newEnd,
        oldStart,
        oldEnd
    ) {

        return (
            newStart < oldEnd &&
            newEnd > oldStart
        );
    }


    /* ========================================================
        CHECK OVERLAP IN MEMORY
    ======================================================== */

    static hasOverlap(slots) {

        if (
            !Array.isArray(slots) ||
            slots.length < 2
        ) {
            return false;
        }

        const grouped =
            new Map();

        for (
            const slot of slots
        ) {

            const key =
                `${slot.room_id}_${slot.date}`;

            if (
                !grouped.has(key)
            ) {
                grouped.set(
                    key,
                    []
                );
            }

            grouped
                .get(key)
                .push(slot);
        }

        for (
            const roomSlots
            of grouped.values()
        ) {

            roomSlots.sort(
                (a, b) =>
                    a.start_time.localeCompare(
                        b.start_time
                    )
            );

            for (
                let i = 1;
                i < roomSlots.length;
                i++
            ) {

                const previous =
                    roomSlots[i - 1];

                const current =
                    roomSlots[i];

                if (
                    this.isOverlap(
                        current.start_time,
                        current.end_time,
                        previous.start_time,
                        previous.end_time
                    )
                ) {
                    return true;
                }
            }
        }

        return false;
    }


    /* ========================================================
        FILTER EXISTING CONFLICTS
    ========================================================

        Đây là phần rất quan trọng.

        Khi thêm phim mới:

        Phim A đã có:

        Room 1
        09:00 -> 11:00

        Phim B muốn:

        Room 1
        09:00 -> 11:00

        => loại.

        Nhưng nếu:

        Phim B:
        11:15 -> 13:15

        => hợp lệ.

    ======================================================== */

    static filterExistingConflicts(
        generatedSlots,
        existingShowtimes = []
    ) {

        if (
            !Array.isArray(generatedSlots) ||
            !generatedSlots.length
        ) {
            return {
                available: [],
                conflicts: []
            };
        }

        if (
            !Array.isArray(existingShowtimes) ||
            !existingShowtimes.length
        ) {
            return {
                available: [
                    ...generatedSlots
                ],
                conflicts: []
            };
        }

        const available = [];
        const conflicts = [];

        for (
            const generated
            of generatedSlots
        ) {

            const conflict =
                existingShowtimes.some(
                    existing => {

                        if (
                            Number(
                                existing.room_id
                            ) !==
                            Number(
                                generated.room_id
                            )
                        ) {
                            return false;
                        }

                        /*
                         * Nếu có date thì kiểm tra
                         * cùng ngày trước.
                         */

                        if (
                            existing.date &&
                            generated.date &&
                            String(
                                existing.date
                            ).substring(0, 10) !==
                            String(
                                generated.date
                            ).substring(0, 10)
                        ) {
                            return false;
                        }

                        const existingStart =
                            String(
                                existing.start_time
                            )
                                .replace("T", " ")
                                .substring(0, 16);

                        let existingEnd =
                            existing.end_time
                                ? String(
                                    existing.end_time
                                )
                                    .replace("T", " ")
                                    .substring(0, 16)
                                : null;

                        /*
                         * Nếu DB chỉ trả start_time
                         * thì dùng duration của
                         * suất hiện tại để tính end.
                         */

                        if (
                            !existingEnd
                        ) {

                            const existingDuration =
                                Number.parseInt(
                                    existing.duration,
                                    10
                                );

                            if (
                                Number.isFinite(
                                    existingDuration
                                ) &&
                                existingDuration > 0
                            ) {

                                const startMinutes =
                                    this.dateTimeToMinutes(
                                        existingStart
                                    );

                                if (
                                    startMinutes !== null
                                ) {

                                    const endMinutes =
                                        startMinutes +
                                        existingDuration;

                                    const date =
                                        existingStart
                                            .substring(
                                                0,
                                                10
                                            );

                                    existingEnd =
                                        this.buildDateTime(
                                            date,
                                            endMinutes
                                        );
                                }
                            }
                        }

                        /*
                         * Nếu vẫn không tính được
                         * end_time thì ít nhất
                         * chặn cùng giờ bắt đầu.
                         */

                        if (!existingEnd) {

                            return (
                                existingStart ===
                                generated.start_time
                            );
                        }

                        return this.isOverlap(
                            generated.start_time,
                            generated.end_time,
                            existingStart,
                            existingEnd
                        );
                    }
                );

            if (conflict) {

                conflicts.push({
                    ...generated,
                    conflict: true
                });

            } else {

                available.push(
                    generated
                );
            }
        }

        return {
            available,
            conflicts
        };
    }


    /* ========================================================
        REMOVE DUPLICATE GENERATED SLOTS
    ======================================================== */

    static removeDuplicateSlots(
        slots
    ) {

        const seen =
            new Set();

        const result = [];

        for (
            const slot of slots
        ) {

            const key =
                [
                    slot.room_id,
                    slot.date,
                    slot.start_time
                ].join("_");

            if (
                seen.has(key)
            ) {
                continue;
            }

            seen.add(key);

            result.push(slot);
        }

        return result;
    }


    /* ========================================================
        GENERATE MULTIPLE ROOMS / MULTIPLE DAYS
    ======================================================== */

    static generate({
        movieId,
        roomIds,
        startDate,
        endDate,

        duration,

        startTime = "09:00",
        endTime = "24:00",

        bufferMinutes = 15,

        distributionLevel = "medium"
    }) {

        /* ====================================================
            VALIDATE
        ==================================================== */

        if (!movieId) {
            throw new Error(
                "Thiếu movieId."
            );
        }

        if (
            !Array.isArray(roomIds) ||
            !roomIds.length
        ) {
            throw new Error(
                "Phải chọn ít nhất một phòng."
            );
        }

        const fromDate =
            this.parseDate(
                startDate
            );

        const toDate =
            this.parseDate(
                endDate
            );

        if (
            fromDate > toDate
        ) {
            throw new Error(
                "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            );
        }

        const config =
            this.normalizeConfig({
                startTime,
                endTime,
                bufferMinutes,
                distributionLevel
            });


        /* ====================================================
            DURATION
        ==================================================== */

        duration =
            Number.parseInt(
                duration,
                10
            );

        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {
            throw new Error(
                "Duration phim không hợp lệ."
            );
        }


        /* ====================================================
            NORMALIZE ROOM IDS
        ==================================================== */

        const normalizedRoomIds =
            [
                ...new Set(
                    roomIds
                        .map(Number)
                        .filter(
                            id =>
                                Number.isInteger(id) &&
                                id > 0
                        )
                )
            ];

        if (
            !normalizedRoomIds.length
        ) {
            throw new Error(
                "Danh sách phòng không hợp lệ."
            );
        }


        /* ====================================================
            GENERATE
        ==================================================== */

        let result = [];

        let currentDate =
            new Date(fromDate);

        while (
            currentDate <= toDate
        ) {

            const date =
                this.formatDate(
                    currentDate
                );

            for (
                const roomId
                of normalizedRoomIds
            ) {

                const roomSlots =
                    this.generateForRoomAndDate({
                        date,
                        roomId,
                        movieId,
                        duration,
                        config
                    });

                result.push(
                    ...roomSlots
                );
            }

            currentDate =
                this.addDays(
                    currentDate,
                    1
                );
        }


        /* ====================================================
            REMOVE DUPLICATES
        ==================================================== */

        result =
            this.removeDuplicateSlots(
                result
            );


        /* ====================================================
            SORT
        ==================================================== */

        result.sort(
            (a, b) => {

                if (
                    a.date !==
                    b.date
                ) {
                    return a.date.localeCompare(
                        b.date
                    );
                }

                if (
                    a.room_id !==
                    b.room_id
                ) {
                    return (
                        a.room_id -
                        b.room_id
                    );
                }

                return a.start_time.localeCompare(
                    b.start_time
                );
            }
        );


        /* ====================================================
            FINAL OVERLAP CHECK
        ==================================================== */

        if (
            this.hasOverlap(result)
        ) {
            throw new Error(
                "Scheduler phát hiện lịch chiếu bị chồng thời gian."
            );
        }


        /* ====================================================
            SUMMARY
        ==================================================== */

        const days =
            Math.floor(
                (
                    toDate -
                    fromDate
                ) /
                (
                    24 *
                    60 *
                    60 *
                    1000
                )
            ) + 1;

        const capacityPerRoomPerDay =
            this.calculateDailyCapacity(
                duration,
                config
            );

        const targetPerRoomPerDay =
            this.calculateTargetCount(
                capacityPerRoomPerDay,
                config.distributionLevel
            );


        /* ====================================================
            RETURN
        ==================================================== */

        return {

            data: result,

            summary: {

                movieId:
                    Number(movieId),

                roomCount:
                    normalizedRoomIds.length,

                days,

                duration,

                startTime:
                    config.startTime,

                endTime:
                    config.endTime,

                bufferMinutes:
                    config.bufferMinutes,

                distributionLevel:
                    config.distributionLevel,

                distributionRatio:
                    this.DISTRIBUTION_RATIO[
                        config.distributionLevel
                    ],

                capacityPerRoomPerDay,

                targetPerRoomPerDay,

                totalGenerated:
                    result.length
            }
        };
    }
}


/* ============================================================
    EXPORT
============================================================ */

module.exports = ShowtimeScheduler;