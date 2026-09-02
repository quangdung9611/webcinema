import React, {
    useEffect,
    useState,
    useRef,
    useCallback
} from 'react';

import api from '../../../../api/api';

import {
    DollarSign,
    Edit,
    Trash2,
    Loader2,
    Plus,
    RefreshCw,
    CheckCircle,
    XCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';

import '../../../styles/PriceConfig.css';


// ==========================================================
// INITIAL FORM DATA
// ==========================================================

const initialFormData = {
    room_type: '2D',
    time_slot: 'MORNING',
    day_type: 'WEEKDAY',
    seat_type: 'STANDARD',
    price: 50000,
    status: 1
};


// ==========================================================
// CONSTANTS
// ==========================================================

const ROOM_TYPES = ['2D', '3D', '4DMAX', 'IMAX', 'VIP'];
const TIME_SLOTS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
const DAY_TYPES = ['WEEKDAY', 'WEEKEND'];
const SEAT_TYPES = ['STANDARD', 'VIP', 'DELUXE', 'RECLINER', 'COUPLE'];

const TIME_SLOT_LABELS = {
    'MORNING': '🕐 Sáng (6h-12h)',
    'AFTERNOON': '🕐 Chiều (12h-17h)',
    'EVENING': '🕐 Tối (17h-20h)',
    'NIGHT': '🕐 Đêm (20h-24h)'
};

const DAY_TYPE_LABELS = {
    'WEEKDAY': '📅 Ngày thường (T2-T6)',
    'WEEKEND': '📅 Cuối tuần (T7-CN)'
};

const SEAT_TYPE_LABELS = {
    'STANDARD': 'Ghế Thường',
    'VIP': 'Ghế VIP',
    'DELUXE': 'Ghế Deluxe',
    'RECLINER': 'Ghế Recliner',
    'COUPLE': 'Ghế Đôi'
};

const SEAT_TYPE_COLORS = {
    'STANDARD': '#7D7D86',
    'VIP': '#D1AD55',
    'DELUXE': '#B8C0C9',
    'RECLINER': '#6F8FA8',
    'COUPLE': '#B86BC7'
};


// ==========================================================
// COMPONENT
// ==========================================================

const PriceConfigPage = () => {

    // ======================================================
    // DATA
    // ======================================================

    const [priceConfigs, setPriceConfigs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);


    // ======================================================
    // SEARCH
    // ======================================================

    const [search, setSearch] = useState('');


    // ======================================================
    // PAGINATION
    // ======================================================

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });


    // ======================================================
    // FETCH CONTROL
    // ======================================================

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);


    // ======================================================
    // FORM
    // ======================================================

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});


    // ======================================================
    // ALERT / CONFIRM MODAL
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
    // SHOW ALERT
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


    // ======================================================
    // CLOSE ALERT
    // ======================================================

    const closeAlert = () => {
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };


    // ======================================================
    // FETCH PRICE CONFIGS
    // ======================================================

    const fetchPriceConfigs = useCallback(
        async (page = 1, keyword = '') => {
            if (isFetching.current) {
                console.log('⏳ Đang fetch, bỏ qua lần gọi mới');
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
                    '/api/price-config',
                    {
                        params: {
                            page,
                            limit: 20,
                            search: keyword.trim()
                        },
                        signal: controller.signal
                    }
                );

                const data = Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];

                const paginationData = res.data?.pagination || {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 1,
                    hasPreviousPage: false,
                    hasNextPage: false
                };

                setPriceConfigs(data);
                setPagination(paginationData);

            } catch (error) {
                if (
                    error.name === 'AbortError' ||
                    error.code === 'ERR_CANCELED'
                ) {
                    console.log('🛑 Request price config bị hủy');
                    return;
                }

                console.error('FETCH PRICE CONFIG ERROR:', error);
                setPriceConfigs([]);
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
                    'Không thể tải danh sách cấu hình giá.',
                    'error'
                );

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
    // INITIAL FETCH
    // ======================================================

    useEffect(() => {
        fetchPriceConfigs(1, '');

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchPriceConfigs]);


    // ======================================================
    // SEARCH DEBOUNCE
    // ======================================================

    const prevSearchRef = useRef('');

    useEffect(() => {
        const currentSearch = search;
        const previousSearch = prevSearchRef.current;

        if (currentSearch === previousSearch) {
            return;
        }

        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchPriceConfigs(1, currentSearch);
        }, 400);

        return () => {
            clearTimeout(timer);
        };
    }, [search, fetchPriceConfigs]);


    // ======================================================
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (page) => {
        fetchPriceConfigs(page, search);
    };


    // ======================================================
    // VALIDATE FORM
    // ======================================================

    const validateForm = () => {
        const errors = {};

        if (!formData.room_type) {
            errors.room_type = 'Vui lòng chọn loại phòng';
        }

        if (!formData.time_slot) {
            errors.time_slot = 'Vui lòng chọn khung giờ';
        }

        if (!formData.day_type) {
            errors.day_type = 'Vui lòng chọn loại ngày';
        }

        if (!formData.seat_type) {
            errors.seat_type = 'Vui lòng chọn loại ghế';
        }

        if (!formData.price || formData.price <= 0) {
            errors.price = 'Giá vé phải lớn hơn 0';
        }

        if (formData.status === undefined || formData.status === null) {
            errors.status = 'Vui lòng chọn trạng thái';
        }

        return errors;
    };


    // ======================================================
    // OPEN ADD FORM
    // ======================================================

    const handleOpenAdd = () => {
        setEditingConfig(null);
        setFormData({ ...initialFormData });
        setFormErrors({});
        setIsFormOpen(true);
    };


    // ======================================================
    // OPEN EDIT FORM
    // ======================================================

    const handleOpenEdit = (config) => {
        setEditingConfig(config);
        setFormErrors({});

        setFormData({
            room_type: config.room_type || '2D',
            time_slot: config.time_slot || 'MORNING',
            day_type: config.day_type || 'WEEKDAY',
            seat_type: config.seat_type || 'STANDARD',
            price: config.price || 50000,
            status: config.status !== undefined ? config.status : 1
        });

        setIsFormOpen(true);
    };


    // ======================================================
    // CLOSE FORM
    // ======================================================

    const handleCloseForm = () => {
        if (submitLoading) {
            return;
        }

        setIsFormOpen(false);
        setEditingConfig(null);
        setFormErrors({});
    };


    // ======================================================
    // HANDLE FORM CHANGE
    // ======================================================

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const parsedValue = type === 'number' ? Number(value) : value;

        setFormData((prev) => ({
            ...prev,
            [name]: parsedValue
        }));

        setFormErrors((prev) => ({
            ...prev,
            [name]: ''
        }));
    };


    // ======================================================
    // SUBMIT FORM
    // ======================================================

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

            const submitData = { ...formData };

            if (editingConfig) {
                await api.put(
                    `/api/price-config/${editingConfig.price_config_id}`,
                    submitData
                );

                setIsFormOpen(false);
                setEditingConfig(null);
                setFormErrors({});

                fetchPriceConfigs(pagination.page, search);

                setTimeout(() => {
                    showAlert(
                        'Thành công',
                        'Cập nhật cấu hình giá thành công.',
                        'success'
                    );
                }, 100);

            } else {
                await api.post('/api/price-config', submitData);

                setIsFormOpen(false);
                setEditingConfig(null);
                setFormErrors({});

                fetchPriceConfigs(pagination.page, search);

                setTimeout(() => {
                    showAlert(
                        'Thành công',
                        'Thêm cấu hình giá thành công.',
                        'success'
                    );
                }, 100);
            }

        } catch (error) {
            console.error('SUBMIT PRICE CONFIG ERROR:', error);

            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.message;

            if (backendField) {
                setFormErrors({
                    [backendField]: backendError || 'Dữ liệu không hợp lệ.'
                });
                return;
            }

            showAlert(
                'Lỗi',
                backendError || 'Đã xảy ra lỗi.',
                'error'
            );

        } finally {
            setSubmitLoading(false);
        }
    };


    // ======================================================
    // TOGGLE STATUS
    // ======================================================

    const handleToggleStatus = (config) => {
        const newStatus = config.status === 1 ? 0 : 1;
        const actionText = newStatus === 1 ? 'kích hoạt' : 'vô hiệu hóa';

        showAlert(
            'Xác nhận',
            `Bạn có chắc muốn ${actionText} cấu hình giá cho ${config.room_type} - ${config.time_slot} - ${config.day_type} - ${config.seat_type}?`,
            'warning',
            async () => {
                try {
                    await api.patch(
                        `/api/price-config/${config.price_config_id}/status`,
                        { status: newStatus }
                    );

                    closeAlert();
                    fetchPriceConfigs(pagination.page, search);

                    setTimeout(() => {
                        showAlert(
                            'Thành công',
                            `Đã ${actionText} cấu hình giá thành công.`,
                            'success'
                        );
                    }, 100);

                } catch (error) {
                    console.error('TOGGLE STATUS ERROR:', error);
                    closeAlert();

                    setTimeout(() => {
                        showAlert(
                            'Lỗi',
                            error.response?.data?.message || 'Không thể cập nhật trạng thái.',
                            'error'
                        );
                    }, 100);
                }
            },
            closeAlert
        );
    };


    // ======================================================
    // DELETE PRICE CONFIG
    // ======================================================

    const handleDelete = (config) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa cấu hình giá cho ${config.room_type} - ${config.time_slot} - ${config.day_type} - ${config.seat_type}?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/price-config/${config.price_config_id}`);

                    closeAlert();

                    const currentPage = pagination.page;
                    const newPage = priceConfigs.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;

                    await fetchPriceConfigs(newPage, search);

                    setTimeout(() => {
                        showAlert(
                            'Thành công',
                            'Xóa cấu hình giá thành công.',
                            'success'
                        );
                    }, 100);

                } catch (error) {
                    console.error('DELETE PRICE CONFIG ERROR:', error);
                    closeAlert();

                    setTimeout(() => {
                        showAlert(
                            'Lỗi',
                            error.response?.data?.message || 'Không thể xóa cấu hình giá.',
                            'error'
                        );
                    }, 100);
                }
            },
            closeAlert
        );
    };


    // ======================================================
    // SEED DATA
    // ======================================================

    const handleSeed = () => {
        showAlert(
            'Xác nhận seed dữ liệu',
            'Dữ liệu giá hiện tại sẽ bị xóa và thay thế bằng dữ liệu mặc định. Bạn có chắc không?',
            'warning',
            async () => {
                try {
                    await api.post('/api/price-config/seed');

                    closeAlert();
                    fetchPriceConfigs(1, '');

                    setTimeout(() => {
                        showAlert(
                            'Thành công',
                            'Seed dữ liệu giá mặc định thành công.',
                            'success'
                        );
                    }, 100);

                } catch (error) {
                    console.error('SEED ERROR:', error);
                    closeAlert();

                    setTimeout(() => {
                        showAlert(
                            'Lỗi',
                            error.response?.data?.message || 'Không thể seed dữ liệu.',
                            'error'
                        );
                    }, 100);
                }
            },
            closeAlert
        );
    };


    // ======================================================
    // GET LABELS
    // ======================================================

    const getTimeSlotLabel = (slot) => TIME_SLOT_LABELS[slot] || slot;
    const getDayTypeLabel = (type) => DAY_TYPE_LABELS[type] || type;
    const getSeatTypeLabel = (type) => SEAT_TYPE_LABELS[type] || type;
    const getSeatTypeColor = (type) => SEAT_TYPE_COLORS[type] || '#7D7D86';


    // ======================================================
    // RENDER
    // ======================================================

    return (
        <div className="price-config-page">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="price-config-header">
                <div className="price-config-header-left">
                    <div className="price-config-icon">
                        <DollarSign size={28} />
                    </div>
                    <div>
                        <h1>💰 Quản lý giá vé</h1>
                        <p>Quản lý giá vé theo loại phòng, khung giờ, ngày chiếu và loại ghế</p>
                    </div>
                </div>

                <div className="price-config-header-right">
                    <button
                        type="button"
                        className="btn btn-seed"
                        onClick={handleSeed}
                    >
                        <RefreshCw size={16} />
                        Seed dữ liệu
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleOpenAdd}
                    >
                        <Plus size={16} />
                        Thêm cấu hình giá
                    </button>
                </div>
            </div>

            {/* ==================================================
                SEARCH BAR
            ================================================== */}

            <div className="price-config-search">
                <div className="search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo loại phòng, khung giờ, loại ghế..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            className="search-clear"
                            onClick={() => setSearch('')}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* ==================================================
                TABLE
            ================================================== */}

            {loading ? (
                <div className="price-config-loading">
                    <Loader2 size={32} className="spin-icon" />
                    <span>Đang tải dữ liệu...</span>
                </div>
            ) : (
                <>
                    <div className="price-config-table-wrapper">
                        <table className="price-config-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Loại phòng</th>
                                    <th>Khung giờ</th>
                                    <th>Ngày</th>
                                    <th>Loại ghế</th>
                                    <th>Giá vé</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {priceConfigs.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="empty-cell">
                                            <div className="empty-state">
                                                <DollarSign size={48} />
                                                <h3>Chưa có cấu hình giá</h3>
                                                <p>Nhấn "Thêm cấu hình giá" để tạo mới</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    priceConfigs.map((config, index) => (
                                        <tr key={config.price_config_id}>
                                            <td>
                                                {(pagination.page - 1) * pagination.limit + index + 1}
                                            </td>
                                            <td>
                                                <span className="room-type-badge">
                                                    {config.room_type}
                                                </span>
                                            </td>
                                            <td>{getTimeSlotLabel(config.time_slot)}</td>
                                            <td>{getDayTypeLabel(config.day_type)}</td>
                                            <td>
                                                <span 
                                                    className="seat-type-badge"
                                                    style={{
                                                        backgroundColor: `${getSeatTypeColor(config.seat_type)}22`,
                                                        color: getSeatTypeColor(config.seat_type),
                                                        borderColor: getSeatTypeColor(config.seat_type)
                                                    }}
                                                >
                                                    {getSeatTypeLabel(config.seat_type)}
                                                </span>
                                            </td>
                                            <td className="price-cell">
                                                {Number(config.price).toLocaleString()}₫
                                            </td>
                                            <td>
                                                <span className={`status-badge ${config.status === 1 ? 'active' : 'inactive'}`}>
                                                    {config.status === 1 ? (
                                                        <>
                                                            <CheckCircle size={14} />
                                                            Hoạt động
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle size={14} />
                                                            Đã khóa
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        type="button"
                                                        className="action-btn edit-btn"
                                                        onClick={() => handleOpenEdit(config)}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Edit size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={`action-btn toggle-btn ${config.status === 1 ? 'active' : 'inactive'}`}
                                                        onClick={() => handleToggleStatus(config)}
                                                        title={config.status === 1 ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                    >
                                                        {config.status === 1 ? '🔒' : '🔓'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="action-btn delete-btn"
                                                        onClick={() => handleDelete(config)}
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ==============================================
                        PAGINATION
                    ============================================== */}

                    {pagination.totalPages > 1 && (
                        <div className="price-config-pagination">
                            <button
                                className="page-btn"
                                disabled={!pagination.hasPreviousPage}
                                onClick={() => handlePageChange(pagination.page - 1)}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <span className="page-info">
                                Trang {pagination.page} / {pagination.totalPages}
                            </span>

                            <button
                                className="page-btn"
                                disabled={!pagination.hasNextPage}
                                onClick={() => handlePageChange(pagination.page + 1)}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* ==============================================
                        STATS
                    ============================================== */}

                    <div className="price-config-stats">
                        <div className="stat-item">
                            <span className="stat-label">Tổng cấu hình:</span>
                            <span className="stat-value">{priceConfigs.length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Đang hoạt động:</span>
                            <span className="stat-value text-success">
                                {priceConfigs.filter(c => c.status === 1).length}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Đã khóa:</span>
                            <span className="stat-value text-danger">
                                {priceConfigs.filter(c => c.status === 0).length}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Loại ghế:</span>
                            <span className="stat-value">
                                {[...new Set(priceConfigs.map(c => c.seat_type))].length}
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* ==================================================
                FORM MODAL
            ================================================== */}

            {isFormOpen && (
                <div className="modal-overlay" onClick={handleCloseForm}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                {editingConfig ? '✏️ Cập nhật cấu hình giá' : '➕ Thêm cấu hình giá mới'}
                            </h2>
                            <button className="modal-close" onClick={handleCloseForm}>
                                <X size={20} />
                            </button>
                        </div>

                        <form className="modal-body" onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Loại phòng <span className="required">*</span></label>
                                    <select
                                        name="room_type"
                                        value={formData.room_type}
                                        onChange={handleChange}
                                        className={formErrors.room_type ? 'error' : ''}
                                    >
                                        {ROOM_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    {formErrors.room_type && (
                                        <span className="error-text">{formErrors.room_type}</span>
                                    )}
                                </div>

                                <div className="form-group half">
                                    <label>Khung giờ <span className="required">*</span></label>
                                    <select
                                        name="time_slot"
                                        value={formData.time_slot}
                                        onChange={handleChange}
                                        className={formErrors.time_slot ? 'error' : ''}
                                    >
                                        {TIME_SLOTS.map(slot => (
                                            <option key={slot} value={slot}>
                                                {TIME_SLOT_LABELS[slot]}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.time_slot && (
                                        <span className="error-text">{formErrors.time_slot}</span>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Loại ngày <span className="required">*</span></label>
                                    <select
                                        name="day_type"
                                        value={formData.day_type}
                                        onChange={handleChange}
                                        className={formErrors.day_type ? 'error' : ''}
                                    >
                                        {DAY_TYPES.map(type => (
                                            <option key={type} value={type}>
                                                {DAY_TYPE_LABELS[type]}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.day_type && (
                                        <span className="error-text">{formErrors.day_type}</span>
                                    )}
                                </div>

                                <div className="form-group half">
                                    <label>Loại ghế <span className="required">*</span></label>
                                    <select
                                        name="seat_type"
                                        value={formData.seat_type}
                                        onChange={handleChange}
                                        className={formErrors.seat_type ? 'error' : ''}
                                    >
                                        {SEAT_TYPES.map(type => (
                                            <option key={type} value={type}>
                                                {SEAT_TYPE_LABELS[type]}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.seat_type && (
                                        <span className="error-text">{formErrors.seat_type}</span>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Giá vé (₫) <span className="required">*</span></label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="Nhập giá vé"
                                    min="0"
                                    step="1000"
                                    className={formErrors.price ? 'error' : ''}
                                />
                                {formErrors.price && (
                                    <span className="error-text">{formErrors.price}</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Trạng thái <span className="required">*</span></label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className={formErrors.status ? 'error' : ''}
                                >
                                    <option value={1}>✅ Hoạt động</option>
                                    <option value={0}>❌ Đã khóa</option>
                                </select>
                                {formErrors.status && (
                                    <span className="error-text">{formErrors.status}</span>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseForm}
                                    disabled={submitLoading}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitLoading}
                                >
                                    {submitLoading ? (
                                        <>
                                            <Loader2 size={16} className="spin-icon" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        editingConfig ? 'Cập nhật' : 'Thêm mới'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================================================
                ALERT / CONFIRM MODAL
            ================================================== */}

            {alertModal.open && (
                <div className="modal-overlay" onClick={closeAlert}>
                    <div className={`modal-content alert-modal ${alertModal.type}`} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{alertModal.title}</h2>
                            <button className="modal-close" onClick={closeAlert}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <p>{alertModal.message}</p>
                        </div>

                        <div className="modal-footer">
                            {alertModal.onCancel && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={alertModal.onCancel}
                                >
                                    Hủy
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={alertModal.onConfirm || closeAlert}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PriceConfigPage;