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
    Loader2,
    Film,
    ArrowLeft,
    Settings,
    ChevronDown,
    ChevronUp,
    Search,
    Clock,
    Calendar,
    CheckSquare,
    Square
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminModal from '../../../components/AdminModal';

import '../../../styles/MovieShowtimeConfigPage.css';

// ==========================================================
// CONSTANTS
// ==========================================================

const TIME_SLOTS = [
    { key: 'MORNING', label: '🌅 SÁNG', startMinutes: 8 * 60, endMinutes: 12 * 60 },
    { key: 'AFTERNOON', label: '☀️ TRƯA', startMinutes: 12 * 60, endMinutes: 17 * 60 },
    { key: 'EVENING', label: '🌆 CHIỀU', startMinutes: 17 * 60, endMinutes: 20 * 60 },
    { key: 'NIGHT', label: '🌙 TỐI', startMinutes: 20 * 60, endMinutes: 24 * 60 }
];

const ROOM_TYPES = ['2D', '3D', 'VIP', 'IMAX'];

const INTERVAL_TYPES = [
    { key: 'HOT', label: '🔥 HOT', minutes: 45, description: 'Phim đông khách' },
    { key: 'NORMAL', label: '📊 NORMAL', minutes: 75, description: 'Phim bình thường' },
    { key: 'COOL', label: '❄️ COOL', minutes: 120, description: 'Phim ít khách' }
];

const INTERVAL_MINUTES_MAP = {
    'HOT': 45,
    'NORMAL': 75,
    'COOL': 120
};

const getIntervalMinutes = (type) => {
    return INTERVAL_MINUTES_MAP[type] || 75;
};

const DEFAULT_INTERVAL_TYPE = 'NORMAL';
const DEFAULT_MOVIE_DURATION = 120;
const DEFAULT_CINEMA_OPEN = 8 * 60;
const DEFAULT_CINEMA_CLOSE = 24 * 60;

// ==========================================================
// UTILS
// ==========================================================

const timeToMinutes = (value, fallback = null) => {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number') {
        if (Number.isFinite(value) && value >= 0 && value <= 1440) return Math.round(value);
        return fallback;
    }
    const stringValue = String(value).trim();
    if (!stringValue) return fallback;
    const match = stringValue.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
        const hour = Number(match[1]);
        const minute = Number(match[2]);
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return hour * 60 + minute;
        }
    }
    const numeric = Number(stringValue);
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1440) {
        return Math.round(numeric);
    }
    return fallback;
};

const minutesToTime = (minutes) => {
    const safeMinutes = Math.max(0, Math.min(1440, Math.round(Number(minutes) || 0)));
    if (safeMinutes === 1440) return '24:00';
    const hour = Math.floor(safeMinutes / 60);
    const minute = safeMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

// Trả về "HH:MM:SS" cho API
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

const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    const current = new Date(start);
    while (current <= end) {
        const year = current.getUTCFullYear();
        const month = String(current.getUTCMonth() + 1).padStart(2, '0');
        const day = String(current.getUTCDate()).padStart(2, '0');
        dates.push({
            date: `${year}-${month}-${day}`,
            display: `${day}/${month}`,
            fullDisplay: `${day}/${month}/${year}`,
            dayOfWeek: ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][current.getUTCDay()],
            dayKey: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][current.getUTCDay()],
            shortDay: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][current.getUTCDay()],
            isWeekend: current.getUTCDay() === 0 || current.getUTCDay() === 6
        });
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
};

// Sinh danh sách giờ cho 1 khung giờ với interval
const generateSlotTimes = ({ startMinutes, endMinutes, intervalMinutes }) => {
    if (startMinutes >= endMinutes || intervalMinutes <= 0) return [];
    const times = [];
    for (let t = startMinutes; t < endMinutes; t += intervalMinutes) {
        times.push(t);
    }
    return times;
};

const extractMovieDuration = (movie) => {
    if (!movie) return DEFAULT_MOVIE_DURATION;
    const candidates = [movie.duration, movie.duration_minutes, movie.movie_duration, movie.runtime, movie.running_time, movie.length_minutes, movie.duration_minute, movie.thoi_luong];
    for (const value of candidates) {
        const number = Number(value);
        if (Number.isFinite(number) && number > 0) return Math.round(number);
    }
    return DEFAULT_MOVIE_DURATION;
};

