// pages/admin/MovieShowtimeConfigPage.jsx

import React, { useState, useEffect } from 'react';
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
    Search
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
        label: 'MORNING (06:00 - 12:00)'
    },
    {
        key: 'AFTERNOON',
        label: 'AFTERNOON (12:00 - 17:00)'
    },
    {
        key: 'EVENING',
        label: 'EVENING (17:00 - 20:00)'
    },
    {
        key: 'NIGHT',
        label: 'NIGHT (20:00 - 24:00)'
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

// ==========================================================
// COMPONENT
// ==========================================================

const MovieShowtimeConfigPage = () => {

    const navigate = useNavigate();

    // ======================================================
    // STATE
    // ======================================================

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);

    const [selectedCinema, setSelectedCinema] = useState('');
    const [selectedMovies, setSelectedMovies] = useState([]);

    const [searchMovie, setSearchMovie] = useState('');

    const [configs, setConfigs] = useState({});

    const [expandedMovies, setExpandedMovies] = useState({});

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default'
    });

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

            const res = await api.get('/api/movies');

            const movieData = Array.isArray(res.data?.data)
                ? res.data.data
                : [];

            setMovies(movieData);

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

            for (const movieId of selectedMovies) {

                try {

                    const res = await api.get(
                        `/api/showtime-config/${movieId}?cinema_id=${selectedCinema}`
                    );

                    const rawData = res.data?.data;

                    const movieConfig = Array.isArray(rawData)
                        ? rawData
                        : Array.isArray(rawData?.data)
                            ? rawData.data
                            : [];

                    newConfigs[movieId] =
                        movieConfig.map(config => ({
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
                                Number(config.slot_count) || 0,

                            interval_minutes:
                                Number(config.interval_minutes) || 45,

                            day_type:
                                config.day_type ||
                                'ALL',

                            is_active:
                                Number(config.is_active) === 1
                                    ? 1
                                    : 0
                        }));

                } catch (error) {

                    console.error(
                        `Lỗi load config cho phim ${movieId}:`,
                        error
                    );

                    newConfigs[movieId] = [];
                }
            }

            setConfigs(newConfigs);

        } finally {

            setLoading(false);
        }
    };

    // ======================================================
    // TOGGLE MOVIE
    // ======================================================

    const toggleMovieSelection = (movieId) => {

        setSelectedMovies(prev => {

            if (prev.includes(movieId)) {

                return prev.filter(
                    id => id !== movieId
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

    const toggleExpand = (movieId) => {

        setExpandedMovies(prev => ({
            ...prev,
            [movieId]: !prev[movieId]
        }));
    };

    // ======================================================
    // ADD CONFIG ROW
    // ======================================================

    const addConfig = (movieId) => {

        setConfigs(prev => ({

            ...prev,

            [movieId]: [
                ...(prev[movieId] || []),

                {
                    time_slot: 'MORNING',
                    room_type: '2D',
                    slot_count: 1,
                    interval_minutes: 45,
                    day_type: 'ALL',
                    is_active: 1
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
            newConfigs.splice(index, 1)[0];

        // -----------------------------------------------
        // CONFIG ĐÃ CÓ TRONG DATABASE
        // -----------------------------------------------

        if (removed?.config_id) {

            try {

                await api.delete(
                    `/api/showtime-config/${movieId}/${removed.config_id}`
                );

                setConfigs(prev => ({
                    ...prev,
                    [movieId]: newConfigs
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

        // -----------------------------------------------
        // CONFIG CHƯA CÓ TRONG DATABASE
        // -----------------------------------------------

        setConfigs(prev => ({
            ...prev,
            [movieId]: newConfigs
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

            if (!movieConfigs[index]) {
                return prev;
            }

            let normalizedValue = value;

            // -------------------------------------------
            // NUMBER
            // -------------------------------------------

            if (
                field === 'slot_count' ||
                field === 'interval_minutes'
            ) {
                normalizedValue = Number(value);

                if (!Number.isFinite(normalizedValue)) {
                    normalizedValue = 0;
                }
            }

            // -------------------------------------------
            // ACTIVE
            // -------------------------------------------

            if (field === 'is_active') {
                normalizedValue =
                    Number(value) === 1
                        ? 1
                        : 0;
            }

            // -------------------------------------------
            // TIME SLOT
            // -------------------------------------------

            if (field === 'time_slot') {

                const exists =
                    TIME_SLOTS.some(
                        item =>
                            item.key === value
                    );

                if (!exists) {
                    normalizedValue = 'MORNING';
                }
            }

            // -------------------------------------------
            // ROOM TYPE
            // -------------------------------------------

            if (field === 'room_type') {

                const exists =
                    ROOM_TYPES.includes(value);

                if (!exists) {
                    normalizedValue = '2D';
                }
            }

            // -------------------------------------------
            // DAY TYPE
            // -------------------------------------------

            if (field === 'day_type') {

                const exists =
                    DAY_TYPES.some(
                        item =>
                            item.key === value
                    );

                if (!exists) {
                    normalizedValue = 'ALL';
                }
            }

            movieConfigs[index] = {
                ...movieConfigs[index],
                [field]: normalizedValue
            };

            return {
                ...prev,
                [movieId]: movieConfigs
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
            !Array.isArray(movieConfigs) ||
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
                    Number(config.is_active) === 1 &&
                    Number(config.slot_count) > 0
            );

        if (activeConfigs.length === 0) {

            return {
                valid: false,
                message:
                    `Phim "${getMovieTitle(movieId)}" chưa có cấu hình đang bật`
            };
        }

        for (
            let index = 0;
            index < activeConfigs.length;
            index++
        ) {

            const config =
                activeConfigs[index];

            if (
                !TIME_SLOTS.some(
                    item =>
                        item.key === config.time_slot
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
                        (config.day_type || 'ALL')
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
                    Number(config.slot_count)
                ) ||
                Number(config.slot_count) <= 0
            ) {
                return {
                    valid: false,
                    message:
                        `Phim "${getMovieTitle(movieId)}": Số suất phải lớn hơn 0`
                };
            }

            if (
                !Number.isFinite(
                    Number(config.interval_minutes)
                ) ||
                Number(config.interval_minutes) <= 0
            ) {
                return {
                    valid: false,
                    message:
                        `Phim "${getMovieTitle(movieId)}": Khoảng cách phải lớn hơn 0`
                };
            }
        }

        return {
            valid: true,
            configs: activeConfigs
        };
    };

    // ======================================================
    // SAVE ALL
    // ======================================================

    const handleSaveAll = async () => {

        // -----------------------------------------------
        // VALIDATE CINEMA
        // -----------------------------------------------

        if (!selectedCinema) {

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

        if (selectedMovies.length === 0) {

            showAlert(
                'Lỗi',
                'Vui lòng chọn ít nhất 1 phim',
                'error'
            );

            return;
        }

        // -----------------------------------------------
        // VALIDATE TẤT CẢ PHIM TRƯỚC KHI SAVE
        // -----------------------------------------------

        const preparedConfigs = {};

        for (const movieId of selectedMovies) {

            const movieConfigs =
                configs[movieId] || [];

            const validation =
                validateConfigs(
                    movieId,
                    movieConfigs
                );

            if (!validation.valid) {

                showAlert(
                    'Cấu hình không hợp lệ',
                    validation.message,
                    'warning'
                );

                return;
            }

            preparedConfigs[movieId] =
                validation.configs.map(config => ({
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

                    // Chỉ gửi config ACTIVE
                    is_active: 1
                }));
        }

        // -----------------------------------------------
        // SAVE
        // -----------------------------------------------

        setSaving(true);

        let successCount = 0;
        let errorCount = 0;

        const errorMovies = [];

        try {

            for (const movieId of selectedMovies) {

                try {

                    await api.post(
                        `/api/showtime-config/${movieId}`,
                        {
                            cinema_id:
                                Number(
                                    selectedCinema
                                ),

                            configs:
                                preparedConfigs[movieId]
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

        // -----------------------------------------------
        // RESULT
        // -----------------------------------------------

        if (errorCount === 0) {

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

    const filteredMovies = movies.filter(movie => {

        const title =
            String(
                movie.title || ''
            ).toLowerCase();

        return title.includes(
            searchMovie.toLowerCase()
        );
    });

    // ======================================================
    // GET MOVIE TITLE
    // ======================================================

    const getMovieTitle = (movieId) => {

        const movie =
            movies.find(
                movie =>
                    String(movie.movie_id) ===
                    String(movieId)
            );

        return (
            movie?.title ||
            `Phim #${movieId}`
        );
    };

    // ======================================================
    // GET TOTAL CONFIG SLOTS
    // ======================================================

    const getTotalSlots = (movieId) => {

        const movieConfigs =
            configs[movieId] || [];

        return movieConfigs.filter(
            config =>
                Number(config.slot_count) > 0 &&
                Number(config.is_active) === 1
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
                icon={<Settings size={30} />}
                buttonText="Quay lại"
                onAdd={() =>
                    navigate(
                        '/admin/showtime-config'
                    )
                }
                buttonIcon={
                    <ArrowLeft size={18} />
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
                            value={selectedCinema}
                            onChange={(e) =>
                                setSelectedCinema(
                                    e.target.value
                                )
                            }
                            className="cinema-select"
                        >

                            <option value="">
                                -- Chọn rạp --
                            </option>

                            {cinemas.map(cinema => (

                                <option
                                    key={
                                        cinema.cinema_id
                                    }
                                    value={
                                        cinema.cinema_id
                                    }
                                >
                                    {cinema.cinema_name}
                                    {cinema.city
                                        ? ` - ${cinema.city}`
                                        : ''}
                                </option>

                            ))}

                        </select>

                    </div>

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
                                    value={searchMovie}
                                    onChange={(e) =>
                                        setSearchMovie(
                                            e.target.value
                                        )
                                    }
                                    className="movie-search-input"
                                />

                                <span className="selected-count">
                                    Đã chọn:{' '}
                                    {selectedMovies.length}{' '}
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

                                                {movie.title}

                                                {isChecked && (

                                                    <span className="movie-chip-badge">
                                                        {
                                                            getTotalSlots(
                                                                movie.movie_id
                                                            )
                                                        }{' '}
                                                        cấu hình
                                                    </span>

                                                )}

                                            </label>
                                        );
                                    }
                                )}

                                {filteredMovies.length === 0 && (

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
                        selectedMovies.length > 0 && (

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

                                        return (

                                            <div
                                                key={
                                                    movieId
                                                }
                                                className="movie-config-card"
                                            >

                                                {/* ======================
                                                    HEADER
                                                ====================== */}

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
                                                            {idx + 1}.
                                                        </span>

                                                        <span className="movie-config-name">
                                                            {movieTitle}
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

                                                {/* ======================
                                                    BODY
                                                ====================== */}

                                                {isExpanded && (

                                                    <div className="movie-config-body">

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

                                                        {/* ==================
                                                            EMPTY
                                                        ================== */}

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

                                                                {/* ==================
                                                                    HEADER
                                                                ================== */}

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

                                                                {/* ==================
                                                                    ROWS
                                                                ================== */}

                                                                {movieConfigs.map(
                                                                    (
                                                                        config,
                                                                        index
                                                                    ) => (

                                                                        <div
                                                                            key={
                                                                                config.config_id ||
                                                                                `${movieId}-${index}`
                                                                            }
                                                                            className="config-table-row"
                                                                        >

                                                                            {/* TIME SLOT */}

                                                                            <select
                                                                                value={
                                                                                    config.time_slot ||
                                                                                    'MORNING'
                                                                                }
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
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
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
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
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
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
                                                                                    45
                                                                                }
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
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
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
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
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
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
                                                                    )
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
                                        Cấu hình sẽ được lưu cho từng phim
                                    </span>

                                </div>

                            </div>
                        )}

                    {/* ==================================================
                        NO MOVIE
                    ================================================== */}

                    {selectedCinema &&
                        selectedMovies.length === 0 && (

                            <div className="empty-state">

                                <Film
                                    size={48}
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
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
                onConfirm={closeAlert}
                confirmText="Đóng"
            >

                <div className="admin-alert-content">

                    <p
                        style={{
                            whiteSpace: 'pre-line'
                        }}
                    >
                        {alertModal.message}
                    </p>

                </div>

            </AdminModal>
        </>
    );
};

export default MovieShowtimeConfigPage;