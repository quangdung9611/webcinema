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
    Info
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';


// ==========================================================
// ROOM TYPES
// ==========================================================
//
// Auto scheduling chỉ cho phép chọn HẠNG PHÒNG.
// Backend sẽ tự tìm room_id thực tế.
// ==========================================================

const ROOM_TYPES = [
    {
        value: '2D',
        label: '2D',
        icon: '🎬'
    },
    {
        value: '3D',
        label: '3D',
        icon: '🕶️'
    },
    {
        value: 'VIP',
        label: 'VIP',
        icon: '👑'
    },
    {
        value: 'IMAX',
        label: 'IMAX',
        icon: '🌌'
    }
];


// ==========================================================
// DISTRIBUTION
// ==========================================================

const DISTRIBUTION_OPTIONS = [
    {
        value: 'cold',
        label: '❄️ Ít - COLD (120 phút/suất)'
    },
    {
        value: 'normal',
        label: '📊 Trung bình - NORMAL (75 phút/suất)'
    },
    {
        value: 'hot',
        label: '🔥 Nhiều - HOT (45 phút/suất)'
    }
];


// ==========================================================
// INITIAL DATA
// ==========================================================

const initialScheduleData = {
    movie_id: '',
    cinema_id: '',

    // AUTO
    room_types: [],

    // EDIT
    room_ids: [],

    start_date: '',
    end_date: '',

    // Chỉ dùng cho EDIT
    operating_start: '08:00',

    distribution_level: 'normal'
};


// ==========================================================
// COMPONENT
// ==========================================================

