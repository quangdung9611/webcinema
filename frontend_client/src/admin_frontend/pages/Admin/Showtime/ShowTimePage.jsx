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
    Layers3,
    Sparkles
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';


// ==========================================================
// INITIAL DATA
// ==========================================================

const initialScheduleData = {
    movie_id: '',
    cinema_id: '',
    room_ids: [],

    start_date: '',
    end_date: '',

    operating_start: '09:00',
    operating_end: '24:00',

    distribution_level: 'medium'
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
    // OPEN CREATE SCHEDULE
    // ======================================================

    const handleOpenAdd = () => {

        setEditingShowtime(null);

        setScheduleData(
            initialScheduleData
        );

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
                room_ids: [st.room_id],

                start_date:
                    st.start_time?.slice(0, 10) || '',

                end_date:
                    st.start_time?.slice(0, 10) || '',

                operating_start:
                    st.start_time?.slice(11, 16) || '09:00',

                operating_end: '24:00',

                distribution_level: 'manual'
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
            value
        } = e.target;


        if (formErrors[name]) {

            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));

        }


        // ----------------------------------------------
        // CINEMA
        // ----------------------------------------------

        if (name === 'cinema_id') {

            setScheduleData(prev => ({
                ...prev,
                cinema_id: value,
                room_ids: []
            }));

            await fetchRoomsByCinema(value);

            return;
        }


        // ----------------------------------------------
        // ROOM MULTI SELECT
        // ----------------------------------------------

        if (name === 'room_ids') {

            const selected =
                Array.from(
                    e.target.selectedOptions,
                    option => Number(option.value)
                );

            setScheduleData(prev => ({
                ...prev,
                room_ids: selected
            }));

            return;
        }


        // ----------------------------------------------
        // NORMAL
        // ----------------------------------------------

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


        if (
            !scheduleData.room_ids ||
            scheduleData.room_ids.length === 0
        ) {

            errors.room_ids =
                'Vui lòng chọn ít nhất một phòng';

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
                            scheduleData.movie_id,

                        cinema_id:
                            scheduleData.cinema_id,

                        room_id:
                            scheduleData.room_ids[0],

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


            const payload = {

                movie_id:
                    Number(scheduleData.movie_id),

                cinema_id:
                    Number(scheduleData.cinema_id),

                room_ids:
                    scheduleData.room_ids.map(Number),

                start_date:
                    scheduleData.start_date,

                end_date:
                    scheduleData.end_date,

                operating_start:
                    scheduleData.operating_start,

                operating_end:
                    scheduleData.operating_end,

                distribution_level:
                    scheduleData.distribution_level

            };


            const res = await api.post(
                '/api/showtimes/schedule',
                payload
            );


            setIsFormOpen(false);


            await fetchShowtimes(
                pagination.page,
                search
            );


            showAlert(
                'Tạo lịch chiếu thành công',
                res.data?.message ||
                'Hệ thống đã tự động phân bổ suất chiếu.',
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
            name: 'room_ids',
            type: 'select',

            multiple: true,

            options: [

                {
                    label:
                        rooms.length
                            ? '-- Giữ Ctrl để chọn nhiều phòng --'
                            : '-- Chọn rạp trước --',

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
            label: 'Ngày bắt đầu',
            name: 'start_date',
            type: 'date'
        },


        {
            label: 'Ngày kết thúc',
            name: 'end_date',
            type: 'date'
        },


        {
            label: 'Bắt đầu hoạt động',
            name: 'operating_start',
            type: 'time'
        },


        {
            label: 'Kết thúc hoạt động',
            name: 'operating_end',
            type: 'time'
        },


        {
            label: 'Mức độ phân bổ',
            name: 'distribution_level',
            type: 'select',

            options: [

                {
                    label: 'Ít - phim ít ưu tiên',
                    value: 'low'
                },

                {
                    label: 'Trung bình - mức mặc định',
                    value: 'medium'
                },

                {
                    label: 'Nhiều - phim được ưu tiên',
                    value: 'high'
                }

            ]
        }

    ];


    // ======================================================
    // RENDER
    // ======================================================

    return (

        <>

            <AdminPage

                title="Quản lý lịch chiếu"

                subtitle="Tự động phân bổ suất chiếu theo phim, rạp, phòng, thời gian và mức độ ưu tiên"

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

                            Hệ thống sẽ dựa vào thời lượng phim,
                            khoảng thời gian hoạt động,
                            các phòng được chọn và mức độ phân bổ
                            để tự tạo lịch chiếu.


                            <br />

                            Đồng thời tự kiểm tra lịch hiện có
                            để tránh trùng suất trong cùng phòng.

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

                            <Layers3 size={16} />

                            <strong>
                                Ví dụ:
                            </strong>

                        </div>


                        Phim 120 phút + nghỉ 15 phút,
                        hoạt động từ 09:00 đến 24:00,
                        chọn 3 phòng và mức
                        <strong> "Nhiều"</strong>.


                        <br />


                        Hệ thống sẽ tự tính các mốc suất phù hợp
                        cho từng phòng và bỏ qua các khoảng thời gian
                        đang bị trùng lịch.

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