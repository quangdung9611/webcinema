// pages/admin/MovieShowtimeConfigPage.jsx

import React, {
    useEffect,
    useMemo,
    useState,
} from 'react';

import { useNavigate } from 'react-router-dom';
import api from '../../../../api/api';

import {
    ArrowLeft,
    BarChart3,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    ChevronUp,
    Clapperboard,
    Clock3,
    Film,
    Flame,
    Info,
    Loader2,
    Moon,
    Save,
    Search,
    Snowflake,
    Sun,
    Sunrise,
    Sunset,
    Timer,
    Trash2,
    Ban,
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';

import '../../../styles/MovieShowtimeConfigPage.css';

// ============================================================
// CONSTANTS
// ============================================================

const TIME_SLOTS = [
    {
        key: 'MORNING',
        label: 'SÁNG',
        icon: Sunrise,
        startMinutes: 8 * 60,
        endMinutes: 12 * 60,
    },
    {
        key: 'AFTERNOON',
        label: 'TRƯA',
        icon: Sun,
        startMinutes: 12 * 60,
        endMinutes: 17 * 60,
    },
    {
        key: 'EVENING',
        label: 'CHIỀU',
        icon: Sunset,
        startMinutes: 17 * 60,
        endMinutes: 20 * 60,
    },
    {
        key: 'NIGHT',
        label: 'TỐI',
        icon: Moon,
        startMinutes: 20 * 60,
        endMinutes: 24 * 60,
    },
];

const ROOM_TYPES = ['2D', '3D', 'VIP', 'IMAX'];

const INTERVAL_TYPES = [
    {
        key: 'HOT',
        label: 'HOT',
        icon: Flame,
        minutes: 45,
        description: 'Phim đông khách',
    },
    {
        key: 'NORMAL',
        label: 'NORMAL',
        icon: BarChart3,
        minutes: 75,
        description: 'Phim bình thường',
    },
    {
        key: 'COOL',
        label: 'COOL',
        icon: Snowflake,
        minutes: 120,
        description: 'Phim ít khách',
    },
];

const INTERVAL_MINUTES_MAP = {
    HOT: 45,
    NORMAL: 75,
    COOL: 120,
};

const DEFAULT_INTERVAL_TYPE = 'NORMAL';
const DEFAULT_MOVIE_DURATION = 120;
const DEFAULT_CINEMA_OPEN = 8 * 60;
const DEFAULT_CINEMA_CLOSE = 24 * 60;

// ============================================================
// UTILS
// ============================================================

const timeToMinutes = (value, fallback = null) => {
    if (value === null || value === undefined || value === '') {
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

    const stringValue = String(value).trim();
    if (!stringValue) return fallback;

    const match = stringValue.match(/^(\d{1,2}):(\d{2})/);

    if (match) {
        const hour = Number(match[1]);
        const minute = Number(match[2]);

        if (
            hour >= 0 &&
            hour <= 23 &&
            minute >= 0 &&
            minute <= 59
        ) {
            return hour * 60 + minute;
        }
    }

    const numeric = Number(stringValue);

    if (
        Number.isFinite(numeric) &&
        numeric >= 0 &&
        numeric <= 1440
    ) {
        return Math.round(numeric);
    }

    return fallback;
};

const minutesToTime = (minutes) => {
    const safeMinutes = Math.max(
        0,
        Math.min(1440, Math.round(Number(minutes) || 0))
    );

    if (safeMinutes === 1440) return '24:00';

    const hour = Math.floor(safeMinutes / 60);
    const minute = safeMinutes % 60;

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const minutesToTimeFull = (minutes) => {
    return `${minutesToTime(minutes)}:00`;
};

const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
};

const getNextWeekDate = () => {
    const now = new Date();
    now.setDate(now.getDate() + 6);
    return now.toISOString().split('T')[0];
};

// ✅ Ngày hôm nay dạng YYYY-MM-DD
const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ✅ Giờ hiện tại dạng phút (0-1439)
const getNowMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
};

// ✅ Check 1 slot đã qua so với thời gian thực chưa
// date: YYYY-MM-DD
// startMinutes: 0-1439
const isSlotInPast = (date, startMinutes) => {
    const today = getTodayString();

    // Ngày đã qua → past
    if (date < today) return true;

    // Ngày tương lai → OK
    if (date > today) return false;

    // Hôm nay → check giờ
    const nowMinutes = getNowMinutes();
    return startMinutes <= nowMinutes;
};

const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    const current = new Date(start);

    while (current <= end) {
        const year = current.getUTCFullYear();
        const month = String(current.getUTCMonth() + 1).padStart(2, '0');
        const day = String(current.getUTCDate()).padStart(2, '0');
        const dayOfWeek = current.getUTCDay();

        dates.push({
            date: `${year}-${month}-${day}`,
            display: `${day}/${month}`,
            fullDisplay: `${day}/${month}/${year}`,
            dayOfWeek: [
                'Chủ Nhật',
                'Thứ 2',
                'Thứ 3',
                'Thứ 4',
                'Thứ 5',
                'Thứ 6',
                'Thứ 7',
            ][dayOfWeek],
            dayKey: [
                'SUNDAY',
                'MONDAY',
                'TUESDAY',
                'WEDNESDAY',
                'THURSDAY',
                'FRIDAY',
                'SATURDAY',
            ][dayOfWeek],
            shortDay: [
                'CN',
                'T2',
                'T3',
                'T4',
                'T5',
                'T6',
                'T7',
            ][dayOfWeek],
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            // ✅ Check ngày này có phải quá khứ không
            isPast: `${year}-${month}-${day}` < getTodayString(),
            isToday: `${year}-${month}-${day}` === getTodayString(),
        });

        current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
};

const generateSlotTimes = ({
    startMinutes,
    endMinutes,
    intervalMinutes,
}) => {
    if (
        startMinutes >= endMinutes ||
        intervalMinutes <= 0
    ) {
        return [];
    }

    const times = [];

    for (
        let t = startMinutes;
        t < endMinutes;
        t += intervalMinutes
    ) {
        times.push(t);
    }

    return times;
};

const extractMovieDuration = (movie) => {
    if (!movie) return DEFAULT_MOVIE_DURATION;

    const candidates = [
        movie.duration,
        movie.duration_minutes,
        movie.movie_duration,
        movie.runtime,
        movie.running_time,
        movie.length_minutes,
        movie.duration_minute,
        movie.thoi_luong,
    ];

    for (const value of candidates) {
        const number = Number(value);

        if (Number.isFinite(number) && number > 0) {
            return Math.round(number);
        }
    }

    return DEFAULT_MOVIE_DURATION;
};

const extractCinemaOpen = (cinema) => {
    if (!cinema) return DEFAULT_CINEMA_OPEN;

    const candidates = [
        cinema.weekday_open,
        cinema.weekend_open,
        cinema.open_time,
        cinema.opening_time,
        cinema.opening_hour,
        cinema.openingTime,
        cinema.openTime,
        cinema.open_at,
        cinema.start_time,
        cinema.startTime,
        cinema.gio_mo_cua,
    ];

    for (const value of candidates) {
        const minutes = timeToMinutes(value, null);

        if (minutes !== null) return minutes;
    }

    return DEFAULT_CINEMA_OPEN;
};

const extractCinemaClose = (cinema) => {
    if (!cinema) return DEFAULT_CINEMA_CLOSE;

    const candidates = [
        cinema.weekday_close,
        cinema.weekend_close,
        cinema.close_time,
        cinema.closing_time,
        cinema.closing_hour,
        cinema.closingTime,
        cinema.closeTime,
        cinema.close_at,
        cinema.end_time,
        cinema.endTime,
        cinema.gio_dong_cua,
    ];

    for (const value of candidates) {
        const minutes = timeToMinutes(value, null);

        if (minutes !== null) return minutes;
    }

    return DEFAULT_CINEMA_CLOSE;
};

const getIntervalMinutes = (type) => {
    return INTERVAL_MINUTES_MAP[type] || 75;
};

const buildSlotKey = (
    timeSlot,
    roomType,
    dayType,
    startMinutes
) => {
    return `${timeSlot}|${roomType}|${dayType}|${startMinutes}`;
};

// ============================================================
// COMPONENT
// ============================================================

const MovieShowtimeConfigPage = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);

    const [selectedCinema, setSelectedCinema] = useState('');
    const [selectedMovies, setSelectedMovies] = useState([]);
    const [searchMovie, setSearchMovie] = useState('');

    const [expandedMovies, setExpandedMovies] = useState({});
    const [configs, setConfigs] = useState({});
    const [movieIntervals, setMovieIntervals] = useState({});

    const [dateRange, setDateRange] = useState({
        startDate: getTodayDate(),
        endDate: getNextWeekDate(),
    });

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
    });

    // ✅ State để update "now" mỗi phút (cho slot disabled realtime)
    const [nowTick, setNowTick] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setNowTick(Date.now());
        }, 60 * 1000); // mỗi phút

        return () => clearInterval(timer);
    }, []);

    const selectedCinemaObject = useMemo(() => {
        return cinemas.find(
            (cinema) =>
                String(cinema.cinema_id) ===
                String(selectedCinema)
        );
    }, [cinemas, selectedCinema]);

    const cinemaOpen = useMemo(
        () => extractCinemaOpen(selectedCinemaObject),
        [selectedCinemaObject]
    );

    const cinemaClose = useMemo(
        () => extractCinemaClose(selectedCinemaObject),
        [selectedCinemaObject]
    );

    const datesInRange = useMemo(() => {
        if (
            !dateRange.startDate ||
            !dateRange.endDate
        ) {
            return [];
        }

        return getDatesInRange(
            dateRange.startDate,
            dateRange.endDate
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange.startDate, dateRange.endDate, nowTick]);

    const showAlert = (
        title,
        message,
        type = 'default'
    ) => {
        setAlertModal({
            open: true,
            title,
            message,
            type,
        });
    };

    const closeAlert = () => {
        setAlertModal((prev) => ({
            ...prev,
            open: false,
        }));
    };

    // ========================================================
    // LOAD INITIAL DATA
    // ========================================================

    useEffect(() => {
        fetchMovies();
        fetchCinemas();
    }, []);

    useEffect(() => {
        if (
            selectedCinema &&
            selectedMovies.length > 0
        ) {
            loadAllConfigs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCinema, selectedMovies]);

    const fetchMovies = async () => {
        try {
            const res = await api.get('/api/movies');
            const movieData = Array.isArray(res.data?.data)
                ? res.data.data
                : [];

            setMovies(movieData);
        } catch (error) {
            console.error('Lỗi load phim:', error);
            showAlert(
                'Lỗi',
                'Không thể tải danh sách phim',
                'error'
            );
        }
    };

    const fetchCinemas = async () => {
        try {
            const res = await api.get('/api/cinemas');
            const cinemaData = Array.isArray(res.data?.data)
                ? res.data.data
                : [];

            setCinemas(cinemaData);

            if (cinemaData.length > 0) {
                setSelectedCinema(
                    cinemaData[0].cinema_id
                );
            }
        } catch (error) {
            console.error('Lỗi load rạp:', error);
            showAlert(
                'Lỗi',
                'Không thể tải danh sách rạp',
                'error'
            );
        }
    };

    // ========================================================
    // LOAD CONFIGS
    // ========================================================

    const loadAllConfigs = async () => {
        if (
            !selectedCinema ||
            selectedMovies.length === 0
        ) {
            return;
        }

        setLoading(true);

        const newConfigs = {};
        const newIntervals = {};

        try {
            for (const movieId of selectedMovies) {
                try {
                    const res = await api.get(
                        `/api/showtime-config/${movieId}?cinema_id=${selectedCinema}`
                    );

                    const rawData = res.data?.data;

                    const rows = Array.isArray(rawData)
                        ? rawData
                        : Array.isArray(rawData?.data)
                            ? rawData.data
                            : [];

                    const movieConfigMap = {};
                    let detectedInterval =
                        DEFAULT_INTERVAL_TYPE;

                    for (const row of rows) {
                        if (Number(row.is_active) !== 1) {
                            continue;
                        }

                        const startMinutes = timeToMinutes(
                            row.slot_time,
                            null
                        );

                        if (startMinutes === null) {
                            continue;
                        }

                        const key = buildSlotKey(
                            row.time_slot,
                            row.room_type,
                            row.day_type,
                            startMinutes
                        );

                        movieConfigMap[key] = {
                            config_id: row.config_id,
                            time_slot: row.time_slot,
                            room_type: row.room_type,
                            day_type: row.day_type,
                            startMinutes,
                            slot_time: row.slot_time,
                            interval_type:
                                row.interval_type ||
                                DEFAULT_INTERVAL_TYPE,
                            is_active: 1,
                        };

                        if (row.interval_type) {
                            detectedInterval =
                                row.interval_type;
                        }
                    }

                    newConfigs[movieId] = movieConfigMap;
                    newIntervals[movieId] =
                        detectedInterval;
                } catch (error) {
                    console.error(
                        `Lỗi load config cho phim ${movieId}:`,
                        error
                    );

                    newConfigs[movieId] = {};
                    newIntervals[movieId] =
                        DEFAULT_INTERVAL_TYPE;
                }
            }

            setConfigs(newConfigs);
            setMovieIntervals(newIntervals);
        } finally {
            setLoading(false);
        }
    };

    // ========================================================
    // MOVIE SELECTION
    // ========================================================

    const toggleMovieSelection = (movieId) => {
        setSelectedMovies((prev) => {
            if (prev.includes(movieId)) {
                return prev.filter(
                    (id) => id !== movieId
                );
            }

            return [...prev, movieId];
        });

        setExpandedMovies((prev) => ({
            ...prev,
            [movieId]: true,
        }));
    };

    const toggleExpand = (movieId) => {
        setExpandedMovies((prev) => ({
            ...prev,
            [movieId]: !prev[movieId],
        }));
    };

    const getMovieTitle = (movieId) => {
        const movie = movies.find(
            (item) =>
                String(item.movie_id) ===
                String(movieId)
        );

        return (
            movie?.title ||
            `Phim #${movieId}`
        );
    };

    const getMovieById = (movieId) => {
        return movies.find(
            (movie) =>
                String(movie.movie_id) ===
                String(movieId)
        );
    };

    const getTotalSelected = (movieId) => {
        const movieConfigs = configs[movieId] || {};
        return Object.keys(movieConfigs).length;
    };

    const getMovieInterval = (movieId) => {
        return (
            movieIntervals[movieId] ||
            DEFAULT_INTERVAL_TYPE
        );
    };

    // ========================================================
    // SLOT ACTIONS
    // ========================================================

    // ✅ Sửa toggleSlot — chặn nếu slot đã qua
    const toggleSlot = (
        movieId,
        timeSlot,
        roomType,
        dayType,
        startMinutes,
        dateStr  // ✅ thêm date để check
    ) => {
        // ✅ Check quá khứ
        if (isSlotInPast(dateStr, startMinutes)) {
            showAlert(
                'Không thể chọn',
                `Suất ${minutesToTime(startMinutes)} ngày ${dateStr.split('-').reverse().join('/')} đã qua so với thời gian hiện tại.`,
                'warning'
            );
            return;
        }

        const key = buildSlotKey(
            timeSlot,
            roomType,
            dayType,
            startMinutes
        );

        setConfigs((prev) => {
            const movieConfigMap = {
                ...(prev[movieId] || {}),
            };

            if (movieConfigMap[key]) {
                delete movieConfigMap[key];
            } else {
                const intervalType =
                    getMovieInterval(movieId);

                movieConfigMap[key] = {
                    config_id: undefined,
                    time_slot: timeSlot,
                    room_type: roomType,
                    day_type: dayType,
                    startMinutes,
                    slot_time:
                        minutesToTimeFull(startMinutes),
                    interval_type: intervalType,
                    is_active: 1,
                };
            }

            return {
                ...prev,
                [movieId]: movieConfigMap,
            };
        });
    };

    const handleChangeInterval = (
        movieId,
        intervalType
    ) => {
        const currentConfigs =
            configs[movieId] || {};

        const currentCount =
            Object.keys(currentConfigs).length;

        if (currentCount > 0) {
            setConfigs((prev) => ({
                ...prev,
                [movieId]: {},
            }));

            showAlert(
                'Đã đổi khoảng cách',
                `Đã xóa tất cả ${currentCount} suất đã tick.\nVui lòng tick lại giờ với khoảng cách mới (${getIntervalMinutes(intervalType)} phút).`,
                'info'
            );
        }

        setMovieIntervals((prev) => ({
            ...prev,
            [movieId]: intervalType,
        }));
    };

    // ✅ Sửa handleAutoFill — bỏ qua slot quá khứ
    const handleAutoFill = (movieId) => {
        const intervalType =
            getMovieInterval(movieId);
        const intervalMinutes =
            getIntervalMinutes(intervalType);

        setConfigs((prev) => {
            const movieConfigMap = {
                ...(prev[movieId] || {}),
            };

            for (const timeSlot of TIME_SLOTS) {
                const actualStart = Math.max(
                    timeSlot.startMinutes,
                    cinemaOpen
                );

                const actualEnd = Math.min(
                    timeSlot.endMinutes,
                    cinemaClose
                );

                if (actualStart >= actualEnd) {
                    continue;
                }

                const times = generateSlotTimes({
                    startMinutes: actualStart,
                    endMinutes: actualEnd,
                    intervalMinutes,
                });

                for (const roomType of ROOM_TYPES) {
                    for (const date of datesInRange) {
                        // ✅ Bỏ qua ngày đã qua
                        if (date.isPast) continue;

                        for (const time of times) {
                            // ✅ Bỏ qua giờ đã qua trong hôm nay
                            if (isSlotInPast(date.date, time)) {
                                continue;
                            }

                            const key = buildSlotKey(
                                timeSlot.key,
                                roomType,
                                date.dayKey,
                                time
                            );

                            if (!movieConfigMap[key]) {
                                movieConfigMap[key] = {
                                    config_id: undefined,
                                    time_slot:
                                        timeSlot.key,
                                    room_type: roomType,
                                    day_type:
                                        date.dayKey,
                                    startMinutes: time,
                                    slot_time:
                                        minutesToTimeFull(
                                            time
                                        ),
                                    interval_type:
                                        intervalType,
                                    is_active: 1,
                                };
                            }
                        }
                    }
                }
            }

            return {
                ...prev,
                [movieId]: movieConfigMap,
            };
        });

        showAlert(
            'Thành công',
            'Đã chọn tất cả giờ có thể chiếu (bỏ qua giờ đã qua)!',
            'success'
        );
    };

    const handleClearAll = (movieId) => {
        setConfigs((prev) => ({
            ...prev,
            [movieId]: {},
        }));

        showAlert(
            'Đã xóa',
            'Đã bỏ chọn tất cả suất chiếu',
            'info'
        );
    };

    // ========================================================
    // SAVE
    // ========================================================

    const handleSaveAll = async () => {
        if (!selectedCinema) {
            showAlert(
                'Lỗi',
                'Vui lòng chọn rạp',
                'error'
            );
            return;
        }

        if (selectedMovies.length === 0) {
            showAlert(
                'Lỗi',
                'Vui lòng chọn ít nhất 1 phim',
                'error'
            );
            return;
        }

        const emptyMovies = [];

        for (const movieId of selectedMovies) {
            const movieConfigs =
                configs[movieId] || {};

            if (
                Object.keys(movieConfigs).length === 0
            ) {
                emptyMovies.push(
                    getMovieTitle(movieId)
                );
            }
        }

        if (emptyMovies.length > 0) {
            showAlert(
                'Chưa chọn suất chiếu',
                `Các phim sau chưa có suất nào được chọn:\n${emptyMovies.join('\n')}\n\nVui lòng tick ít nhất 1 suất cho mỗi phim.`,
                'warning'
            );
            return;
        }

        setSaving(true);

        let successCount = 0;
        let errorCount = 0;
        const errorMovies = [];

        try {
            for (const movieId of selectedMovies) {
                try {
                    const movieConfigMap =
                        configs[movieId] || {};

                    const configsArray =
                        Object.values(
                            movieConfigMap
                        ).map((cfg) => ({
                            config_id: cfg.config_id,
                            time_slot: String(
                                cfg.time_slot
                            ).toUpperCase(),
                            slot_time: cfg.slot_time,
                            room_type: String(
                                cfg.room_type
                            ).toUpperCase(),
                            interval_type: String(
                                cfg.interval_type ||
                                DEFAULT_INTERVAL_TYPE
                            ).toUpperCase(),
                            day_type: String(
                                cfg.day_type ||
                                'MONDAY'
                            ).toUpperCase(),
                            is_active: 1,
                        }));

                    await api.post(
                        `/api/showtime-config/${movieId}`,
                        {
                            cinema_id:
                                Number(selectedCinema),
                            configs: configsArray,
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
                        getMovieTitle(movieId)
                    );
                }
            }
        } finally {
            setSaving(false);
        }

        if (errorCount === 0) {
            showAlert(
                'Thành công',
                `Lưu thành công ${successCount} phim!`,
                'success'
            );
        } else {
            showAlert(
                'Thông báo',
                `Thành công ${successCount}, thất bại ${errorCount}\n\n${errorMovies.join('\n')}`,
                'warning'
            );
        }

        await loadAllConfigs();
    };

    // ========================================================
    // DERIVED DATA
    // ========================================================

    const filteredMovies = movies.filter((movie) => {
        const title = String(
            movie.title || ''
        ).toLowerCase();

        return title.includes(
            searchMovie.toLowerCase()
        );
    });

    const selectedCinemaName =
        selectedCinemaObject?.cinema_name ||
        'Chưa chọn rạp';

    // ========================================================
    // RENDER
    // ========================================================

    if (loading) {
        return (
            <div className="admin-loading">
                <Loader2
                    size={32}
                    className="spin-icon"
                />
                <span>Đang tải dữ liệu...</span>
            </div>
        );
    }

    return (
        <>
            <AdminPage
                title="Cấu hình lịch chiếu"
                subtitle="Thiết lập khung giờ chiếu cho từng phim và từng loại phòng"
                icon={<Clapperboard size={30} />}
                buttonText="Quay lại"
                onAdd={() =>
                    navigate('/admin/showtimes')
                }
                buttonIcon={<ArrowLeft size={18} />}
            >
                <div className="movie-showtime-config-page">
                    {/* CONTROL AREA */}
                    <section className="showtime-controls">
                        {/* RẠP */}
                        <div className="control-row cinema-row">
                            <div className="control-heading">
                                <span className="control-icon">
                                    <Building2 size={18} />
                                </span>
                                <div>
                                    <span className="control-title">
                                        Rạp chiếu
                                    </span>
                                    <span className="control-description">
                                        Chọn rạp cần cấu hình lịch
                                    </span>
                                </div>
                            </div>

                            <div className="cinema-control-main">
                                <select
                                    value={selectedCinema}
                                    onChange={(e) =>
                                        setSelectedCinema(
                                            e.target.value
                                        )
                                    }
                                    className="config-select-main"
                                >
                                    <option value="">
                                        -- Chọn rạp --
                                    </option>

                                    {cinemas.map(
                                        (cinema) => (
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

                                <div className="cinema-hours">
                                    <Clock3 size={15} />
                                    <span>
                                        {minutesToTime(
                                            cinemaOpen
                                        )}{' '}
                                        →{' '}
                                        {minutesToTime(
                                            cinemaClose
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* PHIM */}
                        {selectedCinema && (
                            <div className="control-row movie-row">
                                <div className="control-heading movie-heading">
                                    <span className="control-icon">
                                        <Film size={18} />
                                    </span>
                                    <div>
                                        <span className="control-title">
                                            Phim
                                        </span>
                                        <span className="control-description">
                                            Chọn một hoặc nhiều phim để cấu hình
                                        </span>
                                    </div>
                                    <span className="selection-count">
                                        <strong>
                                            {
                                                selectedMovies.length
                                            }
                                        </strong>{' '}
                                        phim
                                    </span>
                                </div>

                                <div className="movie-search-wrap">
                                    <Search
                                        size={18}
                                        className="movie-search-icon"
                                    />
                                    <input
                                        type="text"
                                        value={searchMovie}
                                        onChange={(e) =>
                                            setSearchMovie(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Tìm nhanh tên phim..."
                                        className="movie-search-input"
                                    />
                                </div>

                                <div className="movie-chip-list">
                                    {filteredMovies.map(
                                        (movie) => {
                                            const isChecked =
                                                selectedMovies.includes(
                                                    movie.movie_id
                                                );

                                            return (
                                                <label
                                                    key={
                                                        movie.movie_id
                                                    }
                                                    className={`movie-chip ${isChecked ? 'checked' : ''}`}
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

                                                    <span className="movie-chip-check">
                                                        {isChecked && (
                                                            <Check
                                                                size={13}
                                                                strokeWidth={3}
                                                            />
                                                        )}
                                                    </span>

                                                    <span className="movie-chip-title">
                                                        {
                                                            movie.title
                                                        }
                                                    </span>

                                                    {isChecked && (
                                                        <span className="chip-badge">
                                                            {
                                                                getTotalSelected(
                                                                    movie.movie_id
                                                                )
                                                            }
                                                        </span>
                                                    )}
                                                </label>
                                            );
                                        }
                                    )}

                                    {filteredMovies.length ===
                                        0 && (
                                        <span className="no-movies">
                                            Không tìm thấy phim phù hợp.
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* NGÀY */}
                        {selectedCinema &&
                            selectedMovies.length >
                            0 && (
                                <div className="control-row date-row">
                                    <div className="date-control-top">
                                        <div className="control-heading">
                                            <span className="control-icon">
                                                <Calendar size={18} />
                                            </span>
                                            <div>
                                                <span className="control-title">
                                                    Khoảng ngày
                                                </span>
                                                <span className="control-description">
                                                    Cấu hình lịch trong khoảng ngày đã chọn
                                                </span>
                                            </div>
                                        </div>

                                        <div className="date-range-picker">
                                            <input
                                                type="date"
                                                value={
                                                    dateRange.startDate
                                                }
                                                onChange={(e) =>
                                                    setDateRange(
                                                        (
                                                            prev
                                                        ) => ({
                                                            ...prev,
                                                            startDate:
                                                                e
                                                                    .target
                                                                    .value,
                                                        })
                                                    )
                                                }
                                                className="date-input"
                                            />

                                            <span className="date-arrow">
                                                →
                                            </span>

                                            <input
                                                type="date"
                                                value={
                                                    dateRange.endDate
                                                }
                                                onChange={(e) =>
                                                    setDateRange(
                                                        (
                                                            prev
                                                        ) => ({
                                                            ...prev,
                                                            endDate:
                                                                e
                                                                    .target
                                                                    .value,
                                                        })
                                                    )
                                                }
                                                className="date-input"
                                            />

                                            <span className="date-count">
                                                {
                                                    datesInRange.length
                                                }{' '}
                                                ngày
                                            </span>
                                        </div>
                                    </div>

                                    <div className="date-strip">
                                        {datesInRange.map(
                                            (date) => (
                                                <div
                                                    key={
                                                        date.date
                                                    }
                                                    className={`date-item ${date.isWeekend ? 'weekend' : ''} ${date.isPast ? 'past' : ''} ${date.isToday ? 'today' : ''}`}
                                                >
                                                    <span className="date-item-day">
                                                        {
                                                            date.shortDay
                                                        }
                                                    </span>
                                                    <span className="date-item-number">
                                                        {
                                                            date.display
                                                        }
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                    </section>

                    {/* EMPTY STATE */}
                    {selectedCinema &&
                        selectedMovies.length === 0 && (
                            <section className="showtime-empty-state">
                                <div className="empty-state-icon">
                                    <Film size={28} />
                                </div>
                                <div>
                                    <h3>
                                        Chưa chọn phim
                                    </h3>
                                    <p>
                                        Chọn ít nhất một phim ở khu vực phía trên để bắt đầu cấu hình lịch chiếu.
                                    </p>
                                </div>
                            </section>
                        )}

                    {/* CONFIG WORKSPACE */}
                    {selectedCinema &&
                        selectedMovies.length >
                        0 && (
                            <section className="showtime-workspace">
                                <div className="workspace-heading">
                                    <div>
                                        <span className="workspace-kicker">
                                            LỊCH CHIẾU
                                        </span>
                                        <h2>
                                            Cấu hình suất chiếu
                                        </h2>
                                        <p>
                                            {selectedCinemaName}
                                            {' · '}
                                            {
                                                datesInRange.length
                                            }{' '}
                                            ngày
                                        </p>
                                    </div>

                                    <div className="workspace-summary">
                                        <span>
                                            <strong>
                                                {
                                                    selectedMovies.length
                                                }
                                            </strong>{' '}
                                            phim
                                        </span>
                                        <span className="summary-divider" />
                                        <span>
                                            <strong>
                                                {
                                                    selectedMovies.reduce(
                                                        (
                                                            total,
                                                            movieId
                                                        ) =>
                                                            total +
                                                            getTotalSelected(
                                                                movieId
                                                            ),
                                                        0
                                                    )
                                                }
                                            </strong>{' '}
                                            suất đã chọn
                                        </span>
                                    </div>
                                </div>

                                <div className="movie-config-list">
                                    {selectedMovies.map(
                                        (
                                            movieId,
                                            movieIndex
                                        ) => {
                                            const movieConfigMap =
                                                configs[
                                                    movieId
                                                ] || {};

                                            const isExpanded =
                                                expandedMovies[
                                                    movieId
                                                ] !== false;

                                            const movie =
                                                getMovieById(
                                                    movieId
                                                );

                                            const movieTitle =
                                                getMovieTitle(
                                                    movieId
                                                );

                                            const duration =
                                                extractMovieDuration(
                                                    movie
                                                );

                                            const totalSelected =
                                                Object.keys(
                                                    movieConfigMap
                                                ).length;

                                            const intervalType =
                                                getMovieInterval(
                                                    movieId
                                                );

                                            const intervalMinutes =
                                                getIntervalMinutes(
                                                    intervalType
                                                );

                                            return (
                                                <article
                                                    key={
                                                        movieId
                                                    }
                                                    className={`movie-config-card ${isExpanded ? 'expanded' : 'collapsed'}`}
                                                >
                                                    {/* MOVIE HEADER */}
                                                    <button
                                                        type="button"
                                                        className="movie-config-header"
                                                        onClick={() =>
                                                            toggleExpand(
                                                                movieId
                                                            )
                                                        }
                                                    >
                                                        <div className="movie-config-index">
                                                            {String(
                                                                movieIndex +
                                                                1
                                                            ).padStart(
                                                                2,
                                                                '0'
                                                            )}
                                                        </div>

                                                        <div className="movie-config-main">
                                                            <div className="movie-config-title-line">
                                                                <Clapperboard
                                                                    size={18}
                                                                />
                                                                <h3>
                                                                    {
                                                                        movieTitle
                                                                    }
                                                                </h3>
                                                            </div>

                                                            <div className="movie-config-meta">
                                                                <span>
                                                                    <Timer
                                                                        size={14}
                                                                    />
                                                                    {
                                                                        duration
                                                                    }
                                                                    p
                                                                </span>
                                                                <span className="meta-dot" />
                                                                <span>
                                                                    {
                                                                        totalSelected
                                                                    }{' '}
                                                                    suất đã chọn
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="movie-config-status">
                                                            <span className="selected-badge">
                                                                {
                                                                    totalSelected
                                                                }
                                                            </span>
                                                            <span className="movie-config-chevron">
                                                                {isExpanded ? (
                                                                    <ChevronUp
                                                                        size={20}
                                                                    />
                                                                ) : (
                                                                    <ChevronDown
                                                                        size={20}
                                                                    />
                                                                )}
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="movie-config-body">
                                                            {/* INTERVAL */}
                                                            <div className="interval-panel">
                                                                <div className="interval-panel-heading">
                                                                    <div>
                                                                        <div className="interval-title">
                                                                            <Clock3
                                                                                size={17}
                                                                            />
                                                                            Khoảng cách suất
                                                                        </div>
                                                                        <p>
                                                                            Chọn khoảng cách trước khi tick giờ.
                                                                        </p>
                                                                    </div>

                                                                    <div className="interval-current">
                                                                        <span>
                                                                            Đang dùng
                                                                        </span>
                                                                        <strong>
                                                                            {
                                                                                intervalMinutes
                                                                            }
                                                                            p
                                                                        </strong>
                                                                    </div>
                                                                </div>

                                                                <div className="interval-options">
                                                                    {INTERVAL_TYPES.map(
                                                                        (
                                                                            preset
                                                                        ) => {
                                                                            const IconComponent =
                                                                                preset.icon;
                                                                            const isActive =
                                                                                intervalType ===
                                                                                preset.key;

                                                                            return (
                                                                                <button
                                                                                    key={
                                                                                        preset.key
                                                                                    }
                                                                                    type="button"
                                                                                    className={`interval-option ${isActive ? 'active' : ''}`}
                                                                                    onClick={() =>
                                                                                        handleChangeInterval(
                                                                                            movieId,
                                                                                            preset.key
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <span className="interval-option-icon">
                                                                                        <IconComponent
                                                                                            size={17}
                                                                                        />
                                                                                    </span>
                                                                                    <span className="interval-option-content">
                                                                                        <span className="interval-option-top">
                                                                                            <strong>
                                                                                                {
                                                                                                    preset.label
                                                                                                }
                                                                                            </strong>
                                                                                            <em>
                                                                                                {
                                                                                                    preset.minutes
                                                                                                }
                                                                                                p
                                                                                            </em>
                                                                                        </span>
                                                                                        <span className="interval-option-desc">
                                                                                            {
                                                                                                preset.description
                                                                                            }
                                                                                        </span>
                                                                                    </span>
                                                                                    {isActive && (
                                                                                        <span className="interval-option-check">
                                                                                            <Check
                                                                                                size={14}
                                                                                            />
                                                                                        </span>
                                                                                    )}
                                                                                </button>
                                                                            );
                                                                        }
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* ACTION BAR */}
                                                            <div className="workspace-action-bar">
                                                                <div className="action-info">
                                                                    <Info
                                                                        size={16}
                                                                    />
                                                                    <span>
                                                                        Giờ đã qua so với thời gian thực sẽ bị vô hiệu hóa.
                                                                    </span>
                                                                </div>

                                                                <div className="config-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="config-action secondary"
                                                                        onClick={() =>
                                                                            handleAutoFill(
                                                                                movieId
                                                                            )
                                                                        }
                                                                    >
                                                                        <Check
                                                                            size={16}
                                                                        />
                                                                        Chọn tất cả
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="config-action danger"
                                                                        onClick={() =>
                                                                            handleClearAll(
                                                                                movieId
                                                                            )
                                                                        }
                                                                    >
                                                                        <Trash2
                                                                            size={16}
                                                                        />
                                                                        Bỏ chọn tất cả
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* TABLE */}
                                                            <div className="schedule-table-shell">
                                                                <div className="schedule-table-scroll">
                                                                    <table className="schedule-table">
                                                                        <thead>
                                                                            <tr>
                                                                                <th className="room-column">
                                                                                    LOẠI PHÒNG
                                                                                </th>
                                                                                {datesInRange.map(
                                                                                    (
                                                                                        date
                                                                                    ) => (
                                                                                        <th
                                                                                            key={
                                                                                                date.date
                                                                                            }
                                                                                            className={`date-column ${date.isWeekend ? 'weekend' : ''} ${date.isPast ? 'past' : ''} ${date.isToday ? 'today' : ''}`}
                                                                                        >
                                                                                            <span>
                                                                                                {
                                                                                                    date.shortDay
                                                                                                }
                                                                                            </span>
                                                                                            <strong>
                                                                                                {
                                                                                                    date.display
                                                                                                }
                                                                                            </strong>
                                                                                        </th>
                                                                                    )
                                                                                )}
                                                                                <th className="total-column">
                                                                                    <BarChart3
                                                                                        size={17}
                                                                                    />
                                                                                </th>
                                                                            </tr>
                                                                        </thead>

                                                                        <tbody>
                                                                            {TIME_SLOTS.map(
                                                                                (
                                                                                    timeSlot
                                                                                ) => {
                                                                                    const actualStart =
                                                                                        Math.max(
                                                                                            timeSlot.startMinutes,
                                                                                            cinemaOpen
                                                                                        );
                                                                                    const actualEnd =
                                                                                        Math.min(
                                                                                            timeSlot.endMinutes,
                                                                                            cinemaClose
                                                                                        );

                                                                                    const isValidRange =
                                                                                        actualStart <
                                                                                        actualEnd;

                                                                                    const times =
                                                                                        isValidRange
                                                                                            ? generateSlotTimes(
                                                                                                  {
                                                                                                      startMinutes:
                                                                                                          actualStart,
                                                                                                      endMinutes:
                                                                                                          actualEnd,
                                                                                                      intervalMinutes,
                                                                                                  }
                                                                                              )
                                                                                            : [];

                                                                                    const TimeSlotIcon =
                                                                                        timeSlot.icon;

                                                                                    return (
                                                                                        <React.Fragment
                                                                                            key={
                                                                                                timeSlot.key
                                                                                            }
                                                                                        >
                                                                                            <tr className="period-row">
                                                                                                <td
                                                                                                    colSpan={
                                                                                                        datesInRange.length +
                                                                                                        2
                                                                                                    }
                                                                                                >
                                                                                                    <div className="period-label">
                                                                                                        <span className="period-icon">
                                                                                                            <TimeSlotIcon
                                                                                                                size={16}
                                                                                                            />
                                                                                                        </span>
                                                                                                        <strong>
                                                                                                            {
                                                                                                                timeSlot.label
                                                                                                            }
                                                                                                        </strong>
                                                                                                        <span>
                                                                                                            {isValidRange
                                                                                                                ? `${minutesToTime(actualStart)} → ${minutesToTime(actualEnd)}`
                                                                                                                : 'Ngoài giờ hoạt động'}
                                                                                                        </span>
                                                                                                        <small>
                                                                                                            {isValidRange
                                                                                                                ? `${times.length} mốc giờ / khoảng cách`
                                                                                                                : 'Không có giờ khả dụng'}
                                                                                                        </small>
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>

                                                                                            {ROOM_TYPES.map(
                                                                                                (
                                                                                                    roomType
                                                                                                ) => {
                                                                                                    let rowTotal = 0;

                                                                                                    for (const date of datesInRange) {
                                                                                                        for (const time of times) {
                                                                                                            const key = buildSlotKey(
                                                                                                                timeSlot.key,
                                                                                                                roomType,
                                                                                                                date.dayKey,
                                                                                                                time
                                                                                                            );

                                                                                                            if (
                                                                                                                movieConfigMap[
                                                                                                                    key
                                                                                                                ]
                                                                                                            ) {
                                                                                                                rowTotal++;
                                                                                                            }
                                                                                                        }
                                                                                                    }

                                                                                                    return (
                                                                                                        <tr
                                                                                                            key={`${timeSlot.key}-${roomType}`}
                                                                                                            className="room-row"
                                                                                                        >
                                                                                                            <td className="room-cell">
                                                                                                                <span className="room-name">
                                                                                                                    {
                                                                                                                        roomType
                                                                                                                    }
                                                                                                                </span>
                                                                                                                <span className="room-count">
                                                                                                                    {
                                                                                                                        times.length
                                                                                                                    }{' '}
                                                                                                                    giờ
                                                                                                                </span>
                                                                                                            </td>

                                                                                                            {datesInRange.map(
                                                                                                                (
                                                                                                                    date
                                                                                                                ) => (
                                                                                                                    <td
                                                                                                                        key={
                                                                                                                            date.date
                                                                                                                        }
                                                                                                                        className={`slot-cell ${date.isWeekend ? 'weekend-cell' : ''} ${date.isPast ? 'past-cell' : ''}`}
                                                                                                                    >
                                                                                                                        {!isValidRange ? (
                                                                                                                            <span className="slot-disabled">
                                                                                                                                —
                                                                                                                            </span>
                                                                                                                        ) : (
                                                                                                                            <div className="slot-grid">
                                                                                                                                {times.map(
                                                                                                                                    (
                                                                                                                                        time
                                                                                                                                    ) => {
                                                                                                                                        const key = buildSlotKey(
                                                                                                                                            timeSlot.key,
                                                                                                                                            roomType,
                                                                                                                                            date.dayKey,
                                                                                                                                            time
                                                                                                                                        );

                                                                                                                                        const isSelected =
                                                                                                                                            Boolean(
                                                                                                                                                movieConfigMap[
                                                                                                                                                    key
                                                                                                                                                ]
                                                                                                                                            );

                                                                                                                                        // ✅ Check slot quá khứ
                                                                                                                                        const isPast =
                                                                                                                                            isSlotInPast(
                                                                                                                                                date.date,
                                                                                                                                                time
                                                                                                                                            );

                                                                                                                                        return (
                                                                                                                                            <button
                                                                                                                                                key={
                                                                                                                                                    time
                                                                                                                                                }
                                                                                                                                                type="button"
                                                                                                                                                className={`slot-button ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                                                                                                                                                disabled={isPast}
                                                                                                                                                onClick={() => {
                                                                                                                                                    if (isPast) return;
                                                                                                                                                    toggleSlot(
                                                                                                                                                        movieId,
                                                                                                                                                        timeSlot.key,
                                                                                                                                                        roomType,
                                                                                                                                                        date.dayKey,
                                                                                                                                                        time,
                                                                                                                                                        date.date
                                                                                                                                                    );
                                                                                                                                                }}
                                                                                                                                                title={
                                                                                                                                                    isPast
                                                                                                                                                        ? `${minutesToTime(time)} · ${roomType} · Đã qua`
                                                                                                                                                        : `${minutesToTime(time)} · ${roomType} · ${date.fullDisplay}`
                                                                                                                                                }
                                                                                                                                            >
                                                                                                                                                {isPast ? (
                                                                                                                                                    <Ban
                                                                                                                                                        size={12}
                                                                                                                                                    />
                                                                                                                                                ) : (
                                                                                                                                                    isSelected && (
                                                                                                                                                        <Check
                                                                                                                                                            size={12}
                                                                                                                                                            strokeWidth={3}
                                                                                                                                                        />
                                                                                                                                                    )
                                                                                                                                                )}
                                                                                                                                                <span>
                                                                                                                                                    {minutesToTime(
                                                                                                                                                        time
                                                                                                                                                    )}
                                                                                                                                                </span>
                                                                                                                                            </button>
                                                                                                                                        );
                                                                                                                                    }
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                    </td>
                                                                                                                )
                                                                                                            )}

                                                                                                            <td className="row-total">
                                                                                                                {
                                                                                                                    rowTotal
                                                                                                                }
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    );
                                                                                                }
                                                                                            )}
                                                                                        </React.Fragment>
                                                                                    );
                                                                                }
                                                                            )}

                                                                            <tr className="grand-total-row">
                                                                                <td className="room-cell total-room-cell">
                                                                                    <span className="room-name">
                                                                                        TỔNG
                                                                                    </span>
                                                                                </td>

                                                                                {datesInRange.map(
                                                                                    (
                                                                                        date
                                                                                    ) => {
                                                                                        let dayTotal = 0;

                                                                                        for (const timeSlot of TIME_SLOTS) {
                                                                                            const actualStart = Math.max(
                                                                                                timeSlot.startMinutes,
                                                                                                cinemaOpen
                                                                                            );

                                                                                            const actualEnd = Math.min(
                                                                                                timeSlot.endMinutes,
                                                                                                cinemaClose
                                                                                            );

                                                                                            if (
                                                                                                actualStart >=
                                                                                                actualEnd
                                                                                            ) {
                                                                                                continue;
                                                                                            }

                                                                                            const times = generateSlotTimes(
                                                                                                {
                                                                                                    startMinutes:
                                                                                                        actualStart,
                                                                                                    endMinutes:
                                                                                                        actualEnd,
                                                                                                    intervalMinutes,
                                                                                                }
                                                                                            );

                                                                                            for (const roomType of ROOM_TYPES) {
                                                                                                for (const time of times) {
                                                                                                    const key = buildSlotKey(
                                                                                                        timeSlot.key,
                                                                                                        roomType,
                                                                                                        date.dayKey,
                                                                                                        time
                                                                                                    );

                                                                                                    if (
                                                                                                        movieConfigMap[
                                                                                                            key
                                                                                                        ]
                                                                                                    ) {
                                                                                                        dayTotal++;
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                        }

                                                                                        return (
                                                                                            <td
                                                                                                key={
                                                                                                    date.date
                                                                                                }
                                                                                                className="grand-total-cell"
                                                                                            >
                                                                                                {
                                                                                                    dayTotal
                                                                                                }
                                                                                            </td>
                                                                                        );
                                                                                    }
                                                                                )}

                                                                                <td className="grand-total-cell final-total">
                                                                                    {
                                                                                        totalSelected
                                                                                    }
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>

                                                                <div className="table-footer-note">
                                                                    <span>
                                                                        <Check
                                                                            size={14}
                                                                        />
                                                                        Ô sáng bạc = suất đã chọn
                                                                    </span>
                                                                    <span>
                                                                        <Ban
                                                                            size={14}
                                                                        />
                                                                        Suất mờ = đã qua so với thời gian thực
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        }
                                    )}
                                </div>

                                {/* SAVE */}
                                <div className="save-workspace">
                                    <div className="save-workspace-info">
                                        <span className="save-count">
                                            {
                                                selectedMovies.length
                                            }
                                        </span>
                                        <div>
                                            <strong>
                                                Sẵn sàng lưu cấu hình
                                            </strong>
                                            <span>
                                                Kiểm tra lại các suất đã chọn trước khi lưu.
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="save-button"
                                        onClick={
                                            handleSaveAll
                                        }
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2
                                                    size={18}
                                                    className="spin-icon"
                                                />
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Lưu tất cả
                                                <span>
                                                    (
                                                    {
                                                        selectedMovies.length
                                                    }{' '}
                                                    phim)
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </section>
                        )}
                </div>
            </AdminPage>

            {/* ALERT */}
            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
                onConfirm={closeAlert}
                confirmText="Đóng"
            >
                <div className="admin-alert-content">
                    <p className="admin-alert-message">
                        {alertModal.message}
                    </p>
                </div>
            </AdminModal>
        </>
    );
};

export default MovieShowtimeConfigPage;