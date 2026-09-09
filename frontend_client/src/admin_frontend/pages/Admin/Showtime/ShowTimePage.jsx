import React, {
    useEffect,
    useState,
    useRef,
    useCallback
} from 'react';

import api from '../../../../api/api';

import {
    CalendarDays,
    Edit,
    Trash2,
    Loader2,
    Film,
    MapPin,
    Clock,
    Sparkles,
    Plus,
    Trash2 as TrashIcon,
    Settings,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// CONSTANTS
// ==========================================================

const TIME_SLOTS = [
    {
        key: 'MORNING',
        label: '🌅 SÁNG (06:00 - 12:00)'
    },
    {
        key: 'AFTERNOON',
        label: '☀️ TRƯA (12:00 - 17:00)'
    },
    {
        key: 'EVENING',
        label: '🌆 CHIỀU (17:00 - 20:00)'
    },
    {
        key: 'NIGHT',
        label: '🌙 TỐI (20:00 - 24:00)'
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
// DEFAULT CONFIG
// ==========================================================

const DEFAULT_CONFIGS = [
    {
        time_slot: 'MORNING',
        room_type: '2D',
        slot_count: 4,
        interval_minutes: 45,
        day_type: 'ALL',
        is_active: 1
    },
    {
        time_slot: 'AFTERNOON',
        room_type: '2D',
        slot_count: 3,
        interval_minutes: 45,
        day_type: 'ALL',
        is_active: 1
    },
    {
        time_slot: 'EVENING',
        room_type: '3D',
        slot_count: 3,
        interval_minutes: 45,
        day_type: 'ALL',
        is_active: 1
    },
    {
        time_slot: 'NIGHT',
        room_type: 'IMAX',
        slot_count: 2,
        interval_minutes: 60,
        day_type: 'ALL',
        is_active: 1
    }
];

// ==========================================================
// INITIAL DATA
// ==========================================================

const initialScheduleData = {
    movie_ids: [],
    cinema_id: '',
    start_date: '',
    end_date: '',
    configs: DEFAULT_CONFIGS.map(config => ({
        ...config
    })),
    showConfigSection: true
};

// ==========================================================
// COMPONENT
// ==========================================================

const ShowTimePage = () => {

    // ======================================================
    // STATE
    // ======================================================

    const [showtimes, setShowtimes] = useState([]);
    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);

    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [showConfigSection, setShowConfigSection] =
        useState(true);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingShowtime, setEditingShowtime] =
        useState(null);

    const [scheduleData, setScheduleData] =
        useState(initialScheduleData);

    const [formErrors, setFormErrors] = useState({});

    const [loadedConfigs, setLoadedConfigs] =
        useState({});

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    const prevSearchRef = useRef('');

    // ======================================================
    // ALERT
    // ======================================================

    const showAlert = (
        title,
        message,
        type = 'default',
        onConfirm = null,
        onCancel = null
    ) => {
        setAlertModal({
            open: true,
            title,
            message,
            type,
            onConfirm,
            onCancel
        });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    // ======================================================
    // FORMAT DATE TIME
    // ======================================================

    const formatDateTime = (dateStr) => {

        if (!dateStr) {
            return {
                date: '--/--/----',
                time: '--:--'
            };
        }

        let normalized = String(dateStr)
            .replace('T', ' ');

        const [datePart, timePart] =
            normalized.split(' ');

        if (!datePart || !timePart) {
            return {
                date: '--/--/----',
                time: '--:--'
            };
        }

        const [
            year,
            month,
            day
        ] = datePart.split('-');

        const [
            hour,
            minute
        ] = timePart.split(':');

        return {
            date: `${day}/${month}/${year}`,
            time: `${hour}:${minute}`
        };
    };

    // ======================================================
    // FETCH SHOWTIMES
    // ======================================================

    const fetchShowtimes = useCallback(
        async (
            page = 1,
            keyword = ''
        ) => {

            if (isFetching.current) {
                return;
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller =
                new AbortController();

            abortControllerRef.current =
                controller;

            isFetching.current = true;
            setLoading(true);

            try {

                const res = await api.get(
                    '/api/showtimes/paginated',
                    {
                        params: {
                            page,
                            limit: 20,
                            search: keyword.trim()
                        },
                        signal: controller.signal
                    }
                );

                setShowtimes(
                    res.data?.data || []
                );

                setPagination(
                    res.data?.pagination || {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 1,
                        hasPreviousPage: false,
                        hasNextPage: false
                    }
                );

            } catch (error) {

                if (
                    error.name === 'AbortError' ||
                    error.code === 'ERR_CANCELED'
                ) {
                    return;
                }

                console.error(
                    'FETCH SHOWTIMES ERROR:',
                    error
                );

                setShowtimes([]);

                showAlert(
                    'Lỗi',
                    'Không thể tải danh sách suất chiếu.',
                    'error'
                );

            } finally {

                setLoading(false);
                isFetching.current = false;

                if (
                    abortControllerRef.current === controller
                ) {
                    abortControllerRef.current = null;
                }
            }
        },
        []
    );

    // ======================================================
    // FETCH INITIAL DATA
    // ======================================================

    const fetchInitialData = useCallback(
        async () => {

            try {

                const [
                    movieRes,
                    cinemaRes
                ] = await Promise.all([
                    api.get('/api/movies'),
                    api.get('/api/cinemas')
                ]);

                setMovies(
                    movieRes.data?.data || []
                );

                setCinemas(
                    cinemaRes.data?.data || []
                );

            } catch (error) {

                console.error(
                    'FETCH INITIAL DATA ERROR:',
                    error
                );

                showAlert(
                    'Lỗi',
                    'Không thể tải danh sách phim hoặc rạp.',
                    'error'
                );
            }
        },
        []
    );

    // ======================================================
    // FETCH ROOMS
    // ======================================================

    const fetchRoomsByCinema = useCallback(
        async (cinemaId) => {

            if (!cinemaId) {
                setRooms([]);
                return [];
            }

            try {

                const res = await api.get(
                    `/api/rooms/cinema/${cinemaId}`
                );

                const roomData =
                    res.data?.data || [];

                setRooms(roomData);

                return roomData;

            } catch (error) {

                console.error(
                    'FETCH ROOMS ERROR:',
                    error
                );

                setRooms([]);

                return [];
            }
        },
        []
    );

    // ======================================================
    // LOAD CONFIG FROM DATABASE
    // ======================================================

    const loadConfigFromDB = useCallback(
        async (
            movieId,
            cinemaId
        ) => {

            if (!movieId || !cinemaId) {
                return null;
            }

            try {

                console.log(
                    '🔍 LOAD CONFIG:',
                    {
                        movieId,
                        cinemaId
                    }
                );

                const res = await api.get(
                    `/api/showtime-config/${movieId}`,
                    {
                        params: {
                            cinema_id: cinemaId
                        }
                    }
                );

                const data =
                    res.data?.data || [];

                console.log(
                    '📋 CONFIG DATABASE:',
                    data
                );

                if (!Array.isArray(data) || data.length === 0) {
                    return null;
                }

                const normalized =
                    data.map(config => ({
                        time_slot:
                            config.time_slot ||
                            'MORNING',

                        room_type:
                            config.room_type ||
                            '2D',

                        slot_count:
                            Number(config.slot_count) || 1,

                        interval_minutes:
                            Number(config.interval_minutes) || 45,

                        day_type:
                            config.day_type ||
                            'ALL',

                        is_active:
                            config.is_active !== undefined
                                ? Number(config.is_active)
                                : 1,

                        config_id:
                            config.config_id
                    }));

                return normalized;

            } catch (error) {

                console.log(
                    'ℹ️ Không có config cũ hoặc lỗi load config:',
                    error.response?.data ||
                    error.message
                );

                return null;
            }
        },
        []
    );

    // ======================================================
    // LOAD CONFIG FOR SELECTED MOVIE
    // ======================================================

    const loadConfigForMovie = useCallback(
        async (
            movieId,
            cinemaId
        ) => {

            if (!movieId || !cinemaId) {
                return null;
            }

            const cacheKey =
                `${movieId}_${cinemaId}`;

            // Nếu đã load rồi thì dùng cache
            if (loadedConfigs[cacheKey]) {
                return loadedConfigs[cacheKey];
            }

            const config =
                await loadConfigFromDB(
                    movieId,
                    cinemaId
                );

            if (config) {

                setLoadedConfigs(prev => ({
                    ...prev,
                    [cacheKey]: config
                }));

                return config;
            }

            return null;
        },
        [
            loadConfigFromDB,
            loadedConfigs
        ]
    );

    // ======================================================
    // INITIAL EFFECT
    // ======================================================

    useEffect(() => {

        fetchShowtimes(1, '');
        fetchInitialData();

        return () => {

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };

    }, [
        fetchShowtimes,
        fetchInitialData
    ]);

    // ======================================================
    // SEARCH EFFECT
    // ======================================================

    useEffect(() => {

        const currentSearch =
            search;

        const previousSearch =
            prevSearchRef.current;

        if (
            currentSearch === previousSearch
        ) {
            return;
        }

        prevSearchRef.current =
            currentSearch;

        const timer =
            setTimeout(() => {

                fetchShowtimes(
                    1,
                    currentSearch
                );

            }, 400);

        return () =>
            clearTimeout(timer);

    }, [
        search,
        fetchShowtimes
    ]);

    // ======================================================
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (page) => {

        fetchShowtimes(
            page,
            search
        );
    };

    // ======================================================
    // CONFIG FUNCTIONS
    // ======================================================

    const addConfig = () => {

        setScheduleData(prev => ({
            ...prev,

            configs: [
                ...prev.configs,

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
    };

    const removeConfig = (index) => {

        setScheduleData(prev => ({
            ...prev,

            configs:
                prev.configs.filter(
                    (_, i) => i !== index
                )
        }));
    };

    const updateConfig = (
        index,
        field,
        value
    ) => {

        setScheduleData(prev => {

            const newConfigs =
                [...prev.configs];

            newConfigs[index] = {
                ...newConfigs[index],
                [field]: value
            };

            return {
                ...prev,
                configs: newConfigs
            };
        });
    };

    // ======================================================
    // OPEN ADD
    // ======================================================

    const handleOpenAdd = () => {

        setEditingShowtime(null);

        setScheduleData({
            movie_ids: [],
            cinema_id: '',
            start_date: '',
            end_date: '',
            configs:
                DEFAULT_CONFIGS.map(config => ({
                    ...config
                })),
            showConfigSection: true
        });

        setRooms([]);
        setFormErrors({});
        setLoadedConfigs({});
        setIsFormOpen(true);
        setShowConfigSection(true);
    };

    // ======================================================
    // OPEN EDIT
    // ======================================================

    const handleOpenEdit = async (
        showtime
    ) => {

        try {

            setLoading(true);

            const res = await api.get(
                `/api/showtimes/detail/${showtime.showtime_id}`
            );

            const st =
                res.data?.data ||
                res.data;

            await fetchRoomsByCinema(
                st.cinema_id
            );

            setEditingShowtime(st);

            setFormErrors({});

            setScheduleData({

                movie_id:
                    st.movie_id,

                cinema_id:
                    st.cinema_id,

                room_ids: [
                    Number(st.room_id)
                ],

                start_date:
                    st.start_time
                        ?.slice(0, 10) ||
                    '',

                end_date:
                    st.start_time
                        ?.slice(0, 10) ||
                    '',

                operating_start:
                    st.start_time
                        ?.slice(11, 16) ||
                    '08:00'
            });

            setIsFormOpen(true);
            setShowConfigSection(false);

        } catch (error) {

            console.error(
                'FETCH SHOWTIME DETAIL ERROR:',
                error
            );

            showAlert(
                'Lỗi',
                'Không thể tải dữ liệu suất chiếu.',
                'error'
            );

        } finally {

            setLoading(false);
        }
    };

    // ======================================================
    // CLOSE FORM
    // ======================================================

    const handleCloseForm = () => {

        if (submitLoading) {
            return;
        }

        setIsFormOpen(false);
        setEditingShowtime(null);
        setFormErrors({});
        setRooms([]);
        setLoadedConfigs({});
    };

    // ======================================================
    // HANDLE CHANGE
    // ======================================================

    const handleChange = async (
        e
    ) => {

        const {
            name,
            value,
            checked
        } = e.target;

        // ----------------------------------------------
        // CLEAR ERROR
        // ----------------------------------------------

        if (formErrors[name]) {

            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        // ----------------------------------------------
        // MOVIE IDS
        // ----------------------------------------------

        if (name === 'movie_ids') {

            const movieId =
                Number(value);

            let nextIds = [];

            setScheduleData(prev => {

                const currentIds =
                    Array.isArray(prev.movie_ids)
                        ? prev.movie_ids
                        : [];

                nextIds = checked
                    ? (
                        currentIds.includes(movieId)
                            ? currentIds
                            : [
                                ...currentIds,
                                movieId
                            ]
                    )
                    : currentIds.filter(
                        id => id !== movieId
                    );

                return {
                    ...prev,
                    movie_ids: nextIds
                };
            });

            // ------------------------------------------------
            // Nếu chọn đúng 1 phim + đã có rạp
            // thì load config ngay
            // ------------------------------------------------

            if (
                checked &&
                nextIds.length === 1 &&
                scheduleData.cinema_id
            ) {

                const config =
                    await loadConfigForMovie(
                        movieId,
                        scheduleData.cinema_id
                    );

                if (config) {

                    setScheduleData(prev => ({
                        ...prev,
                        configs: config
                    }));
                }
            }

            return;
        }

        // ----------------------------------------------
        // CINEMA
        // ----------------------------------------------

        if (name === 'cinema_id') {

            setScheduleData(prev => ({
                ...prev,
                cinema_id: value
            }));

            if (!editingShowtime) {

                await fetchRoomsByCinema(
                    value
                );

                const currentMovieIds =
                    Array.isArray(
                        scheduleData.movie_ids
                    )
                        ? scheduleData.movie_ids
                        : [];

                // Chỉ load config tự động khi
                // đang chọn đúng 1 phim
                if (
                    currentMovieIds.length === 1 &&
                    value
                ) {

                    const config =
                        await loadConfigForMovie(
                            currentMovieIds[0],
                            value
                        );

                    if (config) {

                        setScheduleData(prev => ({
                            ...prev,
                            cinema_id: value,
                            configs: config
                        }));

                    } else {

                        // Không có config DB
                        // giữ config hiện tại
                        setScheduleData(prev => ({
                            ...prev,
                            cinema_id: value
                        }));
                    }
                }
            }

            return;
        }

        // ----------------------------------------------
        // ROOM IDS - EDIT
        // ----------------------------------------------

        if (
            name === 'room_ids' &&
            editingShowtime
        ) {

            const roomId =
                Number(value);

            setScheduleData(prev => {

                const currentRoomIds =
                    Array.isArray(prev.room_ids)
                        ? prev.room_ids
                        : [];

                const nextRoomIds =
                    checked
                        ? (
                            currentRoomIds.includes(roomId)
                                ? currentRoomIds
                                : [
                                    ...currentRoomIds,
                                    roomId
                                ]
                        )
                        : currentRoomIds.filter(
                            id => id !== roomId
                        );

                return {
                    ...prev,
                    room_ids: nextRoomIds
                };
            });

            return;
        }

        // ----------------------------------------------
        // NORMAL FIELD
        // ----------------------------------------------

        setScheduleData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // ======================================================
    // VALIDATE CONFIG
    // ======================================================

    const validateConfigs = () => {

        const configs =
            Array.isArray(scheduleData.configs)
                ? scheduleData.configs
                : [];

        const activeConfigs =
            configs.filter(
                config =>
                    Number(config.slot_count) > 0 &&
                    Number(config.is_active) === 1
            );

        if (activeConfigs.length === 0) {

            return {
                valid: false,
                message:
                    'Vui lòng tạo ít nhất 1 cấu hình suất chiếu đang bật.'
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
                    slot =>
                        slot.key ===
                        config.time_slot
                )
            ) {

                return {
                    valid: false,
                    message:
                        `Cấu hình #${index + 1}: Khung giờ không hợp lệ.`
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
                        `Cấu hình #${index + 1}: Loại phòng không hợp lệ.`
                };
            }

            const slotCount =
                Number(config.slot_count);

            if (
                !Number.isInteger(slotCount) ||
                slotCount < 1 ||
                slotCount > 30
            ) {

                return {
                    valid: false,
                    message:
                        `Cấu hình #${index + 1}: Số suất phải từ 1 đến 30.`
                };
            }

            const interval =
                Number(
                    config.interval_minutes
                );

            if (
                !Number.isInteger(interval) ||
                interval < 30 ||
                interval > 120
            ) {

                return {
                    valid: false,
                    message:
                        `Cấu hình #${index + 1}: Khoảng cách giữa suất phải từ 30 đến 120 phút.`
                };
            }

            if (
                !DAY_TYPES.some(
                    day =>
                        day.key ===
                        (
                            config.day_type ||
                            'ALL'
                        )
                )
            ) {

                return {
                    valid: false,
                    message:
                        `Cấu hình #${index + 1}: Loại ngày không hợp lệ.`
                };
            }
        }

        return {
            valid: true,
            message: ''
        };
    };

    // ======================================================
    // VALIDATE SCHEDULE
    // ======================================================

    const validateSchedule = () => {

        const errors = {};

        // ----------------------------------------------
        // CINEMA
        // ----------------------------------------------

        if (!scheduleData.cinema_id) {

            errors.cinema_id =
                'Vui lòng chọn rạp';
        }

        // ----------------------------------------------
        // START DATE
        // ----------------------------------------------

        if (!scheduleData.start_date) {

            errors.start_date =
                'Vui lòng chọn ngày bắt đầu';
        }

        // ----------------------------------------------
        // END DATE
        // ----------------------------------------------

        if (!scheduleData.end_date) {

            errors.end_date =
                'Vui lòng chọn ngày kết thúc';
        }

        // ----------------------------------------------
        // DATE RANGE
        // ----------------------------------------------

        if (
            scheduleData.start_date &&
            scheduleData.end_date &&
            scheduleData.start_date >
            scheduleData.end_date
        ) {

            errors.end_date =
                'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
        }

        // ----------------------------------------------
        // EDIT
        // ----------------------------------------------

        if (editingShowtime) {

            if (!scheduleData.movie_id) {

                errors.movie_id =
                    'Vui lòng chọn phim';
            }

            if (
                !Array.isArray(
                    scheduleData.room_ids
                ) ||
                scheduleData.room_ids.length === 0
            ) {

                errors.room_ids =
                    'Vui lòng chọn phòng chiếu';
            }

            if (
                !scheduleData.operating_start
            ) {

                errors.operating_start =
                    'Vui lòng chọn giờ';
            }

        } else {

            // ------------------------------------------
            // CREATE
            // ------------------------------------------

            if (
                !Array.isArray(
                    scheduleData.movie_ids
                ) ||
                scheduleData.movie_ids.length === 0
            ) {

                errors.movie_ids =
                    'Vui lòng chọn ít nhất 1 phim';
            }

            // ------------------------------------------
            // CONFIG
            // ------------------------------------------

            const configValidation =
                validateConfigs();

            if (!configValidation.valid) {

                errors.configs =
                    configValidation.message;
            }
        }

        setFormErrors(errors);

        return Object.keys(errors).length === 0;
    };

    // ======================================================
    // NORMALIZE BACKEND RESPONSE
    // ======================================================

    const normalizeScheduleResult = (
        response
    ) => {

        /*
         * Backend có thể trả:
         *
         * {
         *   success: true,
         *   data: [...],
         *   conflicts: [...],
         *   summary: {...}
         * }
         *
         * hoặc:
         *
         * {
         *   data: {
         *      data: [...]
         *   }
         * }
         *
         * Hàm này xử lý cả 2 trường hợp.
         */

        const root =
            response?.data || {};

        let result =
            root;

        // ----------------------------------------------
        // Nếu API wrapper bọc thêm data
        // ----------------------------------------------

        if (
            root?.data &&
            !Array.isArray(root.data) &&
            typeof root.data === 'object'
        ) {

            result =
                root.data;
        }

        // ----------------------------------------------
        // CREATED
        // ----------------------------------------------

        let created = [];

        if (Array.isArray(result?.data)) {

            created =
                result.data;

        } else if (
            Array.isArray(result?.created)
        ) {

            created =
                result.created;

        } else if (
            Array.isArray(result?.showtimes)
        ) {

            created =
                result.showtimes;
        }

        // ----------------------------------------------
        // CONFLICTS
        // ----------------------------------------------

        const conflicts =
            Array.isArray(result?.conflicts)
                ? result.conflicts
                : [];

        // ----------------------------------------------
        // SKIPPED PAST
        // ----------------------------------------------

        const skippedPast =
            Array.isArray(result?.skippedPast)
                ? result.skippedPast
                : [];

        // ----------------------------------------------
        // NO ROOM
        // ----------------------------------------------

        const skippedNoRoom =
            Array.isArray(result?.skippedNoRoom)
                ? result.skippedNoRoom
                : [];

        // ----------------------------------------------
        // OUTSIDE HOURS
        // ----------------------------------------------

        const skippedOutsideHours =
            Array.isArray(
                result?.skippedOutsideHours
            )
                ? result.skippedOutsideHours
                : [];

        // ----------------------------------------------
        // INVALID CONFIG
        // ----------------------------------------------

        const skippedInvalidConfig =
            Array.isArray(
                result?.skippedInvalidConfig
            )
                ? result.skippedInvalidConfig
                : [];

        // ----------------------------------------------
        // SUCCESS
        // ----------------------------------------------

        const success =
            result?.success !== undefined
                ? Boolean(result.success)
                : root?.success !== undefined
                    ? Boolean(root.success)
                    : created.length > 0;

        // ----------------------------------------------
        // MESSAGE
        // ----------------------------------------------

        const message =
            result?.message ||
            root?.message ||
            '';

        // ----------------------------------------------
        // SUMMARY
        // ----------------------------------------------

        const summary =
            result?.summary ||
            root?.summary ||
            {};

        return {
            success,
            message,
            data: created,
            conflicts,
            skippedPast,
            skippedNoRoom,
            skippedOutsideHours,
            skippedInvalidConfig,
            summary,
            usedConfig:
                result?.usedConfig ||
                root?.usedConfig ||
                null
        };
    };

    // ======================================================
    // BUILD RESULT MESSAGE
    // ======================================================

    const buildScheduleResultMessage = (
        normalized
    ) => {

        const {
            data,
            conflicts,
            skippedPast,
            skippedNoRoom,
            skippedOutsideHours,
            skippedInvalidConfig,
            summary
        } = normalized;

        const createdCount =
            data.length;

        const conflictsCount =
            conflicts.length;

        const skippedPastCount =
            skippedPast.length;

        const noRoomCount =
            skippedNoRoom.length;

        const outsideHoursCount =
            skippedOutsideHours.length;

        const invalidConfigCount =
            skippedInvalidConfig.length;

        let message =
            'Tạo lịch chiếu đã hoàn tất.';

        // ==================================================
        // TOTAL
        // ==================================================

        message +=
            `\n\n📊 TỔNG QUAN:`;

        message +=
            `\n✅ Đã tạo: ${createdCount} suất`;

        if (conflictsCount > 0) {

            message +=
                `\n⚠️ Bỏ qua: ${conflictsCount} suất bị trùng`;
        }

        if (skippedPastCount > 0) {

            message +=
                `\n⏭️ Bỏ qua: ${skippedPastCount} suất trong quá khứ`;
        }

        if (noRoomCount > 0) {

            message +=
                `\n🏠 Bỏ qua: ${noRoomCount} suất không có phòng trống`;
        }

        if (outsideHoursCount > 0) {

            message +=
                `\n⏰ Bỏ qua: ${outsideHoursCount} suất ngoài giờ hoạt động`;
        }

        if (invalidConfigCount > 0) {

            message +=
                `\n❌ Bỏ qua: ${invalidConfigCount} cấu hình không hợp lệ`;
        }

        // ==================================================
        // BY MOVIE
        // ==================================================

        if (
            summary?.byMovie &&
            typeof summary.byMovie === 'object'
        ) {

            message +=
                `\n\n🎬 PHÂN BỔ THEO PHIM:`;

            for (
                const [
                    movieId,
                    stats
                ] of Object.entries(
                    summary.byMovie
                )
            ) {

                const title =
                    stats?.title ||
                    `Movie #${movieId}`;

                const count =
                    Number(stats?.count) || 0;

                message +=
                    `\n  🎥 ${title}: ${count} suất`;
            }
        }

        // ==================================================
        // BY ROOM TYPE
        // ==================================================

        if (
            summary?.byRoomType &&
            typeof summary.byRoomType === 'object'
        ) {

            message +=
                `\n\n🏠 PHÂN BỔ THEO HẠNG PHÒNG:`;

            for (
                const [
                    type,
                    count
                ] of Object.entries(
                    summary.byRoomType
                )
            ) {

                message +=
                    `\n  • ${type}: ${Number(count) || 0} suất`;
            }
        }

        // ==================================================
        // BY TIME SLOT
        // ==================================================

        if (
            summary?.byTimeSlot &&
            typeof summary.byTimeSlot === 'object'
        ) {

            message +=
                `\n\n🕐 PHÂN BỔ THEO KHUNG GIỜ:`;

            message +=
                `\n  🌅 Sáng: ${
                    Number(
                        summary.byTimeSlot.MORNING
                    ) || 0
                } suất`;

            message +=
                `\n  ☀️ Trưa: ${
                    Number(
                        summary.byTimeSlot.AFTERNOON
                    ) || 0
                } suất`;

            message +=
                `\n  🌆 Chiều: ${
                    Number(
                        summary.byTimeSlot.EVENING
                    ) || 0
                } suất`;

            message +=
                `\n  🌙 Đêm: ${
                    Number(
                        summary.byTimeSlot.NIGHT
                    ) || 0
                } suất`;
        }

        // ==================================================
        // BY DAY TYPE
        // ==================================================

        if (
            summary?.byDayType &&
            typeof summary.byDayType === 'object'
        ) {

            message +=
                `\n\n📅 PHÂN BỔ THEO LOẠI NGÀY:`;

            if (
                summary.byDayType.ALL !== undefined
            ) {

                message +=
                    `\n  • ALL: ${
                        Number(
                            summary.byDayType.ALL
                        ) || 0
                    } suất`;
            }

            if (
                summary.byDayType.WEEKDAY !== undefined
            ) {

                message +=
                    `\n  • WEEKDAY: ${
                        Number(
                            summary.byDayType.WEEKDAY
                        ) || 0
                    } suất`;
            }

            if (
                summary.byDayType.WEEKEND !== undefined
            ) {

                message +=
                    `\n  • WEEKEND: ${
                        Number(
                            summary.byDayType.WEEKEND
                        ) || 0
                    } suất`;
            }
        }

        // ==================================================
        // ZERO CREATED
        // ==================================================

        if (createdCount === 0) {

            message +=
                `\n\n⚠️ KHÔNG TẠO ĐƯỢC SUẤT NÀO!`;

            message +=
                `\n\n🔍 Hệ thống đã kiểm tra:`;

            message +=
                `\n  • 🎬 Phim được chọn`;

            message +=
                `\n  • 🏠 Phòng chiếu`;

            message +=
                `\n  • ⚙️ movie_showtime_config`;

            message +=
                `\n  • 📅 Loại ngày WEEKDAY/WEEKEND`;

            message +=
                `\n  • ⏰ Giờ hoạt động`;

            message +=
                `\n  • 🚫 Trùng suất`;

            message +=
                `\n  • ⏭️ Suất trong quá khứ`;

            if (
                normalized.usedConfig
            ) {

                message +=
                    `\n\n⚙️ Backend có trả thông tin cấu hình sử dụng.`;
            }
        }

        return message;
    };

    // ======================================================
    // HANDLE SUBMIT
    // ======================================================

    const handleSubmit = async (
        e
    ) => {

        e.preventDefault();

        // ==================================================
        // EDIT SHOWTIME
        // ==================================================

        if (editingShowtime) {

            if (!validateSchedule()) {
                return;
            }

            try {

                setSubmitLoading(true);
                setFormErrors({});

                await api.put(
                    `/api/showtimes/${editingShowtime.showtime_id}`,
                    {
                        movie_id:
                            Number(
                                scheduleData.movie_id
                            ),

                        cinema_id:
                            Number(
                                scheduleData.cinema_id
                            ),

                        room_id:
                            Number(
                                scheduleData.room_ids[0]
                            ),

                        start_time:
                            `${scheduleData.start_date} ${scheduleData.operating_start}`
                    }
                );

                setIsFormOpen(false);

                await fetchShowtimes(
                    pagination.page,
                    search
                );

                showAlert(
                    'Thành công',
                    'Cập nhật suất chiếu thành công.',
                    'success'
                );

            } catch (error) {

                console.error(
                    'UPDATE SHOWTIME ERROR:',
                    error
                );

                showAlert(
                    'Lỗi',
                    error.response?.data?.message ||
                    'Không thể cập nhật suất chiếu.',
                    'error'
                );

            } finally {

                setSubmitLoading(false);
            }

            return;
        }

        // ==================================================
        // CREATE AUTO
        // ==================================================

        if (!validateSchedule()) {
            return;
        }

        try {

            setSubmitLoading(true);
            setFormErrors({});

            const movieIds =
                Array.isArray(
                    scheduleData.movie_ids
                )
                    ? scheduleData.movie_ids
                    : [];

            // ==================================================
            // VALID CONFIG
            // ==================================================

            const validConfigs =
                scheduleData.configs
                    .filter(
                        config =>
                            Number(
                                config.slot_count
                            ) > 0 &&
                            Number(
                                config.is_active
                            ) === 1
                    )
                    .map(config => ({
                        time_slot:
                            config.time_slot,

                        room_type:
                            config.room_type,

                        slot_count:
                            Number(
                                config.slot_count
                            ),

                        interval_minutes:
                            Number(
                                config.interval_minutes
                            ),

                        day_type:
                            config.day_type ||
                            'ALL',

                        is_active: 1
                    }));

            console.log(
                '📋 CONFIG SẼ LƯU:',
                validConfigs
            );

            // ==================================================
            // 1. SAVE CONFIG TO DATABASE
            // ==================================================

            const configErrors = [];

            for (
                const movieId of movieIds
            ) {

                try {

                    console.log(
                        `💾 LƯU CONFIG CHO MOVIE ${movieId}`
                    );

                    const configRes =
                        await api.post(
                            `/api/showtime-config/${movieId}`,
                            {
                                cinema_id:
                                    Number(
                                        scheduleData.cinema_id
                                    ),

                                configs:
                                    validConfigs
                            }
                        );

                    console.log(
                        `✅ CONFIG MOVIE ${movieId}:`,
                        configRes.data
                    );

                } catch (err) {

                    console.error(
                        `❌ KHÔNG THỂ LƯU CONFIG MOVIE ${movieId}:`,
                        err.response?.data ||
                        err
                    );

                    configErrors.push({
                        movieId,
                        message:
                            err.response?.data?.message ||
                            err.message
                    });
                }
            }

            // ==================================================
            // NẾU CONFIG KHÔNG LƯU ĐƯỢC CHO BẤT KỲ PHIM NÀO
            // ==================================================

            if (
                configErrors.length === movieIds.length
            ) {

                setSubmitLoading(false);

                showAlert(
                    '❌ Không thể lưu cấu hình',
                    'Không thể lưu cấu hình suất chiếu vào database cho các phim đã chọn.\n\n' +
                    configErrors
                        .map(
                            item =>
                                `• Movie ${item.movieId}: ${item.message}`
                        )
                        .join('\n'),
                    'error'
                );

                return;
            }

            // ==================================================
            // 2. CREATE AUTO SCHEDULE
            // ==================================================

            const payload = {

                movies:
                    movieIds.map(
                        id => ({
                            movie_id:
                                Number(id)
                        })
                    ),

                cinema_id:
                    Number(
                        scheduleData.cinema_id
                    ),

                start_date:
                    scheduleData.start_date,

                end_date:
                    scheduleData.end_date
            };

            console.log(
                '📤 AUTO SCHEDULE PAYLOAD:',
                payload
            );

            // ==================================================
            // POST SCHEDULE
            // ==================================================

            const res =
                await api.post(
                    '/api/showtimes/schedule',
                    payload
                );

            console.log(
                '📥 RAW RESPONSE TỪ BACKEND:',
                res.data
            );

            // ==================================================
            // NORMALIZE RESPONSE
            // ==================================================

            const result =
                normalizeScheduleResult(
                    res
                );

            console.log(
                '📊 NORMALIZED RESULT:',
                result
            );

            // ==================================================
            // REFRESH DATA
            // ==================================================

            await fetchShowtimes(
                pagination.page,
                search
            );

            // ==================================================
            // SUCCESS / FAILURE
            // ==================================================

            const createdCount =
                result.data.length;

            const message =
                buildScheduleResultMessage(
                    result
                );

            // --------------------------------------------------
            // ZERO CREATED
            // --------------------------------------------------

            if (
                !result.success ||
                createdCount === 0
            ) {

                setIsFormOpen(false);

                showAlert(
                    '⚠️ Không tạo được lịch',
                    message,
                    'warning'
                );

                return;
            }

            // --------------------------------------------------
            // CREATED SUCCESSFULLY
            // --------------------------------------------------

            setIsFormOpen(false);

            showAlert(
                '✅ Tạo lịch chiếu thành công',
                message,
                'success'
            );

        } catch (error) {

            console.error(
                'CREATE SCHEDULE ERROR:',
                error
            );

            console.error(
                'BACKEND RESPONSE:',
                error.response?.data
            );

            const backendField =
                error.response?.data?.field;

            const backendMessage =
                error.response?.data?.message ||
                'Không thể tạo lịch chiếu.';

            if (backendField) {

                setFormErrors({
                    [backendField]:
                        backendMessage
                });

            } else {

                showAlert(
                    '❌ Không thể tạo lịch',
                    backendMessage,
                    'error'
                );
            }

        } finally {

            setSubmitLoading(false);
        }
    };

    // ======================================================
    // DELETE
    // ======================================================

    const handleDelete = (
        showtime
    ) => {

        showAlert(
            'Xác nhận xóa',

            `Bạn có chắc muốn xóa suất chiếu phim "${showtime.title}"?`,

            'warning',

            async () => {

                try {

                    await api.delete(
                        `/api/showtimes/${showtime.showtime_id}`
                    );

                    closeAlert();

                    const currentPage =
                        pagination.page;

                    const newPage =
                        showtimes.length === 1 &&
                        currentPage > 1
                            ? currentPage - 1
                            : currentPage;

                    await fetchShowtimes(
                        newPage,
                        search
                    );

                    showAlert(
                        'Thành công',
                        'Xóa suất chiếu thành công.',
                        'success'
                    );

                } catch (error) {

                    closeAlert();

                    showAlert(
                        'Lỗi',
                        error.response?.data?.message ||
                        'Không thể xóa suất chiếu.',
                        'error'
                    );
                }
            },

            closeAlert
        );
    };

    // ======================================================
    // COLUMNS
    // ======================================================

    const columns = [

        // --------------------------------------------------
        // MOVIE
        // --------------------------------------------------

        {
            title: 'Phim',

            key: 'title',

            render: row => (

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >

                    <div
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#dbeafe',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Film size={18} />
                    </div>

                    <div>

                        <div
                            style={{
                                fontWeight: '600'
                            }}
                        >
                            {row.title}
                        </div>

                        <small
                            style={{
                                color: '#64748b'
                            }}
                        >
                            {row.duration} phút
                        </small>

                    </div>

                </div>
            )
        },

        // --------------------------------------------------
        // CINEMA / ROOM
        // --------------------------------------------------

        {
            title: 'Rạp / Phòng',

            key: 'cinema_name',

            render: row => (

                <div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: '600'
                        }}
                    >

                        <MapPin size={14} />

                        {row.cinema_name}

                    </div>

                    <div
                        className="status-badge"
                        style={{
                            marginTop: '6px',
                            width: 'fit-content'
                        }}
                    >
                        {row.room_name}
                        {' '}
                        ({row.room_type})
                    </div>

                </div>
            )
        },

        // --------------------------------------------------
        // DATE
        // --------------------------------------------------

        {
            title: 'Ngày chiếu',

            key: 'start_time',

            render: row =>
                formatDateTime(
                    row.start_time
                ).date
        },

        // --------------------------------------------------
        // TIME
        // --------------------------------------------------

        {
            title: 'Giờ chiếu',

            key: 'time',

            render: row => (

                <span
                    className="status-badge pending"
                >

                    <Clock
                        size={13}
                        style={{
                            marginRight: '4px'
                        }}
                    />

                    {
                        formatDateTime(
                            row.start_time
                        ).time
                    }

                </span>
            )
        },

        // --------------------------------------------------
        // ACTIONS
        // --------------------------------------------------

        {
            title: 'Thao tác',

            key: 'actions',

            render: row => (

                <div
                    className="admin-table-actions"
                >

                    <button
                        className="admin-action-btn edit-btn"
                        onClick={() =>
                            handleOpenEdit(row)
                        }
                    >
                        <Edit size={16} />
                    </button>

                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() =>
                            handleDelete(row)
                        }
                    >
                        <Trash2 size={16} />
                    </button>

                </div>
            )
        }
    ];

    // ======================================================
    // RENDER CONFIG FORM
    // ======================================================

    const renderConfigForm = () => {

        if (editingShowtime) {
            return null;
        }

        const activeCount =
            scheduleData.configs.filter(
                config =>
                    Number(config.slot_count) > 0 &&
                    Number(config.is_active) === 1
            ).length;

        return (

            <div
                style={{
                    marginBottom: '20px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: '#f8fafc'
                }}
            >

                {/* ==========================================
                    HEADER
                =========================================== */}

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        marginBottom:
                            showConfigSection
                                ? '12px'
                                : '0'
                    }}
                    onClick={() =>
                        setShowConfigSection(
                            !showConfigSection
                        )
                    }
                >

                    <h4
                        style={{
                            margin: 0,
                            color: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >

                        <Settings size={18} />

                        📋 Cấu hình suất chiếu

                        <span
                            style={{
                                fontSize: '12px',
                                color: '#94a3b8',
                                fontWeight: '400'
                            }}
                        >
                            ({activeCount} dòng)
                        </span>

                    </h4>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >

                        {
                            showConfigSection
                                ? <ChevronUp size={18} />
                                : <ChevronDown size={18} />
                        }

                    </div>

                </div>

                {/* ==========================================
                    CONTENT
                =========================================== */}

                {showConfigSection && (

                    <>

                        {/* ======================================
                            ADD BUTTON
                        ======================================= */}

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                marginBottom: '12px',
                                marginTop: '8px'
                            }}
                        >

                            <button
                                type="button"
                                onClick={addConfig}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 14px',
                                    background: '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}
                            >

                                <Plus size={16} />

                                Thêm dòng

                            </button>

                        </div>

                        {/* ======================================
                            ERROR
                        ======================================= */}

                        {formErrors.configs && (

                            <div
                                style={{
                                    marginBottom: '10px',
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#dc2626',
                                    fontSize: '13px'
                                }}
                            >
                                ⚠️ {formErrors.configs}
                            </div>
                        )}

                        {/* ======================================
                            EMPTY
                        ======================================= */}

                        {scheduleData.configs.length === 0 ? (

                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '20px',
                                    color: '#94a3b8'
                                }}
                            >

                                <p>
                                    Chưa có cấu hình.
                                    Bấm "Thêm dòng" để bắt đầu.
                                </p>

                            </div>

                        ) : (

                            <>

                                {/* ==================================
                                    TABLE HEADER
                                =================================== */}

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                            '1.2fr 0.8fr 0.6fr 0.6fr 1fr 0.5fr 40px',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        background: '#f1f5f9',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#64748b',
                                        textTransform: 'uppercase',
                                        marginBottom: '6px'
                                    }}
                                >

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
                                        K/c
                                    </span>

                                    <span>
                                        Áp dụng
                                    </span>

                                    <span>
                                        Bật
                                    </span>

                                    <span />

                                </div>

                                {/* ==================================
                                    CONFIG ROWS
                                =================================== */}

                                {scheduleData.configs.map(
                                    (
                                        config,
                                        index
                                    ) => (

                                        <div
                                            key={
                                                config.config_id ||
                                                index
                                            }
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns:
                                                    '1.2fr 0.8fr 0.6fr 0.6fr 1fr 0.5fr 40px',
                                                gap: '8px',
                                                padding: '6px 12px',
                                                background: '#ffffff',
                                                borderRadius: '6px',
                                                border:
                                                    '1px solid #e2e8f0',
                                                marginBottom: '4px',
                                                alignItems: 'center'
                                            }}
                                        >

                                            {/* TIME SLOT */}

                                            <select
                                                value={
                                                    config.time_slot
                                                }
                                                onChange={
                                                    e =>
                                                        updateConfig(
                                                            index,
                                                            'time_slot',
                                                            e.target.value
                                                        )
                                                }
                                                style={{
                                                    padding: '4px 6px',
                                                    border:
                                                        '1px solid #e2e8f0',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    background: '#fff'
                                                }}
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
                                                    config.room_type
                                                }
                                                onChange={
                                                    e =>
                                                        updateConfig(
                                                            index,
                                                            'room_type',
                                                            e.target.value
                                                        )
                                                }
                                                style={{
                                                    padding: '4px 6px',
                                                    border:
                                                        '1px solid #e2e8f0',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    background: '#fff'
                                                }}
                                            >

                                                {ROOM_TYPES.map(
                                                    type => (

                                                        <option
                                                            key={type}
                                                            value={type}
                                                        >
                                                            {type}
                                                        </option>

                                                    )
                                                )}

                                            </select>

                                            {/* SLOT COUNT */}

                                            <input
                                                type="number"
                                                value={
                                                    config.slot_count
                                                }
                                                onChange={
                                                    e =>
                                                        updateConfig(
                                                            index,
                                                            'slot_count',
                                                            Number(
                                                                e.target.value
                                                            )
                                                        )
                                                }
                                                min="0"
                                                max="30"
                                                style={{
                                                    padding: '4px 6px',
                                                    border:
                                                        '1px solid #e2e8f0',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    width: '100%'
                                                }}
                                            />

                                            {/* INTERVAL */}

                                            <input
                                                type="number"
                                                value={
                                                    config.interval_minutes
                                                }
                                                onChange={
                                                    e =>
                                                        updateConfig(
                                                            index,
                                                            'interval_minutes',
                                                            Number(
                                                                e.target.value
                                                            )
                                                        )
                                                }
                                                min="30"
                                                max="120"
                                                step="5"
                                                style={{
                                                    padding: '4px 6px',
                                                    border:
                                                        '1px solid #e2e8f0',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    width: '100%'
                                                }}
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
                                                            index,
                                                            'day_type',
                                                            e.target.value
                                                        )
                                                }
                                                style={{
                                                    padding: '4px 6px',
                                                    border:
                                                        '1px solid #e2e8f0',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    background: '#fff'
                                                }}
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
                                                    ) === 1
                                                }
                                                onChange={
                                                    e =>
                                                        updateConfig(
                                                            index,
                                                            'is_active',
                                                            e.target.checked
                                                                ? 1
                                                                : 0
                                                        )
                                                }
                                                style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    accentColor:
                                                        '#3b82f6',
                                                    cursor: 'pointer'
                                                }}
                                            />

                                            {/* DELETE */}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeConfig(
                                                        index
                                                    )
                                                }
                                                style={{
                                                    padding: '4px',
                                                    background:
                                                        'transparent',
                                                    color:
                                                        '#dc2626',
                                                    border:
                                                        'none',
                                                    borderRadius:
                                                        '4px',
                                                    cursor:
                                                        'pointer',
                                                    display:
                                                        'flex',
                                                    alignItems:
                                                        'center',
                                                    justifyContent:
                                                        'center'
                                                }}
                                            >

                                                <TrashIcon
                                                    size={15}
                                                />

                                            </button>

                                        </div>
                                    )
                                )}

                            </>
                        )}

                        {/* ======================================
                            HELP
                        ======================================= */}

                        <div
                            style={{
                                marginTop: '8px',
                                fontSize: '12px',
                                color: '#94a3b8'
                            }}
                        >
                            💡 Cấu hình sẽ được lưu vào
                            <strong>
                                {' '}movie_showtime_config
                            </strong>
                            {' '}và dùng cho các lần tạo lịch sau.
                        </div>

                    </>
                )}

            </div>
        );
    };

    // ======================================================
    // RENDER
    // ======================================================

    return (

        <>

            {/* ==================================================
                MAIN PAGE
            ================================================== */}

            <AdminPage
                title="Quản lý lịch chiếu"
                subtitle="Tạo lịch chiếu và cấu hình suất chiếu cho từng phim"
                icon={
                    <CalendarDays size={30} />
                }
                buttonText="Tạo lịch chiếu"
                onAdd={handleOpenAdd}
                searchValue={search}
                onSearchChange={setSearch}
            >

                {loading ? (

                    <div className="admin-loading">

                        <Loader2
                            size={32}
                            className="spin-icon"
                        />

                        <span>
                            Đang tải dữ liệu...
                        </span>

                    </div>

                ) : (

                    <>

                        <AdminTable
                            columns={columns}
                            data={showtimes}
                        />

                        <AdminPagination
                            currentPage={
                                pagination.page
                            }
                            totalPages={
                                pagination.totalPages
                            }
                            onPageChange={
                                handlePageChange
                            }
                        />

                    </>
                )}

            </AdminPage>

            {/* ==================================================
                FORM MODAL
            ================================================== */}

            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title={
                    editingShowtime
                        ? 'Cập nhật suất chiếu'
                        : 'Tạo lịch chiếu'
                }
                type="default"
                size="lg"
            >

                {/* ==================================================
                    CREATE INFO
                ================================================== */}

                {!editingShowtime && (

                    <div
                        style={{
                            marginBottom: '20px',
                            padding: '16px',
                            borderRadius: '12px',
                            background:
                                'rgba(59, 130, 246, 0.08)',
                            border:
                                '1px solid rgba(59, 130, 246, 0.15)'
                        }}
                    >

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '600',
                                marginBottom: '8px'
                            }}
                        >

                            <Sparkles size={18} />

                            Tạo lịch chiếu + Lưu cấu hình

                        </div>

                        <div
                            style={{
                                fontSize: '14px',
                                color: '#64748b',
                                lineHeight: '1.6'
                            }}
                        >

                            <strong>
                                Hệ thống sẽ:
                            </strong>

                            <br />

                            1. 📝 Lưu cấu hình suất chiếu vào hệ thống

                            <br />

                            2. 🎬 Tạo lịch chiếu theo cấu hình

                            <br />

                            3. 📅 Tự xử lý WEEKDAY / WEEKEND

                            <br />

                            4. 🏠 Tự tìm phòng đúng loại và tránh trùng

                            <br />
                            <br />

                            <strong>
                                💡 Lần sau chỉ cần chọn phim + rạp + ngày là tạo được lịch!
                            </strong>

                        </div>

                    </div>
                )}

                {/* ==================================================
                    FORM
                ================================================== */}

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}
                >

                    {/* ==================================================
                        MOVIE
                    ================================================== */}

                    {!editingShowtime && (

                        <div>

                            <label
                                style={{
                                    fontWeight: '500',
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#1e293b'
                                }}
                            >

                                Chọn phim

                                <span
                                    style={{
                                        color: '#64748b',
                                        fontSize: '13px',
                                        fontWeight: '400',
                                        marginLeft: '8px'
                                    }}
                                >
                                    (Có thể chọn nhiều phim)
                                </span>

                            </label>

                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    padding: '12px',
                                    border:
                                        '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    background: '#f8fafc',
                                    maxHeight: '150px',
                                    overflowY: 'auto'
                                }}
                            >

                                {movies.map(
                                    movie => {

                                        const isChecked =
                                            scheduleData.movie_ids?.includes(
                                                movie.movie_id
                                            );

                                        return (

                                            <label
                                                key={
                                                    movie.movie_id
                                                }
                                                style={{
                                                    display:
                                                        'flex',
                                                    alignItems:
                                                        'center',
                                                    gap: '6px',
                                                    padding:
                                                        '4px 12px',
                                                    borderRadius:
                                                        '16px',
                                                    cursor:
                                                        'pointer',
                                                    fontSize:
                                                        '13px',
                                                    background:
                                                        isChecked
                                                            ? '#dbeafe'
                                                            : '#ffffff',
                                                    border:
                                                        isChecked
                                                            ? '2px solid #3b82f6'
                                                            : '1px solid #e2e8f0'
                                                }}
                                            >

                                                <input
                                                    type="checkbox"
                                                    name="movie_ids"
                                                    value={
                                                        movie.movie_id
                                                    }
                                                    checked={
                                                        isChecked
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                    style={{
                                                        accentColor:
                                                            '#3b82f6'
                                                    }}
                                                />

                                                {movie.title}

                                            </label>
                                        );
                                    }
                                )}

                            </div>

                            {formErrors.movie_ids && (

                                <span
                                    style={{
                                        color:
                                            '#ef4444',
                                        fontSize:
                                            '13px'
                                    }}
                                >
                                    {formErrors.movie_ids}
                                </span>
                            )}

                        </div>
                    )}

                    {/* ==================================================
                        EDIT MOVIE
                    ================================================== */}

                    {editingShowtime && (

                        <div>

                            <label
                                style={{
                                    fontWeight: '500',
                                    display: 'block',
                                    marginBottom: '4px',
                                    color: '#1e293b'
                                }}
                            >
                                Phim
                            </label>

                            <input
                                type="text"
                                value={
                                    editingShowtime.title ||
                                    ''
                                }
                                disabled
                                style={{
                                    width: '100%',
                                    padding:
                                        '8px 12px',
                                    border:
                                        '1px solid #e2e8f0',
                                    borderRadius:
                                        '6px',
                                    fontSize:
                                        '14px',
                                    background:
                                        '#f8fafc'
                                }}
                            />

                        </div>
                    )}

                    {/* ==================================================
                        CINEMA
                    ================================================== */}

                    <div>

                        <label
                            style={{
                                fontWeight: '500',
                                display: 'block',
                                marginBottom: '4px',
                                color: '#1e293b'
                            }}
                        >
                            Rạp chiếu
                        </label>

                        <select
                            name="cinema_id"
                            value={
                                scheduleData.cinema_id
                            }
                            onChange={
                                handleChange
                            }
                            disabled={
                                Boolean(editingShowtime)
                            }
                            style={{
                                width: '100%',
                                padding:
                                    '8px 12px',
                                border:
                                    '1px solid #e2e8f0',
                                borderRadius:
                                    '6px',
                                fontSize:
                                    '14px',
                                background:
                                    editingShowtime
                                        ? '#f8fafc'
                                        : '#fff'
                            }}
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
                                    </option>
                                )
                            )}

                        </select>

                        {formErrors.cinema_id && (

                            <span
                                style={{
                                    color:
                                        '#ef4444',
                                    fontSize:
                                        '13px'
                                }}
                            >
                                {
                                    formErrors.cinema_id
                                }
                            </span>
                        )}

                    </div>

                    {/* ==================================================
                        EDIT ROOM
                    ================================================== */}

                    {editingShowtime && (

                        <div>

                            <label
                                style={{
                                    fontWeight: '500',
                                    display: 'block',
                                    marginBottom: '8px',
                                    color: '#1e293b'
                                }}
                            >
                                Phòng chiếu
                            </label>

                            <div
                                style={{
                                    display:
                                        'flex',
                                    flexWrap:
                                        'wrap',
                                    gap:
                                        '8px',
                                    padding:
                                        '12px',
                                    border:
                                        '1px solid #e2e8f0',
                                    borderRadius:
                                        '8px',
                                    background:
                                        '#f8fafc'
                                }}
                            >

                                {rooms.map(
                                    room => {

                                        const checked =
                                            scheduleData.room_ids?.includes(
                                                Number(
                                                    room.room_id
                                                )
                                            );

                                        return (

                                            <label
                                                key={
                                                    room.room_id
                                                }
                                                style={{
                                                    display:
                                                        'flex',
                                                    alignItems:
                                                        'center',
                                                    gap:
                                                        '6px',
                                                    padding:
                                                        '6px 10px',
                                                    borderRadius:
                                                        '6px',
                                                    cursor:
                                                        'pointer',
                                                    background:
                                                        checked
                                                            ? '#dbeafe'
                                                            : '#fff',
                                                    border:
                                                        checked
                                                            ? '1px solid #3b82f6'
                                                            : '1px solid #e2e8f0'
                                                }}
                                            >

                                                <input
                                                    type="checkbox"
                                                    name="room_ids"
                                                    value={
                                                        room.room_id
                                                    }
                                                    checked={
                                                        checked
                                                    }
                                                    onChange={
                                                        handleChange
                                                    }
                                                />

                                                {room.room_name}
                                                {' '}
                                                (
                                                {room.room_type}
                                                )

                                            </label>
                                        );
                                    }
                                )}

                            </div>

                            {formErrors.room_ids && (

                                <span
                                    style={{
                                        color:
                                            '#ef4444',
                                        fontSize:
                                            '13px'
                                    }}
                                >
                                    {
                                        formErrors.room_ids
                                    }
                                </span>
                            )}

                        </div>
                    )}

                    {/* ==================================================
                        DATE
                    ================================================== */}

                    <div
                        style={{
                            display:
                                'grid',
                            gridTemplateColumns:
                                '1fr 1fr',
                            gap:
                                '16px'
                        }}
                    >

                        {/* START */}

                        <div>

                            <label
                                style={{
                                    fontWeight:
                                        '500',
                                    display:
                                        'block',
                                    marginBottom:
                                        '4px',
                                    color:
                                        '#1e293b'
                                }}
                            >
                                Ngày bắt đầu
                            </label>

                            <input
                                type="date"
                                name="start_date"
                                value={
                                    scheduleData.start_date
                                }
                                onChange={
                                    handleChange
                                }
                                style={{
                                    width:
                                        '100%',
                                    padding:
                                        '8px 12px',
                                    border:
                                        '1px solid #e2e8f0',
                                    borderRadius:
                                        '6px',
                                    fontSize:
                                        '14px'
                                }}
                            />

                            {formErrors.start_date && (

                                <span
                                    style={{
                                        color:
                                            '#ef4444',
                                        fontSize:
                                            '13px'
                                    }}
                                >
                                    {
                                        formErrors.start_date
                                    }
                                </span>
                            )}

                        </div>

                        {/* END */}

                        <div>

                            <label
                                style={{
                                    fontWeight:
                                        '500',
                                    display:
                                        'block',
                                    marginBottom:
                                        '4px',
                                    color:
                                        '#1e293b'
                                }}
                            >
                                Ngày kết thúc
                            </label>

                            <input
                                type="date"
                                name="end_date"
                                value={
                                    scheduleData.end_date
                                }
                                onChange={
                                    handleChange
                                }
                                style={{
                                    width:
                                        '100%',
                                    padding:
                                        '8px 12px',
                                    border:
                                        '1px solid #e2e8f0',
                                    borderRadius:
                                        '6px',
                                    fontSize:
                                        '14px'
                                }}
                            />

                            {formErrors.end_date && (

                                <span
                                    style={{
                                        color:
                                            '#ef4444',
                                        fontSize:
                                            '13px'
                                    }}
                                >
                                    {
                                        formErrors.end_date
                                    }
                                </span>
                            )}

                        </div>

                    </div>

                    {/* ==================================================
                        EDIT TIME
                    ================================================== */}

                    {editingShowtime && (

                        <div>

                            <label
                                style={{
                                    fontWeight:
                                        '500',
                                    display:
                                        'block',
                                    marginBottom:
                                        '4px',
                                    color:
                                        '#1e293b'
                                }}
                            >
                                Giờ chiếu
                            </label>

                            <input
                                type="time"
                                name="operating_start"
                                value={
                                    scheduleData.operating_start ||
                                    ''
                                }
                                onChange={
                                    handleChange
                                }
                                style={{
                                    width:
                                        '100%',
                                    padding:
                                        '8px 12px',
                                    border:
                                        '1px solid #e2e8f0',
                                    borderRadius:
                                        '6px',
                                    fontSize:
                                        '14px'
                                }}
                            />

                            {formErrors.operating_start && (

                                <span
                                    style={{
                                        color:
                                            '#ef4444',
                                        fontSize:
                                            '13px'
                                    }}
                                >
                                    {
                                        formErrors.operating_start
                                    }
                                </span>
                            )}

                        </div>
                    )}

                    {/* ==================================================
                        CONFIG
                    ================================================== */}

                    {renderConfigForm()}

                    {/* ==================================================
                        SUBMIT
                    ================================================== */}

                    <button
                        type="submit"
                        onClick={
                            handleSubmit
                        }
                        disabled={
                            submitLoading
                        }
                        style={{
                            padding:
                                '12px 24px',
                            background:
                                submitLoading
                                    ? '#94a3b8'
                                    : '#3b82f6',
                            color:
                                '#fff',
                            border:
                                'none',
                            borderRadius:
                                '6px',
                            fontSize:
                                '16px',
                            fontWeight:
                                '600',
                            cursor:
                                submitLoading
                                    ? 'not-allowed'
                                    : 'pointer',
                            display:
                                'flex',
                            alignItems:
                                'center',
                            justifyContent:
                                'center',
                            gap:
                                '8px'
                        }}
                    >

                        {submitLoading ? (

                            <>

                                <Loader2
                                    size={20}
                                    className="spin-icon"
                                />

                                Đang xử lý...

                            </>

                        ) : (

                            editingShowtime
                                ? 'Lưu thay đổi'
                                : '🚀 Tạo lịch chiếu'
                        )}

                    </button>

                </div>

            </AdminModal>

            {/* ==================================================
                ALERT MODAL
            ================================================== */}

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
                    alertModal.onConfirm ||
                    closeAlert
                }
                onCancel={
                    alertModal.onCancel ||
                    closeAlert
                }
                confirmText="Xác nhận"
                cancelText="Hủy"
            >

                <div
                    className="admin-alert-content"
                >

                    <p
                        style={{
                            whiteSpace:
                                'pre-wrap',
                            lineHeight:
                                '1.6'
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

export default ShowTimePage;