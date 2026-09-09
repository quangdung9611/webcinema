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
    Lightbulb,
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight
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

const DEFAULT_INTERVAL = 45;
const DEFAULT_MOVIE_DURATION = 120;
const DEFAULT_CINEMA_OPEN = 8 * 60;
const DEFAULT_CINEMA_CLOSE = 24 * 60;
const DEFAULT_ROOM_COUNT = 1;

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

const calculateSlotTimes = ({ startMinutes, endMinutes, intervalMinutes }) => {
    if (startMinutes >= endMinutes || intervalMinutes <= 0) return { times: [], maxSlots: 0 };
    const times = [];
    const maxSlots = Math.floor((endMinutes - startMinutes) / intervalMinutes);
    if (maxSlots <= 0) return { times: [], maxSlots: 0 };
    for (let i = 0; i < maxSlots; i++) {
        const start = startMinutes + i * intervalMinutes;
        if (start >= endMinutes) break;
        times.push({
            start: start,
            startTime: minutesToTime(start),
            end: start + intervalMinutes,
            endTime: minutesToTime(start + intervalMinutes)
        });
    }
    return { times, maxSlots, actualCount: times.length };
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
    const candidates = [cinema.open_time, cinema.opening_time, cinema.opening_hour, cinema.openingTime, cinema.openTime, cinema.open_at, cinema.start_time, cinema.startTime, cinema.gio_mo_cua];
    for (const value of candidates) {
        const minutes = timeToMinutes(value, null);
        if (minutes !== null) return minutes;
    }
    return DEFAULT_CINEMA_OPEN;
};

const extractCinemaClose = (cinema) => {
    if (!cinema) return DEFAULT_CINEMA_CLOSE;
    const candidates = [cinema.close_time, cinema.closing_time, cinema.closing_hour, cinema.closingTime, cinema.closeTime, cinema.close_at, cinema.end_time, cinema.endTime, cinema.gio_dong_cua];
    for (const value of candidates) {
        const minutes = timeToMinutes(value, null);
        if (minutes !== null) return minutes;
    }
    return DEFAULT_CINEMA_CLOSE;
};

const extractRoomCount = (cinema, roomType) => {
    if (!cinema) return DEFAULT_ROOM_COUNT;
    const normalizedType = String(roomType || '2D').toUpperCase();
    const byType = cinema.room_count_by_type || cinema.roomCountByType || cinema.rooms_by_type || cinema.roomsByType;
    if (byType && typeof byType === 'object') {
        const value = byType[normalizedType];
        if (Number.isFinite(Number(value)) && Number(value) > 0) return Number(value);
    }
    const rooms = cinema.rooms || cinema.room_list || cinema.roomList;
    if (Array.isArray(rooms)) {
        const matched = rooms.filter(room => {
            const type = String(room.room_type || room.type || room.roomType || '').toUpperCase();
            return type === normalizedType;
        });
        if (matched.length > 0) return matched.length;
    }
    return DEFAULT_ROOM_COUNT;
};

