// pages/admin/MovieShowtimeConfigPage.jsx

import React, {
    useState,
    useEffect,
    useMemo,
    useCallback
} from 'react';

import { useNavigate } from 'react-router-dom';
import api from '../../../../api/api';

import {
    Save,
    Plus,
    Trash2,
    Loader2,
    Film,
    ArrowLeft,
    Settings,
    ChevronDown,
    ChevronUp,
    Search,
    AlertTriangle,
    CheckCircle2,
    Lightbulb
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';

import '../../../styles/MovieShowtimeConfigPage.css';

// ==========================================================
// CONSTANTS
// ==========================================================

const TIME_SLOTS = [
    {
        key: 'MORNING',
        label: 'MORNING (06:00 - 12:00)',
        startMinutes: 6 * 60,
        endMinutes: 12 * 60
    },
    {
        key: 'AFTERNOON',
        label: 'AFTERNOON (12:00 - 17:00)',
        startMinutes: 12 * 60,
        endMinutes: 17 * 60
    },
    {
        key: 'EVENING',
        label: 'EVENING (17:00 - 20:00)',
        startMinutes: 17 * 60,
        endMinutes: 20 * 60
    },
    {
        key: 'NIGHT',
        label: 'NIGHT (20:00 - 24:00)',
        startMinutes: 20 * 60,
        endMinutes: 24 * 60
    }
];

const ROOM_TYPES = [
    '2D',
    '3D',
    'VIP',
    'IMAX'
];

const DAY_TYPES = [
    {
        key: 'ALL',
        label: 'Tất cả các ngày'
    },
    {
        key: 'WEEKDAY',
        label: 'Ngày thường (T2-T6)'
    },
    {
        key: 'WEEKEND',
        label: 'Cuối tuần (T7-CN)'
    }
];

const DEFAULT_INTERVAL = 45;

const DEFAULT_MOVIE_DURATION = 120;

const DEFAULT_CINEMA_OPEN = 8 * 60;

const DEFAULT_CINEMA_CLOSE = 24 * 60;

const DEFAULT_ROOM_COUNT = 1;

// ==========================================================
// UTILS
// ==========================================================

const toNumber = (
    value,
    fallback = 0
) => {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
};

const normalizeString = (
    value,
    fallback = ''
) => {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    return String(value).trim();
};

// ==========================================================
// TIME UTILS
// ==========================================================

const timeToMinutes = (
    value,
    fallback = null
) => {

    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return fallback;
    }

    if (typeof value === 'number') {

        if (
            Number.isFinite(value) &&
            value >= 0 &&
            value <= 1440
        ) {
            return Math.round(value);
        }

        return fallback;
    }

    const stringValue =
        String(value).trim();

    if (!stringValue) {
        return fallback;
    }

    // HH:mm
    const match =
        stringValue.match(
            /^(\d{1,2}):(\d{2})/
        );

    if (match) {

        const hour =
            Number(match[1]);

        const minute =
            Number(match[2]);

        if (
            hour >= 0 &&
            hour <= 23 &&
            minute >= 0 &&
            minute <= 59
        ) {
            return (
                hour * 60 +
                minute
            );
        }
    }

    // Decimal / integer minutes
    const numeric =
        Number(stringValue);

    if (
        Number.isFinite(numeric) &&
        numeric >= 0 &&
        numeric <= 1440
    ) {
        return Math.round(numeric);
    }

    return fallback;
};

