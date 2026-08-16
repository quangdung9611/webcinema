import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';

import {
    CalendarDays,
    Loader2,
    Film,
    MapPin,
    Clock,
    Plus,
    Layers
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// INITIAL FORM
// ==========================================================

const initialFormData = {
    movie_id: '',
    cinema_id: '',
    room_id: '',
    start_time: ''
};

// ==========================================================
// INITIAL BULK FORM
// ==========================================================

const initialBulkFormData = {
    movie_id: '',
    cinema_id: '',
    room_id: '',
    date: '',
    times: ''
};

// ==========================================================
// DEFAULT PAGINATION
// ==========================================================

const defaultPagination = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
};

// ==========================================================
// COMPONENT
// ==========================================================

const ShowTimePage = () => {

    // ======================================================
    // LIST DATA
    // ======================================================

    const [showtimes, setShowtimes] = useState([]);

    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);

    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    // ======================================================
    // SEARCH / PAGINATION
    // ======================================================

    const [search, setSearch] = useState('');

    const [pagination, setPagination] = useState(
        defaultPagination
    );

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    // ======================================================
    // ADD SHOWTIME MODAL
    // ======================================================

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [formData, setFormData] = useState(
        initialFormData
    );

    const [formErrors, setFormErrors] = useState({});

    // ======================================================
    // BULK MODAL
    // ======================================================

    const [isBulkOpen, setIsBulkOpen] = useState(false);

    const [bulkFormData, setBulkFormData] = useState(
        initialBulkFormData
    );

    const [bulkErrors, setBulkErrors] = useState({});

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
    // ALERT HELPERS
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
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    // ======================================================
    // DATE TIME HELPERS
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

        const [datePart, timePart] =
            dateStr.split(' ');

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
        async (page = 1, keyword = '') => {

            if (isFetching.current) {
                return;
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();

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
                    res.data?.pagination ||
                    defaultPagination;

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
                setPagination(
                    defaultPagination
                );

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
    // FETCH ROOMS BY CINEMA
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

                showAlert(
                    'Lỗi',
                    'Không thể tải danh sách phòng của rạp.',
                    'error'
                );
            }
        },
        []
    );

    // ======================================================
    // INITIAL LOAD
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
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (page) => {

        fetchShowtimes(
            page,
            search
        );
    };

    // ======================================================
    // OPEN ADD
    // ======================================================

    const handleOpenAdd = () => {

        setFormData(
            initialFormData
        );

        setFormErrors({});

        setRooms([]);

        setIsFormOpen(true);
    };

    // ======================================================
    // CLOSE ADD
    // ======================================================

    const handleCloseForm = () => {

        if (submitLoading) {
            return;
        }

        setIsFormOpen(false);

        setFormData(
            initialFormData
        );

        setFormErrors({});

        setRooms([]);
    };

    // ======================================================
    // OPEN BULK
    // ======================================================

    const handleOpenBulk = () => {

        setBulkFormData(
            initialBulkFormData
        );

        setBulkErrors({});

        setRooms([]);

        setIsBulkOpen(true);
    };

    // ======================================================
    // CLOSE BULK
    // ======================================================

    const handleCloseBulk = () => {

        if (bulkLoading) {
            return;
        }

        setIsBulkOpen(false);

        setBulkFormData(
            initialBulkFormData
        );

        setBulkErrors({});

        setRooms([]);
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

        // Khi đổi rạp
        if (
            name === 'cinema_id'
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

        if (bulkErrors[name]) {

            setBulkErrors(
                (prev) => ({
                    ...prev,
                    [name]: ''
                })
            );
        }

        setBulkFormData(
            (prev) => ({
                ...prev,
                [name]: value
            })
        );

        // Khi đổi rạp
        if (
            name === 'cinema_id'
        ) {

            setBulkFormData(
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
    // VALIDATE NORMAL FORM
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
    // SUBMIT NORMAL SHOWTIME
    // ======================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {

            setSubmitLoading(true);
            setFormErrors({});

            const submitData = {
                movie_id:
                    Number(formData.movie_id),

                cinema_id:
                    Number(formData.cinema_id),

                room_id:
                    Number(formData.room_id),

                start_time:
                    formData.start_time
                        .replace('T', ' ')
            };

            await api.post(
                '/api/showtimes',
                submitData
            );

            setIsFormOpen(false);

            setFormData(
                initialFormData
            );

            await fetchShowtimes(
                pagination.page,
                search
            );

            showAlert(
                'Thành công',
                'Thêm suất chiếu thành công.',
                'success'
            );

        } catch (error) {

            console.error(
                'CREATE SHOWTIME ERROR:',
                error
            );

            const backendField =
                error.response?.data?.field;

            const backendMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Không thể thêm suất chiếu.';

            if (backendField) {

                setFormErrors({
                    [backendField]:
                        backendMessage
                });

            } else {

                showAlert(
                    'Lỗi',
                    backendMessage,
                    'error'
                );
            }

        } finally {

            setSubmitLoading(false);
        }
    };

    // ======================================================
    // PARSE BULK TIMES
    // ======================================================

    const parseBulkTimes = (value) => {

        if (!value) {
            return [];
        }

        return value
            .split(/[\n,;]+/)
            .map((time) => time.trim())
            .filter(Boolean)
            .map((time) => {

                // Cho phép:
                // 09:00
                // 9:00
                // 09:30

                const match =
                    time.match(
                        /^(\d{1,2}):(\d{2})$/
                    );

                if (!match) {
                    return null;
                }

                const hour =
                    Number(match[1]);

                const minute =
                    Number(match[2]);

                if (
                    hour < 0 ||
                    hour > 23 ||
                    minute < 0 ||
                    minute > 59
                ) {
                    return null;
                }

                return (
                    `${String(hour).padStart(2, '0')}:` +
                    `${String(minute).padStart(2, '0')}`
                );
            })
            .filter(Boolean);
    };

    // ======================================================
    // VALIDATE BULK FORM
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

        if (!bulkFormData.room_id) {
            errors.room_id =
                'Vui lòng chọn phòng';
        }

        if (!bulkFormData.date) {
            errors.date =
                'Vui lòng chọn ngày chiếu';
        }

        const times =
            parseBulkTimes(
                bulkFormData.times
            );

        if (!bulkFormData.times.trim()) {

            errors.times =
                'Vui lòng nhập ít nhất một giờ chiếu';

        } else if (!times.length) {

            errors.times =
                'Giờ chiếu không hợp lệ. Ví dụ: 09:00, 11:30, 14:00';

        }

        setBulkErrors(errors);

        return Object.keys(errors).length === 0;
    };

    // ======================================================
    // BULK CREATE
    // ======================================================

    const handleBulkSubmit = async (e) => {

        e.preventDefault();

        if (!validateBulkForm()) {
            return;
        }

        const times =
            parseBulkTimes(
                bulkFormData.times
            );

        if (!times.length) {
            return;
        }

        try {

            setBulkLoading(true);
            setBulkErrors({});

            /*
             * Gửi từng suất lên API hiện tại.
             *
             * Ví dụ:
             * 09:00
             * 11:30
             * 14:00
             * 16:30
             *
             * => tạo 4 suất chiếu.
             */

            const requests =
                times.map((time) => {

                    return api.post(
                        '/api/showtimes',
                        {
                            movie_id:
                                Number(
                                    bulkFormData.movie_id
                                ),

                            cinema_id:
                                Number(
                                    bulkFormData.cinema_id
                                ),

                            room_id:
                                Number(
                                    bulkFormData.room_id
                                ),

                            start_time:
                                `${bulkFormData.date} ${time}`
                        }
                    );
                });

            const results =
                await Promise.allSettled(
                    requests
                );

            const successCount =
                results.filter(
                    (result) =>
                        result.status ===
                        'fulfilled'
                ).length;

            const failedResults =
                results.filter(
                    (result) =>
                        result.status ===
                        'rejected'
                );

            const failedCount =
                failedResults.length;

            setIsBulkOpen(false);

            setBulkFormData(
                initialBulkFormData
            );

            await fetchShowtimes(
                pagination.page,
                search
            );

            // ==============================================
            // TẤT CẢ THÀNH CÔNG
            // ==============================================

            if (failedCount === 0) {

                showAlert(
                    'Thành công',
                    `Đã thêm ${successCount} suất chiếu thành công.`,
                    'success'
                );

                return;
            }

            // ==============================================
            // CÓ SUẤT BỊ LỖI
            // ==============================================

            const firstError =
                failedResults[0]
                    ?.reason
                    ?.response
                    ?.data
                    ?.message ||
                'Một số suất chiếu không thể thêm.';

            showAlert(
                'Kết quả thêm hàng loạt',
                `Đã thêm thành công ${successCount}/${times.length} suất chiếu.\n\n${firstError}`,
                failedCount === times.length
                    ? 'error'
                    : 'warning'
            );

        } catch (error) {

            console.error(
                'BULK CREATE SHOWTIMES ERROR:',
                error
            );

            showAlert(
                'Lỗi',
                'Không thể thực hiện thêm hàng loạt suất chiếu.',
                'error'
            );

        } finally {

            setBulkLoading(false);
        }
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

                ...movies.map(
                    (movie) => ({
                        label: movie.title,
                        value: movie.movie_id
                    })
                )
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

                ...cinemas.map(
                    (cinema) => ({
                        label:
                            cinema.cinema_name,
                        value:
                            cinema.cinema_id
                    })
                )
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

                ...rooms.map(
                    (room) => ({
                        label:
                            `${room.room_name} (${room.room_type})`,
                        value:
                            room.room_id
                    })
                )
            ]
        },

        {
            label: 'Thời gian chiếu',
            name: 'start_time',
            type: 'datetime-local'
        }
    ];

    // ======================================================
    // BULK FORM FIELDS
    // ======================================================

    const bulkFormFields = [

        {
            label: 'Phim',
            name: 'movie_id',
            type: 'select',

            options: [
                {
                    label: '-- Chọn phim --',
                    value: ''
                },

                ...movies.map(
                    (movie) => ({
                        label:
                            movie.title,
                        value:
                            movie.movie_id
                    })
                )
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

                ...cinemas.map(
                    (cinema) => ({
                        label:
                            cinema.cinema_name,
                        value:
                            cinema.cinema_id
                    })
                )
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

                ...rooms.map(
                    (room) => ({
                        label:
                            `${room.room_name} (${room.room_type})`,
                        value:
                            room.room_id
                    })
                )
            ]
        },

        {
            label: 'Ngày chiếu',
            name: 'date',
            type: 'date'
        },

        {
            label: 'Các giờ chiếu',
            name: 'times',
            type: 'textarea',

            placeholder:
                'Ví dụ:\n09:00\n11:30\n14:00\n16:30\n19:00\n21:30'
        }
    ];

    // ======================================================
    // RENDER
    // ======================================================

    return (
        <>
            <AdminPage
                title="Quản lý lịch chiếu"
                subtitle="Quản lý toàn bộ suất chiếu trong hệ thống"
                icon={
                    <CalendarDays size={30} />
                }

                buttonText="Thêm suất chiếu"

                onAdd={
                    handleOpenAdd
                }

                searchValue={
                    search
                }

                onSearchChange={
                    setSearch
                }

                /*
                 * Nếu AdminPage của bạn chưa hỗ trợ
                 * button phụ thì bỏ phần này và dùng
                 * nút bulk ở bên dưới.
                 */
            >

                {/* ==================================================
                    BULK ACTION
                ================================================== */}

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: '16px'
                    }}
                >

                    <button
                        type="button"
                        onClick={
                            handleOpenBulk
                        }
                        disabled={
                            loading ||
                            submitLoading ||
                            bulkLoading
                        }
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >

                        <Layers size={17} />

                        Thêm hàng loạt

                    </button>

                </div>

                {/* ==================================================
                    TABLE
                ================================================== */}

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
                ADD SINGLE SHOWTIME
            ================================================== */}

            <AdminModal
                open={isFormOpen}
                onClose={
                    handleCloseForm
                }
                title="Thêm suất chiếu"
                type="default"
                size="lg"
            >

                <AdminForm
                    fields={
                        formFields
                    }

                    formData={
                        formData
                    }

                    errors={
                        formErrors
                    }

                    onChange={
                        handleChange
                    }

                    onSubmit={
                        handleSubmit
                    }

                    loading={
                        submitLoading
                    }

                    submitText="Thêm suất chiếu"
                />

            </AdminModal>

            {/* ==================================================
                BULK SHOWTIMES
            ================================================== */}

            <AdminModal
                open={isBulkOpen}
                onClose={
                    handleCloseBulk
                }
                title="Thêm hàng loạt suất chiếu"
                type="default"
                size="lg"
            >

                <div
                    style={{
                        marginBottom: '18px',
                        padding: '14px 16px',
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
                            fontWeight: '600',
                            marginBottom: '6px'
                        }}
                    >

                        <Plus size={16} />

                        Thêm nhiều suất trong cùng một ngày

                    </div>

                    <div
                        style={{
                            color: '#64748b',
                            fontSize: '14px',
                            lineHeight: '1.6'
                        }}
                    >

                        Chọn phim, rạp, phòng và ngày.
                        Sau đó nhập nhiều giờ chiếu.
                        Mỗi giờ sẽ được tạo thành một suất riêng.

                    </div>

                </div>

                <AdminForm
                    fields={
                        bulkFormFields
                    }

                    formData={
                        bulkFormData
                    }

                    errors={
                        bulkErrors
                    }

                    onChange={
                        handleBulkChange
                    }

                    onSubmit={
                        handleBulkSubmit
                    }

                    loading={
                        bulkLoading
                    }

                    submitText={
                        bulkLoading
                            ? 'Đang thêm...'
                            : 'Thêm hàng loạt'
                    }
                />

            </AdminModal>

            {/* ==================================================
                ALERT / CONFIRM MODAL
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

export default ShowTimePage;