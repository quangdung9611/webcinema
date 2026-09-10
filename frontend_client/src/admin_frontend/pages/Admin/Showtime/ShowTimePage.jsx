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
    Sparkles
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminPagination from '../../../components/AdminPagination';

import '../../../styles/ShowtimePage.css';

// ==========================================================
// COMPONENT
// ==========================================================

const ShowTimePage = () => {

    // ======================================================
    // STATE
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

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingShowtime, setEditingShowtime] = useState(null);

    const [scheduleData, setScheduleData] = useState({
        movie_ids: [],
        cinema_id: '',
        start_date: '',
        end_date: ''
    });

    const [formErrors, setFormErrors] = useState({});

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);
    const prevSearchRef = useRef('');

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
    // FORMAT DATE TIME
    // ======================================================

    const formatDateTime = (dateStr) => {
        if (!dateStr) {
            return { date: '--/--/----', time: '--:--' };
        }

        let normalized = String(dateStr).replace('T', ' ');
        const [datePart, timePart] = normalized.split(' ');

        if (!datePart || !timePart) {
            return { date: '--/--/----', time: '--:--' };
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
            if (isFetching.current) return;
            if (abortControllerRef.current) abortControllerRef.current.abort();

            const controller = new AbortController();
            abortControllerRef.current = controller;
            isFetching.current = true;
            setLoading(true);

            try {
                const res = await api.get('/api/showtimes/paginated', {
                    params: {
                        page,
                        limit: 20,
                        search: keyword.trim()
                    },
                    signal: controller.signal
                });

                setShowtimes(res.data?.data || []);
                setPagination(res.data?.pagination || {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 1,
                    hasPreviousPage: false,
                    hasNextPage: false
                });

            } catch (error) {
                if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                    return;
                }

                console.error('FETCH SHOWTIMES ERROR:', error);
                setShowtimes([]);
                showAlert('Lỗi', 'Không thể tải danh sách suất chiếu.', 'error');

            } finally {
                setLoading(false);
                isFetching.current = false;
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
            }
        },
        []
    );

    // ======================================================
    // FETCH INITIAL DATA
    // ======================================================

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
            showAlert('Lỗi', 'Không thể tải danh sách phim hoặc rạp.', 'error');
        }
    }, []);

    // ======================================================
    // FETCH ROOMS
    // ======================================================

    const fetchRoomsByCinema = useCallback(async (cinemaId) => {
        if (!cinemaId) {
            setRooms([]);
            return [];
        }

        try {
            const res = await api.get(`/api/rooms/cinema/${cinemaId}`);
            const roomData = res.data?.data || [];
            setRooms(roomData);
            return roomData;
        } catch (error) {
            console.error('FETCH ROOMS ERROR:', error);
            setRooms([]);
            return [];
        }
    }, []);

    // ======================================================
    // INITIAL EFFECT
    // ======================================================

    useEffect(() => {
        fetchShowtimes(1, '');
        fetchInitialData();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchShowtimes, fetchInitialData]);

    // ======================================================
    // SEARCH EFFECT
    // ======================================================

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

    // ======================================================
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (page) => {
        fetchShowtimes(page, search);
    };

    // ======================================================
    // OPEN ADD
    // ======================================================

    const handleOpenAdd = () => {
        setEditingShowtime(null);
        setScheduleData({
            movie_ids: [],
            cinema_id: '',
            start_date: '',
            end_date: ''
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

        } catch (error) {
            console.error('FETCH SHOWTIME DETAIL ERROR:', error);
            showAlert('Lỗi', 'Không thể tải dữ liệu suất chiếu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ======================================================
    // CLOSE FORM
    // ======================================================

    const handleCloseForm = () => {
        if (submitLoading) return;

        setIsFormOpen(false);
        setEditingShowtime(null);
        setFormErrors({});
        setRooms([]);
    };

    // ======================================================
    // HANDLE CHANGE
    // ======================================================

    const handleChange = (e) => {
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
                fetchRoomsByCinema(value);
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

    // ======================================================
    // VALIDATE SCHEDULE
    // ======================================================

    const validateSchedule = () => {
        const errors = {};

        if (!scheduleData.cinema_id) {
            errors.cinema_id = 'Vui lòng chọn rạp';
        }

        if (!scheduleData.start_date) {
            errors.start_date = 'Vui lòng chọn ngày bắt đầu';
        }

        if (!scheduleData.end_date) {
            errors.end_date = 'Vui lòng chọn ngày kết thúc';
        }

        if (
            scheduleData.start_date &&
            scheduleData.end_date &&
            scheduleData.start_date > scheduleData.end_date
        ) {
            errors.end_date = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
        }

        if (editingShowtime) {
            if (!scheduleData.movie_id) {
                errors.movie_id = 'Vui lòng chọn phim';
            }

            if (!Array.isArray(scheduleData.room_ids) || scheduleData.room_ids.length === 0) {
                errors.room_ids = 'Vui lòng chọn phòng chiếu';
            }

            if (!scheduleData.operating_start) {
                errors.operating_start = 'Vui lòng chọn giờ';
            }
        } else {
            if (!Array.isArray(scheduleData.movie_ids) || scheduleData.movie_ids.length === 0) {
                errors.movie_ids = 'Vui lòng chọn ít nhất 1 phim';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ======================================================
    // NORMALIZE BACKEND RESPONSE
    // ======================================================

    const normalizeScheduleResult = (response) => {
        const root = response?.data || {};

        let result = root;

        if (
            root?.data &&
            !Array.isArray(root.data) &&
            typeof root.data === 'object'
        ) {
            result = root.data;
        }

        let created = [];

        if (Array.isArray(result?.data)) {
            created = result.data;
        } else if (Array.isArray(result?.created)) {
            created = result.created;
        } else if (Array.isArray(result?.showtimes)) {
            created = result.showtimes;
        }

        const conflicts = Array.isArray(result?.conflicts) ? result.conflicts : [];
        const skippedPast = Array.isArray(result?.skippedPast) ? result.skippedPast : [];

        const success = result?.success !== undefined
            ? Boolean(result.success)
            : root?.success !== undefined
                ? Boolean(root.success)
                : created.length > 0;

        const message = result?.message || root?.message || '';
        const summary = result?.summary || root?.summary || {};

        return {
            success,
            message,
            data: created,
            conflicts,
            skippedPast,
            summary,
            usedConfig: result?.usedConfig || root?.usedConfig || null
        };
    };

    // ======================================================
    // BUILD RESULT MESSAGE
    // ======================================================

    const buildScheduleResultMessage = (normalized) => {
        const { data, conflicts, skippedPast, summary } = normalized;

        const createdCount = data.length;
        const conflictsCount = conflicts.length;
        const skippedPastCount = skippedPast.length;

        let message = 'Tạo lịch chiếu đã hoàn tất.';

        message += `\n\n📊 TỔNG QUAN:`;
        message += `\n✅ Đã tạo: ${createdCount} suất`;

        if (conflictsCount > 0) {
            message += `\n⚠️ Bỏ qua: ${conflictsCount} suất bị trùng`;
        }

        if (skippedPastCount > 0) {
            message += `\n⏭️ Bỏ qua: ${skippedPastCount} suất trong quá khứ`;
        }

        if (summary?.byMovie && typeof summary.byMovie === 'object') {
            message += `\n\n🎬 PHÂN BỔ THEO PHIM:`;
            for (const [movieId, stats] of Object.entries(summary.byMovie)) {
                const title = stats?.title || `Movie #${movieId}`;
                const count = Number(stats?.count) || 0;
                message += `\n  🎥 ${title}: ${count} suất`;
            }
        }

        if (summary?.byRoomType && typeof summary.byRoomType === 'object') {
            message += `\n\n🏠 PHÂN BỔ THEO HẠNG PHÒNG:`;
            for (const [type, count] of Object.entries(summary.byRoomType)) {
                message += `\n  • ${type}: ${Number(count) || 0} suất`;
            }
        }

        if (summary?.byTimeSlot && typeof summary.byTimeSlot === 'object') {
            message += `\n\n🕐 PHÂN BỔ THEO KHUNG GIỜ:`;
            message += `\n  🌅 Sáng: ${Number(summary.byTimeSlot.MORNING) || 0} suất`;
            message += `\n  ☀️ Trưa: ${Number(summary.byTimeSlot.AFTERNOON) || 0} suất`;
            message += `\n  🌆 Chiều: ${Number(summary.byTimeSlot.EVENING) || 0} suất`;
            message += `\n  🌙 Đêm: ${Number(summary.byTimeSlot.NIGHT) || 0} suất`;
        }

        if (summary?.byDayType && typeof summary.byDayType === 'object') {
            message += `\n\n📅 PHÂN BỔ THEO LOẠI NGÀY:`;
            if (summary.byDayType.ALL !== undefined) {
                message += `\n  • ALL: ${Number(summary.byDayType.ALL) || 0} suất`;
            }
            if (summary.byDayType.WEEKDAY !== undefined) {
                message += `\n  • WEEKDAY: ${Number(summary.byDayType.WEEKDAY) || 0} suất`;
            }
            if (summary.byDayType.WEEKEND !== undefined) {
                message += `\n  • WEEKEND: ${Number(summary.byDayType.WEEKEND) || 0} suất`;
            }
        }

        if (createdCount === 0) {
            message += `\n\n⚠️ KHÔNG TẠO ĐƯỢC SUẤT NÀO!`;
            message += `\n\n🔍 Hệ thống đã kiểm tra:`;
            message += `\n  • 🎬 Phim được chọn`;
            message += `\n  • 🏠 Phòng chiếu`;
            message += `\n  • ⚙️ Cấu hình movie_showtime_config`;
            message += `\n  • 📅 Loại ngày WEEKDAY/WEEKEND`;
            message += `\n  • ⏰ Giờ hoạt động của rạp`;
            message += `\n  • 🚫 Trùng suất chiếu`;
            message += `\n  • ⏭️ Suất trong quá khứ`;
        }

        return message;
    };

    // ======================================================
    // HANDLE SUBMIT
    // ======================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        // EDIT SHOWTIME
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

            const movieIds = Array.isArray(scheduleData.movie_ids) 
                ? scheduleData.movie_ids 
                : [];

            console.log('📤 movieIds:', movieIds);

            if (movieIds.length === 0) {
                showAlert('Lỗi', 'Vui lòng chọn ít nhất 1 phim', 'error');
                setSubmitLoading(false);
                return;
            }

            const payload = {
                movies: movieIds.map(id => ({ movie_id: Number(id) })),
                cinema_id: Number(scheduleData.cinema_id),
                start_date: scheduleData.start_date,
                end_date: scheduleData.end_date
            };

            console.log('📤 AUTO SCHEDULE PAYLOAD:', payload);

            const res = await api.post('/api/showtimes/schedule', payload);

            console.log('📥 RAW RESPONSE:', res.data);

            const result = normalizeScheduleResult(res);
            console.log('📊 NORMALIZED RESULT:', result);

            await fetchShowtimes(pagination.page, search);

            const message = buildScheduleResultMessage(result);

            setIsFormOpen(false);

            if (result.success === false || result.data.length === 0) {
                let errorMessage = result.message || 'Không tạo được suất chiếu.';
                
                if (result.skippedInvalidConfig && result.skippedInvalidConfig.length > 0) {
                    const firstError = result.skippedInvalidConfig[0];
                    errorMessage = `❌ ${firstError.reason || 'Cấu hình không phù hợp'}`;
                } else if (result.skippedNoRoom && result.skippedNoRoom.length > 0) {
                    errorMessage = `❌ Không có phòng ${result.skippedNoRoom[0].room_type} cho phim này.`;
                } else if (result.conflicts && result.conflicts.length > 0) {
                    errorMessage = `❌ Phòng bị trùng lịch.`;
                }
                
                showAlert('⚠️ Không tạo được lịch', errorMessage, 'warning');
            } else {
                showAlert('✅ Tạo lịch chiếu thành công', message, 'success');
            }

        } catch (error) {
            console.error('CREATE SCHEDULE ERROR:', error);
            console.error('BACKEND RESPONSE:', error.response?.data);

            const backendData = error.response?.data;
            const backendField = backendData?.field;
            const backendMessage = backendData?.message || 'Không thể tạo lịch chiếu.';

            let errorDetail = backendMessage;
            if (backendField) {
                const fieldLabels = {
                    cinema_id: 'Rạp chiếu',
                    start_date: 'Ngày bắt đầu',
                    end_date: 'Ngày kết thúc',
                    movies: 'Phim',
                    configs: 'Cấu hình'
                };
                const fieldLabel = fieldLabels[backendField] || backendField;
                errorDetail = `❌ ${fieldLabel}: ${backendMessage}`;
            }

            if (backendField) {
                setFormErrors({ [backendField]: backendMessage });
            } else {
                showAlert('❌ Không thể tạo lịch', errorDetail, 'error');
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
                    await api.delete(`/api/showtimes/${showtime.showtime_id}`);
                    closeAlert();

                    const currentPage = pagination.page;
                    const newPage = showtimes.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;

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

    // ======================================================
    // COLUMNS
    // ======================================================

    const columns = [
        {
            title: 'Phim',
            key: 'title',
            render: row => (
                <div className="showtime-movie-cell">
                    <div className="showtime-movie-icon">
                        <Film size={18} />
                    </div>
                    <div>
                        <div className="showtime-movie-title">{row.title}</div>
                        <small className="showtime-movie-duration">{row.duration} phút</small>
                    </div>
                </div>
            )
        },
        {
            title: 'Rạp / Phòng',
            key: 'cinema_name',
            render: row => (
                <div>
                    <div className="showtime-cinema-name">
                        <MapPin size={14} /> {row.cinema_name}
                    </div>
                    <div className="status-badge showtime-room-badge">
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
                <span className="status-badge pending showtime-time-badge">
                    <Clock size={13} />
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

    // ======================================================
    // RENDER
    // ======================================================

    return (
        <>
            <AdminPage
                title="Quản lý lịch chiếu"
                subtitle="Tạo lịch chiếu từ cấu hình có sẵn"
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
                onClose={handleCloseForm}
                title={editingShowtime ? 'Cập nhật suất chiếu' : 'Tạo lịch chiếu'}
                type="default"
                size="lg"
            >
                {!editingShowtime && (
                    <div className="showtime-create-info">
                        <div className="showtime-create-header">
                            <Sparkles size={18} />
                            Tạo lịch chiếu
                        </div>
                        <div className="showtime-create-body">
                            <strong>Hệ thống sẽ:</strong>
                            <br />
                            1. 🎬 Lấy cấu hình suất chiếu từ database (<strong>movie_showtime_config</strong>)
                            <br />
                            2. 🏠 Tự tìm phòng đúng loại và tránh trùng
                            <br />
                            3. 📅 Tự xử lý WEEKDAY / WEEKEND
                            <br />
                            4. ⏰ Tự tính giờ hoạt động của rạp
                            <br /><br />
                            <strong>
                                💡 Cấu hình được quản lý tại trang <em>"Cấu hình lịch chiếu"</em>
                            </strong>
                        </div>
                    </div>
                )}

                <div className="showtime-form">
                    {/* MOVIE - CREATE */}
                    {!editingShowtime && (
                        <div className="showtime-form-group">
                            <label className="showtime-form-label">
                                Chọn phim
                                <span className="showtime-form-hint">(Có thể chọn nhiều phim)</span>
                            </label>
                            <div className="showtime-movie-checkbox-list">
                                {movies.map(movie => {
                                    const isChecked = scheduleData.movie_ids?.includes(movie.movie_id);
                                    return (
                                        <label key={movie.movie_id} className={`showtime-movie-checkbox ${isChecked ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                name="movie_ids"
                                                value={movie.movie_id}
                                                checked={isChecked}
                                                onChange={handleChange}
                                            />
                                            {movie.title}
                                        </label>
                                    );
                                })}
                            </div>
                            {formErrors.movie_ids && (
                                <span className="showtime-form-error">{formErrors.movie_ids}</span>
                            )}
                        </div>
                    )}

                    {/* MOVIE - EDIT */}
                    {editingShowtime && (
                        <div className="showtime-form-group">
                            <label className="showtime-form-label">Phim</label>
                            <input
                                type="text"
                                value={editingShowtime.title || ''}
                                disabled
                                className="showtime-form-input showtime-form-input-disabled"
                            />
                        </div>
                    )}

                    {/* CINEMA */}
                    <div className="showtime-form-group">
                        <label className="showtime-form-label">Rạp chiếu</label>
                        <select
                            name="cinema_id"
                            value={scheduleData.cinema_id}
                            onChange={handleChange}
                            disabled={Boolean(editingShowtime)}
                            className="showtime-form-select"
                        >
                            <option value="">-- Chọn rạp --</option>
                            {cinemas.map(cinema => (
                                <option key={cinema.cinema_id} value={cinema.cinema_id}>
                                    {cinema.cinema_name}
                                </option>
                            ))}
                        </select>
                        {formErrors.cinema_id && (
                            <span className="showtime-form-error">{formErrors.cinema_id}</span>
                        )}
                    </div>

                    {/* ROOM - EDIT */}
                    {editingShowtime && (
                        <div className="showtime-form-group">
                            <label className="showtime-form-label">Phòng chiếu</label>
                            <div className="showtime-room-checkbox-list">
                                {rooms.map(room => {
                                    const checked = scheduleData.room_ids?.includes(Number(room.room_id));
                                    return (
                                        <label key={room.room_id} className={`showtime-room-checkbox ${checked ? 'checked' : ''}`}>
                                            <input
                                                type="checkbox"
                                                name="room_ids"
                                                value={room.room_id}
                                                checked={checked}
                                                onChange={handleChange}
                                            />
                                            {room.room_name} ({room.room_type})
                                        </label>
                                    );
                                })}
                            </div>
                            {formErrors.room_ids && (
                                <span className="showtime-form-error">{formErrors.room_ids}</span>
                            )}
                        </div>
                    )}

                    {/* DATE */}
                    <div className="showtime-form-row">
                        <div className="showtime-form-group">
                            <label className="showtime-form-label">Ngày bắt đầu</label>
                            <input
                                type="date"
                                name="start_date"
                                value={scheduleData.start_date}
                                onChange={handleChange}
                                className="showtime-form-input"
                            />
                            {formErrors.start_date && (
                                <span className="showtime-form-error">{formErrors.start_date}</span>
                            )}
                        </div>
                        <div className="showtime-form-group">
                            <label className="showtime-form-label">Ngày kết thúc</label>
                            <input
                                type="date"
                                name="end_date"
                                value={scheduleData.end_date}
                                onChange={handleChange}
                                className="showtime-form-input"
                            />
                            {formErrors.end_date && (
                                <span className="showtime-form-error">{formErrors.end_date}</span>
                            )}
                        </div>
                    </div>

                    {/* TIME - EDIT */}
                    {editingShowtime && (
                        <div className="showtime-form-group">
                            <label className="showtime-form-label">Giờ chiếu</label>
                            <input
                                type="time"
                                name="operating_start"
                                value={scheduleData.operating_start || ''}
                                onChange={handleChange}
                                className="showtime-form-input"
                            />
                            {formErrors.operating_start && (
                                <span className="showtime-form-error">{formErrors.operating_start}</span>
                            )}
                        </div>
                    )}

                    {/* SUBMIT */}
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={submitLoading}
                        className={`showtime-submit-btn ${submitLoading ? 'loading' : ''}`}
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
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {alertModal.message}
                    </p>
                </div>
            </AdminModal>

        </>
    );
};

export default ShowTimePage;