const getMovieByIdFromList = (movies, movieId) => {
    return movies.find(movie => String(movie.movie_id) === String(movieId));
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
    const [configs, setConfigs] = useState({});
    const [expandedMovies, setExpandedMovies] = useState({});

    // 🆕 FILTER STATE
    const [filterRoomType, setFilterRoomType] = useState('ALL');
    const [filterTimeSlot, setFilterTimeSlot] = useState('ALL'); // SÁNG/TRƯA/CHIỀU/TỐI

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

    const loadAllConfigs = async () => {
        if (!selectedCinema || selectedMovies.length === 0) return;
        setLoading(true);
        const newConfigs = {};
        try {
            for (const movieId of selectedMovies) {
                try {
                    const res = await api.get(`/api/showtime-config/${movieId}?cinema_id=${selectedCinema}`);
                    const rawData = res.data?.data;
                    const movieConfig = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.data) ? rawData.data : [];
                    newConfigs[movieId] = movieConfig.map(config => ({
                        ...config,
                        config_id: config.config_id ?? config.id ?? undefined,
                        time_slot: config.time_slot || 'MORNING',
                        room_type: config.room_type || '2D',
                        slot_count: Number(config.slot_count) || 0,
                        interval_minutes: Number(config.interval_minutes) || DEFAULT_INTERVAL,
                        day_type: config.day_type || 'MONDAY',
                        is_active: Number(config.is_active) === 1 ? 1 : 0
                    }));
                } catch (error) {
                    console.error(`Lỗi load config cho phim ${movieId}:`, error);
                    newConfigs[movieId] = [];
                }
            }
            setConfigs(newConfigs);
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

    const addConfigForDay = (movieId, dayKey) => {
        setConfigs(prev => ({
            ...prev,
            [movieId]: [
                ...(prev[movieId] || []),
                {
                    time_slot: 'MORNING',
                    room_type: '2D',
                    slot_count: 1,
                    interval_minutes: DEFAULT_INTERVAL,
                    day_type: dayKey,
                    is_active: 1
                }
            ]
        }));
        setExpandedMovies(prev => ({ ...prev, [movieId]: true }));
    };

    const addConfigForAllDays = (movieId) => {
        const currentConfigs = configs[movieId] || [];
        const existingDayKeys = currentConfigs.map(c => c.day_type);
        const missingDays = datesInRange.filter(d => !existingDayKeys.includes(d.dayKey));
        if (missingDays.length === 0) {
            showAlert('Thông báo', 'Tất cả các ngày đã có cấu hình!', 'info');
            return;
        }
        const newConfigs = missingDays.map(d => ({
            time_slot: 'MORNING',
            room_type: filterRoomType !== 'ALL' ? filterRoomType : '2D',
            slot_count: 1,
            interval_minutes: DEFAULT_INTERVAL,
            day_type: d.dayKey,
            is_active: 1
        }));
        setConfigs(prev => ({
            ...prev,
            [movieId]: [...(prev[movieId] || []), ...newConfigs]
        }));
        setExpandedMovies(prev => ({ ...prev, [movieId]: true }));
        showAlert('Thành công', `Đã thêm cấu hình cho ${missingDays.length} ngày!`, 'success');
    };

    const removeConfig = async (movieId, index) => {
        const movieConfigs = configs[movieId] || [];
        const newConfigs = [...movieConfigs];
        const removed = newConfigs.splice(index, 1)[0];
        if (removed?.config_id) {
            try {
                await api.delete(`/api/showtime-config/${movieId}/${removed.config_id}`);
                setConfigs(prev => ({ ...prev, [movieId]: newConfigs }));
                showAlert('Thành công', 'Xóa cấu hình thành công', 'success');
            } catch (error) {
                console.error('Lỗi xóa config:', error);
                showAlert('Lỗi', 'Không thể xóa cấu hình', 'error');
            }
            return;
        }
        setConfigs(prev => ({ ...prev, [movieId]: newConfigs }));
    };

    const updateConfig = (movieId, index, field, value) => {
        setConfigs(prev => {
            const movieConfigs = [...(prev[movieId] || [])];
            if (!movieConfigs[index]) return prev;
            let normalizedValue = value;
            if (field === 'slot_count' || field === 'interval_minutes') {
                normalizedValue = Number(value);
                if (!Number.isFinite(normalizedValue)) normalizedValue = 0;
            }
            if (field === 'is_active') normalizedValue = Number(value) === 1 ? 1 : 0;
            if (field === 'time_slot') {
                const exists = TIME_SLOTS.some(item => item.key === value);
                if (!exists) normalizedValue = 'MORNING';
            }
            if (field === 'room_type') {
                const exists = ROOM_TYPES.includes(value);
                if (!exists) normalizedValue = '2D';
            }
            movieConfigs[index] = { ...movieConfigs[index], [field]: normalizedValue };
            return { ...prev, [movieId]: movieConfigs };
        });
    };

    const getConfigCapacityInfo = useCallback((movieId, config) => {
        if (!config || Number(config.is_active) !== 1) return null;
        const movie = getMovieByIdFromList(movies, movieId);
        const duration = extractMovieDuration(movie);
        const roomCount = extractRoomCount(selectedCinemaObject, config.room_type);
        const slot = TIME_SLOTS.find(s => s.key === config.time_slot);
        if (!slot) return null;
        const actualStart = Math.max(slot.startMinutes, cinemaOpen);
        const actualEnd = Math.min(slot.endMinutes, cinemaClose);
        if (actualStart >= actualEnd) {
            return { validRange: false, duration, roomCount, maxCapacity: 0, requested: Number(config.slot_count) || 0 };
        }
        const result = calculateSlotTimes({
            startMinutes: actualStart,
            endMinutes: actualEnd,
            intervalMinutes: Number(config.interval_minutes) || DEFAULT_INTERVAL
        });
        const requested = Number(config.slot_count) || 0;
        return {
            validRange: true,
            actualStart,
            actualEnd,
            duration,
            roomCount,
            maxCapacity: result.maxSlots,
            requested,
            exceeded: requested > result.maxSlots,
            recommended: result.maxSlots,
            slotTimes: result.times,
            timeRange: `${minutesToTime(actualStart)} → ${minutesToTime(actualEnd)}`
        };
    }, [movies, selectedCinemaObject, cinemaOpen, cinemaClose]);

    const getCapacityMessage = (movieId, config) => {
        const info = getConfigCapacityInfo(movieId, config);
        if (!info) return null;
        if (!info.validRange) {
            return { type: 'error', text: `❌ Ngoài giờ hoạt động`, maxSlots: 0 };
        }
        if (info.exceeded) {
            return {
                type: 'error',
                text: `⚠️ ${info.requested}/${info.maxCapacity} suất`,
                maxSlots: info.maxCapacity,
                recommended: info.recommended,
                slotTimes: info.slotTimes,
                timeRange: info.timeRange
            };
        }
        return {
            type: 'success',
            text: `✅ ${info.requested}/${info.maxCapacity} suất`,
            maxSlots: info.maxCapacity,
            slotTimes: info.slotTimes,
            timeRange: info.timeRange
        };
    };

    // 🆕 Lọc config theo room_type và time_slot
    const getFilteredConfigs = (movieConfigs) => {
        let filtered = movieConfigs;
        
        if (filterRoomType !== 'ALL') {
            filtered = filtered.filter(c => c.room_type === filterRoomType);
        }
        
        if (filterTimeSlot !== 'ALL') {
            filtered = filtered.filter(c => c.time_slot === filterTimeSlot);
        }
        
        return filtered;
    };

    const handleSaveAll = async () => {
        if (!selectedCinema) {
            showAlert('Lỗi', 'Vui lòng chọn rạp', 'error');
            return;
        }
        if (selectedMovies.length === 0) {
            showAlert('Lỗi', 'Vui lòng chọn ít nhất 1 phim', 'error');
            return;
        }

        const errors = [];
        const preparedConfigs = {};

        for (const movieId of selectedMovies) {
            const movieConfigs = configs[movieId] || [];
            const activeConfigs = movieConfigs.filter(
                config => Number(config.is_active) === 1 && Number(config.slot_count) > 0
            );
            if (activeConfigs.length === 0) {
                errors.push({ movieId, title: getMovieTitle(movieId), message: 'Chưa có cấu hình đang bật' });
                continue;
            }
            for (const config of activeConfigs) {
                const info = getConfigCapacityInfo(movieId, config);
                if (info?.exceeded) {
                    const dayInfo = datesInRange.find(d => d.dayKey === config.day_type);
                    const dayDisplay = dayInfo ? `${dayInfo.shortDay} ${dayInfo.display}` : config.day_type;
                    const timeLabel = TIME_SLOTS.find(s => s.key === config.time_slot)?.label || config.time_slot;
                    errors.push({
                        movieId,
                        title: getMovieTitle(movieId),
                        config,
                        info,
                        message: `${dayDisplay} - ${timeLabel}: ${info.requested}/${info.maxCapacity} suất`
                    });
                }
            }
            preparedConfigs[movieId] = activeConfigs.map(config => ({
                time_slot: String(config.time_slot).toUpperCase(),
                room_type: String(config.room_type).toUpperCase(),
                slot_count: Number(config.slot_count),
                interval_minutes: Number(config.interval_minutes),
                day_type: String(config.day_type || 'MONDAY').toUpperCase(),
                is_active: 1
            }));
        }

        if (errors.length > 0) {
            const firstError = errors[0];
            const info = firstError.info;
            const dayInfo = datesInRange.find(d => d.dayKey === firstError.config.day_type);
            const dayDisplay = dayInfo ? `${dayInfo.shortDay} ${dayInfo.display}` : firstError.config.day_type;
            const timeLabel = TIME_SLOTS.find(s => s.key === firstError.config.time_slot)?.label || firstError.config.time_slot;

            let detailMessage = `⚠️ ${firstError.title}\n`;
            detailMessage += `📅 ${dayDisplay}\n`;
            detailMessage += `🕐 ${timeLabel}\n`;
            detailMessage += `🏠 ${firstError.config.room_type}\n\n`;
            detailMessage += `Bạn nhập: ${firstError.config.slot_count} suất\n`;
            detailMessage += `Tối đa: ${info?.maxCapacity || 0} suất\n`;

            if (info?.slotTimes && info.slotTimes.length > 0) {
                detailMessage += `\n📋 Các giờ bắt đầu:\n`;
                info.slotTimes.slice(0, 6).forEach(t => {
                    detailMessage += `  • ${t.startTime} → ${t.endTime}\n`;
                });
                if (info.slotTimes.length > 6) {
                    detailMessage += `  • ... và ${info.slotTimes.length - 6} suất khác\n`;
                }
            }
            detailMessage += `\n💡 Đề xuất: Nhập ${info?.recommended || info?.maxCapacity || 0} suất`;

            showAlert('⚠️ Vượt giới hạn khung giờ', detailMessage, 'warning');
            return;
        }

        setSaving(true);
        let successCount = 0;
        let errorCount = 0;
        const errorMovies = [];

        try {
            for (const movieId of selectedMovies) {
                try {
                    await api.post(`/api/showtime-config/${movieId}`, {
                        cinema_id: Number(selectedCinema),
                        configs: preparedConfigs[movieId]
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

    const getTotalSlots = (movieId) => {
        const movieConfigs = configs[movieId] || [];
        const filtered = getFilteredConfigs(movieConfigs);
        return filtered.filter(
            config => Number(config.slot_count) > 0 && Number(config.is_active) === 1
        ).length;
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
                subtitle="Cấu hình suất chiếu theo từng ngày"
                icon={<Settings size={30} />}
                buttonText="Quay lại"
                onAdd={() => navigate('/admin/showtime-config')}
                buttonIcon={<ArrowLeft size={18} />}
            >
                <div className="movie-showtime-config-page">

                    {/* ==========================================================
                        TOOLBAR - CHỌN RẠP + FILTER
                    ========================================================== */}
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

                        <div className="filter-group">
                            <label className="config-label">🎯 Loại phòng</label>
                            <select
                                value={filterRoomType}
                                onChange={e => setFilterRoomType(e.target.value)}
                                className="config-select-main config-select-small"
                            >
                                <option value="ALL">Tất cả</option>
                                {ROOM_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="config-label">🕐 Khung giờ</label>
                            <select
                                value={filterTimeSlot}
                                onChange={e => setFilterTimeSlot(e.target.value)}
                                className="config-select-main config-select-small"
                            >
                                <option value="ALL">Tất cả</option>
                                {TIME_SLOTS.map(slot => (
                                    <option key={slot.key} value={slot.key}>{slot.label}</option>
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

                    {/* ==========================================================
                        CHỌN PHIM
                    ========================================================== */}
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
                                                    {getTotalSlots(movie.movie_id)}
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

                    {/* ==========================================================
                        KHOẢNG NGÀY & DANH SÁCH NGÀY
                    ========================================================== */}
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
                                <button className="nav-btn">
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="date-list">
                                    {datesInRange.map((d, i) => (
                                        <span key={i} className={`date-tag ${d.isWeekend ? 'weekend' : ''}`}>
                                            {d.shortDay} {d.display}
                                        </span>
                                    ))}
                                </div>
                                <button className="nav-btn">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </>
                    )}

                    {/* ==========================================================
                        CẤU HÌNH
                    ========================================================== */}
                    {selectedCinema && selectedMovies.length > 0 && (
                        <div className="config-container">
                            {selectedMovies.map((movieId, idx) => {
                                const movieConfigs = configs[movieId] || [];
                                const filteredConfigs = getFilteredConfigs(movieConfigs);
                                const isExpanded = expandedMovies[movieId] !== false;
                                const movieTitle = getMovieTitle(movieId);
                                const totalSlots = filteredConfigs.filter(
                                    c => Number(c.slot_count) > 0 && Number(c.is_active) === 1
                                ).length;
                                const movie = getMovieByIdFromList(movies, movieId);
                                const duration = extractMovieDuration(movie);

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
                                                <span className="movie-badge">{totalSlots} cấu hình</span>
                                                <span className="movie-duration">⏱️ {duration}p</span>
                                            </div>
                                            <div className="movie-card-toggle">
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </div>

                                        {/* Body */}
                                        {isExpanded && (
                                            <div className="movie-card-body">
                                                {/* Actions */}
                                                <div className="card-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-add-all"
                                                        onClick={() => addConfigForAllDays(movieId)}
                                                    >
                                                        <Plus size={14} /> Thêm tất cả ngày
                                                    </button>
                                                </div>

                                                {filteredConfigs.length === 0 ? (
                                                    <div className="empty-config">
                                                        <p>📭 Chưa có cấu hình</p>
                                                        <p className="empty-hint">Bấm "Thêm tất cả ngày" để bắt đầu</p>
                                                    </div>
                                                ) : (
                                                    <div className="config-grid">
                                                        {filteredConfigs.map((config, index) => {
                                                            const actualIndex = movieConfigs.indexOf(config);
                                                            const capacityMessage = getCapacityMessage(movieId, config);
                                                            const isError = capacityMessage?.type === 'error';
                                                            const dayInfo = datesInRange.find(d => d.dayKey === config.day_type);
                                                            const dayDisplay = dayInfo ? `${dayInfo.shortDay} ${dayInfo.display}` : config.day_type;
                                                            const isWeekend = dayInfo?.isWeekend || false;
                                                            const timeLabel = TIME_SLOTS.find(s => s.key === config.time_slot)?.label || config.time_slot;

                                                            return (
                                                                <div
                                                                    key={config.config_id || `${movieId}-${index}`}
                                                                    className={`config-item ${isError ? 'error' : ''} ${isWeekend ? 'weekend' : ''}`}
                                                                >
                                                                    {/* Row 1: Ngày + Controls */}
                                                                    <div className="config-item-header">
                                                                        <span className="config-item-day">
                                                                            {dayDisplay}
                                                                            <span className="config-item-time">• {timeLabel}</span>
                                                                        </span>
                                                                        <div className="config-item-controls">
                                                                            <label className="toggle-switch">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={Number(config.is_active) === 1}
                                                                                    onChange={e => updateConfig(movieId, actualIndex, 'is_active', e.target.checked ? 1 : 0)}
                                                                                />
                                                                                <span className="toggle-slider"></span>
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                className="btn-delete-config"
                                                                                onClick={() => removeConfig(movieId, actualIndex)}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Row 2: Cấu hình - KHÔNG CÓ DROPDOWN NGÀY */}
                                                                    <div className="config-item-fields">
                                                                        <select
                                                                            value={config.time_slot || 'MORNING'}
                                                                            onChange={e => updateConfig(movieId, actualIndex, 'time_slot', e.target.value)}
                                                                            className="config-field"
                                                                        >
                                                                            {TIME_SLOTS.map(slot => (
                                                                                <option key={slot.key} value={slot.key}>
                                                                                    {slot.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>

                                                                        <select
                                                                            value={config.room_type || '2D'}
                                                                            onChange={e => updateConfig(movieId, actualIndex, 'room_type', e.target.value)}
                                                                            className="config-field config-field-small"
                                                                        >
                                                                            {ROOM_TYPES.map(type => (
                                                                                <option key={type} value={type}>{type}</option>
                                                                            ))}
                                                                        </select>

                                                                        <input
                                                                            type="number"
                                                                            value={config.slot_count ?? 0}
                                                                            onChange={e => updateConfig(movieId, actualIndex, 'slot_count', e.target.value)}
                                                                            min="0"
                                                                            max="30"
                                                                            className={`config-field config-field-small ${isError ? 'error' : ''}`}
                                                                            placeholder="Số"
                                                                        />

                                                                        <input
                                                                            type="number"
                                                                            value={config.interval_minutes ?? DEFAULT_INTERVAL}
                                                                            onChange={e => updateConfig(movieId, actualIndex, 'interval_minutes', e.target.value)}
                                                                            min="30"
                                                                            max="120"
                                                                            step="5"
                                                                            className="config-field config-field-small"
                                                                            placeholder="K/c"
                                                                        />
                                                                    </div>

                                                                    {/* Row 3: Status + Times */}
                                                                    <div className="config-item-footer">
                                                                        {capacityMessage && (
                                                                            <div className={`config-status ${capacityMessage.type}`}>
                                                                                {isError ? (
                                                                                    <AlertTriangle size={12} />
                                                                                ) : (
                                                                                    <CheckCircle2 size={12} />
                                                                                )}
                                                                                <span>{capacityMessage.text}</span>
                                                                                {isError && capacityMessage.recommended && (
                                                                                    <span className="status-suggest">
                                                                                        → <strong>{capacityMessage.recommended}</strong>
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {capacityMessage?.slotTimes && capacityMessage.slotTimes.length > 0 && (
                                                                            <div className="config-times">
                                                                                <Clock size={11} />
                                                                                <span>
                                                                                    {capacityMessage.slotTimes.slice(0, 4).map(t => t.startTime).join(' • ')}
                                                                                    {capacityMessage.slotTimes.length > 4 && ` • +${capacityMessage.slotTimes.length - 4}`}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
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