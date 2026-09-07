import React, {
    useEffect,
    useState,
    useRef,
    useCallback
} from 'react';

import api from '../../../../api/api';

import {
    Monitor,
    Trash2,
    Loader2,
    Layout,
    MapPin,
    Building2,
    Info,
    Plus,
    Minus
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// CONSTANTS
// ==========================================================

const ROOM_TYPES = ['2D', '3D', 'VIP', 'IMAX'];

const roomTypeMap = {
    '2D': 'Phòng 2D',
    '3D': 'Phòng 3D',
    'VIP': 'Phòng VIP',
    'IMAX': 'Phòng IMAX'
};

const roomTypeConfig = {
    '2D': {
        bg: '#e0f2fe',
        color: '#0284c7',
        icon: '🎬'
    },
    '3D': {
        bg: '#ede9fe',
        color: '#7c3aed',
        icon: '🕶️'
    },
    'VIP': {
        bg: '#fce4ec',
        color: '#e91e63',
        icon: '👑'
    },
    'IMAX': {
        bg: '#dcfce7',
        color: '#16a34a',
        icon: '🌌'
    }
};

const normalizeRoomType = (value) => {
    return String(value || '')
        .trim()
        .toUpperCase();
};

// ==========================================================
// COMPONENT
// ==========================================================

const RoomPage = () => {

    // ======================================================
    // DATA
    // ======================================================

    const [rooms, setRooms] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [loading, setLoading] = useState(false);

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
    const prevSearchRef = useRef('');

    // ======================================================
    // BULK MODAL
    // ======================================================

    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFormData, setBulkFormData] = useState({
        cinema_id: '',
        counts: {
            '2D': 0,
            '3D': 0,
            'VIP': 0,
            'IMAX': 0
        }
    });
    const [bulkErrors, setBulkErrors] = useState({});
    const [bulkLoading, setBulkLoading] = useState(false);

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

    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
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
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    // ======================================================
    // FETCH ROOMS
    // ======================================================

    const fetchRooms = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/rooms/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const roomsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {};

            setRooms(roomsData);
            setPagination(paginationData);

        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                return;
            }

            console.error('FETCH ROOMS ERROR:', error);
            setRooms([]);
            showAlert('Lỗi', 'Không thể tải danh sách phòng chiếu.', 'error');

        } finally {
            setLoading(false);
            isFetching.current = false;

            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    // ======================================================
    // FETCH CINEMAS
    // ======================================================

    const fetchCinemas = useCallback(async () => {
        try {
            const res = await api.get('/api/cinemas');
            const cinemaList = res.data?.data || [];
            setCinemas(cinemaList);

        } catch (error) {
            console.error('FETCH CINEMAS ERROR:', error);
        }
    }, []);

    // ======================================================
    // INITIAL FETCH
    // ======================================================

    useEffect(() => {
        fetchRooms(1, '');
        fetchCinemas();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchRooms, fetchCinemas]);

    // ======================================================
    // SEARCH DEBOUNCE
    // ======================================================

    useEffect(() => {
        const currentSearch = search;
        const previousSearch = prevSearchRef.current;

        if (currentSearch === previousSearch) return;

        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchRooms(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchRooms]);

    // ======================================================
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (page) => {
        fetchRooms(page, search);
    };

    // ======================================================
    // DELETE ROOM
    // ======================================================

    const handleDelete = (room) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa phòng "${room.room_name}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/rooms/${room.room_id}`);
                    closeAlert();

                    const currentPage = pagination.page;
                    const newPage = rooms.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;

                    await fetchRooms(newPage, search);
                    showAlert('Thành công', 'Xóa phòng chiếu thành công.', 'success');

                } catch (error) {
                    console.error('DELETE ROOM ERROR:', error);
                    closeAlert();
                    showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa phòng chiếu.', 'error');
                }
            },
            closeAlert
        );
    };

    // ======================================================
    // OPEN BULK MODAL
    // ======================================================

    const handleOpenBulkModal = () => {
        setBulkFormData({
            cinema_id: '',
            counts: {
                '2D': 0,
                '3D': 0,
                'VIP': 0,
                'IMAX': 0
            }
        });
        setBulkErrors({});
        setIsBulkModalOpen(true);
    };

    // ======================================================
    // TĂNG / GIẢM SỐ LƯỢNG PHÒNG
    // ======================================================

    const handleCountChange = (type, delta) => {
        setBulkFormData((prev) => {
            const current = Number(prev.counts[type]) || 0;
            const newCount = Math.max(0, current + delta);

            return {
                ...prev,
                counts: {
                    ...prev.counts,
                    [type]: newCount
                }
            };
        });
    };

    const handleInputCountChange = (type, value) => {
        const num = Number(value) || 0;

        setBulkFormData((prev) => ({
            ...prev,
            counts: {
                ...prev.counts,
                [type]: Math.max(0, num)
            }
        }));
    };

    // ======================================================
    // BULK SUBMIT
    // ======================================================

    const handleBulkSubmit = async (e) => {
        e.preventDefault();

        const errors = {};

        if (!bulkFormData.cinema_id) {
            errors.cinema_id = 'Vui lòng chọn rạp chiếu';
        }

        const roomTypesPayload = ROOM_TYPES
            .filter((type) => Number(bulkFormData.counts[type]) > 0)
            .map((type) => ({
                type,
                count: Number(bulkFormData.counts[type]) || 1
            }));

        if (roomTypesPayload.length === 0) {
            errors.room_types = 'Vui lòng nhập số lượng ít nhất 1 phòng';
        }

        if (Object.keys(errors).length > 0) {
            setBulkErrors(errors);
            return;
        }

        setBulkLoading(true);

        try {
            const payload = {
                cinema_id: Number(bulkFormData.cinema_id),
                room_types: roomTypesPayload
            };

            console.log('🏢 [ROOM BULK CREATE] Payload:', payload);

            const res = await api.post('/api/rooms/bulk', payload);
            setIsBulkModalOpen(false);

            const createdCount = res.data?.data?.created || 0;
            const totalCount = res.data?.data?.total || 0;

            showAlert(
                'Thành công',
                `Tạo thành công ${createdCount}/${totalCount} phòng. Ghế đã được tự động tạo!`,
                'success'
            );

            await fetchRooms(1, search);

        } catch (error) {
            console.error('BULK CREATE ERROR:', error);

            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.message || 'Không thể tạo phòng hàng loạt.';

            if (backendField) {
                setBulkErrors({
                    [backendField]: backendError
                });
            } else {
                showAlert('Lỗi', backendError, 'error');
            }

        } finally {
            setBulkLoading(false);
        }
    };

    // ======================================================
    // RENDER TYPE BADGE
    // ======================================================

    const renderTypeBadge = (type) => {
        const normalizedType = normalizeRoomType(type);
        const config = roomTypeConfig[normalizedType] || {
            bg: '#e2e8f0',
            color: '#475569',
            icon: '📽️'
        };
        const displayName = roomTypeMap[normalizedType] || normalizedType;

        return (
            <span
                style={{
                    background: config.bg,
                    color: config.color,
                    padding: '7px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                <span>{config.icon}</span>
                {displayName}
            </span>
        );
    };

    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [
        {
            title: 'Phòng chiếu',
            key: 'room_name',
            render: (row) => (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                    }}
                >
                    <div
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
                        }}
                    >
                        <Monitor size={20} />
                    </div>

                    <div>
                        <div
                            style={{
                                fontWeight: '700',
                                fontSize: '15px',
                                color: 'var(--text-heading)'
                            }}
                        >
                            {row.room_name}
                        </div>

                        <small
                            style={{
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px'
                            }}
                        >
                            <Building2 size={13} />
                            Room ID: #{row.room_id}
                        </small>
                    </div>
                </div>
            )
        },

        {
            title: 'Loại phòng',
            key: 'room_type',
            render: (row) => renderTypeBadge(row.room_type)
        },

        {
            title: 'Rạp chiếu',
            key: 'cinema_name',
            render: (row) => (
                <div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '700',
                            color: 'var(--text-heading)'
                        }}
                    >
                        <Layout size={15} style={{ color: 'var(--silver-primary)' }} />
                        {row.cinema_name}
                    </div>

                    <div
                        style={{
                            marginTop: '7px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '13px'
                        }}
                    >
                        <MapPin size={13} style={{ color: 'var(--silver-primary)' }} />
                        {row.city}
                    </div>
                </div>
            )
        },

        {
            title: 'Thao tác',
            key: 'actions',
            render: (row) => (
                <div className="admin-table-actions">
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
    // RENDER BULK FORM
    // ======================================================

    const renderBulkForm = () => (
        <div>
            {/* Chọn rạp */}
            <AdminForm
                fields={[
                    {
                        label: 'Rạp chiếu',
                        name: 'cinema_id',
                        type: 'select',
                        required: true,
                        options: [
                            { label: '-- Chọn rạp --', value: '' },
                            ...cinemas.map((cinema) => ({
                                label: `${cinema.cinema_name} (${cinema.city})`,
                                value: cinema.cinema_id
                            }))
                        ]
                    }
                ]}
                formData={bulkFormData}
                errors={bulkErrors}
                onChange={(e) =>
                    setBulkFormData((prev) => ({
                        ...prev,
                        [e.target.name]: e.target.value
                    }))
                }
                onSubmit={handleBulkSubmit}
                loading={bulkLoading}
                submitText="Tạo hàng loạt"
            />

            {/* Nhập số lượng */}
            <div style={{ marginTop: '20px' }}>
                <div style={{ fontWeight: '700', marginBottom: '12px' }}>
                    Nhập số lượng phòng (nhập 0 nếu không tạo):
                </div>

                {ROOM_TYPES.map((type) => (
                    <div
                        key={type}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            marginBottom: '10px',
                            background: roomTypeConfig[type].bg,
                            borderRadius: '10px',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        <div
                            style={{
                                fontWeight: '600',
                                color: roomTypeConfig[type].color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>
                                {roomTypeConfig[type].icon}
                            </span>
                            {roomTypeMap[type]}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => handleCountChange(type, -1)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: '#fff',
                                    border: '1px solid #ccc',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Minus size={16} />
                            </button>

                            <input
                                type="number"
                                min="0"
                                value={bulkFormData.counts[type]}
                                onChange={(e) => handleInputCountChange(type, e.target.value)}
                                style={{
                                    width: '60px',
                                    textAlign: 'center',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    border: '1px solid #ccc',
                                    fontWeight: '700'
                                }}
                            />

                            <button
                                type="button"
                                onClick={() => handleCountChange(type, 1)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: '#fff',
                                    border: '1px solid #ccc',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Nút tạo */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    onClick={handleBulkSubmit}
                    disabled={bulkLoading}
                    style={{
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: 'pointer'
                    }}
                >
                    {bulkLoading
                        ? 'Đang tạo...'
                        : `TẠO PHÒNG (${Object.values(bulkFormData.counts).reduce((a, b) => a + Number(b), 0)} phòng)`}
                </button>
            </div>
        </div>
    );

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
                title="Quản lý phòng chiếu"
                subtitle="Quản lý toàn bộ phòng chiếu trong hệ thống"
                icon={<Monitor size={30} />}
                buttonText="Tạo phòng hàng loạt"
                onAdd={handleOpenBulkModal}
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
                        <AdminTable
                            columns={columns}
                            data={rooms}
                        />

                        <AdminPagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </AdminPage>

            {/* ==================================================
                BULK MODAL
            ================================================== */}

            <AdminModal
                open={isBulkModalOpen}
                onClose={() => {
                    if (!bulkLoading) {
                        setIsBulkModalOpen(false);
                    }
                }}
                title="Tạo phòng hàng loạt"
                type="default"
                variant="custom"
                size="lg"
            >
                <div style={{ marginBottom: '16px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', marginBottom: '6px' }}>
                        <Info size={18} />
                        Thông tin
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                        Hệ thống sẽ tự động tạo số lượng phòng theo số bạn nhập, và tự động tạo ghế tương ứng cho từng phòng.
                    </div>
                </div>

                {renderBulkForm()}
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

export default RoomPage;