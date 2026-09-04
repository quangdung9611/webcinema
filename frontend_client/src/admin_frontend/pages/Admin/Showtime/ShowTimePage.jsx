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
    Sparkles,
    Info
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// DISTRIBUTION
// ==========================================================

const DISTRIBUTION_OPTIONS = [
    { value: 'cold', label: '❄️ Ít - COLD (120 phút/suất)' },
    { value: 'normal', label: '📊 Trung bình - NORMAL (75 phút/suất)' },
    { value: 'hot', label: '🔥 Nhiều - HOT (45 phút/suất)' }
];

// ==========================================================
// INITIAL DATA - KHÔNG CÓ room_types
// ==========================================================

const initialScheduleData = {
    movie_id: '',
    cinema_id: '',
    room_ids: [],
    start_date: '',
    end_date: '',
    operating_start: '08:00',
    distribution_level: 'normal'
};

// ==========================================================
// COMPONENT
// ==========================================================

const ShowTimePage = () => {

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
    const [scheduleData, setScheduleData] = useState(initialScheduleData);
    const [formErrors, setFormErrors] = useState({});

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, type, onConfirm, onCancel });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, open: false, onConfirm: null, onCancel: null }));
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return { date: '--/--/----', time: '--:--' };
        let normalized = String(dateStr).replace('T', ' ');
        const [datePart, timePart] = normalized.split(' ');
        if (!datePart || !timePart) return { date: '--/--/----', time: '--:--' };
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        return { date: `${day}/${month}/${year}`, time: `${hour}:${minute}` };
    };

    const fetchShowtimes = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/showtimes/paginated', {
                params: { page, limit: 20, search: keyword.trim() },
                signal: controller.signal
            });

            const showtimesData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1, limit: 20, total: 0, totalPages: 1,
                hasPreviousPage: false, hasNextPage: false
            };

            setShowtimes(showtimesData);
            setPagination(paginationData);

        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
            console.error('FETCH SHOWTIMES ERROR:', error);
            setShowtimes([]);
            showAlert('Lỗi', 'Không thể tải danh sách suất chiếu.', 'error');

        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) abortControllerRef.current = null;
        }
    }, []);

    const fetchInitialData = useCallback(async () => {
        try {
            const [movieRes, cinemaRes] = await Promise.all([
                api.get('/api/movies'),
                api.get('/api/cinemas')
            ]);
            setMovies(movieRes.data?.data || []);
            setCinemas(cinemaRes.data?.data || []);
        } catch (error) {
            console.error('FETCH INITIAL DATA ERROR:', error);
        }
    }, []);

    const fetchRoomsByCinema = useCallback(async (cinemaId) => {
        if (!cinemaId) {
            setRooms([]);
            return;
        }
        try {
            const res = await api.get(`/api/rooms/cinema/${cinemaId}`);
            setRooms(res.data?.data || []);
        } catch (error) {
            console.error('FETCH ROOMS ERROR:', error);
            setRooms([]);
        }
    }, []);

    useEffect(() => {
        fetchShowtimes(1, '');
        fetchInitialData();
        return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, [fetchShowtimes, fetchInitialData]);

    const prevSearchRef = useRef('');

    useEffect(() => {
        const currentSearch = search;
        const previousSearch = prevSearchRef.current;
        if (currentSearch === previousSearch) return;

        prevSearchRef.current = currentSearch;
        const timer = setTimeout(() => {
            fetchShowtimes(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchShowtimes]);

    const handlePageChange = (page) => {
        fetchShowtimes(page, search);
    };

    const handleOpenAdd = () => {
        setEditingShowtime(null);
        setScheduleData({
            ...initialScheduleData,
            room_ids: [],
            start_date: '',
            end_date: '',
            operating_start: '08:00',
            distribution_level: 'normal'
        });
        setRooms([]);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = async (showtime) => {
        try {
            setLoading(true);
            const res = await api.get(`/api/showtimes/detail/${showtime.showtime_id}`);
            const st = res.data?.data || res.data;
            await fetchRoomsByCinema(st.cinema_id);

            setEditingShowtime(st);
            setFormErrors({});
            setScheduleData({
                movie_id: st.movie_id,
                cinema_id: st.cinema_id,
                room_ids: [Number(st.room_id)],
                start_date: st.start_time?.slice(0, 10) || '',
                end_date: st.start_time?.slice(0, 10) || '',
                operating_start: st.start_time?.slice(11, 16) || '08:00',
                distribution_level: 'normal'
            });
            setIsFormOpen(true);

        } catch (error) {
            console.error('FETCH SHOWTIME DETAIL ERROR:', error);
            showAlert('Lỗi', 'Không thể tải dữ liệu suất chiếu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingShowtime(null);
        setFormErrors({});
        setRooms([]);
    };

    const handleChange = async (e) => {
        const { name, value, checked } = e.target;

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }

        if (name === 'cinema_id') {
            setScheduleData(prev => ({ ...prev, cinema_id: value, room_ids: [] }));
            await fetchRoomsByCinema(value);
            return;
        }

        if (name === 'room_ids') {
            const roomId = Number(value);
            setScheduleData(prev => {
                const currentRoomIds = Array.isArray(prev.room_ids) ? prev.room_ids : [];
                const nextRoomIds = checked
                    ? (currentRoomIds.includes(roomId) ? currentRoomIds : [...currentRoomIds, roomId])
                    : currentRoomIds.filter(id => id !== roomId);
                return { ...prev, room_ids: nextRoomIds };
            });
            return;
        }

        setScheduleData(prev => ({ ...prev, [name]: value }));
    };

    // ✅ VALIDATE - KHÔNG CÓ room_types
    const validateSchedule = () => {
        const errors = {};

        if (!scheduleData.movie_id) errors.movie_id = 'Vui lòng chọn phim';
        if (!scheduleData.cinema_id) errors.cinema_id = 'Vui lòng chọn rạp';

        if (editingShowtime) {
            if (!Array.isArray(scheduleData.room_ids) || scheduleData.room_ids.length === 0) {
                errors.room_ids = 'Vui lòng chọn phòng chiếu';
            }
        }

        if (!scheduleData.start_date) errors.start_date = 'Vui lòng chọn ngày bắt đầu';
        if (!scheduleData.end_date) errors.end_date = 'Vui lòng chọn ngày kết thúc';

        if (scheduleData.start_date && scheduleData.end_date && scheduleData.start_date > scheduleData.end_date) {
            errors.end_date = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
        }

        if (editingShowtime && !scheduleData.operating_start) {
            errors.operating_start = 'Vui lòng chọn giờ';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (editingShowtime) {
            if (!validateSchedule()) return;

            try {
                setSubmitLoading(true);
                setFormErrors({});

                await api.put(`/api/showtimes/${editingShowtime.showtime_id}`, {
                    movie_id: Number(scheduleData.movie_id),
                    cinema_id: Number(scheduleData.cinema_id),
                    room_id: Number(scheduleData.room_ids[0]),
                    start_time: `${scheduleData.start_date} ${scheduleData.operating_start}`
                });

                setIsFormOpen(false);
                await fetchShowtimes(pagination.page, search);
                showAlert('Thành công', 'Cập nhật suất chiếu thành công.', 'success');

            } catch (error) {
                console.error('UPDATE SHOWTIME ERROR:', error);
                showAlert('Lỗi', error.response?.data?.message || 'Không thể cập nhật suất chiếu.', 'error');
            } finally {
                setSubmitLoading(false);
            }
            return;
        }

        // ✅ CREATE AUTO - KHÔNG CÓ room_types
        if (!validateSchedule()) return;

        try {
            setSubmitLoading(true);
            setFormErrors({});

            const payload = {
                movie_id: Number(scheduleData.movie_id),
                cinema_id: Number(scheduleData.cinema_id),
                start_date: scheduleData.start_date,
                end_date: scheduleData.end_date,
                distribution: scheduleData.distribution_level
            };

            console.log('📤 AUTO SCHEDULE PAYLOAD:', payload);

            const res = await api.post('/api/showtimes/schedule', payload);
            console.log('📥 AUTO SCHEDULE RESPONSE:', res.data);

            setIsFormOpen(false);
            await fetchShowtimes(pagination.page, search);

            const data = res.data?.data;
            let message = res.data?.message || 'Tạo lịch chiếu thành công.';

            if (data) {
                const created = Array.isArray(data.data) ? data.data.length : (data.createdCount || 0);
                const conflicts = Array.isArray(data.conflicts) ? data.conflicts.length : 0;
                const skippedPast = Array.isArray(data.skippedPast) ? data.skippedPast.length : 0;
                const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0;

                message += `\n\n✅ Đã tạo: ${created} suất`;
                if (conflicts > 0) message += `\n⚠️ Bỏ qua: ${conflicts} suất bị trùng`;
                if (skippedPast > 0) message += `\n⏭️ Bỏ qua: ${skippedPast} suất trong quá khứ`;
                if (skipped > 0) message += `\n⏭️ Bỏ qua: ${skipped} suất không thể xếp`;

                if (data.summary?.allocation && data.summary.allocation.length > 0) {
                    message += `\n\n📊 PHÂN BỔ PHÒNG THEO HẠNG:`;
                    for (const alloc of data.summary.allocation) {
                        const roomAlloc = alloc.roomAllocation || {};
                        const roomDetails = Object.entries(roomAlloc)
                            .filter(([type, info]) => info.count > 0)
                            .map(([type, info]) => `${type}: ${info.count} phòng`)
                            .join(' | ');
                        
                        message += `\n  🎬 ${alloc.title} (${alloc.hotLevel?.toUpperCase() || 'NORMAL'}):`;
                        message += `\n     Tổng: ${alloc.allocatedRooms} phòng`;
                        if (roomDetails) {
                            message += `\n     Chi tiết: ${roomDetails}`;
                        }
                    }
                }
            }

            showAlert('Tạo lịch chiếu thành công', message, 'success');

        } catch (error) {
            console.error('CREATE SCHEDULE ERROR:', error);
            const backendField = error.response?.data?.field;
            const message = error.response?.data?.message || 'Không thể tạo lịch chiếu.';

            if (backendField) {
                setFormErrors({ [backendField]: message });
            } else {
                showAlert('Không thể tạo lịch', message, 'error');
            }

        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = (showtime) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa suất chiếu phim "${showtime.title}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/showtimes/${showtime.showtime_id}`);
                    closeAlert();

                    const currentPage = pagination.page;
                    const newPage = showtimes.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
                    await fetchShowtimes(newPage, search);
                    showAlert('Thành công', 'Xóa suất chiếu thành công.', 'success');

                } catch (error) {
                    closeAlert();
                    showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa suất chiếu.', 'error');
                }
            },
            closeAlert
        );
    };

    const columns = [
        {
            title: 'Phim',
            key: 'title',
            render: row => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            render: row => (
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
            render: row => formatDateTime(row.start_time).date
        },
        {
            title: 'Giờ chiếu',
            key: 'time',
            render: row => (
                <span className="status-badge pending">
                    <Clock size={13} style={{ marginRight: '4px' }} />
                    {formatDateTime(row.start_time).time}
                </span>
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: row => (
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

    // ✅ FORM FIELDS - KHÔNG CÓ room_types
    const formFields = [
        {
            label: 'Phim',
            name: 'movie_id',
            type: 'select',
            options: [{ label: '-- Chọn phim --', value: '' }, ...movies.map(movie => ({ label: movie.title, value: movie.movie_id }))]
        },
        {
            label: 'Rạp chiếu',
            name: 'cinema_id',
            type: 'select',
            options: [{ label: '-- Chọn rạp --', value: '' }, ...cinemas.map(cinema => ({ label: cinema.cinema_name, value: cinema.cinema_id }))]
        },
        ...(editingShowtime ? [{
            label: 'Phòng chiếu',
            name: 'room_ids',
            type: 'checkbox-select',
            options: rooms.map(room => ({ 
                label: `${room.room_name} (${String(room.room_type || '').trim().toUpperCase()})`, 
                value: room.room_id 
            }))
        }] : []),
        { label: 'Ngày bắt đầu', name: 'start_date', type: 'date' },
        { label: 'Ngày kết thúc', name: 'end_date', type: 'date' },
        ...(editingShowtime ? [{ label: 'Giờ chiếu', name: 'operating_start', type: 'time' }] : []),
        ...(!editingShowtime ? [{
            label: 'Mức độ phân bổ',
            name: 'distribution_level',
            type: 'select',
            options: DISTRIBUTION_OPTIONS
        }] : [])
    ];

    return (
        <>
            <AdminPage
                title="Quản lý lịch chiếu"
                subtitle="Tự động phân bổ suất chiếu theo phim, rạp và mức độ ưu tiên"
                icon={<CalendarDays size={30} />}
                buttonText="Tạo lịch chiếu"
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
                        <AdminPagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
                    </>
                )}
            </AdminPage>

            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title={editingShowtime ? 'Cập nhật suất chiếu' : 'Tạo lịch chiếu tự động'}
                type="default"
                size="lg"
            >
                {!editingShowtime && (
                    <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '8px' }}>
                            <Sparkles size={18} /> Phân bổ suất chiếu tự động
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                            <strong>Hệ thống sẽ tự động phân bổ phòng theo mức độ ưu tiên:</strong>
                            <br /><br />
                            🔥 <strong>HOT</strong>: 45 phút/suất
                            <br />
                            &nbsp;&nbsp;&nbsp;→ 2D(40%) + 3D(30%) + VIP(20%) + IMAX(10%)
                            <br /><br />
                            📊 <strong>NORMAL</strong>: 75 phút/suất
                            <br />
                            &nbsp;&nbsp;&nbsp;→ 2D(60%) + 3D(40%)
                            <br /><br />
                            ❄️ <strong>COLD</strong>: 120 phút/suất
                            <br />
                            &nbsp;&nbsp;&nbsp;→ 2D(50%)
                            <br /><br />
                            <strong>💡 Bạn chỉ cần chọn mức độ ưu tiên, hệ thống sẽ tự động phân bổ hạng phòng!</strong>
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
                    submitText={editingShowtime ? 'Lưu thay đổi' : 'Tự động tạo lịch'}
                />

                {!editingShowtime && (
                    <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: '#f8fafc', fontSize: '13px', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                            <Info size={16} /> <strong>Cách hoạt động:</strong>
                        </div>
                        Hệ thống sẽ tự động lấy toàn bộ phòng thuộc các hạng phù hợp với mức ưu tiên bạn chọn.
                        <br /><br />
                        <strong>🕐 Giờ hoạt động:</strong>
                        <br />Thứ 2 → Thứ 6: <strong>08:00 → 23:30</strong>
                        <br />Thứ 7 → Chủ nhật: <strong>08:00 → 24:00</strong>
                        <br /><br />
                        <strong>Khoảng cách suất:</strong>
                        <br />🔥 HOT: <strong>45 phút</strong> | 📊 NORMAL: <strong>75 phút</strong> | ❄️ COLD: <strong>120 phút</strong>
                        <br /><br />
                        Phòng nào đang bận thì hệ thống sẽ thử phòng khác.
                        <br />Phòng chỉ được sử dụng lại sau khi phim trước kết thúc <strong>+ 15 phút</strong>.
                    </div>
                )}
            </AdminModal>

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
                onConfirm={alertModal.onConfirm || closeAlert}
                onCancel={alertModal.onCancel || closeAlert}
                confirmText="Xác nhận"
                cancelText="Hủy"
            >
                <div className="admin-alert-content">
                    <p>{alertModal.message}</p>
                </div>
            </AdminModal>
        </>
    );
};

export default ShowTimePage;