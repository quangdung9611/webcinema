
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
    Layers3,
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
// INITIAL DATA
// ==========================================================

const initialScheduleData = {
    movie_id: '',
    cinema_id: '',

    // TỰ ĐỘNG: chọn hạng phòng
    room_types: [],

    // Dùng cho EDIT
    room_ids: [],

    start_date: '',
    end_date: '',

    operating_start: '08:00',
    operating_end: '23:30',

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

        const [datePart, timePart] = dateStr.split(' ');

        if (!datePart || !timePart) {
            return {
                date: '--/--/----',
                time: '--:--'
            };
        }

        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');

        return {
            date: `${day}/${month}/${year}`,
            time: `${hour}:${minute}`
        };

    };


    // ======================================================
    // FETCH SHOWTIMES
    // ======================================================

    const fetchShowtimes = useCallback(
        async (page = 1, keyword = '') => {

            if (isFetching.current) {
                return;
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();

            abortControllerRef.current = controller;

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

                setShowtimes(showtimesData);

                setPagination(paginationData);

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
    // FETCH MOVIES + CINEMAS
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

            }

        },
        []
    );


    // ======================================================
    // FETCH ROOMS
    //
    // Chỉ dùng khi EDIT.
    // Tạo tự động không cần lấy room_id.
    // ======================================================

    const fetchRoomsByCinema = useCallback(
        async (cinemaId) => {

            if (!cinemaId) {

                setRooms([]);

                return;
            }

            try {

                const res = await api.get(
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

            if (abortControllerRef.current) {
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

    const prevSearchRef = useRef('');

    useEffect(() => {

        const currentSearch = search;

        const previousSearch =
            prevSearchRef.current;

        if (currentSearch === previousSearch) {
            return;
        }

        prevSearchRef.current =
            currentSearch;

        const timer = setTimeout(() => {

            fetchShowtimes(
                1,
                currentSearch
            );

        }, 400);

        return () => clearTimeout(timer);

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

            operating_start: '08:00',
            operating_end: '23:30',

            room_types: [],
            room_ids: [],

            distribution_level: 'normal'
        });

        setRooms([]);

        setFormErrors({});

        setIsFormOpen(true);

    };


    // ======================================================
    // OPEN EDIT
    // ======================================================

    const handleOpenEdit = async (showtime) => {

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

                movie_id: st.movie_id,

                cinema_id: st.cinema_id,

                room_ids: [
                    Number(st.room_id)
                ],

                // EDIT không dùng room_types
                room_types: [],

                start_date:
                    st.start_time?.slice(0, 10) || '',

                end_date:
                    st.start_time?.slice(0, 10) || '',

                operating_start:
                    st.start_time?.slice(11, 16) ||
                    '08:00',

                operating_end:
                    '23:30',

                distribution_level:
                    'manual'

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
            type,
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

                // Tạo tự động
                room_types: [],

                // Edit
                room_ids: []
            }));

            await fetchRoomsByCinema(value);

            return;
        }


        // ==================================================
        // ROOM TYPE CHECKBOX
        // ==================================================

        if (name === 'room_types') {

            setScheduleData(prev => {

                const currentTypes =
                    prev.room_types || [];

                if (checked) {

                    if (
                        !currentTypes.includes(value)
                    ) {

                        return {
                            ...prev,

                            room_types: [
                                ...currentTypes,
                                value
                            ]
                        };

                    }

                    return prev;

                }

                return {
                    ...prev,

                    room_types:
                        currentTypes.filter(
                            type =>
                                type !== value
                        )
                };

            });

            return;
        }


        // ==================================================
        // ROOM CHECKBOX
        //
        // Chỉ dùng khi EDIT.
        // ==================================================

        if (name === 'room_ids') {

            const roomId =
                Number(value);

            setScheduleData(prev => {

                const currentRoomIds =
                    prev.room_ids || [];

                if (checked) {

                    if (
                        !currentRoomIds.includes(roomId)
                    ) {

                        return {
                            ...prev,

                            room_ids: [
                                ...currentRoomIds,
                                roomId
                            ]
                        };

                    }

                    return prev;
                }

                return {
                    ...prev,

                    room_ids:
                        currentRoomIds.filter(
                            id =>
                                id !== roomId
                        )
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
    // VALIDATE
    // ======================================================

    const validateSchedule = () => {

        const errors = {};


        if (!scheduleData.movie_id) {

            errors.movie_id =
                'Vui lòng chọn phim';

        }


        if (!scheduleData.cinema_id) {

            errors.cinema_id =
                'Vui lòng chọn rạp';

        }


        // ==================================================
        // TẠO TỰ ĐỘNG
        // ==================================================

        if (!editingShowtime) {

            if (
                !scheduleData.room_types ||
                scheduleData.room_types.length === 0
            ) {

                errors.room_types =
                    'Vui lòng chọn ít nhất một hạng phòng';

            }

        }


        // ==================================================
        // EDIT
        // ==================================================

        if (editingShowtime) {

            if (
                !scheduleData.room_ids ||
                scheduleData.room_ids.length === 0
            ) {

                errors.room_ids =
                    'Vui lòng chọn phòng chiếu';

            }

        }


        if (!scheduleData.start_date) {

            errors.start_date =
                'Vui lòng chọn ngày bắt đầu';

        }


        if (!scheduleData.end_date) {

            errors.end_date =
                'Vui lòng chọn ngày kết thúc';

        }


        if (
            scheduleData.start_date &&
            scheduleData.end_date &&
            scheduleData.start_date >
            scheduleData.end_date
        ) {

            errors.end_date =
                'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';

        }


        if (!scheduleData.operating_start) {

            errors.operating_start =
                'Vui lòng chọn giờ bắt đầu';

        }


        if (!scheduleData.operating_end) {

            errors.operating_end =
                'Vui lòng chọn giờ kết thúc';

        }


        // ==================================================
        // TIME RANGE
        // ==================================================

        if (
            scheduleData.operating_start &&
            scheduleData.operating_end
        ) {

            if (
                scheduleData.operating_start >=
                scheduleData.operating_end
            ) {

                errors.operating_end =
                    'Giờ kết thúc phải lớn hơn giờ bắt đầu';

            }

        }


        setFormErrors(errors);

        return Object.keys(errors).length === 0;

    };


    // ======================================================
    // SUBMIT
    // ======================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        // ==================================================
        // EDIT SINGLE SHOWTIME
        // ==================================================

        if (editingShowtime) {

            if (
                !scheduleData.start_date ||
                !scheduleData.operating_start
            ) {

                setFormErrors({
                    start_date:
                        'Vui lòng chọn ngày',

                    operating_start:
                        'Vui lòng chọn giờ'
                });

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

                const message =
                    error.response?.data?.message ||
                    'Không thể cập nhật suất chiếu.';


                showAlert(
                    'Lỗi',
                    message,
                    'error'
                );


            } finally {

                setSubmitLoading(false);

            }

            return;

        }


        // ==================================================
        // CREATE AUTOMATIC SCHEDULE
        // ==================================================

        if (!validateSchedule()) {
            return;
        }


        try {

            setSubmitLoading(true);

            setFormErrors({});


            // ==================================================
            // PAYLOAD MỚI
            //
            // KHÔNG GỬI room_ids
            // GỬI room_types
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
                    scheduleData.room_types,

                start_date:
                    scheduleData.start_date,

                end_date:
                    scheduleData.end_date,

                start_hour:
                    scheduleData.operating_start,

                end_hour:
                    scheduleData.operating_end,

                distribution:
                    scheduleData.distribution_level

            };


            console.log(
                '📤 Payload tạo lịch:',
                payload
            );


            const res = await api.post(
                '/api/showtimes/schedule',
                payload
            );


            console.log(
                '📥 Response:',
                res.data
            );


            setIsFormOpen(false);


            await fetchShowtimes(
                pagination.page,
                search
            );


            // ==================================================
            // RESPONSE
            // ==================================================

            const data =
                res.data?.data;

            let message =
                res.data?.message ||
                'Tạo lịch chiếu thành công.';


            if (data) {

                const created =
                    data.data?.length || 0;

                const conflicts =
                    data.conflicts?.length || 0;

                const skipped =
                    data.skippedPast?.length || 0;


                message +=
                    `\n\n✅ Đã tạo: ${created} suất`;


                if (conflicts > 0) {

                    message +=
                        `\n⚠️ Bỏ qua: ${conflicts} suất bị trùng`;

                }


                if (skipped > 0) {

                    message +=
                        `\n⏭️ Bỏ qua: ${skipped} suất trong quá khứ`;

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

    const handleDelete = (showtime) => {

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


        {
            title: 'Ngày chiếu',
            key: 'start_time',

            render: row =>
                formatDateTime(
                    row.start_time
                ).date

        },


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
        // ROOM TYPE
        //
        // TỰ ĐỘNG
        // ==================================================

        ...(!editingShowtime
            ? [
                {
                    label: 'Hạng phòng',
                    name: 'room_types',
                    type: 'checkbox-select',

                    options:
                        ROOM_TYPES.map(type => ({

                            label:
                                `${type.icon} ${type.label}`,

                            value:
                                type.value

                        }))
                }
            ]
            : []),


        // ==================================================
        // ROOM
        //
        // EDIT
        // ==================================================

        ...(editingShowtime
            ? [
                {
                    label: 'Phòng chiếu',
                    name: 'room_ids',
                    type: 'checkbox-select',

                    options:
                        rooms.map(room => ({

                            label:
                                `${room.room_name} (${room.room_type})`,

                            value:
                                room.room_id

                        }))
                }
            ]
            : []),


        // ==================================================
        // DATES
        // ==================================================

        {
            label: 'Ngày bắt đầu',
            name: 'start_date',
            type: 'date'
        },


        {
            label: 'Ngày kết thúc',
            name: 'end_date',
            type: 'date'
        },


        // ==================================================
        // OPERATING TIME
        // ==================================================

        {
            label: 'Giờ bắt đầu hoạt động',
            name: 'operating_start',
            type: 'time'
        },


        {
            label: 'Giờ kết thúc hoạt động',
            name: 'operating_end',
            type: 'time'
        },


        // ==================================================
        // DISTRIBUTION
        // ==================================================

        ...(!editingShowtime
            ? [
                {
                    label: 'Mức độ phân bổ',
                    name: 'distribution_level',
                    type: 'select',

                    options: [

                        {
                            label:
                                '❄️ Ít - COLD (120 phút/suất)',

                            value:
                                'cold'
                        },

                        {
                            label:
                                '📊 Trung bình - NORMAL (75 phút/suất)',

                            value:
                                'normal'
                        },

                        {
                            label:
                                '🔥 Nhiều - HOT (45 phút/suất)',

                            value:
                                'hot'
                        }

                    ]
                }
            ]
            : [])

    ];


    // ======================================================
    // RENDER
    // ======================================================

    return (

        <>

            <AdminPage

                title="Quản lý lịch chiếu"

                subtitle="Tự động phân bổ suất chiếu theo phim, rạp, hạng phòng, thời gian và mức độ ưu tiên"

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

                            Hệ thống sẽ tự chọn phòng thực tế
                            dựa trên <strong>hạng phòng</strong>
                            mà bạn chọn.

                            <br />

                            Không cần chọn từng phòng cụ thể.

                            <br /><br />

                            <strong>Hạng phòng hỗ trợ:</strong>

                            <br />

                            🎬 <strong>2D</strong>
                            <br />

                            🕶️ <strong>3D</strong>
                            <br />

                            👑 <strong>VIP</strong>
                            <br />

                            🌌 <strong>IMAX</strong>

                            <br /><br />

                            <strong>Mức độ phân bổ:</strong>

                            <br />

                            🔥 <strong>HOT</strong>:
                            45 phút/suất

                            <br />

                            📊 <strong>NORMAL</strong>:
                            75 phút/suất

                            <br />

                            ❄️ <strong>COLD</strong>:
                            120 phút/suất

                            <br /><br />

                            Hệ thống sẽ tự kiểm tra lịch hiện có,
                            tránh trùng phòng và tự chọn phòng
                            phù hợp trong từng hạng.

                        </div>

                    </div>

                )}


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


                {!editingShowtime && (

                    <div
                        style={{
                            marginTop: '16px',
                            padding: '14px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            fontSize: '13px',
                            color: '#64748b'
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


                        Ví dụ bạn chọn:

                        <br />

                        🎬 <strong>2D + VIP</strong>

                        <br />

                        🔥 <strong>HOT</strong>

                        <br />

                        ⏰ <strong>08:00 → 23:30</strong>

                        <br /><br />

                        Hệ thống sẽ lấy toàn bộ phòng
                        <strong> 2D + VIP </strong>
                        đang có tại rạp và tự động phân bổ
                        suất chiếu.

                        <br /><br />

                        Các mốc thời gian HOT sẽ cách nhau
                        <strong> 45 phút</strong>.

                        <br />

                        Phòng nào đang bận thì bỏ qua phòng đó
                        và thử phòng khác.

                        <br />

                        Phòng chỉ được sử dụng lại sau khi
                        phim trước kết thúc + <strong>15 phút</strong>.

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

