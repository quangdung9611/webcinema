import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';

import {
    CalendarDays,
    Edit,
    Trash2,
    Loader2,
    Film,
    MapPin,
    Clock,
    Layers,
    CalendarRange
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// CONSTANTS
// ==========================================================

const initialFormData = {
    movie_id: '',
    cinema_id: '',
    room_id: '',
    start_time: ''
};

const initialBulkFormData = {
    movie_id: '',
    cinema_id: '',
    room_ids: [],
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    interval_minutes: 0
};

// ==========================================================
// COMPONENT
// ==========================================================

const ShowTimePage = () => {

    // ======================================================
    // SHOWTIME LIST STATES
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
    // MODAL STATES
    // ======================================================

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingShowtime, setEditingShowtime] = useState(null);

    const [formData, setFormData] = useState(initialFormData);

    const [formErrors, setFormErrors] = useState({});

    // ======================================================
    // BULK MODE
    // ======================================================

    const [bulkMode, setBulkMode] = useState(false);

    const [bulkFormData, setBulkFormData] = useState(initialBulkFormData);

    const [bulkFormErrors, setBulkFormErrors] = useState({});

    const [bulkRooms, setBulkRooms] = useState([]);

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
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    // ======================================================
    // TIMEZONE / DATE HELPERS
    // ======================================================

    const formatForInput = (dateString) => {
        if (!dateString) return '';

        return dateString
            .slice(0, 16)
            .replace(' ', 'T');
    };

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

    const fetchShowtimes = useCallback(async (page = 1, keyword = '') => {

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

            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });

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

    }, []);

    // ======================================================
    // FETCH INITIAL DATA
    // ======================================================

    const fetchInitialData = useCallback(async () => {

        try {

            const [
                movieRes,
                cinemaRes
            ] = await Promise.all([
                api.get('/api/movies'),
                api.get('/api/cinemas')
            ]);

            const moviesData =
                movieRes.data?.data || [];

            const cinemasData =
                cinemaRes.data?.data || [];

            setMovies(moviesData);

            setCinemas(cinemasData);

        } catch (error) {

            console.error(
                'FETCH INITIAL DATA ERROR:',
                error
            );

        }

    }, []);

    // ======================================================
    // FETCH ROOMS BY CINEMA
    // ======================================================

    const fetchRoomsByCinema = useCallback(
        async (cinemaId) => {

            if (!cinemaId) {

                setRooms([]);
                setBulkRooms([]);

                return;
            }

            try {

                const res = await api.get(
                    `/api/rooms/cinema/${cinemaId}`
                );

                const roomsData =
                    res.data?.data || [];

                setRooms(roomsData);

                setBulkRooms(roomsData);

            } catch (error) {

                console.error(
                    'FETCH ROOMS ERROR:',
                    error
                );

                setRooms([]);
                setBulkRooms([]);
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
    // SEARCH DEBOUNCE
    // ======================================================

    const prevSearchRef = useRef('');

    useEffect(() => {

        const currentSearch = search;
        const prevSearch = prevSearchRef.current;

        if (currentSearch === prevSearch) {
            return;
        }

        prevSearchRef.current = currentSearch;

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
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (page) => {

        fetchShowtimes(
            page,
            search
        );

    };

    // ======================================================
    // NORMAL FORM VALIDATION
    // ======================================================

    const validateForm = () => {

        const errors = {};

        if (!formData.movie_id) {
            errors.movie_id =
                'Vui lòng chọn phim';
        }

        if (!formData.cinema_id) {
            errors.cinema_id =
                'Vui lòng chọn rạp';
        }

        if (!formData.room_id) {
            errors.room_id =
                'Vui lòng chọn phòng';
        }

        if (!formData.start_time) {
            errors.start_time =
                'Vui lòng chọn thời gian chiếu';
        }

        setFormErrors(errors);

        return Object.keys(errors).length === 0;
    };

    // ======================================================
    // BULK FORM VALIDATION
    // ======================================================

    const validateBulkForm = () => {

        const errors = {};

        if (!bulkFormData.movie_id) {
            errors.movie_id =
                'Vui lòng chọn phim';
        }

        if (!bulkFormData.cinema_id) {
            errors.cinema_id =
                'Vui lòng chọn rạp';
        }

        if (
            !bulkFormData.room_ids ||
            bulkFormData.room_ids.length === 0
        ) {
            errors.room_ids =
                'Vui lòng chọn ít nhất một phòng';
        }

        if (!bulkFormData.start_date) {
            errors.start_date =
                'Vui lòng chọn ngày bắt đầu';
        }

        if (!bulkFormData.end_date) {
            errors.end_date =
                'Vui lòng chọn ngày kết thúc';
        }

        if (
            bulkFormData.start_date &&
            bulkFormData.end_date &&
            bulkFormData.start_date >
            bulkFormData.end_date
        ) {
            errors.end_date =
                'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
        }

        if (!bulkFormData.start_time) {
            errors.start_time =
                'Vui lòng chọn giờ bắt đầu';
        }

        if (!bulkFormData.end_time) {
            errors.end_time =
                'Vui lòng chọn giờ kết thúc';
        }

        if (
            bulkFormData.start_time &&
            bulkFormData.end_time &&
            bulkFormData.start_time >=
            bulkFormData.end_time
        ) {
            errors.end_time =
                'Giờ kết thúc phải lớn hơn giờ bắt đầu';
        }

        if (
            bulkFormData.interval_minutes === '' ||
            Number(bulkFormData.interval_minutes) <= 0
        ) {
            errors.interval_minutes =
                'Khoảng cách phải lớn hơn 0 phút';
        }

        setBulkFormErrors(errors);

        return Object.keys(errors).length === 0;
    };

    // ======================================================
    // OPEN NORMAL ADD
    // ======================================================

    const handleOpenAdd = () => {

        setBulkMode(false);

        setEditingShowtime(null);

        setFormData(initialFormData);

        setBulkFormData(initialBulkFormData);

        setRooms([]);

        setBulkRooms([]);

        setFormErrors({});

        setBulkFormErrors({});

        setIsFormOpen(true);
    };

    // ======================================================
    // OPEN BULK ADD
    // ======================================================

    const handleOpenBulkAdd = () => {

        setBulkMode(true);

        setEditingShowtime(null);

        setFormData(initialFormData);

        setBulkFormData(initialBulkFormData);

        setRooms([]);

        setBulkRooms([]);

        setFormErrors({});

        setBulkFormErrors({});

        setIsFormOpen(true);
    };

    // ======================================================
    // OPEN EDIT
    // ======================================================

    const handleOpenEdit = async (showtime) => {

        try {

            setLoading(true);

            const detailRes =
                await api.get(
                    `/api/showtimes/detail/${showtime.showtime_id}`
                );

            const st =
                detailRes.data?.data ||
                detailRes.data;

            await fetchRoomsByCinema(
                st.cinema_id
            );

            setBulkMode(false);

            setEditingShowtime(st);

            setFormErrors({});

            setFormData({
                movie_id: st.movie_id,
                cinema_id: st.cinema_id,
                room_id: st.room_id,
                start_time:
                    formatForInput(
                        st.start_time
                    )
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
    // CLOSE FORM
    // ======================================================

    const handleCloseForm = () => {

        if (submitLoading) {
            return;
        }

        setIsFormOpen(false);

        setEditingShowtime(null);

        setBulkMode(false);

        setFormErrors({});

        setBulkFormErrors({});

        setRooms([]);

        setBulkRooms([]);
    };

    // ======================================================
    // NORMAL FORM CHANGE
    // ======================================================

    const handleChange = async (e) => {

        const {
            name,
            value
        } = e.target;

        if (formErrors[name]) {

            setFormErrors(
                (prev) => ({
                    ...prev,
                    [name]: ''
                })
            );
        }

        setFormData(
            (prev) => ({
                ...prev,
                [name]: value
            })
        );

        if (
            name === 'cinema_id' &&
            value
        ) {

            setFormData(
                (prev) => ({
                    ...prev,
                    cinema_id: value,
                    room_id: ''
                })
            );

            await fetchRoomsByCinema(
                value
            );
        }
    };

    // ======================================================
    // BULK FORM CHANGE
    // ======================================================

    const handleBulkChange = async (e) => {

        const {
            name,
            value
        } = e.target;

        if (bulkFormErrors[name]) {

            setBulkFormErrors(
                (prev) => ({
                    ...prev,
                    [name]: ''
                })
            );
        }

        if (name === 'cinema_id') {

            setBulkFormData(
                (prev) => ({
                    ...prev,
                    cinema_id: value,
                    room_ids: []
                })
            );

            await fetchRoomsByCinema(value);

            return;
        }

        if (name === 'movie_id') {

            setBulkFormData(
                (prev) => ({
                    ...prev,
                    movie_id: value
                })
            );

            // ==============================================
            // TỰ ĐỘNG ĐỀ XUẤT KHOẢNG CÁCH
            // duration + 20 phút
            // ==============================================

            const selectedMovie =
                movies.find(
                    movie =>
                        String(movie.movie_id) ===
                        String(value)
                );

            if (
                selectedMovie &&
                selectedMovie.duration
            ) {

                const suggestedInterval =
                    Number(
                        selectedMovie.duration
                    ) + 20;

                setBulkFormData(
                    (prev) => ({
                        ...prev,
                        movie_id: value,
                        interval_minutes:
                            suggestedInterval
                    })
                );
            }

            return;
        }

        setBulkFormData(
            (prev) => ({
                ...prev,
                [name]: value
            })
        );
    };

    // ======================================================
    // BULK ROOM SELECTION
    // ======================================================

    const handleBulkRoomChange = (roomId) => {

        setBulkFormErrors(
            (prev) => ({
                ...prev,
                room_ids: ''
            })
        );

        setBulkFormData(
            (prev) => {

                const exists =
                    prev.room_ids.includes(
                        String(roomId)
                    );

                return {
                    ...prev,
                    room_ids: exists
                        ? prev.room_ids.filter(
                            id =>
                                id !==
                                String(roomId)
                        )
                        : [
                            ...prev.room_ids,
                            String(roomId)
                        ]
                };

            }
        );
    };

    // ======================================================
    // SELECT / DESELECT ALL ROOMS
    // ======================================================

    const handleSelectAllRooms = () => {

        if (!bulkRooms.length) {
            return;
        }

        const allRoomIds =
            bulkRooms.map(
                room =>
                    String(room.room_id)
            );

        const allSelected =
            bulkFormData.room_ids.length ===
            allRoomIds.length;

        setBulkFormData(
            (prev) => ({
                ...prev,
                room_ids: allSelected
                    ? []
                    : allRoomIds
            })
        );
    };

    // ======================================================
    // SUBMIT NORMAL SHOWTIME
    // ======================================================

    const handleNormalSubmit = async () => {

        if (!validateForm()) {
            return;
        }

        try {

            setSubmitLoading(true);

            setFormErrors({});

            const submitData = {
                ...formData,
                start_time:
                    formData.start_time
                        .replace('T', ' ')
            };

            if (editingShowtime) {

                await api.put(
                    `/api/showtimes/${editingShowtime.showtime_id}`,
                    submitData
                );

                setIsFormOpen(false);

                await fetchShowtimes(
                    pagination.page,
                    search
                );

                setTimeout(() => {

                    showAlert(
                        'Thành công',
                        'Cập nhật suất chiếu thành công.',
                        'success'
                    );

                }, 100);

            } else {

                await api.post(
                    '/api/showtimes',
                    submitData
                );

                setIsFormOpen(false);

                await fetchShowtimes(
                    pagination.page,
                    search
                );

                setTimeout(() => {

                    showAlert(
                        'Thành công',
                        'Thêm suất chiếu thành công.',
                        'success'
                    );

                }, 100);
            }

        } catch (error) {

            console.error(
                'SUBMIT SHOWTIME ERROR:',
                error
            );

            const backendField =
                error.response?.data?.field;

            const backendError =
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Đã xảy ra lỗi.';

            if (backendField) {

                setFormErrors({
                    [backendField]:
                        backendError
                });

            } else {

                showAlert(
                    'Lỗi',
                    backendError,
                    'error'
                );
            }

        } finally {

            setSubmitLoading(false);

        }
    };

    // ======================================================
    // SUBMIT BULK SHOWTIMES
    // ======================================================

    const handleBulkSubmit = async () => {

        if (!validateBulkForm()) {
            return;
        }

        try {

            setSubmitLoading(true);

            setBulkFormErrors({});

            const payload = {
                cinema_id:
                    Number(
                        bulkFormData.cinema_id
                    ),

                movie_ids: [
                    Number(
                        bulkFormData.movie_id
                    )
                ],

                room_ids:
                    bulkFormData.room_ids.map(
                        id => Number(id)
                    ),

                start_date:
                    bulkFormData.start_date,

                end_date:
                    bulkFormData.end_date,

                start_time:
                    bulkFormData.start_time,

                end_time:
                    bulkFormData.end_time,

                interval_minutes:
                    Number(
                        bulkFormData.interval_minutes
                    )
            };

            const res = await api.post(
                '/api/showtimes/bulk',
                payload
            );

            const result =
                res.data?.data || {};

            setIsFormOpen(false);

            setBulkMode(false);

            await fetchShowtimes(
                1,
                search
            );

            // ==============================================
            // THÔNG BÁO KẾT QUẢ
            // ==============================================

            const inserted =
                Number(
                    result.inserted || 0
                );

            const errors =
                Array.isArray(result.errors)
                    ? result.errors
                    : [];

            let message =
                `Đã tạo thành công ${inserted} suất chiếu.`;

            if (errors.length > 0) {

                message +=
                    `\nCó ${errors.length} suất được bỏ qua do trùng lịch hoặc không hợp lệ.`;
            }

            setTimeout(() => {

                showAlert(
                    inserted > 0
                        ? 'Tạo suất chiếu hàng loạt thành công'
                        : 'Không tạo được suất chiếu',
                    message,
                    inserted > 0
                        ? 'success'
                        : 'warning'
                );

            }, 100);

        } catch (error) {

            console.error(
                'BULK CREATE SHOWTIME ERROR:',
                error
            );

            const backendError =
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Không thể tạo suất chiếu hàng loạt.';

            showAlert(
                'Lỗi',
                backendError,
                'error'
            );

        } finally {

            setSubmitLoading(false);

        }
    };

    // ======================================================
    // MAIN SUBMIT
    // ======================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (bulkMode) {

            await handleBulkSubmit();

        } else {

            await handleNormalSubmit();

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

                    setTimeout(() => {

                        showAlert(
                            'Thành công',
                            'Xóa suất chiếu thành công.',
                            'success'
                        );

                    }, 100);

                } catch (error) {

                    console.error(
                        'DELETE SHOWTIME ERROR:',
                        error
                    );

                    closeAlert();

                    setTimeout(() => {

                        showAlert(
                            'Lỗi',
                            error.response?.data?.message ||
                            error.response?.data?.error ||
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
    // TABLE COLUMNS
    // ======================================================

    const columns = [

        {
            title: 'Phim',
            key: 'title',

            render: (row) => (

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

            render: (row) => (

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
                        {row.room_name} ({row.room_type})
                    </div>

                </div>
            )
        },

        {
            title: 'Ngày chiếu',
            key: 'start_time',

            render: (row) =>
                formatDateTime(
                    row.start_time
                ).date
        },

        {
            title: 'Giờ chiếu',
            key: 'time',

            render: (row) => (

                <span className="status-badge pending">

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

            render: (row) => (

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
    // NORMAL FORM FIELDS
    // ======================================================

    const formFields = [

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
                    label: movie.title,
                    value: movie.movie_id
                }))
            ]
        },

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
                    label: cinema.cinema_name,
                    value: cinema.cinema_id
                }))
            ]
        },

        {
            label: 'Phòng chiếu',
            name: 'room_id',
            type: 'select',

            options: [
                {
                    label: '-- Chọn phòng --',
                    value: ''
                },

                ...rooms.map(room => ({
                    label:
                        `${room.room_name} (${room.room_type})`,
                    value: room.room_id
                }))
            ]
        },

        {
            label: 'Thời gian chiếu',
            name: 'start_time',
            type: 'datetime-local'
        }

    ];

    // ======================================================
    // SELECTED MOVIE INFO
    // ======================================================

    const selectedBulkMovie =
        movies.find(
            movie =>
                String(movie.movie_id) ===
                String(bulkFormData.movie_id)
        );

    // ======================================================
    // RENDER BULK FORM
    // ======================================================

    const renderBulkForm = () => (

        <form
            onSubmit={handleSubmit}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}
        >

            {/* ==================================================
                MOVIE
            ================================================== */}

            <div>

                <label
                    style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600'
                    }}
                >
                    Phim
                </label>

                <select
                    name="movie_id"
                    value={bulkFormData.movie_id}
                    onChange={handleBulkChange}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: bulkFormErrors.movie_id
                            ? '1px solid #ef4444'
                            : '1px solid #d1d5db'
                    }}
                >

                    <option value="">
                        -- Chọn phim --
                    </option>

                    {movies.map(movie => (

                        <option
                            key={movie.movie_id}
                            value={movie.movie_id}
                        >
                            {movie.title}
                            {movie.duration
                                ? ` (${movie.duration} phút)`
                                : ''
                            }
                        </option>

                    ))}

                </select>

                {bulkFormErrors.movie_id && (

                    <small
                        style={{
                            color: '#ef4444',
                            display: 'block',
                            marginTop: '5px'
                        }}
                    >
                        {bulkFormErrors.movie_id}
                    </small>

                )}

            </div>

            {/* ==================================================
                CINEMA
            ================================================== */}

            <div>

                <label
                    style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600'
                    }}
                >
                    Rạp chiếu
                </label>

                <select
                    name="cinema_id"
                    value={bulkFormData.cinema_id}
                    onChange={handleBulkChange}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: bulkFormErrors.cinema_id
                            ? '1px solid #ef4444'
                            : '1px solid #d1d5db'
                    }}
                >

                    <option value="">
                        -- Chọn rạp --
                    </option>

                    {cinemas.map(cinema => (

                        <option
                            key={cinema.cinema_id}
                            value={cinema.cinema_id}
                        >
                            {cinema.cinema_name}
                        </option>

                    ))}

                </select>

                {bulkFormErrors.cinema_id && (

                    <small
                        style={{
                            color: '#ef4444',
                            display: 'block',
                            marginTop: '5px'
                        }}
                    >
                        {bulkFormErrors.cinema_id}
                    </small>

                )}

            </div>

            {/* ==================================================
                ROOMS
            ================================================== */}

            <div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                    }}
                >

                    <label
                        style={{
                            fontWeight: '600'
                        }}
                    >
                        Phòng chiếu
                    </label>

                    {bulkRooms.length > 0 && (

                        <button
                            type="button"
                            onClick={handleSelectAllRooms}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#2563eb',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            {
                                bulkFormData.room_ids.length ===
                                bulkRooms.length
                                    ? 'Bỏ chọn tất cả'
                                    : 'Chọn tất cả'
                            }
                        </button>

                    )}

                </div>

                <div
                    style={{
                        border: bulkFormErrors.room_ids
                            ? '1px solid #ef4444'
                            : '1px solid #d1d5db',

                        borderRadius: '10px',

                        padding: '12px',

                        maxHeight: '220px',

                        overflowY: 'auto',

                        background: '#fafafa'
                    }}
                >

                    {!bulkFormData.cinema_id ? (

                        <div
                            style={{
                                color: '#64748b',
                                textAlign: 'center',
                                padding: '15px'
                            }}
                        >
                            Vui lòng chọn rạp trước
                        </div>

                    ) : bulkRooms.length === 0 ? (

                        <div
                            style={{
                                color: '#64748b',
                                textAlign: 'center',
                                padding: '15px'
                            }}
                        >
                            Rạp này chưa có phòng
                        </div>

                    ) : (

                        bulkRooms.map(room => {

                            const roomId =
                                String(room.room_id);

                            const checked =
                                bulkFormData.room_ids.includes(
                                    roomId
                                );

                            return (

                                <label
                                    key={room.room_id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        background:
                                            checked
                                                ? '#eff6ff'
                                                : 'transparent'
                                    }}
                                >

                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                            handleBulkRoomChange(
                                                room.room_id
                                            )
                                        }
                                    />

                                    <span
                                        style={{
                                            fontWeight: '500'
                                        }}
                                    >
                                        {room.room_name}
                                    </span>

                                    <span
                                        className="status-badge"
                                        style={{
                                            marginLeft: 'auto'
                                        }}
                                    >
                                        {room.room_type}
                                    </span>

                                </label>

                            );

                        })

                    )}

                </div>

                {bulkFormErrors.room_ids && (

                    <small
                        style={{
                            color: '#ef4444',
                            display: 'block',
                            marginTop: '5px'
                        }}
                    >
                        {bulkFormErrors.room_ids}
                    </small>

                )}

            </div>

            {/* ==================================================
                DATE RANGE
            ================================================== */}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(2, minmax(0, 1fr))',
                    gap: '15px'
                }}
            >

                <div>

                    <label
                        style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600'
                        }}
                    >
                        Ngày bắt đầu
                    </label>

                    <input
                        type="date"
                        name="start_date"
                        value={
                            bulkFormData.start_date
                        }
                        onChange={handleBulkChange}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border:
                                bulkFormErrors.start_date
                                    ? '1px solid #ef4444'
                                    : '1px solid #d1d5db'
                        }}
                    />

                    {bulkFormErrors.start_date && (

                        <small
                            style={{
                                color: '#ef4444'
                            }}
                        >
                            {bulkFormErrors.start_date}
                        </small>

                    )}

                </div>

                <div>

                    <label
                        style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600'
                        }}
                    >
                        Ngày kết thúc
                    </label>

                    <input
                        type="date"
                        name="end_date"
                        value={
                            bulkFormData.end_date
                        }
                        onChange={handleBulkChange}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border:
                                bulkFormErrors.end_date
                                    ? '1px solid #ef4444'
                                    : '1px solid #d1d5db'
                        }}
                    />

                    {bulkFormErrors.end_date && (

                        <small
                            style={{
                                color: '#ef4444'
                            }}
                        >
                            {bulkFormErrors.end_date}
                        </small>

                    )}

                </div>

            </div>

            {/* ==================================================
                TIME RANGE
            ================================================== */}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(2, minmax(0, 1fr))',
                    gap: '15px'
                }}
            >

                <div>

                    <label
                        style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600'
                        }}
                    >
                        Giờ bắt đầu
                    </label>

                    <input
                        type="time"
                        name="start_time"
                        value={
                            bulkFormData.start_time
                        }
                        onChange={handleBulkChange}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border:
                                bulkFormErrors.start_time
                                    ? '1px solid #ef4444'
                                    : '1px solid #d1d5db'
                        }}
                    />

                    {bulkFormErrors.start_time && (

                        <small
                            style={{
                                color: '#ef4444'
                            }}
                        >
                            {bulkFormErrors.start_time}
                        </small>

                    )}

                </div>

                <div>

                    <label
                        style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600'
                        }}
                    >
                        Giờ kết thúc
                    </label>

                    <input
                        type="time"
                        name="end_time"
                        value={
                            bulkFormData.end_time
                        }
                        onChange={handleBulkChange}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border:
                                bulkFormErrors.end_time
                                    ? '1px solid #ef4444'
                                    : '1px solid #d1d5db'
                        }}
                    />

                    {bulkFormErrors.end_time && (

                        <small
                            style={{
                                color: '#ef4444'
                            }}
                        >
                            {bulkFormErrors.end_time}
                        </small>

                    )}

                </div>

            </div>

            {/* ==================================================
                INTERVAL
            ================================================== */}

            <div>

                <label
                    style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600'
                    }}
                >
                    Khoảng cách giữa các suất (phút)
                </label>

                <input
                    type="number"
                    min="1"
                    step="1"
                    name="interval_minutes"
                    value={
                        bulkFormData.interval_minutes
                    }
                    onChange={handleBulkChange}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border:
                            bulkFormErrors.interval_minutes
                                ? '1px solid #ef4444'
                                : '1px solid #d1d5db'
                    }}
                />

                {selectedBulkMovie &&
                    selectedBulkMovie.duration && (

                        <small
                            style={{
                                display: 'block',
                                marginTop: '6px',
                                color: '#64748b'
                            }}
                        >
                            Gợi ý: phim dài{' '}
                            {selectedBulkMovie.duration}
                            {' '}phút → khoảng cách{' '}
                            {Number(
                                selectedBulkMovie.duration
                            ) + 20}
                            {' '}phút
                            {' '}(
                            {selectedBulkMovie.duration}
                            {' '}phút phim + 20 phút vệ sinh/chuyển khách)
                        </small>

                    )}

                {bulkFormErrors.interval_minutes && (

                    <small
                        style={{
                            display: 'block',
                            color: '#ef4444',
                            marginTop: '5px'
                        }}
                    >
                        {bulkFormErrors.interval_minutes}
                    </small>

                )}

            </div>

            {/* ==================================================
                SUMMARY
            ================================================== */}

            <div
                style={{
                    padding: '15px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0'
                }}
            >

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        fontWeight: '700'
                    }}
                >
                    <Layers size={18} />

                    Xem trước cấu hình
                </div>

                <div
                    style={{
                        color: '#475569',
                        fontSize: '14px',
                        lineHeight: '1.8'
                    }}
                >

                    <div>
                        🎬 Phim:{' '}
                        <strong>
                            {selectedBulkMovie?.title ||
                                'Chưa chọn'}
                        </strong>
                    </div>

                    <div>
                        🏢 Số phòng:{' '}
                        <strong>
                            {
                                bulkFormData.room_ids.length
                            }
                        </strong>
                    </div>

                    <div>
                        📅 Từ:{' '}
                        <strong>
                            {
                                bulkFormData.start_date ||
                                '--'
                            }
                        </strong>
                        {' '}đến{' '}
                        <strong>
                            {
                                bulkFormData.end_date ||
                                '--'
                            }
                        </strong>
                    </div>

                    <div>
                        🕐 Khung giờ:{' '}
                        <strong>
                            {
                                bulkFormData.start_time ||
                                '--:--'
                            }
                        </strong>
                        {' '}→{' '}
                        <strong>
                            {
                                bulkFormData.end_time ||
                                '--:--'
                            }
                        </strong>
                    </div>

                    <div>
                        ⏱️ Khoảng cách:{' '}
                        <strong>
                            {
                                bulkFormData.interval_minutes ||
                                0
                            }
                            {' '}phút
                        </strong>
                    </div>

                </div>

            </div>

            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    paddingTop: '5px'
                }}
            >

                <button
                    type="button"
                    onClick={handleCloseForm}
                    disabled={submitLoading}
                    style={{
                        padding: '11px 18px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        cursor: submitLoading
                            ? 'not-allowed'
                            : 'pointer'
                    }}
                >
                    Hủy
                </button>

                <button
                    type="submit"
                    disabled={submitLoading}
                    style={{
                        padding: '11px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#2563eb',
                        color: '#fff',
                        cursor: submitLoading
                            ? 'not-allowed'
                            : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >

                    {submitLoading && (
                        <Loader2
                            size={16}
                            className="spin-icon"
                        />
                    )}

                    {submitLoading
                        ? 'Đang tạo...'
                        : 'Tạo suất chiếu hàng loạt'}

                </button>

            </div>

        </form>
    );

    // ======================================================
    // RENDER
    // ======================================================

    return (
        <>

            <AdminPage
                title="Quản lý lịch chiếu"
                subtitle="Quản lý toàn bộ suất chiếu trong hệ thống"
                icon={<CalendarDays size={30} />}
                buttonText="Thêm suất chiếu"
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
                        : bulkMode
                            ? 'Thêm suất chiếu hàng loạt'
                            : 'Thêm suất chiếu'
                }
                type="default"
                size="lg"
            >

                {/* ==================================================
                    ADD MODE SWITCH
                ================================================== */}

                {!editingShowtime && (

                    <div
                        style={{
                            display: 'flex',
                            gap: '10px',
                            marginBottom: '20px',
                            padding: '5px',
                            borderRadius: '10px',
                            background: '#f1f5f9'
                        }}
                    >

                        <button
                            type="button"
                            onClick={() =>
                                setBulkMode(false)
                            }
                            style={{
                                flex: 1,
                                padding: '11px',
                                borderRadius: '8px',
                                border: 'none',
                                background:
                                    !bulkMode
                                        ? '#fff'
                                        : 'transparent',
                                boxShadow:
                                    !bulkMode
                                        ? '0 1px 4px rgba(0,0,0,0.08)'
                                        : 'none',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Thêm từng suất
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleOpenBulkAdd
                            }
                            style={{
                                flex: 1,
                                padding: '11px',
                                borderRadius: '8px',
                                border: 'none',
                                background:
                                    bulkMode
                                        ? '#fff'
                                        : 'transparent',
                                boxShadow:
                                    bulkMode
                                        ? '0 1px 4px rgba(0,0,0,0.08)'
                                        : 'none',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '7px'
                            }}
                        >
                            <CalendarRange
                                size={16}
                            />

                            Thêm hàng loạt
                        </button>

                    </div>

                )}

                {/* ==================================================
                    BULK FORM
                ================================================== */}

                {bulkMode ? (

                    renderBulkForm()

                ) : (

                    <AdminForm
                        fields={formFields}
                        formData={formData}
                        errors={formErrors}
                        onChange={handleChange}
                        onSubmit={handleSubmit}
                        loading={submitLoading}
                        submitText={
                            editingShowtime
                                ? 'Lưu thay đổi'
                                : 'Thêm suất chiếu'
                        }
                    />

                )}

            </AdminModal>

            {/* ==================================================
                ALERT / CONFIRM MODAL
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

export default ShowTimePage;