const ShowTimePage = () => {

    // ======================================================
    // STATES
    // ======================================================

    const [showtimes, setShowtimes] = useState([]);

    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);

    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);


    // ======================================================
    // MODAL
    // ======================================================

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingShowtime, setEditingShowtime] = useState(null);

    const [scheduleData, setScheduleData] = useState(
        initialScheduleData
    );

    const [formErrors, setFormErrors] = useState({});


    // ======================================================
    // ALERT MODAL
    // ======================================================

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });


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
    // TIME HELPERS
    // ======================================================

    const formatDateTime = (dateStr) => {

        if (!dateStr) {

            return {
                date: '--/--/----',
                time: '--:--'
            };

        }

        let normalized = String(dateStr);

        normalized = normalized.replace('T', ' ');

        const [datePart, timePart] =
            normalized.split(' ');

        if (!datePart || !timePart) {

            return {
                date: '--/--/----',
                time: '--:--'
            };

        }

        const [year, month, day] =
            datePart.split('-');

        const [hour, minute] =
            timePart.split(':');

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

                const showtimesData =
                    res.data?.data || [];

                const paginationData =
                    res.data?.pagination || {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 1,
                        hasPreviousPage: false,
                        hasNextPage: false
                    };

                setShowtimes(
                    showtimesData
                );

                setPagination(
                    paginationData
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
                    abortControllerRef.current ===
                    controller
                ) {

                    abortControllerRef.current =
                        null;

                }

            }

        },
        []
    );


    // ======================================================
    // FETCH MOVIES + CINEMAS
    // ======================================================

    const fetchInitialData =
        useCallback(
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

                }

            },
            []
        );


    // ======================================================
    // FETCH ROOMS
    // ======================================================

    const fetchRoomsByCinema =
        useCallback(
            async (cinemaId) => {

                if (!cinemaId) {

                    setRooms([]);

                    return;

                }

                try {

                    const res =
                        await api.get(
                            `/api/rooms/cinema/${cinemaId}`
                        );

                    setRooms(
                        res.data?.data || []
                    );

                } catch (error) {

                    console.error(
                        'FETCH ROOMS ERROR:',
                        error
                    );

                    setRooms([]);

                }

            },
            []
        );


    // ======================================================
    // MOUNT
    // ======================================================

    useEffect(() => {

        fetchShowtimes(1, '');

        fetchInitialData();

        return () => {

            if (
                abortControllerRef.current
            ) {

                abortControllerRef.current.abort();

            }

        };

    }, [
        fetchShowtimes,
        fetchInitialData
    ]);


    // ======================================================
    // SEARCH
    // ======================================================

    const prevSearchRef =
        useRef('');

    useEffect(() => {

        const currentSearch =
            search;

        const previousSearch =
            prevSearchRef.current;

        if (
            currentSearch ===
            previousSearch
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
    // PAGE
    // ======================================================

    const handlePageChange = (page) => {

        fetchShowtimes(
            page,
            search
        );

    };


    // ======================================================
    // OPEN CREATE
    // ======================================================

    const handleOpenAdd = () => {

        setEditingShowtime(null);

        setScheduleData({
            ...initialScheduleData,

            room_types: [],
            room_ids: [],

            start_date: '',
            end_date: '',

            operating_start: '08:00',

            distribution_level:
                'normal'
        });

        setRooms([]);

        setFormErrors({});

        setIsFormOpen(true);

    };


    // ======================================================
    // OPEN EDIT
    // ======================================================

    const handleOpenEdit =
        async (showtime) => {

            try {

                setLoading(true);

                const res =
                    await api.get(
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

                    room_types: [],

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
                        '08:00',

                    distribution_level:
                        'normal'

                });

                setIsFormOpen(true);

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
    // CLOSE
    // ======================================================

    const handleCloseForm = () => {

        if (submitLoading) {
            return;
        }

        setIsFormOpen(false);

        setEditingShowtime(null);

        setFormErrors({});

        setRooms([]);

    };


    // ======================================================
    // CHANGE
    // ======================================================

    const handleChange = async (e) => {

        const {
            name,
            value,
            checked
        } = e.target;


        if (formErrors[name]) {

            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));

        }


        // ==================================================
        // CINEMA
        // ==================================================

        if (name === 'cinema_id') {

            setScheduleData(prev => ({
                ...prev,

                cinema_id: value,

                room_types: [],
                room_ids: []

            }));

            await fetchRoomsByCinema(
                value
            );

            return;

        }


        // ==================================================
        // ROOM TYPE
        // ==================================================

        if (name === 'room_types') {

            setScheduleData(prev => {

                const currentTypes =
                    Array.isArray(
                        prev.room_types
                    )
                        ? prev.room_types
                        : [];

                const nextTypes =
                    checked
                        ? (
                            currentTypes.includes(
                                value
                            )
                                ? currentTypes
                                : [
                                    ...currentTypes,
                                    value
                                ]
                        )
                        : currentTypes.filter(
                            type =>
                                type !== value
                        );

                return {
                    ...prev,
                    room_types:
                        nextTypes
                };

            });

            return;

        }


        // ==================================================
        // ROOM ID
        // ==================================================

        if (name === 'room_ids') {

            const roomId =
                Number(value);

            setScheduleData(prev => {

                const currentRoomIds =
                    Array.isArray(
                        prev.room_ids
                    )
                        ? prev.room_ids
                        : [];

                const nextRoomIds =
                    checked
                        ? (
                            currentRoomIds.includes(
                                roomId
                            )
                                ? currentRoomIds
                                : [
                                    ...currentRoomIds,
                                    roomId
                                ]
                        )
                        : currentRoomIds.filter(
                            id =>
                                id !== roomId
                        );

                return {
                    ...prev,
                    room_ids:
                        nextRoomIds
                };

            });

            return;

        }


        // ==================================================
        // NORMAL
        // ==================================================

        setScheduleData(prev => ({
            ...prev,
            [name]: value
        }));

    };


    // ======================================================
    // ROOM TYPE TOGGLE
    // ======================================================

    const handleRoomTypeToggle =
        (roomType) => {

            setFormErrors(prev => ({
                ...prev,
                room_types: ''
            }));

            setScheduleData(prev => {

                const currentTypes =
                    Array.isArray(
                        prev.room_types
                    )
                        ? prev.room_types
                        : [];

                const exists =
                    currentTypes.includes(
                        roomType
                    );

                return {
                    ...prev,

                    room_types:
                        exists
                            ? currentTypes.filter(
                                type =>
                                    type !==
                                    roomType
                            )
                            : [
                                ...currentTypes,
                                roomType
                            ]
                };

            });

        };


    // ======================================================
    // VALIDATE
    // ======================================================

    const validateSchedule = () => {

        const errors = {};


        // ==================================================
        // MOVIE
        // ==================================================

        if (!scheduleData.movie_id) {

            errors.movie_id =
                'Vui lòng chọn phim';

        }


        // ==================================================
        // CINEMA
        // ==================================================

        if (!scheduleData.cinema_id) {

            errors.cinema_id =
                'Vui lòng chọn rạp';

        }


        // ==================================================
        // ROOM TYPE - AUTO
        // ==================================================

        if (!editingShowtime) {

            if (
                !Array.isArray(
                    scheduleData.room_types
                ) ||
                scheduleData.room_types.length === 0
            ) {

                errors.room_types =
                    'Vui lòng chọn ít nhất một hạng phòng';

            }

        }


        // ==================================================
        // ROOM ID - EDIT
        // ==================================================

        if (editingShowtime) {

            if (
                !Array.isArray(
                    scheduleData.room_ids
                ) ||
                scheduleData.room_ids.length === 0
            ) {

                errors.room_ids =
                    'Vui lòng chọn phòng chiếu';

            }

        }


        // ==================================================
        // START DATE
        // ==================================================

        if (!scheduleData.start_date) {

            errors.start_date =
                'Vui lòng chọn ngày bắt đầu';

        }


        // ==================================================
        // END DATE
        // ==================================================

        if (!scheduleData.end_date) {

            errors.end_date =
                'Vui lòng chọn ngày kết thúc';

        }


        // ==================================================
        // DATE RANGE
        // ==================================================

        if (
            scheduleData.start_date &&
            scheduleData.end_date &&
            scheduleData.start_date >
            scheduleData.end_date
        ) {

            errors.end_date =
                'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';

        }


        // ==================================================
        // EDIT TIME
        // ==================================================

        if (
            editingShowtime &&
            !scheduleData.operating_start
        ) {

            errors.operating_start =
                'Vui lòng chọn giờ';

        }


        setFormErrors(errors);

        return (
            Object.keys(errors).length === 0
        );

    };


    // ======================================================
    // SUBMIT
    // ======================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        // ==================================================
        // EDIT
        // ==================================================

        if (editingShowtime) {

            if (
                !validateSchedule()
            ) {

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
                                scheduleData
                                    .room_ids[0]
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


            // ==================================================
            // BACKEND SCHEDULER PAYLOAD
            // ==================================================
            //
            // Không gửi room_ids.
            // Không gửi operating_start/end.
            //
            // Backend tự quyết định:
            //
            // Weekday:
            // 08:00 -> 23:30
            //
            // Weekend:
            // 08:00 -> 24:00
            //
            // ==================================================

            const payload = {

                movie_id:
                    Number(
                        scheduleData.movie_id
                    ),

                cinema_id:
                    Number(
                        scheduleData.cinema_id
                    ),

                room_types:
                    [
                        ...scheduleData.room_types
                    ],

                start_date:
                    scheduleData.start_date,

                end_date:
                    scheduleData.end_date,

                distribution:
                    scheduleData
                        .distribution_level

            };


            console.log(
                '📤 AUTO SCHEDULE PAYLOAD:',
                payload
            );


            const res =
                await api.post(
                    '/api/showtimes/schedule',
                    payload
                );


            console.log(
                '📥 AUTO SCHEDULE RESPONSE:',
                res.data
            );


            setIsFormOpen(false);


            await fetchShowtimes(
                pagination.page,
                search
            );


            // ==================================================
            // RESPONSE MESSAGE
            // ==================================================

            const data =
                res.data?.data;

            let message =
                res.data?.message ||
                'Tạo lịch chiếu thành công.';


            if (data) {

                const created =
                    Array.isArray(
                        data.data
                    )
                        ? data.data.length
                        : (
                            data.createdCount ||
                            0
                        );


                const conflicts =
                    Array.isArray(
                        data.conflicts
                    )
                        ? data.conflicts.length
                        : 0;


                const skippedPast =
                    Array.isArray(
                        data.skippedPast
                    )
                        ? data.skippedPast.length
                        : 0;


                const skipped =
                    Array.isArray(
                        data.skipped
                    )
                        ? data.skipped.length
                        : 0;


                message +=
                    `\n\n✅ Đã tạo: ${created} suất`;


                if (conflicts > 0) {

                    message +=
                        `\n⚠️ Bỏ qua: ${conflicts} suất bị trùng`;

                }


                if (skippedPast > 0) {

                    message +=
                        `\n⏭️ Bỏ qua: ${skippedPast} suất trong quá khứ`;

                }


                if (skipped > 0) {

                    message +=
                        `\n⏭️ Bỏ qua: ${skipped} suất không thể xếp`;

                }

            }


            showAlert(
                'Tạo lịch chiếu thành công',
                message,
                'success'
            );

        } catch (error) {

            console.error(
                'CREATE SCHEDULE ERROR:',
                error
            );


            const backendField =
                error.response?.data?.field;


            const message =
                error.response?.data?.message ||
                'Không thể tạo lịch chiếu.';


            if (backendField) {

                setFormErrors({
                    [backendField]:
                        message
                });

            } else {

                showAlert(
                    'Không thể tạo lịch',
                    message,
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

    const handleDelete =
        (showtime) => {

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

                        setTimeout(() => {

                            showAlert(
                                'Lỗi',
                                error.response?.data?.message ||
                                'Không thể xóa suất chiếu.',
                                'error'
                            );

                        }, 100);

                    }

                },

                closeAlert
            );

        };


    // ======================================================
    // TABLE
    // ======================================================

    const columns = [

        // ==================================================
        // MOVIE
        // ==================================================

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


        // ==================================================
        // CINEMA / ROOM
        // ==================================================

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


        // ==================================================
        // DATE
        // ==================================================

        {
            title: 'Ngày chiếu',
            key: 'start_time',

            render: row =>
                formatDateTime(
                    row.start_time
                ).date

        },


        // ==================================================
        // TIME
        // ==================================================

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


        // ==================================================
        // ACTIONS
        // ==================================================

        {
            title: 'Thao tác',
            key: 'actions',

            render: row => (

                <div className="admin-table-actions">

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
    // FORM FIELDS
    // ======================================================

    const formFields = [

        // ==================================================
        // MOVIE
        // ==================================================

        {
            label: 'Phim',
            name: 'movie_id',
            type: 'select',

            options: [

                {
                    label: '-- Chọn phim --',
                    value: ''
                },

                ...movies.map(movie => ({

                    label:
                        movie.title,

                    value:
                        movie.movie_id

                }))

            ]
        },


        // ==================================================
        // CINEMA
        // ==================================================

        {
            label: 'Rạp chiếu',
            name: 'cinema_id',
            type: 'select',

            options: [

                {
                    label: '-- Chọn rạp --',
                    value: ''
                },

                ...cinemas.map(cinema => ({

                    label:
                        cinema.cinema_name,

                    value:
                        cinema.cinema_id

                }))

            ]
        },


        // ==================================================
        // EDIT ONLY - ROOM
        // ==================================================

        ...(editingShowtime
            ? [

                {
                    label: 'Phòng chiếu',
                    name: 'room_ids',
                    type: 'checkbox-select',

                    options:
                        rooms
                            .filter(room =>
                                ROOM_TYPES.some(
                                    type =>
                                        type.value ===
                                        room.room_type
                                )
                            )
                            .map(room => ({

                                label:
                                    `${room.room_name} (${room.room_type})`,

                                value:
                                    room.room_id

                            }))

                }

            ]
            : []),


        // ==================================================
        // START DATE
        // ==================================================

        {
            label: 'Ngày bắt đầu',
            name: 'start_date',
            type: 'date'
        },


        // ==================================================
        // END DATE
        // ==================================================

        {
            label: 'Ngày kết thúc',
            name: 'end_date',
            type: 'date'
        },


        // ==================================================
        // EDIT ONLY - START TIME
        // ==================================================

        ...(editingShowtime
            ? [

                {
                    label: 'Giờ chiếu',
                    name: 'operating_start',
                    type: 'time'
                }

            ]
            : []),


        // ==================================================
        // AUTO DISTRIBUTION
        // ==================================================

        ...(!editingShowtime
            ? [

                {
                    label: 'Mức độ phân bổ',
                    name: 'distribution_level',
                    type: 'select',

                    options:
                        DISTRIBUTION_OPTIONS

                }

            ]
            : [])

    ];


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

                subtitle="Tự động phân bổ suất chiếu theo phim, rạp, hạng phòng và mức độ ưu tiên"

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
                SCHEDULE MODAL
            ================================================== */}

            <AdminModal

                open={isFormOpen}

                onClose={handleCloseForm}

                title={
                    editingShowtime
                        ? 'Cập nhật suất chiếu'
                        : 'Tạo lịch chiếu tự động'
                }

                type="default"

                size="lg"

            >


                {/* ==================================================
                    AUTO INFO
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

                            Phân bổ suất chiếu tự động

                        </div>


                        <div
                            style={{
                                fontSize: '14px',
                                color: '#64748b',
                                lineHeight: '1.6'
                            }}
                        >

                            Hệ thống sẽ tự chọn
                            <strong> phòng thực tế </strong>
                            dựa trên
                            <strong> hạng phòng </strong>
                            bạn chọn.

                            <br />

                            Bạn không cần chọn từng phòng.

                            <br /><br />


                            <strong>
                                Hạng phòng hỗ trợ:
                            </strong>

                            <br />

                            🎬 <strong>2D</strong>

                            <br />

                            🕶️ <strong>3D</strong>

                            <br />

                            👑 <strong>VIP</strong>

                            <br />

                            🌌 <strong>IMAX</strong>

                            <br /><br />


                            <strong>
                                Mức độ phân bổ:
                            </strong>

                            <br />

                            🔥 <strong>HOT</strong>:
                            45 phút/suất

                            <br />

                            📊 <strong>NORMAL</strong>:
                            75 phút/suất

                            <br />

                            ❄️ <strong>COLD</strong>:
                            120 phút/suất

                        </div>

                    </div>

                )}


                {/* ==================================================
                    FORM
                ================================================== */}

                <AdminForm

                    fields={formFields}

                    formData={scheduleData}

                    errors={formErrors}

                    onChange={handleChange}

                    onSubmit={handleSubmit}

                    loading={submitLoading}

                    submitText={
                        editingShowtime
                            ? 'Lưu thay đổi'
                            : 'Tự động tạo lịch'
                    }

                />


                {/* ==================================================
                    ROOM TYPE SELECTOR
                ================================================== */}

                {!editingShowtime && (

                    <div
                        style={{
                            marginTop: '18px',
                            marginBottom: '8px'
                        }}
                    >

                        <label
                            style={{
                                display: 'block',
                                marginBottom: '10px',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}
                        >
                            Hạng phòng
                        </label>


                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(2, minmax(0, 1fr))',
                                gap: '10px'
                            }}
                        >

                            {ROOM_TYPES.map(type => {

                                const selected =
                                    Array.isArray(
                                        scheduleData.room_types
                                    ) &&
                                    scheduleData
                                        .room_types
                                        .includes(
                                            type.value
                                        );


                                return (

                                    <button
                                        key={type.value}
                                        type="button"

                                        onClick={() =>
                                            handleRoomTypeToggle(
                                                type.value
                                            )
                                        }

                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',

                                            padding:
                                                '13px 15px',

                                            borderRadius:
                                                '10px',

                                            border:
                                                selected
                                                    ? '2px solid #2563eb'
                                                    : '1px solid #cbd5e1',

                                            background:
                                                selected
                                                    ? 'rgba(37, 99, 235, 0.08)'
                                                    : '#ffffff',

                                            color:
                                                selected
                                                    ? '#1d4ed8'
                                                    : '#334155',

                                            cursor:
                                                'pointer',

                                            fontWeight:
                                                selected
                                                    ? '600'
                                                    : '500',

                                            textAlign:
                                                'left',

                                            transition:
                                                'all 0.15s ease'
                                        }}
                                    >

                                        <span
                                            style={{
                                                fontSize:
                                                    '20px'
                                            }}
                                        >
                                            {type.icon}
                                        </span>


                                        <span>
                                            {type.label}
                                        </span>


                                        <span
                                            style={{
                                                marginLeft:
                                                    'auto',

                                                width:
                                                    '18px',

                                                height:
                                                    '18px',

                                                borderRadius:
                                                    '5px',

                                                border:
                                                    selected
                                                        ? 'none'
                                                        : '2px solid #94a3b8',

                                                background:
                                                    selected
                                                        ? '#2563eb'
                                                        : '#ffffff',

                                                display:
                                                    'flex',

                                                alignItems:
                                                    'center',

                                                justifyContent:
                                                    'center',

                                                color:
                                                    '#ffffff',

                                                fontSize:
                                                    '12px',

                                                fontWeight:
                                                    '700'
                                            }}
                                        >
                                            {
                                                selected
                                                    ? '✓'
                                                    : ''
                                            }
                                        </span>

                                    </button>

                                );

                            })}

                        </div>


                        {/* ERROR */}

                        {formErrors.room_types && (

                            <div
                                style={{
                                    marginTop:
                                        '8px',

                                    color:
                                        '#dc2626',

                                    fontSize:
                                        '13px'
                                }}
                            >
                                {
                                    formErrors.room_types
                                }
                            </div>

                        )}


                        {/* SELECTED COUNT */}

                        <div
                            style={{
                                marginTop:
                                    '9px',

                                fontSize:
                                    '12px',

                                color:
                                    '#64748b'
                            }}
                        >

                            Đã chọn:{' '}

                            <strong>
                                {
                                    scheduleData
                                        .room_types
                                        ?.length || 0
                                }
                            </strong>

                            {' '}hạng phòng


                            {scheduleData
                                .room_types
                                ?.length > 0 && (

                                <>

                                    {' — '}

                                    {
                                        scheduleData
                                            .room_types
                                            .join(' + ')
                                    }

                                </>

                            )}

                        </div>

                    </div>

                )}


                {/* ==================================================
                    AUTO SCHEDULER INFO
                ================================================== */}

                {!editingShowtime && (

                    <div
                        style={{
                            marginTop: '16px',
                            padding: '14px',
                            borderRadius: '10px',
                            background:
                                '#f8fafc',
                            fontSize:
                                '13px',
                            color:
                                '#64748b'
                        }}
                    >

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                marginBottom: '7px'
                            }}
                        >

                            <Info size={16} />

                            <strong>
                                Cách hoạt động:
                            </strong>

                        </div>


                        Hệ thống sẽ tự động lấy toàn bộ
                        phòng thuộc các hạng bạn chọn
                        tại rạp.


                        <br /><br />


                        <strong>
                            🕐 Giờ hoạt động:
                        </strong>

                        <br />

                        Thứ 2 → Thứ 6:
                        <strong> 08:00 → 23:30</strong>

                        <br />

                        Thứ 7 → Chủ nhật:
                        <strong> 08:00 → 24:00</strong>


                        <br /><br />


                        <strong>
                            Khoảng cách suất:
                        </strong>

                        <br />

                        🔥 HOT:
                        <strong> 45 phút</strong>

                        <br />

                        📊 NORMAL:
                        <strong> 75 phút</strong>

                        <br />

                        ❄️ COLD:
                        <strong> 120 phút</strong>


                        <br /><br />


                        Phòng nào đang bận thì hệ thống
                        sẽ thử phòng khác.


                        <br />


                        Phòng chỉ được sử dụng lại sau khi
                        phim trước kết thúc
                        <strong> + 15 phút</strong>.


                        <br /><br />


                        <strong>
                            Ví dụ:
                        </strong>

                        <br />

                        Chọn <strong>2D + VIP</strong>
                        + <strong>HOT</strong>


                        <br />

                        Hệ thống sẽ tự tìm các phòng
                        <strong> 2D/VIP </strong>
                        phù hợp và phân bổ các mốc
                        cách nhau <strong>45 phút</strong>.

                    </div>

                )}

            </AdminModal>


            {/* ==================================================
                ALERT
            ================================================== */}

            <AdminModal

                open={alertModal.open}

                onClose={closeAlert}

                title={alertModal.title}

                type={alertModal.type}

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

                <div className="admin-alert-content">

                    <p>
                        {alertModal.message}
                    </p>

                </div>

            </AdminModal>

        </>

    );

};


export default ShowTimePage;