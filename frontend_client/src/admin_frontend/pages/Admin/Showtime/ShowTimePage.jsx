import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

import {
    CalendarDays,
    Edit,
    Trash2,
    Loader2,
    Film,
    MapPin,
    Clock
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

const SHOWTIME_API =
    'https://api.quangdungcinema.id.vn/api/showtimes';

const MOVIES_API =
    'https://api.quangdungcinema.id.vn/api/movies';

const CINEMAS_API =
    'https://api.quangdungcinema.id.vn/api/cinemas';

const ROOMS_API =
    'https://api.quangdungcinema.id.vn/api/rooms/cinema';

const initialFormData = {
    movie_id: '',
    cinema_id: '',
    room_id: '',
    start_time: ''
};

const ShowTimePage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [showtimes, setShowtimes] = useState([]);

    const [movies, setMovies] = useState([]);

    const [cinemas, setCinemas] = useState([]);

    const [rooms, setRooms] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingShowtime, setEditingShowtime] =
        useState(null);

    const [formData, setFormData] =
        useState(initialFormData);

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    /* =====================================================
        TIMEZONE HELPERS (FIX CHUẨN MÚI GIỜ)
    ===================================================== */

    // Convert DATETIME từ MySQL -> input datetime-local
    const formatForInput = (dateString) => {

        if (!dateString) return '';

        // VD:
        // "2026-05-20 19:30"
        // -> "2026-05-20T19:30"

        return dateString.slice(0, 16).replace(' ', 'T');

    };

    // Format hiển thị bảng
    const formatDateTime = (dateStr) => {

        if (!dateStr) {
            return {
                date: '--/--/----',
                time: '--:--'
            };
        }

        // Parse thủ công để tránh lệch timezone
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

    /* =====================================================
        ALERT MODAL
    ===================================================== */

    const showAlert = (
        title,
        message,
        onConfirm = null,
        onCancel = null
    ) => {

        setAlertModal({
            open: true,
            title,
            message,
            onConfirm,
            onCancel
        });

    };

    const closeAlert = () => {

        setAlertModal(prev => ({
            ...prev,
            open: false
        }));

    };

    /* =====================================================
        FETCH DATA
    ===================================================== */

    const fetchShowtimes = async () => {

        setLoading(true);

        try {

            const res = await axios.get(
                SHOWTIME_API
            );

            setShowtimes(res.data);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách suất chiếu.'
            );

        } finally {

            setLoading(false);

        }

    };

    const fetchInitialData = async () => {

        try {

            const [
                movieRes,
                cinemaRes
            ] = await Promise.all([
                axios.get(MOVIES_API),
                axios.get(CINEMAS_API)
            ]);

            setMovies(movieRes.data);

            setCinemas(cinemaRes.data);

        } catch (error) {

            console.error(error);

        }

    };

    useEffect(() => {

        fetchShowtimes();

        fetchInitialData();

    }, []);

    /* =====================================================
        OPEN ADD
    ===================================================== */

    const handleOpenAdd = () => {

        setEditingShowtime(null);

        setFormData(initialFormData);

        setRooms([]);

        setIsFormOpen(true);

    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */

    const handleOpenEdit = async (showtime) => {

        try {

            setLoading(true);

            const detailRes = await axios.get(
                `${SHOWTIME_API}/detail/${showtime.showtime_id}`
            );

            const st = detailRes.data;

            const roomRes = await axios.get(
                `${ROOMS_API}/${st.cinema_id}`
            );

            setRooms(roomRes.data);

            setEditingShowtime(st);

            setFormData({
                movie_id: st.movie_id,
                cinema_id: st.cinema_id,
                room_id: st.room_id,

                // FIX CHUẨN
                start_time: formatForInput(
                    st.start_time
                )
            });

            setIsFormOpen(true);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải dữ liệu suất chiếu.'
            );

        } finally {

            setLoading(false);

        }

    };

    /* =====================================================
        HANDLE CHANGE
    ===================================================== */

    const handleChange = async (e) => {

        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'cinema_id') {

            setFormData(prev => ({
                ...prev,
                cinema_id: value,
                room_id: ''
            }));

            if (value) {

                try {

                    const res = await axios.get(
                        `${ROOMS_API}/${value}`
                    );

                    setRooms(res.data);

                } catch (error) {

                    console.error(error);

                }

            } else {

                setRooms([]);

            }

        }

    };

    /* =====================================================
        SUBMIT
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const submitData = {
                ...formData,

                // datetime-local
                // 2026-05-20T19:30
                // ->
                // 2026-05-20 19:30

                start_time:
                    formData.start_time.replace(
                        'T',
                        ' '
                    )
            };

            if (editingShowtime) {

                await axios.put(
                    `${SHOWTIME_API}/update/${editingShowtime.showtime_id}`,
                    submitData
                );

                showAlert(
                    'Thành công',
                    'Cập nhật suất chiếu thành công.'
                );

            } else {

                await axios.post(
                    `${SHOWTIME_API}/add`,
                    submitData
                );

                showAlert(
                    'Thành công',
                    'Thêm suất chiếu thành công.'
                );

            }

            setIsFormOpen(false);

            fetchShowtimes();

        } catch (error) {

            showAlert(
                'Lỗi',
                error.response?.data?.error ||
                'Đã xảy ra lỗi.'
            );

        }

    };

    /* =====================================================
        DELETE
    ===================================================== */

    const handleDelete = (showtime) => {

        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa suất chiếu phim "${showtime.title}"?`,

            async () => {

                try {

                    await axios.delete(
                        `${SHOWTIME_API}/${showtime.showtime_id}`
                    );

                    closeAlert();

                    fetchShowtimes();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        error.response?.data?.error ||
                        'Không thể xóa suất chiếu.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FILTER
    ===================================================== */

    const filteredShowtimes =
        showtimes.filter(showtime => {

            const keyword =
                search.toLowerCase();

            return (
                showtime.title
                    ?.toLowerCase()
                    .includes(keyword) ||

                showtime.cinema_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                showtime.room_name
                    ?.toLowerCase()
                    .includes(keyword)
            );

        });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

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

            render: (row) => {

                const {
                    date
                } = formatDateTime(
                    row.start_time
                );

                return date;

            }
        },

        {
            title: 'Giờ chiếu',
            key: 'time',

            render: (row) => {

                const {
                    time
                } = formatDateTime(
                    row.start_time
                );

                return (

                    <span
                        className="status-badge pending"
                    >

                        <Clock
                            size={13}
                            style={{
                                marginRight: '4px'
                            }}
                        />

                        {time}

                    </span>

                );

            }
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

    /* =====================================================
        FORM FIELDS
    ===================================================== */

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

    /* =====================================================
        RENDER
    ===================================================== */

    return (

        <>

            <AdminPage

                title="Quản lý lịch chiếu"

                subtitle="Quản lý toàn bộ suất chiếu trong hệ thống"

                icon={
                    <CalendarDays size={30} />
                }

                buttonText="Thêm suất chiếu"

                onAdd={handleOpenAdd}

                searchValue={search}

                onSearchChange={setSearch}

            >

                {
                    loading ? (

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

                        <AdminTable
                            columns={columns}
                            data={filteredShowtimes}
                        />

                    )
                }

            </AdminPage>

            {/* =============================================
                FORM MODAL
            ============================================= */}

            <AdminModal
                open={isFormOpen}
                onClose={() =>
                    setIsFormOpen(false)
                }
                title={
                    editingShowtime
                        ? 'Cập nhật suất chiếu'
                        : 'Thêm suất chiếu'
                }
            >

                <AdminForm
                    fields={formFields}
                    formData={formData}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    submitText={
                        editingShowtime
                            ? 'Lưu thay đổi'
                            : 'Thêm suất chiếu'
                    }
                />

            </AdminModal>

            {/* =============================================
                ALERT MODAL
            ============================================= */}

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
            >

                <div className="admin-alert-content">

                    <p>
                        {alertModal.message}
                    </p>

                    <div className="admin-alert-actions">

                        {
                            alertModal.onCancel && (

                                <button
                                    className="admin-cancel-btn"
                                    onClick={
                                        alertModal.onCancel
                                    }
                                >
                                    Hủy
                                </button>

                            )
                        }

                        <button
                            className="admin-confirm-btn"
                            onClick={
                                alertModal.onConfirm ||
                                closeAlert
                            }
                        >
                            Xác nhận
                        </button>

                    </div>

                </div>

            </AdminModal>

        </>

    );

};

export default ShowTimePage;