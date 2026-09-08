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
    Plus,
    Trash2 as TrashIcon,
    Settings,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// CONSTANTS
// ==========================================================

const TIME_SLOTS = [
    { key: 'MORNING', label: '🌅 SÁNG (06:00 - 12:00)' },
    { key: 'AFTERNOON', label: '☀️ TRƯA (12:00 - 17:00)' },
    { key: 'EVENING', label: '🌆 CHIỀU (17:00 - 20:00)' },
    { key: 'NIGHT', label: '🌙 TỐI (20:00 - 24:00)' }
];

const ROOM_TYPES = ['2D', '3D', 'VIP', 'IMAX'];

const DAY_TYPES = [
    { key: 'ALL', label: 'Tất cả các ngày' },
    { key: 'WEEKDAY', label: 'Ngày thường (T2-T6)' },
    { key: 'WEEKEND', label: 'Cuối tuần (T7-CN)' }
];

// ==========================================================
// INITIAL DATA
// ==========================================================

const initialScheduleData = {
    movie_ids: [],
    cinema_id: '',
    start_date: '',
    end_date: '',
    configs: [
        { time_slot: 'MORNING', room_type: '2D', slot_count: 4, interval_minutes: 45, day_type: 'ALL', is_active: 1 },
        { time_slot: 'AFTERNOON', room_type: '2D', slot_count: 3, interval_minutes: 45, day_type: 'ALL', is_active: 1 },
        { time_slot: 'EVENING', room_type: '3D', slot_count: 3, interval_minutes: 45, day_type: 'ALL', is_active: 1 },
        { time_slot: 'NIGHT', room_type: 'IMAX', slot_count: 2, interval_minutes: 60, day_type: 'ALL', is_active: 1 }
    ],
    showConfigSection: true
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
    const [showConfigSection, setShowConfigSection] = useState(true);

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
    const [loadedConfigs, setLoadedConfigs] = useState({});

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

    // ==========================================================
    // FETCH DATA
    // ==========================================================

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

            setShowtimes(res.data?.data || []);
            setPagination(res.data?.pagination || {
                page: 1, limit: 20, total: 0, totalPages: 1,
                hasPreviousPage: false, hasNextPage: false
            });

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

    // 👉 LOAD CONFIG TỪ DATABASE
    const loadConfigFromDB = async (movieId, cinemaId) => {
        if (!movieId || !cinemaId) return null;
        try {
            const res = await api.get(`/api/showtime-config/${movieId}?cinema_id=${cinemaId}`);
            const data = res.data.data || [];
            if (data.length > 0) {
                return data.map(c => ({
                    time_slot: c.time_slot || 'MORNING',
                    room_type: c.room_type || '2D',
                    slot_count: c.slot_count || 1,
                    interval_minutes: c.interval_minutes || 45,
                    day_type: c.day_type || 'ALL',
                    is_active: c.is_active !== undefined ? c.is_active : 1,
                    config_id: c.config_id
                }));
            }
            return null;
        } catch (error) {
            console.log('Không có config cũ hoặc lỗi load:', error);
            return null;
        }
    };

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

    // ==========================================================
    // CONFIG FUNCTIONS
    // ==========================================================

    const addConfig = () => {
        setScheduleData(prev => ({
            ...prev,
            configs: [
                ...prev.configs,
                { time_slot: 'MORNING', room_type: '2D', slot_count: 1, interval_minutes: 45, day_type: 'ALL', is_active: 1 }
            ]
        }));
    };

    const removeConfig = (index) => {
        setScheduleData(prev => ({
            ...prev,
            configs: prev.configs.filter((_, i) => i !== index)
        }));
    };

    const updateConfig = (index, field, value) => {
        setScheduleData(prev => {
            const newConfigs = [...prev.configs];
            newConfigs[index] = { ...newConfigs[index], [field]: value };
            return { ...prev, configs: newConfigs };
        });
    };

    // ==========================================================
    // HANDLE MODAL
    // ==========================================================

    const handleOpenAdd = async () => {
        setEditingShowtime(null);
        setScheduleData({
            ...initialScheduleData,
            movie_ids: [],
            cinema_id: '',
            start_date: '',
            end_date: '',
            configs: [
                { time_slot: 'MORNING', room_type: '2D', slot_count: 4, interval_minutes: 45, day_type: 'ALL', is_active: 1 },
                { time_slot: 'AFTERNOON', room_type: '2D', slot_count: 3, interval_minutes: 45, day_type: 'ALL', is_active: 1 },
                { time_slot: 'EVENING', room_type: '3D', slot_count: 3, interval_minutes: 45, day_type: 'ALL', is_active: 1 },
                { time_slot: 'NIGHT', room_type: 'IMAX', slot_count: 2, interval_minutes: 60, day_type: 'ALL', is_active: 1 }
            ],
            showConfigSection: true
        });
        setRooms([]);
        setFormErrors({});
        setIsFormOpen(true);
        setShowConfigSection(true);
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
                operating_start: st.start_time?.slice(11, 16) || '08:00'
            });
            setIsFormOpen(true);
            setShowConfigSection(false);

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

    // ==========================================================
    // HANDLE CHANGE
    // ==========================================================

    const handleChange = async (e) => {
        const { name, value, checked } = e.target;

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }

        if (name === 'movie_ids') {
            const movieId = Number(value);
            setScheduleData(prev => {
                const currentIds = Array.isArray(prev.movie_ids) ? prev.movie_ids : [];
                const nextIds = checked
                    ? (currentIds.includes(movieId) ? currentIds : [...currentIds, movieId])
                    : currentIds.filter(id => id !== movieId);
                return { ...prev, movie_ids: nextIds };
            });
            return;
        }

        if (name === 'cinema_id') {
            setScheduleData(prev => ({ ...prev, cinema_id: value }));
            if (!editingShowtime) {
                await fetchRoomsByCinema(value);
                // Load config khi chọn phim + rạp
                if (scheduleData.movie_ids && scheduleData.movie_ids.length === 1) {
                    const config = await loadConfigFromDB(scheduleData.movie_ids[0], value);
                    if (config) {
                        setScheduleData(prev => ({ ...prev, configs: config }));
                    }
                }
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

    // ==========================================================
    // VALIDATE
    // ==========================================================

    const validateSchedule = () => {
        const errors = {};

        if (!scheduleData.cinema_id) errors.cinema_id = 'Vui lòng chọn rạp';
        if (!scheduleData.start_date) errors.start_date = 'Vui lòng chọn ngày bắt đầu';
        if (!scheduleData.end_date) errors.end_date = 'Vui lòng chọn ngày kết thúc';

        if (scheduleData.start_date && scheduleData.end_date && scheduleData.start_date > scheduleData.end_date) {
            errors.end_date = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
        }

        if (editingShowtime) {
            if (!scheduleData.movie_id) errors.movie_id = 'Vui lòng chọn phim';
            if (!Array.isArray(scheduleData.room_ids) || scheduleData.room_ids.length === 0) {
                errors.room_ids = 'Vui lòng chọn phòng chiếu';
            }
            if (!scheduleData.operating_start) {
                errors.operating_start = 'Vui lòng chọn giờ';
            }
        } else {
            if (!scheduleData.movie_ids || scheduleData.movie_ids.length === 0) {
                errors.movie_ids = 'Vui lòng chọn ít nhất 1 phim';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ==========================================================
    // HANDLE SUBMIT
    // ==========================================================

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

            const movieIds = scheduleData.movie_ids || [];
            const validConfigs = scheduleData.configs.filter(c => c.slot_count > 0 && c.is_active === 1);

            // 👉 1. LƯU CẤU HÌNH VÀO DATABASE
            for (const movieId of movieIds) {
                try {
                    await api.post(`/api/showtime-config/${movieId}`, {
                        cinema_id: Number(scheduleData.cinema_id),
                        configs: validConfigs.map(c => ({
                            time_slot: c.time_slot,
                            room_type: c.room_type,
                            slot_count: c.slot_count,
                            interval_minutes: c.interval_minutes,
                            day_type: c.day_type || 'ALL',
                            is_active: c.is_active !== undefined ? c.is_active : 1
                        }))
                    });
                } catch (err) {
                    console.warn(`⚠️ Không thể lưu config cho phim ${movieId}:`, err);
                }
            }

            // 👉 2. TẠO LỊCH CHIẾU
            const payload = {
                movies: movieIds.map(id => ({ movie_id: id })),
                cinema_id: Number(scheduleData.cinema_id),
                start_date: scheduleData.start_date,
                end_date: scheduleData.end_date
            };

            console.log('📤 AUTO SCHEDULE PAYLOAD:', payload);
            const res = await api.post('/api/showtimes/schedule', payload);

            setIsFormOpen(false);
            await fetchShowtimes(pagination.page, search);

            const data = res.data?.data;
            let message = res.data?.message || 'Tạo lịch chiếu thành công.';

            if (data) {
                const created = data.data?.length || 0;
                const conflicts = data.conflicts?.length || 0;
                const skippedPast = data.skippedPast?.length || 0;

                message += `\n\n📊 TỔNG QUAN:`;
                message += `\n✅ Đã tạo: ${created} suất`;
                if (conflicts > 0) message += `\n⚠️ Bỏ qua: ${conflicts} suất bị trùng`;
                if (skippedPast > 0) message += `\n⏭️ Bỏ qua: ${skippedPast} suất trong quá khứ`;

                if (data.summary?.byMovie) {
                    message += `\n\n📊 PHÂN BỔ THEO PHIM:`;
                    for (const [movieId, stats] of Object.entries(data.summary.byMovie)) {
                        message += `\n  🎬 ${stats.title}: ${stats.count} suất`;
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
                    message += `\n  ☀️ Trưa: ${data.summary.byTimeSlot.AFTERNOON || 0} suất`;
                    message += `\n  🌆 Chiều: ${data.summary.byTimeSlot.EVENING || 0} suất`;
                    message += `\n  🌙 Đêm: ${data.summary.byTimeSlot.NIGHT || 0} suất`;
                }
            }

            showAlert('✅ Tạo lịch chiếu thành công', message, 'success');

        } catch (error) {
            console.error('CREATE SCHEDULE ERROR:', error);
            const backendField = error.response?.data?.field;
            const message = error.response?.data?.message || 'Không thể tạo lịch chiếu.';

            if (backendField) {
                setFormErrors({ [backendField]: message });
            } else {
                showAlert('❌ Không thể tạo lịch', message, 'error');
            }

        } finally {
            setSubmitLoading(false);
        }
    };

    // ==========================================================
    // HANDLE DELETE
    // ==========================================================

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

    // ==========================================================
    // COLUMNS
    // ==========================================================

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

    // ==========================================================
    // RENDER CONFIG FORM
    // ==========================================================

    const renderConfigForm = () => {
        if (editingShowtime) return null;

        return (
            <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <div 
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        marginBottom: showConfigSection ? '12px' : '0'
                    }}
                    onClick={() => setShowConfigSection(!showConfigSection)}
                >
                    <h4 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={18} />
                        📋 Cấu hình suất chiếu
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '400' }}>
                            ({scheduleData.configs.filter(c => c.slot_count > 0 && c.is_active === 1).length} suất)
                        </span>
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {showConfigSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </div>

                {showConfigSection && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', marginTop: '8px' }}>
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
                                <Plus size={16} /> Thêm dòng
                            </button>
                        </div>

                        {scheduleData.configs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                                <p>Chưa có cấu hình. Bấm "Thêm dòng" để bắt đầu.</p>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.2fr 0.8fr 0.6fr 0.6fr 1fr 0.5fr 40px',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: '#f1f5f9',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#64748b',
                                    textTransform: 'uppercase',
                                    marginBottom: '6px'
                                }}>
                                    <span>Khung giờ</span>
                                    <span>Loại phòng</span>
                                    <span>Số suất</span>
                                    <span>K/c</span>
                                    <span>Áp dụng</span>
                                    <span>Bật</span>
                                    <span></span>
                                </div>

                                {scheduleData.configs.map((config, index) => (
                                    <div key={index} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.2fr 0.8fr 0.6fr 0.6fr 1fr 0.5fr 40px',
                                        gap: '8px',
                                        padding: '6px 12px',
                                        background: '#ffffff',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        marginBottom: '4px',
                                        alignItems: 'center'
                                    }}>
                                        <select 
                                            value={config.time_slot}
                                            onChange={(e) => updateConfig(index, 'time_slot', e.target.value)}
                                            style={{ padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', background: '#fff' }}
                                        >
                                            {TIME_SLOTS.map(s => <option key={s.key} value={s.key}>{s.label.split(' ')[0]}</option>)}
                                        </select>

                                        <select 
                                            value={config.room_type}
                                            onChange={(e) => updateConfig(index, 'room_type', e.target.value)}
                                            style={{ padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', background: '#fff' }}
                                        >
                                            {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>

                                        <input 
                                            type="number" 
                                            value={config.slot_count}
                                            onChange={(e) => updateConfig(index, 'slot_count', Number(e.target.value))}
                                            min="0"
                                            max="30"
                                            style={{ padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', width: '100%' }}
                                        />

                                        <input 
                                            type="number" 
                                            value={config.interval_minutes}
                                            onChange={(e) => updateConfig(index, 'interval_minutes', Number(e.target.value))}
                                            min="30"
                                            max="120"
                                            step="5"
                                            style={{ padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', width: '100%' }}
                                        />

                                        <select 
                                            value={config.day_type || 'ALL'}
                                            onChange={(e) => updateConfig(index, 'day_type', e.target.value)}
                                            style={{ padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', background: '#fff' }}
                                        >
                                            {DAY_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                        </select>

                                        <input 
                                            type="checkbox" 
                                            checked={config.is_active === 1}
                                            onChange={(e) => updateConfig(index, 'is_active', e.target.checked ? 1 : 0)}
                                            style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
                                        />

                                        <button 
                                            type="button"
                                            onClick={() => removeConfig(index)}
                                            style={{
                                                padding: '4px',
                                                background: 'transparent',
                                                color: '#dc2626',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <TrashIcon size={15} />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}

                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                            💡 Cấu hình sẽ được lưu và dùng cho các lần tạo lịch sau
                        </div>
                    </>
                )}
            </div>
        );
    };

    // ==========================================================
    // RENDER
    // ==========================================================

    return (
        <>
            <AdminPage
                title="Quản lý lịch chiếu"
                subtitle="Tạo lịch chiếu và cấu hình suất chiếu cho từng phim"
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

            {/* FORM MODAL */}
            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title={editingShowtime ? 'Cập nhật suất chiếu' : 'Tạo lịch chiếu'}
                type="default"
                size="lg"
            >
                {!editingShowtime && (
                    <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '8px' }}>
                            <Sparkles size={18} /> Tạo lịch chiếu + Lưu cấu hình
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                            <strong>Hệ thống sẽ:</strong>
                            <br />
                            1. 📝 Lưu cấu hình suất chiếu vào hệ thống (dùng cho lần sau)
                            <br />
                            2. 🎬 Tạo lịch chiếu theo cấu hình đã nhập
                            <br /><br />
                            <strong>💡 Lần sau chỉ cần chọn phim + rạp + ngày là tạo được lịch!</strong>
                        </div>
                    </div>
                )}

                {/* Form chính */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Chọn phim */}
                    {!editingShowtime && (
                        <div>
                            <label style={{ fontWeight: '500', display: 'block', marginBottom: '8px', color: '#1e293b' }}>
                                Chọn phim
                                <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '400', marginLeft: '8px' }}>
                                    (Có thể chọn nhiều phim)
                                </span>
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', maxHeight: '150px', overflowY: 'auto' }}>
                                {movies.map(movie => {
                                    const isChecked = scheduleData.movie_ids?.includes(movie.movie_id);
                                    return (
                                        <label key={movie.movie_id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 12px',
                                            borderRadius: '16px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            background: isChecked ? '#dbeafe' : '#ffffff',
                                            border: isChecked ? '2px solid #3b82f6' : '1px solid #e2e8f0'
                                        }}>
                                            <input
                                                type="checkbox"
                                                name="movie_ids"
                                                value={movie.movie_id}
                                                checked={isChecked}
                                                onChange={handleChange}
                                                style={{ accentColor: '#3b82f6' }}
                                            />
                                            {movie.title}
                                        </label>
                                    );
                                })}
                            </div>
                            {formErrors.movie_ids && <span style={{ color: '#ef4444', fontSize: '13px' }}>{formErrors.movie_ids}</span>}
                        </div>
                    )}

                    {/* Rạp chiếu */}
                    <div>
                        <label style={{ fontWeight: '500', display: 'block', marginBottom: '4px', color: '#1e293b' }}>Rạp chiếu</label>
                        <select
                            name="cinema_id"
                            value={scheduleData.cinema_id}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                        >
                            <option value="">-- Chọn rạp --</option>
                            {cinemas.map(c => (
                                <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>
                            ))}
                        </select>
                        {formErrors.cinema_id && <span style={{ color: '#ef4444', fontSize: '13px' }}>{formErrors.cinema_id}</span>}
                    </div>

                    {/* Ngày */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ fontWeight: '500', display: 'block', marginBottom: '4px', color: '#1e293b' }}>Ngày bắt đầu</label>
                            <input
                                type="date"
                                name="start_date"
                                value={scheduleData.start_date}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                            />
                            {formErrors.start_date && <span style={{ color: '#ef4444', fontSize: '13px' }}>{formErrors.start_date}</span>}
                        </div>
                        <div>
                            <label style={{ fontWeight: '500', display: 'block', marginBottom: '4px', color: '#1e293b' }}>Ngày kết thúc</label>
                            <input
                                type="date"
                                name="end_date"
                                value={scheduleData.end_date}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                            />
                            {formErrors.end_date && <span style={{ color: '#ef4444', fontSize: '13px' }}>{formErrors.end_date}</span>}
                        </div>
                    </div>

                    {/* Cấu hình suất chiếu */}
                    {renderConfigForm()}

                    {/* Nút submit */}
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={submitLoading}
                        style={{
                            padding: '12px 24px',
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        {submitLoading ? (
                            <>
                                <Loader2 size={20} className="spin-icon" />
                                Đang xử lý...
                            </>
                        ) : (
                            editingShowtime ? 'Lưu thay đổi' : '🚀 Tạo lịch chiếu'
                        )}
                    </button>
                </div>
            </AdminModal>

            {/* ALERT MODAL */}
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