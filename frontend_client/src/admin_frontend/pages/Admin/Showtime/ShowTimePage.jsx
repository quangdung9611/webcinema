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
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info
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

// ==========================================================
// COMPONENT
// ==========================================================
const ShowTimePage = () => {
    // ------------------------------------------------------
    // STATES
    // ------------------------------------------------------
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

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingShowtime, setEditingShowtime] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    // ------------------------------------------------------
    // ALERT HANDLER
    // ------------------------------------------------------
    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, type, onConfirm, onCancel });
    };
    const closeAlert = () => setAlertModal((prev) => ({ ...prev, open: false }));

    // ------------------------------------------------------
    // TIMEZONE HELPERS
    // ------------------------------------------------------
    const formatForInput = (dateString) => {
        if (!dateString) return '';
        return dateString.slice(0, 16).replace(' ', 'T');
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return { date: '--/--/----', time: '--:--' };
        const [datePart, timePart] = dateStr.split(' ');
        if (!datePart || !timePart) return { date: '--/--/----', time: '--:--' };
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        return { date: `${day}/${month}/${year}`, time: `${hour}:${minute}` };
    };

    // ------------------------------------------------------
    // FETCH SHOWTIMES (PAGINATION + SEARCH)
    // ------------------------------------------------------
    const fetchShowtimes = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/showtimes', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const responseData = res.data?.data;
            const showtimesData = responseData?.data || [];
            const paginationData = responseData?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1
            };

            setShowtimes(showtimesData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('FETCH SHOWTIMES ERROR:', error);
            showAlert('Lỗi', 'Không thể tải danh sách suất chiếu.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    // ------------------------------------------------------
    // FETCH INITIAL DATA (Movies & Cinemas)
    // ------------------------------------------------------
    const fetchInitialData = async () => {
        try {
            const [movieRes, cinemaRes] = await Promise.all([
                api.get('/api/movies'),
                api.get('/api/cinemas')
            ]);
            setMovies(movieRes.data?.data?.data || movieRes.data?.data || []);
            setCinemas(cinemaRes.data?.data?.data || cinemaRes.data?.data || []);
        } catch (error) {
            console.error('Fetch initial data error:', error);
        }
    };

    useEffect(() => {
        fetchShowtimes(1, '');
        fetchInitialData();
    }, []);

    // ------------------------------------------------------
    // SEARCH DEBOUNCE
    // ------------------------------------------------------
    const prevSearchRef = useRef('');
    useEffect(() => {
        if (search === prevSearchRef.current) return;
        prevSearchRef.current = search;
        const timer = setTimeout(() => fetchShowtimes(1, search), 400);
        return () => clearTimeout(timer);
    }, [search, fetchShowtimes]);

    const handlePageChange = (page) => fetchShowtimes(page, search);

    // ------------------------------------------------------
    // FETCH ROOMS BY CINEMA
    // ------------------------------------------------------
    const fetchRoomsByCinema = async (cinemaId) => {
        if (!cinemaId) {
            setRooms([]);
            return;
        }
        try {
            const res = await api.get(`/api/rooms/cinema/${cinemaId}`);
            setRooms(res.data?.data || res.data || []);
        } catch (error) {
            console.error('Fetch rooms error:', error);
            setRooms([]);
        }
    };

    // ------------------------------------------------------
    // VALIDATE FORM
    // ------------------------------------------------------
    const validateForm = () => {
        const errors = {};
        if (!formData.movie_id) errors.movie_id = 'Vui lòng chọn phim';
        if (!formData.cinema_id) errors.cinema_id = 'Vui lòng chọn rạp';
        if (!formData.room_id) errors.room_id = 'Vui lòng chọn phòng';
        if (!formData.start_time) errors.start_time = 'Vui lòng chọn thời gian chiếu';
        return errors;
    };

    // ------------------------------------------------------
    // HANDLE MODAL ACTIONS
    // ------------------------------------------------------
    const handleOpenAdd = () => {
        setEditingShowtime(null);
        setFormData(initialFormData);
        setRooms([]);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = async (showtime) => {
        try {
            setLoading(true);
            const detailRes = await api.get(`/api/showtimes/${showtime.showtime_id}`);
            const st = detailRes.data?.data || detailRes.data;

            await fetchRoomsByCinema(st.cinema_id);

            setEditingShowtime(st);
            setFormErrors({});
            setFormData({
                movie_id: st.movie_id,
                cinema_id: st.cinema_id,
                room_id: st.room_id,
                start_time: formatForInput(st.start_time)
            });
            setIsFormOpen(true);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải dữ liệu suất chiếu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------
    // HANDLE CHANGE
    // ------------------------------------------------------
    const handleChange = async (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({ ...prev, [name]: value }));

        let errorMessage = '';
        switch (name) {
            case 'movie_id': if (!value) errorMessage = 'Vui lòng chọn phim'; break;
            case 'cinema_id': if (!value) errorMessage = 'Vui lòng chọn rạp'; break;
            case 'room_id': if (!value) errorMessage = 'Vui lòng chọn phòng'; break;
            case 'start_time': if (!value) errorMessage = 'Vui lòng chọn thời gian chiếu'; break;
            default: break;
        }
        setFormErrors((prev) => ({ ...prev, [name]: errorMessage }));

        if (name === 'cinema_id') {
            setFormData((prev) => ({ ...prev, cinema_id: value, room_id: '' }));
            await fetchRoomsByCinema(value);
        }
    };

    // ------------------------------------------------------
    // HANDLE SUBMIT
    // ------------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        try {
            setSubmitLoading(true);
            setFormErrors({});

            const submitData = {
                ...formData,
                start_time: formData.start_time.replace('T', ' ')
            };

            if (editingShowtime) {
                await api.put(`/api/showtimes/${editingShowtime.showtime_id}`, submitData);
                showAlert('Thành công', 'Cập nhật suất chiếu thành công.', 'success');
            } else {
                await api.post('/api/showtimes', submitData);
                showAlert('Thành công', 'Thêm suất chiếu thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchShowtimes(pagination.page, search);
        } catch (error) {
            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.error || 'Đã xảy ra lỗi.';
            if (backendField) {
                setFormErrors({ [backendField]: backendError });
            } else {
                showAlert('Lỗi', backendError, 'error');
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    // ------------------------------------------------------
    // HANDLE DELETE
    // ------------------------------------------------------
    const handleDelete = (showtime) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa suất chiếu phim "${showtime.title}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/showtimes/${showtime.showtime_id}`);
                    closeAlert();

                    const newPage = showtimes.length === 1 && pagination.page > 1
                        ? pagination.page - 1
                        : pagination.page;
                    fetchShowtimes(newPage, search);
                    showAlert('Thành công', 'Xóa suất chiếu thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', error.response?.data?.error || 'Không thể xóa suất chiếu.', 'error');
                }
            },
            closeAlert
        );
    };

    // ------------------------------------------------------
    // TABLE COLUMNS
    // ------------------------------------------------------
    const columns = [
        {
            title: 'Phim',
            key: 'title',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#dbeafe',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Film size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '600' }}>{row.title}</div>
                        <small style={{ color: '#64748b' }}>{row.duration} phút</small>
                    </div>
                </div>
            )
        },
        {
            title: 'Rạp / Phòng',
            key: 'cinema_name',
            render: (row) => (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                        <MapPin size={14} /> {row.cinema_name}
                    </div>
                    <div className="status-badge" style={{ marginTop: '6px', width: 'fit-content' }}>
                        {row.room_name} ({row.room_type})
                    </div>
                </div>
            )
        },
        {
            title: 'Ngày chiếu',
            key: 'start_time',
            render: (row) => formatDateTime(row.start_time).date
        },
        {
            title: 'Giờ chiếu',
            key: 'time',
            render: (row) => (
                <span className="status-badge pending">
                    <Clock size={13} style={{ marginRight: '4px' }} />
                    {formatDateTime(row.start_time).time}
                </span>
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (row) => (
                <div className="admin-table-actions">
                    <button className="admin-action-btn edit-btn" onClick={() => handleOpenEdit(row)}>
                        <Edit size={16} />
                    </button>
                    <button className="admin-action-btn delete-btn" onClick={() => handleDelete(row)}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    // ------------------------------------------------------
    // FORM FIELDS
    // ------------------------------------------------------
    const formFields = [
        {
            label: 'Phim',
            name: 'movie_id',
            type: 'select',
            options: [
                { label: '-- Chọn phim --', value: '' },
                ...movies.map(movie => ({ label: movie.title, value: movie.movie_id }))
            ]
        },
        {
            label: 'Rạp chiếu',
            name: 'cinema_id',
            type: 'select',
            options: [
                { label: '-- Chọn rạp --', value: '' },
                ...cinemas.map(cinema => ({ label: cinema.cinema_name, value: cinema.cinema_id }))
            ]
        },
        {
            label: 'Phòng chiếu',
            name: 'room_id',
            type: 'select',
            options: [
                { label: '-- Chọn phòng --', value: '' },
                ...rooms.map(room => ({ label: `${room.room_name} (${room.room_type})`, value: room.room_id }))
            ]
        },
        {
            label: 'Thời gian chiếu',
            name: 'start_time',
            type: 'datetime-local'
        }
    ];

    // ------------------------------------------------------
    // HELPER: RENDER ALERT ICON
    // ------------------------------------------------------
    const renderAlertIcon = () => {
        switch (alertModal.type) {
            case 'success': return <CheckCircle2 size={58} color="#22c55e" />;
            case 'error': return <XCircle size={58} color="#ef4444" />;
            case 'warning': return <AlertTriangle size={58} color="#f59e0b" />;
            default: return <Info size={58} color="#3b82f6" />;
        }
    };

    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------
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
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <>
                        <AdminTable columns={columns} data={showtimes} />
                        <AdminPagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </AdminPage>

            {/* FORM MODAL */}
            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingShowtime ? 'Cập nhật suất chiếu' : 'Thêm suất chiếu'}
            >
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingShowtime ? 'Lưu thay đổi' : 'Thêm suất chiếu'}
                />
            </AdminModal>

            {/* ALERT MODAL */}
            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
            >
                <div className="admin-alert-content">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                        {renderAlertIcon()}
                    </div>
                    <p>{alertModal.message}</p>
                    <div className="admin-alert-actions">
                        {alertModal.onCancel && (
                            <button className="admin-cancel-btn" onClick={alertModal.onCancel}>
                                Hủy
                            </button>
                        )}
                        <button className="admin-confirm-btn" onClick={alertModal.onConfirm || closeAlert}>
                            Xác nhận
                        </button>
                    </div>
                </div>
            </AdminModal>
        </>
    );
};

export default ShowTimePage;