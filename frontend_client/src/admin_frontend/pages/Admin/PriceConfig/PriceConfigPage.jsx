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
    RefreshCw
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';



// ==========================================================
// CONSTANTS
// ==========================================================

const ROOM_TYPES = ['2D', '3D', '4DMAX', 'IMAX', 'VIP'];
const TIME_SLOTS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
const DAY_TYPES = ['WEEKDAY', 'WEEKEND'];
const SEAT_TYPES = ['STANDARD', 'VIP', 'DELUXE', 'RECLINER', 'COUPLE'];

const TIME_SLOT_LABELS = {
    'MORNING': 'Sáng (6h-12h)',
    'AFTERNOON': 'Chiều (12h-17h)',
    'EVENING': 'Tối (17h-20h)',
    'NIGHT': 'Đêm (20h-24h)'
};

const DAY_TYPE_LABELS = {
    'WEEKDAY': 'Ngày thường (T2-T6)',
    'WEEKEND': 'Cuối tuần (T7-CN)'
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

            // ----------------------------------------------
            // CHỐNG FETCH TRÙNG
            // ----------------------------------------------

            if (isFetching.current) {
                console.log('⏳ Đang fetch, bỏ qua lần gọi mới');
                return;
            }


            // ----------------------------------------------
            // HỦY REQUEST CŨ
            // ----------------------------------------------

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;
            isFetching.current = true;
            setLoading(true);

            try {

                // ------------------------------------------
                // API
                // ------------------------------------------

                const res = await api.get(
                    '/api/price-config/paginated',  // <-- SỬA: Thêm /paginated
                    {
                        params: {
                            page,
                            limit: 20,
                            search: keyword.trim()
                        },
                        signal: controller.signal
                    }
                );


                // ------------------------------------------
                // PRICE CONFIGS DATA
                // ------------------------------------------

                const data = Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];


                // ------------------------------------------
                // PAGINATION DATA
                // ------------------------------------------

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

                // ------------------------------------------
                // REQUEST BỊ HỦY
                // ------------------------------------------

                if (
                    error.name === 'AbortError' ||
                    error.code === 'ERR_CANCELED'
                ) {
                    console.log('🛑 Request price config bị hủy');
                    return;
                }


                // ------------------------------------------
                // ERROR
                // ------------------------------------------

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

                // Sau khi thêm, quay về trang 1
                fetchPriceConfigs(1, search);

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
    // TABLE COLUMNS
    // ======================================================

    const columns = [
        {
            title: 'ID',
            key: 'price_config_id',
            render: (row) => `#${row.price_config_id}`
        },
        {
            title: 'Loại phòng',
            key: 'room_type',
            render: (row) => (
                <span className="room-type-badge">
                    {row.room_type}
                </span>
            )
        },
        {
            title: 'Khung giờ',
            key: 'time_slot',
            render: (row) => getTimeSlotLabel(row.time_slot)
        },
        {
            title: 'Ngày',
            key: 'day_type',
            render: (row) => getDayTypeLabel(row.day_type)
        },
        {
            title: 'Loại ghế',
            key: 'seat_type',
            render: (row) => (
                <span 
                    className="seat-type-badge"
                    style={{
                        backgroundColor: `${getSeatTypeColor(row.seat_type)}22`,
                        color: getSeatTypeColor(row.seat_type),
                        borderColor: getSeatTypeColor(row.seat_type)
                    }}
                >
                    {getSeatTypeLabel(row.seat_type)}
                </span>
            )
        },
        {
            title: 'Giá vé',
            key: 'price',
            render: (row) => (
                <strong className="price-cell">
                    {Number(row.price).toLocaleString()}₫
                </strong>
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (row) => (
                <span className={`status-badge ${row.status === 1 ? 'active' : 'inactive'}`}>
                    {row.status === 1 ? '✅ Hoạt động' : '❌ Đã khóa'}
                </span>
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (row) => (
                <div className="admin-table-actions">
                    <button
                        type="button"
                        className="admin-action-btn edit-btn"
                        onClick={() => handleOpenEdit(row)}
                        title="Chỉnh sửa"
                    >
                        <Edit size={16} />
                    </button>

                    <button
                        type="button"
                        className={`admin-action-btn toggle-btn ${row.status === 1 ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(row)}
                        title={row.status === 1 ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    >
                        {row.status === 1 ? '🔒' : '🔓'}
                    </button>

                    <button
                        type="button"
                        className="admin-action-btn delete-btn"
                        onClick={() => handleDelete(row)}
                        title="Xóa"
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
            label: 'Loại phòng',
            name: 'room_type',
            type: 'select',
            required: true,
            options: ROOM_TYPES.map(type => ({
                label: type,
                value: type
            }))
        },
        {
            label: 'Khung giờ',
            name: 'time_slot',
            type: 'select',
            required: true,
            options: TIME_SLOTS.map(slot => ({
                label: TIME_SLOT_LABELS[slot],
                value: slot
            }))
        },
        {
            label: 'Loại ngày',
            name: 'day_type',
            type: 'select',
            required: true,
            options: DAY_TYPES.map(type => ({
                label: DAY_TYPE_LABELS[type],
                value: type
            }))
        },
        {
            label: 'Loại ghế',
            name: 'seat_type',
            type: 'select',
            required: true,
            options: SEAT_TYPES.map(type => ({
                label: SEAT_TYPE_LABELS[type],
                value: type
            }))
        },
        {
            label: 'Giá vé (₫)',
            name: 'price',
            type: 'number',
            placeholder: 'Nhập giá vé',
            required: true,
            min: 0,
            step: 1000
        },
        {
            label: 'Trạng thái',
            name: 'status',
            type: 'select',
            required: true,
            options: [
                { label: '✅ Hoạt động', value: 1 },
                { label: '❌ Đã khóa', value: 0 }
            ]
        }
    ];


    // ======================================================
    // ALERT VARIANT
    // ======================================================

    const alertVariant = alertModal.onConfirm ? 'confirm' : 'alert';


    // ======================================================
    // RENDER
    // ======================================================

    return (
        <>
            {/* ==================================================
                ADMIN PAGE
            ================================================== */}

            <AdminPage
                title="💰 Quản lý giá vé"
                subtitle="Quản lý giá vé theo loại phòng, khung giờ, ngày chiếu và loại ghế"
                icon={<DollarSign size={30} />}
                buttonText="Thêm cấu hình giá"
                onAdd={handleOpenAdd}
                searchValue={search}
                onSearchChange={setSearch}
                extraButtons={
                    <button
                        type="button"
                        className="admin-extra-btn seed-btn"
                        onClick={handleSeed}
                        title="Seed dữ liệu mặc định"
                    >
                        <RefreshCw size={16} />
                        Seed dữ liệu
                    </button>
                }
            >
                {/* ==============================================
                    LOADING
                ============================================== */}

                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <>
                        {/* ==========================================
                            TABLE
                        ========================================== */}

                        <AdminTable
                            columns={columns}
                            data={priceConfigs}
                            emptyMessage="Chưa có cấu hình giá nào"
                        />


                        {/* ==========================================
                            PAGINATION
                        ========================================== */}

                        <AdminPagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />


                        {/* ==========================================
                            STATS
                        ========================================== */}

                        <div className="admin-stats">
                            <div className="stat-item">
                                <span className="stat-label">Tổng cấu hình:</span>
                                <span className="stat-value">{pagination.total}</span>
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
                                <span className="stat-label">Trang hiện tại:</span>
                                <span className="stat-value">{pagination.page}/{pagination.totalPages}</span>
                            </div>
                        </div>
                    </>
                )}
            </AdminPage>

            {/* ==================================================
                FORM MODAL
            ================================================== */}

            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title={
                    editingConfig
                        ? '✏️ Cập nhật cấu hình giá'
                        : '➕ Thêm cấu hình giá mới'
                }
                type="default"
                variant="custom"
                size="lg"
            >
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={
                        editingConfig
                            ? 'Lưu thay đổi'
                            : 'Thêm cấu hình giá'
                    }
                />
            </AdminModal>

            {/* ==================================================
                ALERT / CONFIRM MODAL
            ================================================== */}

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                variant={alertVariant}
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

export default PriceConfigPage;