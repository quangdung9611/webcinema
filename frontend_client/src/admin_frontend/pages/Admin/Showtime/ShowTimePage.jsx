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
    Sparkles,
    Rocket,
    AlertTriangle,
    Lightbulb,
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

    const [scheduleData, setScheduleData] = useState({
        movie_ids: [],
        cinema_id: '',
        start_date: '',
        end_date: ''
    });

    const [formErrors, setFormErrors] = useState({});

    // ✅ STATE CHO MODAL HỦY SUẤT CHIẾU
    const [cancelModal, setCancelModal] = useState({
        open: false,
        showtime: null,
        bookingCount: 0,
        hasBookings: false,
        isPast: false,
        canCancel: true,
        reason: '',
        loading: false
    });

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
    // OPEN ADD (TẠO LỊCH CHIẾU)
    // ======================================================

    const handleOpenAdd = () => {
        setScheduleData({
            movie_ids: [],
            cinema_id: '',
            start_date: '',
            end_date: ''
        });
        setFormErrors({});
        setIsFormOpen(true);
    };

    // ======================================================
    // ✅ OPEN CANCEL MODAL — NÚT "SỬA" GIỜ LÀ "HỦY SUẤT"
    // ======================================================

    const handleOpenCancel = async (showtime) => {
        try {
            setLoading(true);

            // Check suất chiếu có booking không
            const checkRes = await api.get(
                `/admin/api/showtimes/${showtime.showtime_id}/check-bookings`
            );

            const checkData = checkRes.data?.data || {};

            setCancelModal({
                open: true,
                showtime: showtime,
                bookingCount: checkData.bookingCount || 0,
                hasBookings: checkData.hasBookings || false,
                isPast: checkData.isPast || false,
                canCancel: checkData.canCancel !== false,
                reason: '',
                loading: false
            });

        } catch (error) {
            console.error('CHECK BOOKINGS ERROR:', error);
            showAlert('Lỗi', error.response?.data?.message || 'Không thể kiểm tra suất chiếu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ======================================================
    // ✅ CLOSE CANCEL MODAL
    // ======================================================

    const closeCancelModal = () => {
        if (cancelModal.loading) return;

        setCancelModal({
            open: false,
            showtime: null,
            bookingCount: 0,
            hasBookings: false,
            isPast: false,
            canCancel: true,
            reason: '',
            loading: false
        });
    };

    // ======================================================
    // ✅ CONFIRM CANCEL SHOWTIME (HỦY + HOÀN ĐIỂM)
    // ======================================================

    const handleConfirmCancel = async () => {
        if (!cancelModal.reason.trim()) {
            showAlert('Lỗi', 'Vui lòng nhập lý do hủy.', 'error');
            return;
        }

        try {
            setCancelModal(prev => ({ ...prev, loading: true }));

            const res = await api.post(
                `/admin/api/showtimes/${cancelModal.showtime.showtime_id}/cancel`,
                { reason: cancelModal.reason.trim() }
            );

            const {
                cancelledBookings,
                totalPointsRefunded,
                emailSuccessCount
            } = res.data?.data || {};

            closeCancelModal();

            await fetchShowtimes(pagination.page, search);

            showAlert(
                'Đã hủy suất chiếu',
                `✅ Đã hủy suất chiếu.\n\n` +
                `👥 Số khách bị ảnh hưởng: ${cancelledBookings || 0}\n` +
                `💰 Tổng điểm hoàn: ${Number(totalPointsRefunded || 0).toLocaleString('vi-VN')} điểm\n` +
                `📧 Email gửi thành công: ${emailSuccessCount || 0}/${cancelledBookings || 0}`,
                'success'
            );

        } catch (error) {
            console.error('CANCEL SHOWTIME ERROR:', error);
            setCancelModal(prev => ({ ...prev, loading: false }));
            showAlert('Lỗi', error.response?.data?.message || 'Không thể hủy suất chiếu.', 'error');
        }
    };

    // ======================================================
    // CLOSE FORM (TẠO LỊCH)
    // ======================================================

    const handleCloseForm = () => {
        if (submitLoading) return;

        setIsFormOpen(false);
        setFormErrors({});
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

        if (!Array.isArray(scheduleData.movie_ids) || scheduleData.movie_ids.length === 0) {
            errors.movie_ids = 'Vui lòng chọn ít nhất 1 phim';
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

        message += `\n\nTỔNG QUAN:`;
        message += `\n- Đã tạo: ${createdCount} suất`;

        if (conflictsCount > 0) {
            message += `\n- Bỏ qua: ${conflictsCount} suất bị trùng`;
        }

        if (skippedPastCount > 0) {
            message += `\n- Bỏ qua: ${skippedPastCount} suất trong quá khứ`;
        }

        if (summary?.byMovie && typeof summary.byMovie === 'object') {
            message += `\n\nPHÂN BỔ THEO PHIM:`;
            for (const [movieId, stats] of Object.entries(summary.byMovie)) {
                const title = stats?.title || `Movie #${movieId}`;
                const count = Number(stats?.count) || 0;
                message += `\n  - ${title}: ${count} suất`;
            }
        }

        if (createdCount === 0) {
            message += `\n\nKHÔNG TẠO ĐƯỢC SUẤT NÀO!`;
            message += `\n\nHệ thống đã kiểm tra:`;
            message += `\n  - Phim được chọn`;
            message += `\n  - Phòng chiếu`;
            message += `\n  - Cấu hình movie_showtime_config`;
            message += `\n  - Loại ngày WEEKDAY/WEEKEND`;
            message += `\n  - Giờ hoạt động của rạp`;
            message += `\n  - Trùng suất chiếu`;
            message += `\n  - Suất trong quá khứ`;
        }

        return message;
    };

    // ======================================================
    // HANDLE SUBMIT (CHỈ TẠO LỊCH)
    // ======================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateSchedule()) return;

        try {
            setSubmitLoading(true);
            setFormErrors({});

            const movieIds = Array.isArray(scheduleData.movie_ids)
                ? scheduleData.movie_ids
                : [];

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

            const res = await api.post('/api/showtimes/schedule', payload);

            const result = normalizeScheduleResult(res);

            await fetchShowtimes(pagination.page, search);

            const message = buildScheduleResultMessage(result);

            setIsFormOpen(false);

            if (result.success === false || result.data.length === 0) {
                let errorMessage = result.message || 'Không tạo được suất chiếu.';

                if (result.skippedInvalidConfig && result.skippedInvalidConfig.length > 0) {
                    const firstError = result.skippedInvalidConfig[0];
                    errorMessage = firstError.reason || 'Cấu hình không phù hợp';
                } else if (result.skippedNoRoom && result.skippedNoRoom.length > 0) {
                    errorMessage = `Không có phòng ${result.skippedNoRoom[0].room_type} cho phim này.`;
                } else if (result.conflicts && result.conflicts.length > 0) {
                    errorMessage = `Phòng bị trùng lịch.`;
                }

                showAlert('Không tạo được lịch', errorMessage, 'warning');
            } else {
                showAlert('Tạo lịch chiếu thành công', message, 'success');
            }

        } catch (error) {
            console.error('CREATE SCHEDULE ERROR:', error);

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
                errorDetail = `${fieldLabel}: ${backendMessage}`;
            }

            if (backendField) {
                setFormErrors({ [backendField]: backendMessage });
            } else {
                showAlert('Không thể tạo lịch', errorDetail, 'error');
            }

        } finally {
            setSubmitLoading(false);
        }
    };

    // ======================================================
    // DELETE (XÓA BÌNH THƯỜNG)
    // ======================================================

    const handleDelete = (showtime) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa suất chiếu phim "${showtime.title}"?\n\nLưu ý: Nếu suất đã có khách đặt vé, hệ thống sẽ không cho xóa. Vui lòng dùng nút "Hủy suất" (icon bút chì) thay vì xóa.`,
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
                    <button
                        className="admin-action-btn edit-btn"
                        onClick={() => handleOpenCancel(row)}
                        title="Hủy suất chiếu"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() => handleDelete(row)}
                        title="Xóa suất chiếu"
                    >
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

            {/* ============================================
                FORM MODAL — TẠO LỊCH CHIẾU
            ============================================ */}
            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title="Tạo lịch chiếu"
                type="default"
                size="lg"
            >
                <div className="showtime-create-info">
                    <div className="showtime-create-header">
                        <Sparkles size={18} />
                        Tạo lịch chiếu tự động
                    </div>
                    <div className="showtime-create-body">
                        <strong>Hệ thống sẽ:</strong>
                        <br />
                        1. Lấy cấu hình suất chiếu từ database (<strong>movie_showtime_config</strong>)
                        <br />
                        2. Tự tìm phòng đúng loại và tránh trùng
                        <br />
                        3. Tự xử lý WEEKDAY / WEEKEND
                        <br />
                        4. Tự tính giờ hoạt động của rạp
                        <br /><br />
                        <strong>
                            <Lightbulb size={14} /> Cấu hình được quản lý tại trang <em>"Cấu hình lịch chiếu"</em>
                        </strong>
                    </div>
                </div>

                <div className="showtime-form">
                    {/* MOVIE */}
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

                    {/* CINEMA */}
                    <div className="showtime-form-group">
                        <label className="showtime-form-label">Rạp chiếu</label>
                        <select
                            name="cinema_id"
                            value={scheduleData.cinema_id}
                            onChange={handleChange}
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
                            <>
                                <Rocket size={18} /> Tạo lịch chiếu
                            </>
                        )}
                    </button>
                </div>
            </AdminModal>

            {/* ============================================
                CANCEL MODAL — HỦY SUẤT CHIẾU + HOÀN ĐIỂM
            ============================================ */}
            <AdminModal
                open={cancelModal.open}
                onClose={closeCancelModal}
                title="Hủy suất chiếu"
                type="warning"
                size="md"
                onConfirm={cancelModal.isPast ? closeCancelModal : handleConfirmCancel}
                onCancel={closeCancelModal}
                confirmText={cancelModal.loading ? 'Đang xử lý...' : 'Xác nhận hủy'}
                cancelText="Hủy bỏ"
            >
                <div className="cancel-showtime-content">
                    {/* SUẤT ĐÃ DIỄN RA */}
                    {cancelModal.isPast && (
                        <div className="cancel-warning-box" style={{ background: 'rgba(231,76,60,0.1)', borderColor: '#e74c3c' }}>
                            <AlertTriangle size={24} style={{ color: '#e74c3c' }} />
                            <div>
                                <strong style={{ color: '#e74c3c' }}>Không thể hủy!</strong>
                                <p>Suất chiếu này đã diễn ra rồi.</p>
                            </div>
                        </div>
                    )}

                    {/* CÓ BOOKING */}
                    {!cancelModal.isPast && cancelModal.hasBookings && (
                        <div className="cancel-warning-box">
                            <AlertTriangle size={24} />
                            <div>
                                <strong>Suất chiếu này có {cancelModal.bookingCount} khách đã đặt vé!</strong>
                                <p>Khi hủy, hệ thống sẽ hoàn 100% số tiền vé vào điểm tích lũy của từng khách và gửi email thông báo.</p>
                            </div>
                        </div>
                    )}

                    {/* CHƯA CÓ BOOKING */}
                    {!cancelModal.isPast && !cancelModal.hasBookings && (
                        <div className="cancel-info-box" style={{ background: '#f0f9ff', borderColor: '#3b82f6' }}>
                            <p style={{ margin: 0, color: '#3b82f6', fontWeight: 600, fontSize: 14 }}>
                                ℹ️ Suất chiếu này chưa có khách đặt vé.
                            </p>
                            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: 13 }}>
                                Bạn có thể yên tâm hủy suất chiếu này.
                            </p>
                        </div>
                    )}

                    {/* THÔNG TIN SUẤT CHIẾU */}
                    <div className="cancel-info-box">
                        <p><strong>Phim:</strong> {cancelModal.showtime?.title}</p>
                        <p><strong>Rạp:</strong> {cancelModal.showtime?.cinema_name}</p>
                        <p><strong>Phòng:</strong> {cancelModal.showtime?.room_name} ({cancelModal.showtime?.room_type})</p>
                        <p><strong>Giờ:</strong> {formatDateTime(cancelModal.showtime?.start_time).time}</p>
                        <p><strong>Ngày:</strong> {formatDateTime(cancelModal.showtime?.start_time).date}</p>
                    </div>

                    {/* NHẬP LÝ DO */}
                    {!cancelModal.isPast && (
                        <div className="cancel-reason-group">
                            <label>
                                Lý do hủy <span style={{ color: '#e74c3c' }}>*</span>
                            </label>
                            <textarea
                                value={cancelModal.reason}
                                onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="VD: Mất điện đột xuất, máy chiếu bảo trì, sự cố kỹ thuật..."
                                rows={3}
                                disabled={cancelModal.loading}
                                maxLength={255}
                            />
                            <small>{cancelModal.reason.length}/255</small>
                        </div>
                    )}
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
                    <p className="admin-alert-message">
                        {alertModal.message}
                    </p>
                </div>
            </AdminModal>

        </>
    );
};

export default ShowTimePage;