const extractCinemaOpen = (cinema) => {
    if (!cinema) return DEFAULT_CINEMA_OPEN;
    const candidates = [cinema.weekday_open, cinema.weekend_open, cinema.open_time, cinema.opening_time, cinema.opening_hour, cinema.openingTime, cinema.openTime, cinema.open_at, cinema.start_time, cinema.startTime, cinema.gio_mo_cua];
    for (const value of candidates) {
        const minutes = timeToMinutes(value, null);
        if (minutes !== null) return minutes;
    }
    return DEFAULT_CINEMA_OPEN;
};

const extractCinemaClose = (cinema) => {
    if (!cinema) return DEFAULT_CINEMA_CLOSE;
    const candidates = [cinema.weekday_close, cinema.weekend_close, cinema.close_time, cinema.closing_time, cinema.closing_hour, cinema.closingTime, cinema.closeTime, cinema.close_at, cinema.end_time, cinema.endTime, cinema.gio_dong_cua];
    for (const value of candidates) {
        const minutes = timeToMinutes(value, null);
        if (minutes !== null) return minutes;
    }
    return DEFAULT_CINEMA_CLOSE;
};

const getMovieByIdFromList = (movies, movieId) => {
    return movies.find(movie => String(movie.movie_id) === String(movieId));
};

// Key để định danh 1 giờ cụ thể
const buildSlotKey = (timeSlot, roomType, dayType, startMinutes) => {
    return `${timeSlot}|${roomType}|${dayType}|${startMinutes}`;
};