const minutesToTime = (
    minutes
) => {

    const safeMinutes =
        Math.max(
            0,
            Math.min(
                1440,
                Math.round(
                    Number(minutes) || 0
                )
            )
        );

    if (
        safeMinutes === 1440
    ) {
        return '24:00';
    }

    const hour =
        Math.floor(
            safeMinutes / 60
        );

    const minute =
        safeMinutes % 60;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const formatHourShort = (
    minutes
) => {

    const value =
        Math.round(
            Number(minutes) || 0
        );

    if (value === 1440) {
        return '24h';
    }

    const hour =
        Math.floor(
            value / 60
        );

    const minute =
        value % 60;

    if (minute === 0) {
        return `${hour}h`;
    }

    return `${hour}h${String(minute).padStart(2, '0')}`;
};

// ==========================================================
// EXTRACT MOVIE DURATION
// ==========================================================

const extractMovieDuration = (
    movie
) => {

    if (!movie) {
        return DEFAULT_MOVIE_DURATION;
    }

    const candidates = [
        movie.duration,
        movie.duration_minutes,
        movie.movie_duration,
        movie.runtime,
        movie.running_time,
        movie.length_minutes,
        movie.duration_minute,
        movie.thoi_luong
    ];

    for (const value of candidates) {

        const number =
            Number(value);

        if (
            Number.isFinite(number) &&
            number > 0
        ) {
            return Math.round(number);
        }
    }

    return DEFAULT_MOVIE_DURATION;
};

// ==========================================================
// EXTRACT CINEMA OPEN / CLOSE
// ==========================================================

const extractCinemaOpen = (
    cinema
) => {

    if (!cinema) {
        return DEFAULT_CINEMA_OPEN;
    }

    const candidates = [
        cinema.open_time,
        cinema.opening_time,
        cinema.opening_hour,
        cinema.openingTime,
        cinema.openTime,
        cinema.open_at,
        cinema.start_time,
        cinema.startTime,
        cinema.gio_mo_cua
    ];

    for (const value of candidates) {

        const minutes =
            timeToMinutes(
                value,
                null
            );

        if (
            minutes !== null
        ) {
            return minutes;
        }
    }

    return DEFAULT_CINEMA_OPEN;
};

const extractCinemaClose = (
    cinema
) => {

    if (!cinema) {
        return DEFAULT_CINEMA_CLOSE;
    }

    const candidates = [
        cinema.close_time,
        cinema.closing_time,
        cinema.closing_hour,
        cinema.closingTime,
        cinema.closeTime,
        cinema.close_at,
        cinema.end_time,
        cinema.endTime,
        cinema.gio_dong_cua
    ];

    for (const value of candidates) {

        const minutes =
            timeToMinutes(
                value,
                null
            );

        if (
            minutes !== null
        ) {
            return minutes;
        }
    }

    return DEFAULT_CINEMA_CLOSE;
};

// ==========================================================
// EXTRACT ROOM COUNT
// ==========================================================

const extractRoomCount = (
    cinema,
    roomType
) => {

    if (!cinema) {
        return DEFAULT_ROOM_COUNT;
    }

    const normalizedType =
        String(
            roomType || '2D'
        ).toUpperCase();

    // ----------------------------------------------
    // 1. room_count_by_type
    // ----------------------------------------------

    const byType =
        cinema.room_count_by_type ||
        cinema.roomCountByType ||
        cinema.rooms_by_type ||
        cinema.roomsByType;

    if (
        byType &&
        typeof byType === 'object'
    ) {

        const value =
            byType[normalizedType];

        if (
            Number.isFinite(
                Number(value)
            ) &&
            Number(value) > 0
        ) {
            return Number(value);
        }
    }

    // ----------------------------------------------
    // 2. rooms array
    // ----------------------------------------------

    const rooms =
        cinema.rooms ||
        cinema.room_list ||
        cinema.roomList;

    if (
        Array.isArray(rooms)
    ) {

        const matched =
            rooms.filter(room => {

                const type =
                    String(
                        room.room_type ||
                        room.type ||
                        room.roomType ||
                        ''
                    ).toUpperCase();

                return (
                    type ===
                    normalizedType
                );
            });

        if (
            matched.length > 0
        ) {
            return matched.length;
        }
    }

    // ----------------------------------------------
    // 3. room_count
    // ----------------------------------------------

    const genericCount =
        cinema.room_count ||
        cinema.roomCount ||
        cinema.total_rooms ||
        cinema.totalRooms;

    if (
        Number.isFinite(
            Number(genericCount)
        ) &&
        Number(genericCount) > 0
    ) {

        /*
         * Nếu backend chỉ trả tổng số phòng
         * mà không có phân loại thì chưa thể
         * biết chính xác từng loại.
         *
         * Tạm dùng 1 phòng để không đánh giá
         * quá cao capacity.
         */
        return DEFAULT_ROOM_COUNT;
    }

    return DEFAULT_ROOM_COUNT;
};

// ==========================================================
// GET MOVIE OBJECT
// ==========================================================

const getMovieByIdFromList = (
    movies,
    movieId
) => {

    return movies.find(
        movie =>
            String(
                movie.movie_id
            ) ===
            String(movieId)
    );
};

// ==========================================================
// GET TIME SLOT
// ==========================================================

const getTimeSlotByKey = (
    key
) => {

    return TIME_SLOTS.find(
        slot =>
            slot.key === key
    );
};

// ==========================================================
// CALCULATE EFFECTIVE TIME RANGE
// ==========================================================

const getEffectiveSlotRange = (
    timeSlotKey,
    cinemaOpen,
    cinemaClose
) => {

    const slot =
        getTimeSlotByKey(
            timeSlotKey
        );

    if (!slot) {
        return null;
    }

    const start =
        Math.max(
            cinemaOpen,
            slot.startMinutes
        );

    const end =
        Math.min(
            cinemaClose,
            slot.endMinutes
        );

    if (start >= end) {
        return null;
    }

    return {
        start,
        end
    };
};

// ==========================================================
// CALCULATE MAX CAPACITY
// ==========================================================

const calculateMaxCapacity = ({
    slotStart,
    slotEnd,
    duration,
    intervalMinutes,
    roomCount
}) => {

    if (
        !Number.isFinite(slotStart) ||
        !Number.isFinite(slotEnd) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(intervalMinutes) ||
        !Number.isFinite(roomCount)
    ) {
        return 0;
    }

    if (
        slotStart >= slotEnd ||
        duration <= 0 ||
        intervalMinutes <= 0 ||
        roomCount <= 0
    ) {
        return 0;
    }

    /*
     * Scheduler hiện tại của bạn có buffer 15 phút
     * giữa hai suất cùng một phòng.
     */
    const ROOM_BUFFER = 15;

    let totalCapacity = 0;

    for (
        let roomIndex = 0;
        roomIndex < roomCount;
        roomIndex++
    ) {

        let candidate =
            slotStart;

        let lastBlockedUntil =
            -Infinity;

        let roomCapacity = 0;

        while (
            candidate + duration <=
            slotEnd
        ) {

            if (
                candidate >=
                lastBlockedUntil
            ) {

                roomCapacity++;

                lastBlockedUntil =
                    candidate +
                    duration +
                    ROOM_BUFFER;

                candidate +=
                    intervalMinutes;

            } else {

                const difference =
                    lastBlockedUntil -
                    candidate;

                const jumps =
                    Math.ceil(
                        difference /
                        intervalMinutes
                    );

                candidate +=
                    Math.max(
                        1,
                        jumps
                    ) *
                    intervalMinutes;
            }
        }

        totalCapacity +=
            roomCapacity;
    }

    return totalCapacity;
};

// ==========================================================
// GET EFFECTIVE SLOT LABEL
// ==========================================================

const getEffectiveSlotLabel = (
    timeSlotKey,
    cinemaOpen,
    cinemaClose
) => {

    const range =
        getEffectiveSlotRange(
            timeSlotKey,
            cinemaOpen,
            cinemaClose
        );

    const slot =
        getTimeSlotByKey(
            timeSlotKey
        );

    if (
        !range ||
        !slot
    ) {
        return slot?.label ||
            timeSlotKey;
    }

    return `${timeSlotKey} (${formatHourShort(range.start)} - ${formatHourShort(range.end)})`;
};

// ==========================================================
// COMPONENT
// ==========================================================

const MovieShowtimeConfigPage = () => {

    const navigate = useNavigate();

    // ======================================================
    // STATE
    // ======================================================

    const [loading, setLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [movies, setMovies] =
        useState([]);

    const [cinemas, setCinemas] =
        useState([]);

    const [selectedCinema, setSelectedCinema] =
        useState('');

    const [selectedMovies, setSelectedMovies] =
        useState([]);

    const [searchMovie, setSearchMovie] =
        useState('');

    const [configs, setConfigs] =
        useState({});

    const [expandedMovies, setExpandedMovies] =
        useState({});

    const [alertModal, setAlertModal] =
        useState({
            open: false,
            title: '',
            message: '',
            type: 'default'
        });

    // ======================================================
    // SELECTED CINEMA OBJECT
    // ======================================================

    const selectedCinemaObject =
        useMemo(() => {

            return cinemas.find(
                cinema =>
                    String(
                        cinema.cinema_id
                    ) ===
                    String(
                        selectedCinema
                    )
            );

        }, [
            cinemas,
            selectedCinema
        ]);

    // ======================================================
    // CINEMA HOURS
    // ======================================================

    const cinemaOpen =
        useMemo(() => {

            return extractCinemaOpen(
                selectedCinemaObject
            );

        }, [
            selectedCinemaObject
        ]);

    const cinemaClose =
        useMemo(() => {

            return extractCinemaClose(
                selectedCinemaObject
            );

        }, [
            selectedCinemaObject
        ]);

    // ======================================================
    // ALERT
    // ======================================================

    const showAlert = (
        title,
        message,
        type = 'default'
    ) => {

        setAlertModal({
            open: true,
            title,
            message,
            type
        });
    };

    const closeAlert = () => {

        setAlertModal(prev => ({
            ...prev,
            open: false
        }));
    };

    // ======================================================
    // LOAD INITIAL DATA
    // ======================================================

    useEffect(() => {

        fetchMovies();
        fetchCinemas();

    }, []);

    // ======================================================
    // LOAD CONFIG WHEN CINEMA / MOVIES CHANGE
    // ======================================================

    useEffect(() => {

        if (
            selectedCinema &&
            selectedMovies.length > 0
        ) {
            loadAllConfigs();
        }

    }, [
        selectedCinema,
        selectedMovies
    ]);

    // ======================================================
    // FETCH MOVIES
    // ======================================================

    const fetchMovies = async () => {

        try {

            const res =
                await api.get(
                    '/api/movies'
                );

            const movieData =
                Array.isArray(
                    res.data?.data
                )
                    ? res.data.data
                    : [];

            setMovies(
                movieData
            );

        } catch (error) {

            console.error(
                'Lỗi load phim:',
                error
            );

            showAlert(
                'Lỗi',
                'Không thể tải danh sách phim',
                'error'
            );
        }
    };

    // ======================================================
    // FETCH CINEMAS
    // ======================================================

    const fetchCinemas = async () => {

        try {

            const res =
                await api.get(
                    '/api/cinemas'
                );

            const cinemaData =
                Array.isArray(
                    res.data?.data
                )
                    ? res.data.data
                    : [];

            setCinemas(
                cinemaData
            );

            if (
                cinemaData.length > 0
            ) {

                setSelectedCinema(
                    cinemaData[0].cinema_id
                );
            }

        } catch (error) {

            console.error(
                'Lỗi load rạp:',
                error
            );

            showAlert(
                'Lỗi',
                'Không thể tải danh sách rạp',
                'error'
            );
        }
    };

    // ======================================================
    // LOAD ALL CONFIGS
    // ======================================================

    const loadAllConfigs = async () => {

        if (
            !selectedCinema ||
            selectedMovies.length === 0
        ) {
            return;
        }

        setLoading(true);

        const newConfigs = {};

        try {

            for (
                const movieId
                of selectedMovies
            ) {

                try {

                    const res =
                        await api.get(
                            `/api/showtime-config/${movieId}?cinema_id=${selectedCinema}`
                        );

                    const rawData =
                        res.data?.data;

                    const movieConfig =
                        Array.isArray(
                            rawData
                        )
                            ? rawData
                            : Array.isArray(
                                rawData?.data
                            )
                                ? rawData.data
                                : [];

                    newConfigs[movieId] =
                        movieConfig.map(
                            config => ({
                                ...config,

                                config_id:
                                    config.config_id ??
                                    config.id ??
                                    undefined,

                                time_slot:
                                    config.time_slot ||
                                    'MORNING',

                                room_type:
                                    config.room_type ||
                                    '2D',

                                slot_count:
                                    Number(
                                        config.slot_count
                                    ) || 0,

                                interval_minutes:
                                    Number(
                                        config.interval_minutes
                                    ) ||
                                    DEFAULT_INTERVAL,

                                day_type:
                                    config.day_type ||
                                    'ALL',

                                is_active:
                                    Number(
                                        config.is_active
                                    ) === 1
                                        ? 1
                                        : 0
                            })
                        );

                } catch (error) {

                    console.error(
                        `Lỗi load config cho phim ${movieId}:`,
                        error
                    );

                    newConfigs[movieId] =
                        [];
                }
            }

            setConfigs(
                newConfigs
            );

        } finally {

            setLoading(false);
        }
    };

    // ======================================================
    // TOGGLE MOVIE
    // ======================================================

    const toggleMovieSelection = (
        movieId
    ) => {

        setSelectedMovies(prev => {

            if (
                prev.includes(
                    movieId
                )
            ) {

                return prev.filter(
                    id =>
                        id !== movieId
                );
            }

            return [
                ...prev,
                movieId
            ];
        });

        setExpandedMovies(prev => ({
            ...prev,
            [movieId]: true
        }));
    };

    // ======================================================
    // TOGGLE EXPAND
    // ======================================================

    const toggleExpand = (
        movieId
    ) => {

        setExpandedMovies(prev => ({
            ...prev,
            [movieId]:
                !prev[movieId]
        }));
    };

    // ======================================================
    // ADD CONFIG ROW
    // ======================================================

    const addConfig = (
        movieId
    ) => {

        setConfigs(prev => ({

            ...prev,

            [movieId]: [
                ...(prev[movieId] || []),

                {
                    time_slot:
                        'MORNING',

                    room_type:
                        '2D',

                    slot_count:
                        1,

                    interval_minutes:
                        DEFAULT_INTERVAL,

                    day_type:
                        'ALL',

                    is_active:
                        1
                }
            ]
        }));

        setExpandedMovies(prev => ({
            ...prev,
            [movieId]: true
        }));
    };

    // ======================================================
    // REMOVE CONFIG
    // ======================================================

    const removeConfig = async (
        movieId,
        index
    ) => {

        const movieConfigs =
            configs[movieId] || [];

        const newConfigs = [
            ...movieConfigs
        ];

        const removed =
            newConfigs.splice(
                index,
                1
            )[0];

        if (
            removed?.config_id
        ) {

            try {

                await api.delete(
                    `/api/showtime-config/${movieId}/${removed.config_id}`
                );

                setConfigs(prev => ({
                    ...prev,
                    [movieId]:
                        newConfigs
                }));

                showAlert(
                    'Thành công',
                    'Xóa cấu hình thành công',
                    'success'
                );

            } catch (error) {

                console.error(
                    'Lỗi xóa config:',
                    error
                );

                showAlert(
                    'Lỗi',
                    'Không thể xóa cấu hình',
                    'error'
                );
            }

            return;
        }

        setConfigs(prev => ({
            ...prev,
            [movieId]:
                newConfigs
        }));
    };

    // ======================================================
    // UPDATE CONFIG
    // ======================================================

    const updateConfig = (
        movieId,
        index,
        field,
        value
    ) => {

        setConfigs(prev => {

            const movieConfigs = [
                ...(prev[movieId] || [])
            ];

            if (
                !movieConfigs[index]
            ) {
                return prev;
            }

            let normalizedValue =
                value;

            // NUMBER
            if (
                field ===
                    'slot_count' ||
                field ===
                    'interval_minutes'
            ) {

                normalizedValue =
                    Number(value);

                if (
                    !Number.isFinite(
                        normalizedValue
                    )
                ) {
                    normalizedValue =
                        0;
                }
            }

            // ACTIVE
            if (
                field ===
                'is_active'
            ) {

                normalizedValue =
                    Number(value) ===
                    1
                        ? 1
                        : 0;
            }

            // TIME SLOT
            if (
                field ===
                'time_slot'
            ) {

                const exists =
                    TIME_SLOTS.some(
                        item =>
                            item.key ===
                            value
                    );

                if (!exists) {

                    normalizedValue =
                        'MORNING';
                }
            }

            // ROOM TYPE
            if (
                field ===
                'room_type'
            ) {

                const exists =
                    ROOM_TYPES.includes(
                        value
                    );

                if (!exists) {

                    normalizedValue =
                        '2D';
                }
            }

            // DAY TYPE
            if (
                field ===
                'day_type'
            ) {

                const exists =
                    DAY_TYPES.some(
                        item =>
                            item.key ===
                            value
                    );

                if (!exists) {

                    normalizedValue =
                        'ALL';
                }
            }

            movieConfigs[index] = {
                ...movieConfigs[index],
                [field]:
                    normalizedValue
            };

            return {
                ...prev,
                [movieId]:
                    movieConfigs
            };
        });
    };

    // ======================================================
    // VALIDATE CONFIG
    // ======================================================

    const validateConfigs = (
        movieId,
        movieConfigs
    ) => {

        if (
            !Array.isArray(
                movieConfigs
            ) ||
            movieConfigs.length === 0
        ) {

            return {
                valid: false,
                message:
                    `Phim "${getMovieTitle(movieId)}" chưa có cấu hình`
            };
        }

        const activeConfigs =
            movieConfigs.filter(
                config =>
                    Number(
                        config.is_active
                    ) === 1 &&
                    Number(
                        config.slot_count
                    ) > 0
            );

        if (
            activeConfigs.length === 0
        ) {

            return {
                valid: false,
                message:
                    `Phim "${getMovieTitle(movieId)}" chưa có cấu hình đang bật`
            };
        }

        for (
            let index = 0;
            index <
            activeConfigs.length;
            index++
        ) {

            const config =
                activeConfigs[index];

            if (
                !TIME_SLOTS.some(
                    item =>
                        item.key ===
                        config.time_slot
                )
            ) {

                return {
                    valid: false,
                    message:
                        `Phim "${getMovieTitle(movieId)}": Khung giờ không hợp lệ`
                };
            }

            if (
                !ROOM_TYPES.includes(
                    config.room_type
                )
            ) {

                return {
                    valid: false,
                    message:
                        `Phim "${getMovieTitle(movieId)}": Loại phòng không hợp lệ`
                };
            }

            if (
                !DAY_TYPES.some(
                    item =>
                        item.key ===
                        (
                            config.day_type ||
                            'ALL'
                        )
                )
            ) {

                return {
                    valid: false,
                    message:
                        `Phim "${getMovieTitle(movieId)}": Loại ngày không hợp lệ`
                };
            }

            if (
                !Number.isFinite(
                    Number(
                        config.slot_count
                    )
                ) ||
                Number(
                    config.slot_count
                ) <= 0
            ) {

                return {
                    valid: false,
                    message:
                        `Phim "${getMovieTitle(movieId)}": Số suất phải lớn hơn 0`
                };
            }

            if (
                !Number.isFinite(
                    Number(
                        config.interval_minutes
                    )
                ) ||
                Number(
                    config.interval_minutes
                ) <= 0
            ) {

                return {
                    valid: false,
                    message:
                        `Phim "${getMovieTitle(movieId)}": Khoảng cách phải lớn hơn 0`
                };
            }

            // ==========================================
            // CAPACITY VALIDATION
            // ==========================================

            const movie =
                getMovieByIdFromList(
                    movies,
                    movieId
                );

            const duration =
                extractMovieDuration(
                    movie
                );

            const roomCount =
                extractRoomCount(
                    selectedCinemaObject,
                    config.room_type
                );

            const range =
                getEffectiveSlotRange(
                    config.time_slot,
                    cinemaOpen,
                    cinemaClose
                );

            if (!range) {

                return {
                    valid: false,
                    message:
                        `Phim "${getMovieTitle(movieId)}": Khung ${config.time_slot} không nằm trong giờ hoạt động của rạp (${minutesToTime(cinemaOpen)} - ${minutesToTime(cinemaClose)})`
                };
            }

            const maxCapacity =
                calculateMaxCapacity({
                    slotStart:
                        range.start,

                    slotEnd:
                        range.end,

                    duration,

                    intervalMinutes:
                        Number(
                            config.interval_minutes
                        ),

                    roomCount
                });

            if (
                Number(
                    config.slot_count
                ) > maxCapacity
            ) {

                return {
                    valid: false,

                    capacityError: true,

                    movieId,

                    config,

                    duration,

                    roomCount,

                    range,

                    maxCapacity,

                    message:
                        [
                            `⚠️ CẤU HÌNH VƯỢT KHUNG GIỜ`,

                            ``,

                            `🎬 Phim: ${getMovieTitle(movieId)}`,

                            `🎞️ Khung giờ: ${config.time_slot}`,

                            `⏰ Khung thực tế: ${minutesToTime(range.start)} → ${minutesToTime(range.end)}`,

                            `🏠 Loại phòng: ${config.room_type}`,

                            `🏢 Số phòng: ${roomCount}`,

                            `🎥 Thời lượng phim: ${duration} phút`,

                            `⏱️ Khoảng cách suất: ${config.interval_minutes} phút`,

                            ``,

                            `Bạn đang cấu hình: ${config.slot_count} suất`,

                            `Tối đa có thể tạo: ${maxCapacity} suất`,

                            ``,

                            `💡 ĐỀ XUẤT:`,

                            `👉 Đặt slot_count = ${maxCapacity}`,

                            ``,

                            `Vui lòng giảm số suất để phù hợp với khung giờ.`
                        ].join('\n')
                };
            }
        }

        return {
            valid: true,
            configs: activeConfigs
        };
    };

    // ======================================================
    // GET CONFIG CAPACITY INFO
    // ======================================================

    const getConfigCapacityInfo = useCallback(
        (
            movieId,
            config
        ) => {

            if (
                !config ||
                Number(
                    config.is_active
                ) !== 1
            ) {
                return null;
            }

            const movie =
                getMovieByIdFromList(
                    movies,
                    movieId
                );

            const duration =
                extractMovieDuration(
                    movie
                );

            const roomCount =
                extractRoomCount(
                    selectedCinemaObject,
                    config.room_type
                );

            const range =
                getEffectiveSlotRange(
                    config.time_slot,
                    cinemaOpen,
                    cinemaClose
                );

            if (!range) {

                return {
                    validRange: false,

                    duration,

                    roomCount,

                    maxCapacity: 0,

                    requested:
                        Number(
                            config.slot_count
                        ) || 0
                };
            }

            const maxCapacity =
                calculateMaxCapacity({
                    slotStart:
                        range.start,

                    slotEnd:
                        range.end,

                    duration,

                    intervalMinutes:
                        Number(
                            config.interval_minutes
                        ) ||
                        DEFAULT_INTERVAL,

                    roomCount
                });

            const requested =
                Number(
                    config.slot_count
                ) || 0;

            return {
                validRange: true,

                range,

                duration,

                roomCount,

                maxCapacity,

                requested,

                exceeded:
                    requested >
                    maxCapacity,

                recommended:
                    maxCapacity
            };
        },
        [
            movies,
            selectedCinemaObject,
            cinemaOpen,
            cinemaClose
        ]
    );

    // ======================================================
    // GET CAPACITY MESSAGE
    // ======================================================

    const getCapacityMessage = (
        movieId,
        config
    ) => {

        const info =
            getConfigCapacityInfo(
                movieId,
                config
            );

        if (!info) {
            return null;
        }

        if (
            !info.validRange
        ) {

            return {
                type: 'error',

                text:
                    `Khung ${config.time_slot} không nằm trong giờ hoạt động của rạp.`
            };
        }

        if (
            info.exceeded
        ) {

            return {
                type: 'error',

                text:
                    `⚠️ Vượt giới hạn: ${info.requested} suất → tối đa ${info.maxCapacity} suất. Đề xuất: ${info.maxCapacity} suất.`
            };
        }

        return {
            type: 'success',

            text:
                `✓ Phù hợp: tối đa ${info.maxCapacity} suất trong khung này.`
        };
    };

    // ======================================================
    // FIND CAPACITY ERRORS
    // ======================================================

    const findCapacityErrors = () => {

        const errors = [];

        for (
            const movieId
            of selectedMovies
        ) {

            const movieConfigs =
                configs[movieId] || [];

            for (
                const config
                of movieConfigs
            ) {

                if (
                    Number(
                        config.is_active
                    ) !== 1
                ) {
                    continue;
                }

                if (
                    Number(
                        config.slot_count
                    ) <= 0
                ) {
                    continue;
                }

                const info =
                    getConfigCapacityInfo(
                        movieId,
                        config
                    );

                if (
                    info?.exceeded
                ) {

                    errors.push({
                        movieId,

                        movieTitle:
                            getMovieTitle(
                                movieId
                            ),

                        config,

                        info
                    });
                }
            }
        }

        return errors;
    };

    // ======================================================
    // SAVE ALL
    // ======================================================

    const handleSaveAll = async () => {

        // -----------------------------------------------
        // VALIDATE CINEMA
        // -----------------------------------------------

        if (
            !selectedCinema
        ) {

            showAlert(
                'Lỗi',
                'Vui lòng chọn rạp',
                'error'
            );

            return;
        }

        // -----------------------------------------------
        // VALIDATE MOVIES
        // -----------------------------------------------

        if (
            selectedMovies.length === 0
        ) {

            showAlert(
                'Lỗi',
                'Vui lòng chọn ít nhất 1 phim',
                'error'
            );

            return;
        }

        // -----------------------------------------------
        // CAPACITY VALIDATION
        // -----------------------------------------------

        const capacityErrors =
            findCapacityErrors();

        if (
            capacityErrors.length > 0
        ) {

            const first =
                capacityErrors[0];

            const info =
                first.info;

            showAlert(
                'Cấu hình vượt khung giờ',

                [
                    `⚠️ Phim: ${first.movieTitle}`,

                    `Khung giờ: ${first.config.time_slot}`,

                    `Loại phòng: ${first.config.room_type}`,

                    ``,

                    `Bạn đang nhập: ${info.requested} suất`,

                    `Tối đa có thể tạo: ${info.maxCapacity} suất`,

                    ``,

                    `💡 Đề xuất:`,

                    `Nhập ${info.maxCapacity} suất.`,

                    ``,

                    `Khung giờ thực tế: ${minutesToTime(info.range.start)} → ${minutesToTime(info.range.end)}`,

                    `Thời lượng phim: ${info.duration} phút`,

                    `Số phòng: ${info.roomCount}`,

                    `Khoảng cách suất: ${first.config.interval_minutes} phút`
                ].join('\n'),

                'warning'
            );

            return;
        }

        // -----------------------------------------------
        // VALIDATE ALL CONFIGS
        // -----------------------------------------------

        const preparedConfigs = {};

        for (
            const movieId
            of selectedMovies
        ) {

            const movieConfigs =
                configs[movieId] || [];

            const validation =
                validateConfigs(
                    movieId,
                    movieConfigs
                );

            if (
                !validation.valid
            ) {

                showAlert(
                    validation.capacityError
                        ? 'Cấu hình vượt khung giờ'
                        : 'Cấu hình không hợp lệ',

                    validation.message,

                    validation.capacityError
                        ? 'warning'
                        : 'error'
                );

                return;
            }

            preparedConfigs[movieId] =
                validation.configs.map(
                    config => ({

                        time_slot:
                            String(
                                config.time_slot
                            ).toUpperCase(),

                        room_type:
                            String(
                                config.room_type
                            ).toUpperCase(),

                        slot_count:
                            Number(
                                config.slot_count
                            ),

                        interval_minutes:
                            Number(
                                config.interval_minutes
                            ),

                        day_type:
                            String(
                                config.day_type ||
                                'ALL'
                            ).toUpperCase(),

                        is_active:
                            1
                    })
                );
        }

        // -----------------------------------------------
        // SAVE
        // -----------------------------------------------

        setSaving(true);

        let successCount = 0;

        let errorCount = 0;

        const errorMovies = [];

        try {

            for (
                const movieId
                of selectedMovies
            ) {

                try {

                    await api.post(
                        `/api/showtime-config/${movieId}`,

                        {
                            cinema_id:
                                Number(
                                    selectedCinema
                                ),

                            configs:
                                preparedConfigs[
                                    movieId
                                ]
                        }
                    );

                    successCount++;

                } catch (error) {

                    console.error(
                        `Lỗi lưu config cho phim ${movieId}:`,
                        error
                    );

                    errorCount++;

                    errorMovies.push(
                        getMovieTitle(
                            movieId
                        )
                    );
                }
            }

        } finally {

            setSaving(false);
        }

        // -----------------------------------------------
        // RESULT
        // -----------------------------------------------

        if (
            errorCount === 0
        ) {

            showAlert(
                'Thành công',

                `Lưu cấu hình thành công cho ${successCount} phim!`,

                'success'
            );

        } else {

            showAlert(
                'Thông báo',

                `Lưu thành công ${successCount} phim, thất bại ${errorCount} phim.${
                    errorMovies.length > 0
                        ? `\n\nPhim lỗi:\n${errorMovies.join('\n')}`
                        : ''
                }`,

                'warning'
            );
        }

        // -----------------------------------------------
        // RELOAD DATABASE CONFIG
        // -----------------------------------------------

        await loadAllConfigs();
    };

    // ======================================================
    // FILTER MOVIES
    // ======================================================

    const filteredMovies =
        movies.filter(
            movie => {

                const title =
                    String(
                        movie.title ||
                        ''
                    ).toLowerCase();

                return title.includes(
                    searchMovie.toLowerCase()
                );
            }
        );

    // ======================================================
    // GET MOVIE TITLE
    // ======================================================

    const getMovieTitle = (
        movieId
    ) => {

        const movie =
            movies.find(
                movie =>
                    String(
                        movie.movie_id
                    ) ===
                    String(
                        movieId
                    )
            );

        return (
            movie?.title ||
            `Phim #${movieId}`
        );
    };

    // ======================================================
    // GET TOTAL CONFIG SLOTS
    // ======================================================

    const getTotalSlots = (
        movieId
    ) => {

        const movieConfigs =
            configs[movieId] || [];

        return movieConfigs.filter(
            config =>
                Number(
                    config.slot_count
                ) > 0 &&
                Number(
                    config.is_active
                ) === 1
        ).length;
    };

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {

        return (
            <div className="admin-loading">

                <Loader2
                    size={32}
                    className="spin-icon"
                />

                <span>
                    Đang tải dữ liệu...
                </span>

            </div>
        );
    }

    // ======================================================
    // RENDER
    // ======================================================

    return (
        <>
            <AdminPage
                title="Cấu hình lịch chiếu"
                subtitle="Cấu hình suất chiếu cho nhiều phim cùng lúc"
                icon={
                    <Settings
                        size={30}
                    />
                }
                buttonText="Quay lại"
                onAdd={() =>
                    navigate(
                        '/admin/showtime-config'
                    )
                }
                buttonIcon={
                    <ArrowLeft
                        size={18}
                    />
                }
            >

                <div className="movie-showtime-config-page">

                    {/* ==================================================
                        CHỌN RẠP
                    ================================================== */}

                    <div className="cinema-select-wrapper">

                        <label className="cinema-select-label">
                            Chọn rạp:
                        </label>

                        <select
                            value={
                                selectedCinema
                            }
                            onChange={
                                e =>
                                    setSelectedCinema(
                                        e.target.value
                                    )
                            }
                            className="cinema-select"
                        >

                            <option value="">
                                -- Chọn rạp --
                            </option>

                            {cinemas.map(
                                cinema => (

                                    <option
                                        key={
                                            cinema.cinema_id
                                        }
                                        value={
                                            cinema.cinema_id
                                        }
                                    >
                                        {
                                            cinema.cinema_name
                                        }

                                        {cinema.city
                                            ? ` - ${cinema.city}`
                                            : ''}
                                    </option>
                                )
                            )}

                        </select>

                    </div>

                    {/* ==================================================
                        CINEMA INFO
                    ================================================== */}

                    {selectedCinema && (

                        <div
                            className="showtime-capacity-summary"
                            style={{
                                marginTop:
                                    '12px',
                                marginBottom:
                                    '18px',
                                padding:
                                    '12px 16px',
                                border:
                                    '1px solid rgba(255,255,255,0.1)',
                                borderRadius:
                                    '10px'
                            }}
                        >

                            <div
                                style={{
                                    display:
                                        'flex',
                                    alignItems:
                                        'center',
                                    gap:
                                        '8px',
                                    marginBottom:
                                        '6px'
                                }}
                            >

                                <Settings
                                    size={16}
                                />

                                <strong>
                                    Giờ hoạt động của rạp
                                </strong>

                            </div>

                            <div>
                                🕐{' '}
                                {minutesToTime(
                                    cinemaOpen
                                )}

                                {' → '}

                                {minutesToTime(
                                    cinemaClose
                                )}
                            </div>

                            <small
                                style={{
                                    opacity:
                                        0.7
                                }}
                            >
                                Khung giờ được tự động giới hạn theo giờ hoạt động của rạp.
                            </small>

                        </div>
                    )}

                    {/* ==================================================
                        CHỌN PHIM
                    ================================================== */}

                    {selectedCinema && (

                        <div className="movie-select-wrapper">

                            <label className="movie-select-label">

                                Chọn phim để cấu hình

                                <span className="movie-select-hint">
                                    (Có thể chọn nhiều phim)
                                </span>

                            </label>

                            <div className="movie-search-wrapper">

                                <Search
                                    size={18}
                                    className="search-icon"
                                />

                                <input
                                    type="text"
                                    placeholder="Tìm phim..."
                                    value={
                                        searchMovie
                                    }
                                    onChange={
                                        e =>
                                            setSearchMovie(
                                                e.target.value
                                            )
                                    }
                                    className="movie-search-input"
                                />

                                <span className="selected-count">
                                    Đã chọn:{' '}
                                    {
                                        selectedMovies.length
                                    }{' '}
                                    phim
                                </span>

                            </div>

                            <div className="movie-list">

                                {filteredMovies.map(
                                    movie => {

                                        const isChecked =
                                            selectedMovies.includes(
                                                movie.movie_id
                                            );

                                        return (

                                            <label
                                                key={
                                                    movie.movie_id
                                                }
                                                className={
                                                    `movie-chip ${
                                                        isChecked
                                                            ? 'checked'
                                                            : ''
                                                    }`
                                                }
                                            >

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        isChecked
                                                    }
                                                    onChange={() =>
                                                        toggleMovieSelection(
                                                            movie.movie_id
                                                        )
                                                    }
                                                />

                                                {
                                                    movie.title
                                                }

                                                {isChecked && (

                                                    <span className="movie-chip-badge">

                                                        {
                                                            getTotalSlots(
                                                                movie.movie_id
                                                            )
                                                        }

                                                        {' '}
                                                        cấu hình

                                                    </span>

                                                )}

                                            </label>
                                        );
                                    }
                                )}

                                {filteredMovies.length ===
                                    0 && (

                                    <span className="no-movies">
                                        Không tìm thấy phim
                                    </span>

                                )}

                            </div>

                        </div>
                    )}

                    {/* ==================================================
                        CONFIGURATION
                    ================================================== */}

                    {selectedCinema &&
                        selectedMovies.length >
                            0 && (

                            <div className="config-container">

                                {selectedMovies.map(
                                    (
                                        movieId,
                                        idx
                                    ) => {

                                        const movieConfigs =
                                            configs[
                                                movieId
                                            ] || [];

                                        const isExpanded =
                                            expandedMovies[
                                                movieId
                                            ] !== false;

                                        const movieTitle =
                                            getMovieTitle(
                                                movieId
                                            );

                                        const totalSlots =
                                            getTotalSlots(
                                                movieId
                                            );

                                        const movie =
                                            getMovieByIdFromList(
                                                movies,
                                                movieId
                                            );

                                        const duration =
                                            extractMovieDuration(
                                                movie
                                            );

                                        return (

                                            <div
                                                key={
                                                    movieId
                                                }
                                                className="movie-config-card"
                                            >

                                                {/* HEADER */}

                                                <div
                                                    className={
                                                        `movie-config-header ${
                                                            isExpanded
                                                                ? 'expanded'
                                                                : ''
                                                        }`
                                                    }
                                                    onClick={() =>
                                                        toggleExpand(
                                                            movieId
                                                        )
                                                    }
                                                >

                                                    <div className="movie-config-title">

                                                        <span className="movie-config-index">
                                                            {
                                                                idx +
                                                                1
                                                            }.
                                                        </span>

                                                        <span className="movie-config-name">
                                                            {
                                                                movieTitle
                                                            }
                                                        </span>

                                                        <span className="movie-config-badge">
                                                            {
                                                                totalSlots
                                                            }{' '}
                                                            cấu hình
                                                        </span>

                                                    </div>

                                                    <div className="movie-config-toggle">

                                                        {isExpanded
                                                            ? (
                                                                <ChevronUp
                                                                    size={
                                                                        18
                                                                    }
                                                                />
                                                            )
                                                            : (
                                                                <ChevronDown
                                                                    size={
                                                                        18
                                                                    }
                                                                />
                                                            )}

                                                    </div>

                                                </div>

                                                {/* BODY */}

                                                {isExpanded && (

                                                    <div className="movie-config-body">

                                                        {/* MOVIE INFO */}

                                                        <div
                                                            style={{
                                                                marginBottom:
                                                                    '12px',
                                                                padding:
                                                                    '10px 14px',
                                                                borderRadius:
                                                                    '8px',
                                                                background:
                                                                    'rgba(255,255,255,0.04)',
                                                                fontSize:
                                                                    '13px'
                                                            }}
                                                        >

                                                            🎥 Thời lượng phim:
                                                            {' '}
                                                            <strong>
                                                                {
                                                                    duration
                                                                }{' '}
                                                                phút
                                                            </strong>

                                                            {' • '}

                                                            🏢 Giờ rạp:
                                                            {' '}
                                                            <strong>
                                                                {
                                                                    minutesToTime(
                                                                        cinemaOpen
                                                                    )
                                                                }
                                                                {' → '}
                                                                {
                                                                    minutesToTime(
                                                                        cinemaClose
                                                                    )
                                                                }
                                                            </strong>

                                                        </div>

                                                        <div className="config-actions">

                                                            <button
                                                                type="button"
                                                                className="btn-add-row"
                                                                onClick={() =>
                                                                    addConfig(
                                                                        movieId
                                                                    )
                                                                }
                                                            >

                                                                <Plus
                                                                    size={
                                                                        16
                                                                    }
                                                                />

                                                                Thêm dòng

                                                            </button>

                                                        </div>

                                                        {movieConfigs.length ===
                                                        0 ? (

                                                            <div className="empty-config">

                                                                <p>
                                                                    Chưa có cấu hình cho phim này
                                                                </p>

                                                                <p className="empty-hint">
                                                                    Bấm "Thêm dòng" để bắt đầu
                                                                </p>

                                                            </div>

                                                        ) : (

                                                            <>

                                                                {/* HEADER */}

                                                                <div className="config-table-header">

                                                                    <span>
                                                                        Khung giờ
                                                                    </span>

                                                                    <span>
                                                                        Loại phòng
                                                                    </span>

                                                                    <span>
                                                                        Số suất
                                                                    </span>

                                                                    <span>
                                                                        K/c (phút)
                                                                    </span>

                                                                    <span>
                                                                        Áp dụng
                                                                    </span>

                                                                    <span>
                                                                        Bật
                                                                    </span>

                                                                    <span></span>

                                                                </div>

                                                                {/* ROWS */}

                                                                {movieConfigs.map(
                                                                    (
                                                                        config,
                                                                        index
                                                                    ) => {

                                                                        const capacityInfo =
                                                                            getConfigCapacityInfo(
                                                                                movieId,
                                                                                config
                                                                            );

                                                                        const capacityMessage =
                                                                            getCapacityMessage(
                                                                                movieId,
                                                                                config
                                                                            );

                                                                        return (

                                                                            <React.Fragment
                                                                                key={
                                                                                    config.config_id ||
                                                                                    `${movieId}-${index}`
                                                                                }
                                                                            >

                                                                                <div
                                                                                    className={
                                                                                        `config-table-row ${
                                                                                            capacityMessage?.type ===
                                                                                            'error'
                                                                                                ? 'config-row-warning'
                                                                                                : ''
                                                                                        }`
                                                                                    }
                                                                                >

                                                                                    {/* TIME SLOT */}

                                                                                    <select
                                                                                        value={
                                                                                            config.time_slot ||
                                                                                            'MORNING'
                                                                                        }
                                                                                        onChange={
                                                                                            e =>
                                                                                                updateConfig(
                                                                                                    movieId,
                                                                                                    index,
                                                                                                    'time_slot',
                                                                                                    e.target.value
                                                                                                )
                                                                                        }
                                                                                        className="config-select"
                                                                                    >

                                                                                        {TIME_SLOTS.map(
                                                                                            slot => (

                                                                                                <option
                                                                                                    key={
                                                                                                        slot.key
                                                                                                    }
                                                                                                    value={
                                                                                                        slot.key
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        slot.label
                                                                                                    }
                                                                                                </option>

                                                                                            )
                                                                                        )}

                                                                                    </select>

                                                                                    {/* ROOM TYPE */}

                                                                                    <select
                                                                                        value={
                                                                                            config.room_type ||
                                                                                            '2D'
                                                                                        }
                                                                                        onChange={
                                                                                            e =>
                                                                                                updateConfig(
                                                                                                    movieId,
                                                                                                    index,
                                                                                                    'room_type',
                                                                                                    e.target.value
                                                                                                )
                                                                                        }
                                                                                        className="config-select"
                                                                                    >

                                                                                        {ROOM_TYPES.map(
                                                                                            type => (

                                                                                                <option
                                                                                                    key={
                                                                                                        type
                                                                                                    }
                                                                                                    value={
                                                                                                        type
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        type
                                                                                                    }
                                                                                                </option>

                                                                                            )
                                                                                        )}

                                                                                    </select>

                                                                                    {/* SLOT COUNT */}

                                                                                    <input
                                                                                        type="number"
                                                                                        value={
                                                                                            config.slot_count ??
                                                                                            0
                                                                                        }
                                                                                        onChange={
                                                                                            e =>
                                                                                                updateConfig(
                                                                                                    movieId,
                                                                                                    index,
                                                                                                    'slot_count',
                                                                                                    e.target.value
                                                                                                )
                                                                                        }
                                                                                        min="0"
                                                                                        max="30"
                                                                                        className="config-input config-input-number"
                                                                                    />

                                                                                    {/* INTERVAL */}

                                                                                    <input
                                                                                        type="number"
                                                                                        value={
                                                                                            config.interval_minutes ??
                                                                                            DEFAULT_INTERVAL
                                                                                        }
                                                                                        onChange={
                                                                                            e =>
                                                                                                updateConfig(
                                                                                                    movieId,
                                                                                                    index,
                                                                                                    'interval_minutes',
                                                                                                    e.target.value
                                                                                                )
                                                                                        }
                                                                                        min="30"
                                                                                        max="120"
                                                                                        step="5"
                                                                                        className="config-input config-input-number"
                                                                                    />

                                                                                    {/* DAY TYPE */}

                                                                                    <select
                                                                                        value={
                                                                                            config.day_type ||
                                                                                            'ALL'
                                                                                        }
                                                                                        onChange={
                                                                                            e =>
                                                                                                updateConfig(
                                                                                                    movieId,
                                                                                                    index,
                                                                                                    'day_type',
                                                                                                    e.target.value
                                                                                                )
                                                                                        }
                                                                                        className="config-select"
                                                                                    >

                                                                                        {DAY_TYPES.map(
                                                                                            day => (

                                                                                                <option
                                                                                                    key={
                                                                                                        day.key
                                                                                                    }
                                                                                                    value={
                                                                                                        day.key
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        day.label
                                                                                                    }
                                                                                                </option>

                                                                                            )
                                                                                        )}

                                                                                    </select>

                                                                                    {/* ACTIVE */}

                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={
                                                                                            Number(
                                                                                                config.is_active
                                                                                            ) ===
                                                                                            1
                                                                                        }
                                                                                        onChange={
                                                                                            e =>
                                                                                                updateConfig(
                                                                                                    movieId,
                                                                                                    index,
                                                                                                    'is_active',
                                                                                                    e.target
                                                                                                        .checked
                                                                                                        ? 1
                                                                                                        : 0
                                                                                                )
                                                                                        }
                                                                                        className="config-checkbox"
                                                                                    />

                                                                                    {/* DELETE */}

                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn-remove-row"
                                                                                        onClick={() =>
                                                                                            removeConfig(
                                                                                                movieId,
                                                                                                index
                                                                                            )
                                                                                        }
                                                                                    >

                                                                                        <Trash2
                                                                                            size={
                                                                                                15
                                                                                            }
                                                                                        />

                                                                                    </button>

                                                                                </div>

                                                                                {/* ==================================================
                                                                                    CAPACITY WARNING / RECOMMENDATION
                                                                                ================================================== */}

                                                                                {capacityInfo && (
                                                                                    <div
                                                                                        style={{
                                                                                            margin:
                                                                                                '0 0 10px 0',
                                                                                            padding:
                                                                                                '9px 12px',
                                                                                            borderRadius:
                                                                                                '0 0 8px 8px',
                                                                                            fontSize:
                                                                                                '12px',
                                                                                            display:
                                                                                                'flex',
                                                                                            alignItems:
                                                                                                'center',
                                                                                            gap:
                                                                                                '8px',
                                                                                            background:
                                                                                                capacityMessage?.type ===
                                                                                                'error'
                                                                                                    ? 'rgba(220, 38, 38, 0.12)'
                                                                                                    : 'rgba(34, 197, 94, 0.08)',
                                                                                            border:
                                                                                                capacityMessage?.type ===
                                                                                                'error'
                                                                                                    ? '1px solid rgba(220, 38, 38, 0.3)'
                                                                                                    : '1px solid rgba(34, 197, 94, 0.2)'
                                                                                        }}
                                                                                    >

                                                                                        {capacityMessage?.type ===
                                                                                        'error'
                                                                                            ? (
                                                                                                <AlertTriangle
                                                                                                    size={
                                                                                                        16
                                                                                                    }
                                                                                                />
                                                                                            )
                                                                                            : (
                                                                                                <CheckCircle2
                                                                                                    size={
                                                                                                        16
                                                                                                    }
                                                                                                />
                                                                                            )}

                                                                                        <div>

                                                                                            <div>
                                                                                                {
                                                                                                    capacityMessage?.text
                                                                                                }
                                                                                            </div>

                                                                                            {capacityMessage?.type ===
                                                                                                'error' &&
                                                                                                capacityInfo.validRange && (

                                                                                                    <div
                                                                                                        style={{
                                                                                                            marginTop:
                                                                                                                '4px',
                                                                                                            display:
                                                                                                                'flex',
                                                                                                            alignItems:
                                                                                                                'center',
                                                                                                            gap:
                                                                                                                '5px'
                                                                                                        }}
                                                                                                    >

                                                                                                        <Lightbulb
                                                                                                            size={
                                                                                                                14
                                                                                                            }
                                                                                                        />

                                                                                                        Đề xuất:
                                                                                                        {' '}
                                                                                                        <strong>
                                                                                                            {
                                                                                                                capacityInfo.recommended
                                                                                                            }{' '}
                                                                                                            suất
                                                                                                        </strong>

                                                                                                        {' '}
                                                                                                        (
                                                                                                        {
                                                                                                            minutesToTime(
                                                                                                                capacityInfo.range.start
                                                                                                            )
                                                                                                        }
                                                                                                        {' → '}
                                                                                                        {
                                                                                                            minutesToTime(
                                                                                                                capacityInfo.range.end
                                                                                                            )
                                                                                                        }
                                                                                                        )

                                                                                                    </div>

                                                                                                )}

                                                                                        </div>

                                                                                    </div>
                                                                                )}

                                                                            </React.Fragment>
                                                                        );
                                                                    }
                                                                )}

                                                            </>

                                                        )}

                                                    </div>
                                                )}

                                            </div>
                                        );
                                    }
                                )}

                                {/* ==================================================
                                    SAVE ALL
                                ================================================== */}

                                <div className="save-all-wrapper">

                                    <button
                                        type="button"
                                        className="btn-save-all"
                                        onClick={
                                            handleSaveAll
                                        }
                                        disabled={
                                            saving ||
                                            selectedMovies.length ===
                                                0
                                        }
                                    >

                                        {saving ? (

                                            <>

                                                <Loader2
                                                    size={
                                                        18
                                                    }
                                                    className="spin-icon"
                                                />

                                                Đang lưu...

                                            </>

                                        ) : (

                                            <>

                                                <Save
                                                    size={
                                                        18
                                                    }
                                                />

                                                Lưu tất cả (
                                                {
                                                    selectedMovies.length
                                                }{' '}
                                                phim)

                                            </>
                                        )}

                                    </button>

                                    <span className="save-hint">

                                        Cấu hình sẽ được kiểm tra
                                        giới hạn khung giờ trước khi lưu

                                    </span>

                                </div>

                            </div>
                        )}

                    {/* ==================================================
                        NO MOVIE
                    ================================================== */}

                    {selectedCinema &&
                        selectedMovies.length ===
                            0 && (

                            <div className="empty-state">

                                <Film
                                    size={
                                        48
                                    }
                                    className="empty-icon"
                                />

                                <p className="empty-title">
                                    Chưa chọn phim nào
                                </p>

                                <p className="empty-subtitle">
                                    Hãy chọn ít nhất 1 phim ở trên để cấu hình
                                </p>

                            </div>
                        )}

                </div>

            </AdminPage>

            {/* ======================================================
                ALERT MODAL
            ====================================================== */}

            <AdminModal
                open={
                    alertModal.open
                }
                onClose={
                    closeAlert
                }
                title={
                    alertModal.title
                }
                type={
                    alertModal.type
                }
                size="sm"
                onConfirm={
                    closeAlert
                }
                confirmText="Đóng"
            >

                <div className="admin-alert-content">

                    <p
                        style={{
                            whiteSpace:
                                'pre-line'
                        }}
                    >
                        {
                            alertModal.message
                        }
                    </p>

                </div>

            </AdminModal>

        </>
    );
};

export default MovieShowtimeConfigPage;