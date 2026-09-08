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
    Info,
    Settings
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
    { value: 'hot', label: '🔥 HOT - 45 phút/suất' },
    { value: 'normal', label: '📊 NORMAL - 75 phút/suất' },
    { value: 'cold', label: '❄️ COLD - 120 phút/suất' }
];

// ==========================================================
// INITIAL DATA
// ==========================================================

const initialScheduleData = {
    movie_ids: [],
    movie_distributions: {}, // { movie_id: 'hot' | 'normal' | 'cold' }
    cinema_id: '',
    start_date: '',
    end_date: '',
    weekday_start: '08:00',
    weekday_end: '23:30',
    weekend_start: '08:00',
    weekend_end: '24:00',
    hot_interval: 45,
    normal_interval: 75,
    cold_interval: 120,
    buffer_minutes: 15
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
    const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

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
            movie_ids: [],
            movie_distributions: {},
            start_date: '',
            end_date: '',
            weekday_start: '08:00',
            weekday_end: '23:30',
            weekend_start: '08:00',
            weekend_end: '24:00',
            hot_interval: 45,
            normal_interval: 75,
            cold_interval: 120,
            buffer_minutes: 15
        });
        setRooms([]);
        setFormErrors({});
        setIsFormOpen(true);
        setShowAdvancedConfig(false);
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
        setShowAdvancedConfig(false);
    };

    const handleChange = async (e) => {
        const { name, value, checked, type } = e.target;

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Xử lý chọn phim
        if (name === 'movie_ids') {
            const movieId = Number(value);
            setScheduleData(prev => {
                const currentIds = Array.isArray(prev.movie_ids) ? prev.movie_ids : [];
                const nextIds = checked
                    ? (currentIds.includes(movieId) ? currentIds : [...currentIds, movieId])
                    : currentIds.filter(id => id !== movieId);
                
                // 👉 Nếu bỏ chọn phim, xóa luôn distribution của nó
                const newDistributions = { ...prev.movie_distributions };
                if (!checked) {
                    delete newDistributions[movieId];
                } else if (!newDistributions[movieId]) {
                    // Nếu chọn phim mới, set default là 'normal'
                    newDistributions[movieId] = 'normal';
                }
                
                return { 
                    ...prev, 
                    movie_ids: nextIds,
                    movie_distributions: newDistributions
                };
            });
            return;
        }

        // Xử lý change distribution cho từng phim
        if (name.startsWith('dist_')) {
            const movieId = Number(name.replace('dist_', ''));
            setScheduleData(prev => ({
                ...prev,
                movie_distributions: {
                    ...prev.movie_distributions,
                    [movieId]: value
                }
            }));
            return;
        }

        if (name === 'cinema_id') {
            setScheduleData(prev => ({ ...prev, cinema_id: value }));
            if (!editingShowtime) {
                await fetchRoomsByCinema(value);
            }
            return;
        }

        if (name === 'room_ids' && editingShowtime) {
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

    const validateSchedule = () => {
        const errors = {};

        if (!scheduleData.cinema_id) errors.cinema_id = 'Vui lòng chọn rạp';

        if (editingShowtime) {
            if (!scheduleData.movie_id) errors.movie_id = 'Vui lòng chọn phim';
            if (!Array.isArray(scheduleData.room_ids) || scheduleData.room_ids.length === 0) {
                errors.room_ids = 'Vui lòng chọn phòng chiếu';
            }
            if (!scheduleData.operating_start) {
                errors.operating_start = 'Vui lòng chọn giờ';
            }
        }

        if (!scheduleData.start_date) errors.start_date = 'Vui lòng chọn ngày bắt đầu';
        if (!scheduleData.end_date) errors.end_date = 'Vui lòng chọn ngày kết thúc';

        if (scheduleData.start_date && scheduleData.end_date && scheduleData.start_date > scheduleData.end_date) {
            errors.end_date = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
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

        // CREATE AUTO
        if (!validateSchedule()) return;

        try {
            setSubmitLoading(true);
            setFormErrors({});

            // 👉 Xây dựng payload với distribution riêng cho từng phim
            const movieIds = scheduleData.movie_ids || [];
            const movieDistributions = scheduleData.movie_distributions || {};
            
            // Tạo mảng movies với distribution riêng
            const moviesWithDist = movieIds.map(movieId => ({
                movie_id: movieId,
                distribution: movieDistributions[movieId] || 'normal'
            }));

            const payload = {
                movies: moviesWithDist,
                cinema_id: Number(scheduleData.cinema_id),
                start_date: scheduleData.start_date,
                end_date: scheduleData.end_date,
                config: {
                    weekday_start: scheduleData.weekday_start || '08:00',
                    weekday_end: scheduleData.weekday_end || '23:30',
                    weekend_start: scheduleData.weekend_start || '08:00',
                    weekend_end: scheduleData.weekend_end || '24:00',
                    hot_interval: Number(scheduleData.hot_interval) || 45,
                    normal_interval: Number(scheduleData.normal_interval) || 75,
                    cold_interval: Number(scheduleData.cold_interval) || 120,
                    buffer_minutes: Number(scheduleData.buffer_minutes) || 15
                }
            };

            console.log('📤 AUTO SCHEDULE PAYLOAD:', payload);

            const res = await api.post('/api/showtimes/schedule', payload);
            console.log('📥 AUTO SCHEDULE RESPONSE:', res.data);

            setIsFormOpen(false);
            await fetchShowtimes(pagination.page, search);

            const data = res.data?.data;
            let message = res.data?.message || 'Tạo lịch chiếu thành công.';

            if (data) {
                const created = data.data?.length || 0;
                const conflicts = data.conflicts?.length || 0;
                const skippedPast = data.skippedPast?.length || 0;
                const movieCount = data.summary?.movieCount || 0;

                message += `\n\n📊 TỔNG QUAN:`;
                message += `\n🎬 Số phim: ${movieCount}`;
                message += `\n✅ Đã tạo: ${created} suất`;
                if (conflicts > 0) message += `\n⚠️ Bỏ qua: ${conflicts} suất bị trùng`;
                if (skippedPast > 0) message += `\n⏭️ Bỏ qua: ${skippedPast} suất trong quá khứ`;

                if (data.summary?.byMovie) {
                    message += `\n\n📊 PHÂN BỔ THEO PHIM:`;
                    for (const [movieId, stats] of Object.entries(data.summary.byMovie)) {
                        const dist = movieDistributions[movieId] || 'normal';
                        const distLabel = dist === 'hot' ? '🔥' : dist === 'cold' ? '❄️' : '📊';
                        message += `\n  ${distLabel} ${stats.title}: ${stats.count} suất (${stats.avgPerDay || 0}/ngày)`;
                    }
                }

                if (data.summary?.byRoomType) {
                    message += `\n\n📊 PHÂN BỔ THEO HẠNG PHÒNG:`;
                    for (const [type, count] of Object.entries(data.summary.byRoomType)) {
                        message += `\n  🏠 ${type}: ${count} suất`;
                    }
                }

                if (data.summary?.byTimeSlot) {
                    message += `\n\n📊 PHÂN BỔ THEO KHUNG GIỜ:`;
                    message += `\n  🌅 Sáng: ${data.summary.byTimeSlot.MORNING || 0} suất`;
                    message += `\n  ☀️ Chiều: ${data.summary.byTimeSlot.AFTERNOON || 0} suất`;
                    message += `\n  🌆 Tối: ${data.summary.byTimeSlot.EVENING || 0} suất`;
                    message += `\n  🌙 Đêm: ${data.summary.byTimeSlot.NIGHT || 0} suất`;
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

    // FORM FIELDS - KHÔNG CÓ movie_ids và distribution_level
    const formFields = [
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
        ...(editingShowtime ? [{ label: 'Giờ chiếu', name: 'operating_start', type: 'time' }] : [])
    ];

    // Advanced config fields
    const advancedConfigFields = [
        {
            label: '⏰ GIỜ HOẠT ĐỘNG (Thứ 2 - Thứ 6)',
            name: 'weekday_start',
            type: 'time'
        },
        {
            label: '⏰ GIỜ KẾT THÚC (Thứ 2 - Thứ 6)',
            name: 'weekday_end',
            type: 'time'
        },
        {
            label: '⏰ GIỜ HOẠT ĐỘNG (Thứ 7 - Chủ nhật)',
            name: 'weekend_start',
            type: 'time'
        },
        {
            label: '⏰ GIỜ KẾT THÚC (Thứ 7 - Chủ nhật)',
            name: 'weekend_end',
            type: 'time'
        },
        {
            label: '🔥 Khoảng cách HOT (phút)',
            name: 'hot_interval',
            type: 'number',
            min: 30,
            max: 60
        },
        {
            label: '📊 Khoảng cách NORMAL (phút)',
            name: 'normal_interval',
            type: 'number',
            min: 60,
            max: 90
        },
        {
            label: '❄️ Khoảng cách COLD (phút)',
            name: 'cold_interval',
            type: 'number',
            min: 90,
            max: 150
        },
        {
            label: '🧹 Thời gian vệ sinh (phút)',
            name: 'buffer_minutes',
            type: 'number',
            min: 10,
            max: 30
        }
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
                    <>
                        {/* Phần hướng dẫn */}
                        <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '8px' }}>
                                <Sparkles size={18} /> Phân bổ suất chiếu tự động
                            </div>
                            <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>
                                        <div style={{ fontWeight: '600', color: '#dc2626' }}>🔥 HOT</div>
                                        <div>45 phút/suất</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>2D(40%) + 3D(30%) + VIP(20%) + IMAX(10%)</div>
                                    </div>
                                    <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px' }}>
                                        <div style={{ fontWeight: '600', color: '#2563eb' }}>📊 NORMAL</div>
                                        <div>75 phút/suất</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>2D(60%) + 3D(40%)</div>
                                    </div>
                                    <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px' }}>
                                        <div style={{ fontWeight: '600', color: '#16a34a' }}>❄️ COLD</div>
                                        <div>120 phút/suất</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>2D(50%)</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '13px' }}>
                                    💡 <strong>Chọn phim và mức độ ưu tiên riêng cho từng phim</strong>
                                </div>
                            </div>
                        </div>

                        {/* 👇 PHẦN CHỌN PHIM + DISTRIBUTION RIÊNG */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: '500',
                                marginBottom: '12px',
                                color: '#1e293b'
                            }}>
                                Chọn phim và cấu hình mức độ ưu tiên
                                <span style={{
                                    color: '#64748b',
                                    fontSize: '13px',
                                    fontWeight: '400'
                                }}>
                                    (Mỗi phim có thể chọn mức độ khác nhau)
                                </span>
                            </label>

                            {/* Bảng chọn phim */}
                            <div style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '14px'
                                }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '10px 16px', textAlign: 'left', width: '40px' }}></th>
                                            <th style={{ padding: '10px 16px', textAlign: 'left' }}>Tên phim</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'center', width: '220px' }}>Mức độ ưu tiên</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movies.map(movie => {
                                            const isChecked = scheduleData.movie_ids?.includes(movie.movie_id);
                                            const distValue = scheduleData.movie_distributions?.[movie.movie_id] || 'normal';
                                            
                                            return (
                                                <tr 
                                                    key={movie.movie_id}
                                                    style={{
                                                        borderTop: '1px solid #e2e8f0',
                                                        background: isChecked ? '#f8fafc' : '#ffffff'
                                                    }}
                                                >
                                                    <td style={{ padding: '10px 16px' }}>
                                                        <input
                                                            type="checkbox"
                                                            name="movie_ids"
                                                            value={movie.movie_id}
                                                            checked={isChecked || false}
                                                            onChange={handleChange}
                                                            style={{
                                                                width: '18px',
                                                                height: '18px',
                                                                cursor: 'pointer',
                                                                accentColor: '#3b82f6'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ 
                                                        padding: '10px 16px',
                                                        fontWeight: isChecked ? '500' : '400',
                                                        color: isChecked ? '#1e293b' : '#94a3b8'
                                                    }}>
                                                        {movie.title}
                                                    </td>
                                                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                        {isChecked ? (
                                                            <select
                                                                name={`dist_${movie.movie_id}`}
                                                                value={distValue}
                                                                onChange={handleChange}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #e2e8f0',
                                                                    fontSize: '13px',
                                                                    background: '#ffffff',
                                                                    cursor: 'pointer',
                                                                    minWidth: '160px'
                                                                }}
                                                            >
                                                                <option value="hot" style={{ color: '#dc2626' }}>🔥 HOT - 45 phút</option>
                                                                <option value="normal" style={{ color: '#2563eb' }}>📊 NORMAL - 75 phút</option>
                                                                <option value="cold" style={{ color: '#16a34a' }}>❄️ COLD - 120 phút</option>
                                                            </select>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>-- Chưa chọn --</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Thông báo số phim đã chọn */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '8px'
                            }}>
                                {formErrors.movie_ids && (
                                    <span style={{ color: '#ef4444', fontSize: '13px' }}>
                                        {formErrors.movie_ids}
                                    </span>
                                )}
                                {scheduleData.movie_ids?.length > 0 && !formErrors.movie_ids && (
                                    <span style={{ fontSize: '13px', color: '#22c55e' }}>
                                        ✅ Đã chọn <strong>{scheduleData.movie_ids.length}</strong> phim
                                    </span>
                                )}
                                {(!scheduleData.movie_ids || scheduleData.movie_ids.length === 0) && !formErrors.movie_ids && (
                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                                        ⚠️ Để trống để lấy tất cả phim đang chiếu (mặc định NORMAL)
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* AdminForm - LỌC BỎ distribution_level */}
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
                    <>
                        <button
                            type="button"
                            onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                            style={{
                                marginTop: '16px',
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px'
                            }}
                        >
                            <Settings size={16} />
                            {showAdvancedConfig ? 'Ẩn' : 'Hiện'} cấu hình nâng cao
                        </button>

                        {showAdvancedConfig && (
                            <div style={{
                                marginTop: '16px',
                                padding: '20px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>
                                    ⚙️ Cấu hình giờ chiếu nâng cao
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {advancedConfigFields.map(field => (
                                        <div key={field.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '500', color: '#475569' }}>
                                                {field.label}
                                            </label>
                                            <input
                                                type={field.type === 'time' ? 'time' : 'number'}
                                                name={field.name}
                                                value={scheduleData[field.name] || ''}
                                                onChange={handleChange}
                                                min={field.min}
                                                max={field.max}
                                                style={{
                                                    padding: '8px 12px',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: '#f8fafc', fontSize: '13px', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px' }}>
                                <Info size={16} /> <strong>Cách hoạt động:</strong>
                            </div>
                            Hệ thống sẽ tự động lấy toàn bộ phòng thuộc các hạng phù hợp với mức ưu tiên bạn chọn.
                            <br /><br />
                            <strong>🕐 Giờ hoạt động mặc định:</strong>
                            <br />Thứ 2 → Thứ 6: <strong>08:00 → 23:30</strong>
                            <br />Thứ 7 → Chủ nhật: <strong>08:00 → 24:00</strong>
                            <br /><br />
                            <strong>Khoảng cách suất mặc định:</strong>
                            <br />🔥 HOT: <strong>45 phút</strong> | 📊 NORMAL: <strong>75 phút</strong> | ❄️ COLD: <strong>120 phút</strong>
                            <br /><br />
                            Phòng nào đang bận thì hệ thống sẽ thử phòng khác.
                            <br />Phòng chỉ được sử dụng lại sau khi phim trước kết thúc <strong>+ 15 phút</strong>.
                            <br /><br />
                            <em>💡 Bấm vào "Cấu hình nâng cao" để tùy chỉnh giờ hoạt động và khoảng cách suất.</em>
                        </div>
                    </>
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
                    <p style={{ whiteSpace: 'pre-wrap' }}>{alertModal.message}</p>
                </div>
            </AdminModal>
        </>
    );
};

export default ShowTimePage;