// ==========================================================
// COMPONENT
// ==========================================================

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

    // Config lưu dạng: { [movieId]: { [slotKey]: { config_id, ... } } }
    const [configs, setConfigs] = useState({});

    // Interval riêng cho từng phim: { [movieId]: 'HOT' | 'NORMAL' | 'COOL' }
    const [movieIntervals, setMovieIntervals] = useState({});

    const [dateRange, setDateRange] = useState({
        startDate: getTodayDate(),
        endDate: getNextWeekDate()
    });

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default'
    });

    const selectedCinemaObject = useMemo(() => {
        return cinemas.find(cinema => String(cinema.cinema_id) === String(selectedCinema));
    }, [cinemas, selectedCinema]);

    const cinemaOpen = useMemo(() => extractCinemaOpen(selectedCinemaObject), [selectedCinemaObject]);
    const cinemaClose = useMemo(() => extractCinemaClose(selectedCinemaObject), [selectedCinemaObject]);

    const datesInRange = useMemo(() => {
        if (!dateRange.startDate || !dateRange.endDate) return [];
        return getDatesInRange(dateRange.startDate, dateRange.endDate);
    }, [dateRange.startDate, dateRange.endDate]);

    const showAlert = (title, message, type = 'default') => {
        setAlertModal({ open: true, title, message, type });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, open: false }));
    };

    useEffect(() => {
        fetchMovies();
        fetchCinemas();
    }, []);

    useEffect(() => {
        if (selectedCinema && selectedMovies.length > 0) {
            loadAllConfigs();
        }
    }, [selectedCinema, selectedMovies]);

    const fetchMovies = async () => {
        try {
            const res = await api.get('/api/movies');
            const movieData = Array.isArray(res.data?.data) ? res.data.data : [];
            setMovies(movieData);
        } catch (error) {
            console.error('Lỗi load phim:', error);
            showAlert('Lỗi', 'Không thể tải danh sách phim', 'error');
        }
    };

    const fetchCinemas = async () => {
        try {
            const res = await api.get('/api/cinemas');
            const cinemaData = Array.isArray(res.data?.data) ? res.data.data : [];
            setCinemas(cinemaData);
            if (cinemaData.length > 0) {
                setSelectedCinema(cinemaData[0].cinema_id);
            }
        } catch (error) {
            console.error('Lỗi load rạp:', error);
            showAlert('Lỗi', 'Không thể tải danh sách rạp', 'error');
        }
    };

    // Load config từ API - chuyển mảng row thành object theo slotKey
    const loadAllConfigs = async () => {
        if (!selectedCinema || selectedMovies.length === 0) return;
        setLoading(true);
        const newConfigs = {};
        const newIntervals = {};

        try {
            for (const movieId of selectedMovies) {
                try {
                    const res = await api.get(`/api/showtime-config/${movieId}?cinema_id=${selectedCinema}`);
                    const rawData = res.data?.data;
                    const rows = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.data) ? rawData.data : [];

                    const movieConfigMap = {};
                    let detectedInterval = DEFAULT_INTERVAL_TYPE;

                    for (const row of rows) {
                        if (Number(row.is_active) !== 1) continue;

                        const startMinutes = timeToMinutes(row.slot_time, null);
                        if (startMinutes === null) continue;

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
                            interval_type: row.interval_type || DEFAULT_INTERVAL_TYPE,
                            is_active: 1
                        };

                        if (row.interval_type) {
                            detectedInterval = row.interval_type;
                        }
                    }

                    newConfigs[movieId] = movieConfigMap;
                    newIntervals[movieId] = detectedInterval;
                } catch (error) {
                    console.error(`Lỗi load config cho phim ${movieId}:`, error);
                    newConfigs[movieId] = {};
                    newIntervals[movieId] = DEFAULT_INTERVAL_TYPE;
                }
            }
            setConfigs(newConfigs);
            setMovieIntervals(newIntervals);
        } finally {
            setLoading(false);
        }
    };

    const toggleMovieSelection = (movieId) => {
        setSelectedMovies(prev => {
            if (prev.includes(movieId)) return prev.filter(id => id !== movieId);
            return [...prev, movieId];
        });
        setExpandedMovies(prev => ({ ...prev, [movieId]: true }));
    };

    const toggleExpand = (movieId) => {
        setExpandedMovies(prev => ({ ...prev, [movieId]: !prev[movieId] }));
    };

    const getMovieInterval = (movieId) => {
        return movieIntervals[movieId] || DEFAULT_INTERVAL_TYPE;
    };

    const setMovieInterval = (movieId, intervalType) => {
        setMovieIntervals(prev => ({ ...prev, [movieId]: intervalType }));
    };

    // Toggle 1 slot (giờ) cụ thể
    const toggleSlot = (movieId, timeSlot, roomType, dayType, startMinutes) => {
        const key = buildSlotKey(timeSlot, roomType, dayType, startMinutes);
        setConfigs(prev => {
            const movieConfigMap = { ...(prev[movieId] || {}) };

            if (movieConfigMap[key]) {
                // Đã chọn → bỏ chọn (nhưng giữ config_id để backend biết cần xóa)
                delete movieConfigMap[key];
            } else {
                // Chưa chọn → thêm vào
                const intervalType = getMovieInterval(movieId);
                movieConfigMap[key] = {
                    config_id: undefined,
                    time_slot: timeSlot,
                    room_type: roomType,
                    day_type: dayType,
                    startMinutes,
                    slot_time: minutesToTimeFull(startMinutes),
                    interval_type: intervalType,
                    is_active: 1
                };
            }

            return { ...prev, [movieId]: movieConfigMap };
        });
    };

    // Toggle toàn bộ 1 khung giờ (SÁNG/TRƯA/CHIỀU/TỐI) cho 1 phòng + 1 ngày
    const toggleTimeSlotAll = (movieId, timeSlotKey, roomType, dayType) => {
        const timeSlot = TIME_SLOTS.find(s => s.key === timeSlotKey);
        if (!timeSlot) return;

        const actualStart = Math.max(timeSlot.startMinutes, cinemaOpen);
        const actualEnd = Math.min(timeSlot.endMinutes, cinemaClose);
        if (actualStart >= actualEnd) return;

        const intervalType = getMovieInterval(movieId);
        const intervalMinutes = getIntervalMinutes(intervalType);
        const allTimes = generateSlotTimes({
            startMinutes: actualStart,
            endMinutes: actualEnd,
            intervalMinutes
        });

        setConfigs(prev => {
            const movieConfigMap = { ...(prev[movieId] || {}) };
            const anySelected = allTimes.some(t => {
                const key = buildSlotKey(timeSlotKey, roomType, dayType, t);
                return !!movieConfigMap[key];
            });

            if (anySelected) {
                // Bỏ chọn tất cả
                for (const t of allTimes) {
                    const key = buildSlotKey(timeSlotKey, roomType, dayType, t);
                    delete movieConfigMap[key];
                }
            } else {
                // Chọn tất cả
                for (const t of allTimes) {
                    const key = buildSlotKey(timeSlotKey, roomType, dayType, t);
                    if (!movieConfigMap[key]) {
                        movieConfigMap[key] = {
                            config_id: undefined,
                            time_slot: timeSlotKey,
                            room_type: roomType,
                            day_type: dayType,
                            startMinutes: t,
                            slot_time: minutesToTimeFull(t),
                            interval_type: intervalType,
                            is_active: 1
                        };
                    }
                }
            }

            return { ...prev, [movieId]: movieConfigMap };
        });
    };

    // Toggle toàn bộ 1 hàng (room_type) cho 1 ngày
    const toggleRowAll = (movieId, roomType, dayType) => {
        setConfigs(prev => {
            const movieConfigMap = { ...(prev[movieId] || {}) };
            const intervalType = getMovieInterval(movieId);
            const intervalMinutes = getIntervalMinutes(intervalType);

            // Kiểm tra có slot nào đã chọn chưa
            let anySelected = false;
            for (const timeSlot of TIME_SLOTS) {
                const actualStart = Math.max(timeSlot.startMinutes, cinemaOpen);
                const actualEnd = Math.min(timeSlot.endMinutes, cinemaClose);
                if (actualStart >= actualEnd) continue;
                const times = generateSlotTimes({ startMinutes: actualStart, endMinutes: actualEnd, intervalMinutes });
                if (times.some(t => {
                    const key = buildSlotKey(timeSlot.key, roomType, dayType, t);
                    return !!movieConfigMap[key];
                })) {
                    anySelected = true;
                    break;
                }
            }

            if (anySelected) {
                // Bỏ chọn tất cả
                for (const timeSlot of TIME_SLOTS) {
                    const actualStart = Math.max(timeSlot.startMinutes, cinemaOpen);
                    const actualEnd = Math.min(timeSlot.endMinutes, cinemaClose);
                    if (actualStart >= actualEnd) continue;
                    const times = generateSlotTimes({ startMinutes: actualStart, endMinutes: actualEnd, intervalMinutes });
                    for (const t of times) {
                        const key = buildSlotKey(timeSlot.key, roomType, dayType, t);
                        delete movieConfigMap[key];
                    }
                }
            } else {
                // Chọn tất cả
                for (const timeSlot of TIME_SLOTS) {
                    const actualStart = Math.max(timeSlot.startMinutes, cinemaOpen);
                    const actualEnd = Math.min(timeSlot.endMinutes, cinemaClose);
                    if (actualStart >= actualEnd) continue;
                    const times = generateSlotTimes({ startMinutes: actualStart, endMinutes: actualEnd, intervalMinutes });
                    for (const t of times) {
                        const key = buildSlotKey(timeSlot.key, roomType, dayType, t);
                        if (!movieConfigMap[key]) {
                            movieConfigMap[key] = {
                                config_id: undefined,
                                time_slot: timeSlot.key,
                                room_type: roomType,
                                day_type: dayType,
                                startMinutes: t,
                                slot_time: minutesToTimeFull(t),
                                interval_type: intervalType,
                                is_active: 1
                            };
                        }
                    }
                }
            }

            return { ...prev, [movieId]: movieConfigMap };
        });
    };

    // Đổi interval cho 1 phim → reset hết tick của phim đó (vì giờ thay đổi)
    const handleChangeInterval = (movieId, intervalType) => {
        const currentConfigs = configs[movieId] || {};
        const hasConfigs = Object.keys(currentConfigs).length > 0;

        if (hasConfigs) {
            // Reset hết tick vì giờ thay đổi
            setConfigs(prev => ({ ...prev, [movieId]: {} }));
            showAlert(
                '🔄 Đã đổi khoảng cách',
                `Đã xóa tất cả ${Object.keys(currentConfigs).length} suất đã tick.\nVui lòng tick lại giờ với khoảng cách mới (${getIntervalMinutes(intervalType)} phút).`,
                'info'
            );
        }

        setMovieIntervals(prev => ({ ...prev, [movieId]: intervalType }));
    };

    // Auto - tick tất cả giờ có thể chiếu
    const handleAutoFill = (movieId) => {
        const intervalType = getMovieInterval(movieId);
        const intervalMinutes = getIntervalMinutes(intervalType);

        setConfigs(prev => {
            const movieConfigMap = { ...(prev[movieId] || {}) };

            for (const timeSlot of TIME_SLOTS) {
                const actualStart = Math.max(timeSlot.startMinutes, cinemaOpen);
                const actualEnd = Math.min(timeSlot.endMinutes, cinemaClose);
                if (actualStart >= actualEnd) continue;

                const times = generateSlotTimes({
                    startMinutes: actualStart,
                    endMinutes: actualEnd,
                    intervalMinutes
                });

                for (const roomType of ROOM_TYPES) {
                    for (const d of datesInRange) {
                        for (const t of times) {
                            const key = buildSlotKey(timeSlot.key, roomType, d.dayKey, t);
                            if (!movieConfigMap[key]) {
                                movieConfigMap[key] = {
                                    config_id: undefined,
                                    time_slot: timeSlot.key,
                                    room_type: roomType,
                                    day_type: d.dayKey,
                                    startMinutes: t,
                                    slot_time: minutesToTimeFull(t),
                                    interval_type: intervalType,
                                    is_active: 1
                                };
                            }
                        }
                    }
                }
            }

            return { ...prev, [movieId]: movieConfigMap };
        });

        showAlert('✅ Thành công', `🤖 Đã chọn tất cả giờ có thể chiếu!`, 'success');
    };

    // Bỏ chọn tất cả
    const handleClearAll = (movieId) => {
        setConfigs(prev => ({ ...prev, [movieId]: {} }));
        showAlert('Đã xóa', 'Đã bỏ chọn tất cả suất chiếu', 'info');
    };

    // Save
    const handleSaveAll = async () => {
        if (!selectedCinema) {
            showAlert('Lỗi', 'Vui lòng chọn rạp', 'error');
            return;
        }
        if (selectedMovies.length === 0) {
            showAlert('Lỗi', 'Vui lòng chọn ít nhất 1 phim', 'error');
            return;
        }

        // Kiểm tra phim nào chưa có config
        const emptyMovies = [];
        for (const movieId of selectedMovies) {
            const movieConfigs = configs[movieId] || {};
            if (Object.keys(movieConfigs).length === 0) {
                emptyMovies.push(getMovieTitle(movieId));
            }
        }

        if (emptyMovies.length > 0) {
            showAlert(
                '⚠️ Chưa chọn suất chiếu',
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
                    const movieConfigMap = configs[movieId] || {};
                    const configsArray = Object.values(movieConfigMap).map(cfg => ({
                        config_id: cfg.config_id,
                        time_slot: String(cfg.time_slot).toUpperCase(),
                        slot_time: cfg.slot_time,
                        room_type: String(cfg.room_type).toUpperCase(),
                        interval_type: String(cfg.interval_type || DEFAULT_INTERVAL_TYPE).toUpperCase(),
                        day_type: String(cfg.day_type || 'MONDAY').toUpperCase(),
                        is_active: 1
                    }));

                    await api.post(`/api/showtime-config/${movieId}`, {
                        cinema_id: Number(selectedCinema),
                        configs: configsArray
                    });
                    successCount++;
                } catch (error) {
                    console.error(`Lỗi lưu config cho phim ${movieId}:`, error);
                    errorCount++;
                    errorMovies.push(getMovieTitle(movieId));
                }
            }
        } finally {
            setSaving(false);
        }

        if (errorCount === 0) {
            showAlert('Thành công', `✅ Lưu thành công ${successCount} phim!`, 'success');
        } else {
            showAlert('Thông báo', `⚠️ Thành công ${successCount}, thất bại ${errorCount}\n\n${errorMovies.join('\n')}`, 'warning');
        }
        await loadAllConfigs();
    };

    const filteredMovies = movies.filter(movie => {
        const title = String(movie.title || '').toLowerCase();
        return title.includes(searchMovie.toLowerCase());
    });

    const getMovieTitle = (movieId) => {
        const movie = movies.find(movie => String(movie.movie_id) === String(movieId));
        return movie?.title || `Phim #${movieId}`;
    };

    const getTotalSelected = (movieId) => {
        const movieConfigs = configs[movieId] || {};
        return Object.keys(movieConfigs).length;
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <Loader2 size={32} className="spin-icon" />
                <span>Đang tải dữ liệu...</span>
            </div>
        );
    }

    return (
        <>
            <AdminPage
                title="Cấu hình lịch chiếu"
                subtitle="Tick chọn giờ chiếu cụ thể cho từng phim"
                icon={<Settings size={30} />}
                buttonText="Quay lại"
                onAdd={() => navigate('/admin/showtime-config')}
                buttonIcon={<ArrowLeft size={18} />}
            >
                <div className="movie-showtime-config-page">

                    {/* TOOLBAR - CHỌN RẠP */}
                    <div className="config-toolbar">
                        <div className="filter-group">
                            <label className="config-label">🏠 Rạp</label>
                            <select
                                value={selectedCinema}
                                onChange={e => setSelectedCinema(e.target.value)}
                                className="config-select-main"
                            >
                                <option value="">-- Chọn rạp --</option>
                                {cinemas.map(cinema => (
                                    <option key={cinema.cinema_id} value={cinema.cinema_id}>
                                        {cinema.cinema_name}
                                        {cinema.city ? ` - ${cinema.city}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="cinema-info">
                            <span className="info-item">
                                <Clock size={14} />
                                {minutesToTime(cinemaOpen)} → {minutesToTime(cinemaClose)}
                            </span>
                        </div>
                    </div>

                    {/* CHỌN PHIM */}
                    {selectedCinema && (
                        <div className="movie-select-section">
                            <div className="movie-select-header">
                                <label className="config-label">🎬 Chọn phim</label>
                                <span className="movie-select-hint">(Chọn nhiều phim)</span>
                            </div>

                            <div className="movie-search-bar">
                                <Search size={16} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Tìm phim..."
                                    value={searchMovie}
                                    onChange={e => setSearchMovie(e.target.value)}
                                    className="search-input"
                                />
                                <span className="selected-count">
                                    Đã chọn: <strong>{selectedMovies.length}</strong> phim
                                </span>
                            </div>

                            <div className="movie-chip-list">
                                {filteredMovies.map(movie => {
                                    const isChecked = selectedMovies.includes(movie.movie_id);
                                    return (
                                        <label
                                            key={movie.movie_id}
                                            className={`movie-chip ${isChecked ? 'checked' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleMovieSelection(movie.movie_id)}
                                            />
                                            {movie.title}
                                            {isChecked && (
                                                <span className="chip-badge">
                                                    {getTotalSelected(movie.movie_id)}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                                {filteredMovies.length === 0 && (
                                    <span className="no-movies">Không tìm thấy phim</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* KHOẢNG NGÀY */}
                    {selectedCinema && selectedMovies.length > 0 && (
                        <>
                            <div className="date-range-section">
                                <div className="date-range-group">
                                    <Calendar size={16} className="date-icon" />
                                    <label className="config-label">Khoảng ngày</label>
                                    <input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="date-input"
                                    />
                                    <span className="date-arrow">→</span>
                                    <input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="date-input"
                                    />
                                    <span className="date-info">
                                        ({datesInRange.length} ngày)
                                    </span>
                                </div>
                            </div>

                            <div className="date-navigation">
                                <div className="date-list">
                                    {datesInRange.map((d, i) => (
                                        <span key={i} className={`date-tag ${d.isWeekend ? 'weekend' : ''}`}>
                                            {d.shortDay} {d.display}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* CẤU HÌNH */}
                    {selectedCinema && selectedMovies.length > 0 && (
                        <div className="config-container">
                            {selectedMovies.map((movieId, idx) => {
                                const movieConfigMap = configs[movieId] || {};
                                const isExpanded = expandedMovies[movieId] !== false;
                                const movieTitle = getMovieTitle(movieId);
                                const totalSelected = Object.keys(movieConfigMap).length;
                                const movie = getMovieByIdFromList(movies, movieId);
                                const duration = extractMovieDuration(movie);
                                const intervalType = getMovieInterval(movieId);
                                const intervalMinutes = getIntervalMinutes(intervalType);

                                return (
                                    <div key={movieId} className="movie-card">
                                        {/* Header */}
                                        <div
                                            className={`movie-card-header ${isExpanded ? 'expanded' : ''}`}
                                            onClick={() => toggleExpand(movieId)}
                                        >
                                            <div className="movie-card-title">
                                                <span className="movie-index">{idx + 1}.</span>
                                                <span className="movie-name">🎬 {movieTitle}</span>
                                                <span className="movie-badge">{totalSelected} suất</span>
                                                <span className="movie-duration">⏱️ {duration}p</span>
                                            </div>
                                            <div className="movie-card-toggle">
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </div>

                                        {/* Body */}
                                        {isExpanded && (
                                            <div className="movie-card-body">

                                                {/* INTERVAL SECTION */}
                                                <div className="interval-section">
                                                    <div className="interval-header">
                                                        <span className="interval-label">⏱️ Khoảng cách giữa các suất</span>
                                                        <span className="interval-hint">
                                                            {totalSelected > 0
                                                                ? `Đã chọn ${totalSelected} suất`
                                                                : 'Chọn khoảng cách trước khi tick giờ'
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="interval-group">
                                                        {INTERVAL_TYPES.map(preset => (
                                                            <button
                                                                key={preset.key}
                                                                type="button"
                                                                className={`interval-btn ${intervalType === preset.key ? 'active' : ''}`}
                                                                onClick={() => handleChangeInterval(movieId, preset.key)}
                                                            >
                                                                <span className="interval-label-btn">{preset.label}</span>
                                                                <span className="interval-minutes">{preset.minutes}p</span>
                                                                <span className="interval-desc">{preset.description}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* ACTIONS */}
                                                <div className="card-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-auto-fill"
                                                        onClick={() => handleAutoFill(movieId)}
                                                    >
                                                        🤖 Chọn tất cả
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-clear-all"
                                                        onClick={() => handleClearAll(movieId)}
                                                    >
                                                        🗑️ Bỏ chọn tất cả
                                                    </button>
                                                </div>

                                                {/* BẢNG */}
                                                <div className="config-table-wrapper">
                                                    <table className="config-table">
                                                        <thead>
                                                            <tr>
                                                                <th style={{ minWidth: '120px', textAlign: 'left' }}>
                                                                    LOẠI PHÒNG
                                                                </th>
                                                                {datesInRange.map((d, idx) => (
                                                                    <th
                                                                        key={idx}
                                                                        className={`date-header ${d.isWeekend ? 'weekend' : ''}`}
                                                                    >
                                                                        {d.shortDay}<br />
                                                                        <span style={{ fontWeight: '400', fontSize: '10px', color: 'var(--text-muted)' }}>
                                                                            {d.display}
                                                                        </span>
                                                                    </th>
                                                                ))}
                                                                <th style={{ minWidth: '50px', color: 'var(--accent-ice)' }}>📊</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {TIME_SLOTS.map(timeSlot => {
                                                                const actualStart = Math.max(timeSlot.startMinutes, cinemaOpen);
                                                                const actualEnd = Math.min(timeSlot.endMinutes, cinemaClose);
                                                                const isValidRange = actualStart < actualEnd;
                                                                const times = isValidRange
                                                                    ? generateSlotTimes({
                                                                        startMinutes: actualStart,
                                                                        endMinutes: actualEnd,
                                                                        intervalMinutes
                                                                    })
                                                                    : [];

                                                                return (
                                                                    <React.Fragment key={timeSlot.key}>
                                                                        <tr className="time-slot-header">
                                                                            <td colSpan={datesInRange.length + 2}>
                                                                                {timeSlot.label}
                                                                                {isValidRange && (
                                                                                    <span className="time-slot-range">
                                                                                        {' '}({minutesToTime(actualStart)} → {minutesToTime(actualEnd)})
                                                                                    </span>
                                                                                )}
                                                                                {!isValidRange && (
                                                                                    <span className="time-slot-range disabled">
                                                                                        {' '}(ngoài giờ hoạt động)
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>

                                                                        {ROOM_TYPES.map(roomType => {
                                                                            // Đếm tổng selected trong row này
                                                                            let rowTotal = 0;
                                                                            for (const d of datesInRange) {
                                                                                for (const t of times) {
                                                                                    const key = buildSlotKey(timeSlot.key, roomType, d.dayKey, t);
                                                                                    if (movieConfigMap[key]) rowTotal++;
                                                                                }
                                                                            }

                                                                            return (
                                                                                <tr key={roomType} className={rowTotal === 0 ? 'empty-row' : ''}>
                                                                                    <td className="room-label">
                                                                                        <div className="room-label-content">
                                                                                            <span>{roomType}</span>
                                                                                            {isValidRange && times.length > 0 && (
                                                                                                <span className="room-slot-count">
                                                                                                    ({times.length} giờ)
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    {datesInRange.map((d, dayIdx) => {
                                                                                        return (
                                                                                            <td key={dayIdx} className="slot-cell-container">
                                                                                                {!isValidRange ? (
                                                                                                    <span className="no-slots">-</span>
                                                                                                ) : (
                                                                                                    <div className="slot-list">
                                                                                                        {times.map(t => {
                                                                                                            const key = buildSlotKey(timeSlot.key, roomType, d.dayKey, t);
                                                                                                            const isSelected = !!movieConfigMap[key];
                                                                                                            return (
                                                                                                                <button
                                                                                                                    key={t}
                                                                                                                    type="button"
                                                                                                                    className={`slot-btn ${isSelected ? 'selected' : ''}`}
                                                                                                                    onClick={() => toggleSlot(movieId, timeSlot.key, roomType, d.dayKey, t)}
                                                                                                                    title={`${minutesToTime(t)} - ${roomType} - ${d.shortDay} ${d.display}`}
                                                                                                                >
                                                                                                                    {minutesToTime(t)}
                                                                                                                </button>
                                                                                                            );
                                                                                                        })}
                                                                                                    </div>
                                                                                                )}
                                                                                            </td>
                                                                                        );
                                                                                    })}
                                                                                    <td className="total-cell">{rowTotal}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </React.Fragment>
                                                                );
                                                            })}

                                                            <tr className="total-row">
                                                                <td className="room-label">📊 TỔNG</td>
                                                                {datesInRange.map((d, dayIdx) => {
                                                                    let dayTotal = 0;
                                                                    for (const timeSlot of TIME_SLOTS) {
                                                                        const actualStart = Math.max(timeSlot.startMinutes, cinemaOpen);
                                                                        const actualEnd = Math.min(timeSlot.endMinutes, cinemaClose);
                                                                        if (actualStart >= actualEnd) continue;
                                                                        const times = generateSlotTimes({
                                                                            startMinutes: actualStart,
                                                                            endMinutes: actualEnd,
                                                                            intervalMinutes
                                                                        });
                                                                        for (const roomType of ROOM_TYPES) {
                                                                            for (const t of times) {
                                                                                const key = buildSlotKey(timeSlot.key, roomType, d.dayKey, t);
                                                                                if (movieConfigMap[key]) dayTotal++;
                                                                            }
                                                                        }
                                                                    }
                                                                    return (
                                                                        <td key={dayIdx} className="total-cell">{dayTotal}</td>
                                                                    );
                                                                })}
                                                                <td className="total-cell">{totalSelected}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Save All */}
                            <div className="save-all-section">
                                <button
                                    type="button"
                                    className="btn-save-all"
                                    onClick={handleSaveAll}
                                    disabled={saving || selectedMovies.length === 0}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={18} className="spin-icon" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            💾 Lưu tất cả ({selectedMovies.length} phim)
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {selectedCinema && selectedMovies.length === 0 && (
                        <div className="empty-state">
                            <Film size={48} className="empty-icon" />
                            <p className="empty-title">Chưa chọn phim nào</p>
                            <p className="empty-subtitle">Hãy chọn ít nhất 1 phim ở trên để cấu hình</p>
                        </div>
                    )}
                </div>
            </AdminPage>

            {/* Alert Modal */}
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
                    <p style={{ whiteSpace: 'pre-line' }}>{alertModal.message}</p>
                </div>
            </AdminModal>
        </>
    );
};

export default MovieShowtimeConfigPage;