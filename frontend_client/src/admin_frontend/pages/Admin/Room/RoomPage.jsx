import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Monitor,
    Edit,
    Trash2,
    Loader2,
    Layout,
    MapPin,
    Building2,
    Layers3,
    CircleDot,
    Tv2,
    Crown,
    Sparkles,
    Zap,
    CheckSquare,
    Square
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
    room_name: '',
    cinema_id: '',
    room_type: ''
};

// ✅ Map giá trị room_type sang tên hiển thị (ĐÃ XÓA 4DMAX)
const roomTypeMap = {
    '2D': 'Phòng 2D',
    '3D': 'Phòng 3D',
    'IMAX': 'Phòng IMAX',
    'VIP': 'Phòng VIP'
};

// ✅ Cấu hình màu sắc và icon cho từng loại phòng (ĐÃ XÓA 4DMAX)
const roomTypeConfig = {
    '2D': { bg: '#e0f2fe', color: '#0284c7', icon: <CircleDot size={14} /> },
    '3D': { bg: '#ede9fe', color: '#7c3aed', icon: <Layers3 size={14} /> },
    'IMAX': { bg: '#dcfce7', color: '#16a34a', icon: <Tv2 size={14} /> },
    'VIP': { bg: '#fce4ec', color: '#e91e63', icon: <Crown size={14} /> }
};

// Cấu hình số lượng phòng mặc định cho từng hạng
const DEFAULT_ROOM_COUNT = {
    '2D': 10,
    '3D': 5,
    'VIP': 3,
    'IMAX': 2
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
    const [editingRoom, setEditingRoom] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

    // ======================================================
    // BULK CREATE 🆕
    // ======================================================

    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkCinemaId, setBulkCinemaId] = useState('');
    const [selectedRoomTypes, setSelectedRoomTypes] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

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
    // FETCH ROOMS
    // ======================================================

    const fetchRooms = useCallback(async (page = 1, keyword = '') => {
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
            const res = await api.get('/api/rooms/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const roomsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setRooms(roomsData);
            setPagination(paginationData);

        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request rooms bị hủy');
                return;
            }
            console.error('FETCH ROOMS ERROR:', error);
            setRooms([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
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
    // FETCH CINEMAS (cho dropdown)
    // ======================================================

    const fetchCinemas = useCallback(async () => {
        try {
            const res = await api.get('/api/cinemas');
            const cinemaList = res.data?.data || [];
            setCinemas(cinemaList);
        } catch (error) {
            console.error('Fetch cinemas error:', error);
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

    const prevSearchRef = useRef('');

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
    // VALIDATE FORM
    // ======================================================

    const validateForm = () => {
        const errors = {};

        if (!formData.room_name.trim()) {
            errors.room_name = 'Vui lòng nhập tên phòng';
        } else if (formData.room_name.trim().length < 2) {
            errors.room_name = 'Tên phòng phải từ 2 ký tự trở lên';
        }

        if (!formData.room_type) {
            errors.room_type = 'Vui lòng chọn loại phòng';
        }

        if (!formData.cinema_id) {
            errors.cinema_id = 'Vui lòng chọn rạp chiếu';
        }

        return errors;
    };

    // ======================================================
    // OPEN ADD FORM
    // ======================================================

    const handleOpenAdd = () => {
        setEditingRoom(null);
        setFormData({ ...initialFormData });
        setFormErrors({});
        setIsFormOpen(true);
    };

    // ======================================================
    // OPEN EDIT FORM
    // ======================================================

    const handleOpenEdit = (room) => {
        setEditingRoom(room);
        setFormErrors({});
        setFormData({
            room_name: room.room_name || '',
            cinema_id: room.cinema_id || '',
            room_type: room.room_type || ''
        });
        setIsFormOpen(true);
    };

    // ======================================================
    // CLOSE FORM
    // ======================================================

    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingRoom(null);
        setFormErrors({});
    };

    // ======================================================
    // HANDLE FORM CHANGE
    // ======================================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
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

            if (editingRoom) {
                await api.put(`/api/rooms/${editingRoom.room_id}`, formData);
                setIsFormOpen(false);
                setEditingRoom(null);
                setFormErrors({});

                fetchRooms(pagination.page, search);

                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật phòng chiếu thành công.', 'success');
                }, 100);

            } else {
                await api.post('/api/rooms', formData);
                setIsFormOpen(false);
                setFormErrors({});

                fetchRooms(pagination.page, search);

                setTimeout(() => {
                    showAlert('Thành công', 'Thêm phòng chiếu thành công.', 'success');
                }, 100);
            }

        } catch (error) {
            console.error('SUBMIT ROOM ERROR:', error);

            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.message || 'Đã xảy ra lỗi.';

            if (backendField) {
                setFormErrors({ [backendField]: backendError });
            } else {
                showAlert('Lỗi', backendError, 'error');
            }

        } finally {
            setSubmitLoading(false);
        }
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
                    const newPage = rooms.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;

                    await fetchRooms(newPage, search);

                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa phòng chiếu thành công.', 'success');
                    }, 100);

                } catch (error) {
                    console.error('DELETE ROOM ERROR:', error);
                    closeAlert();

                    setTimeout(() => {
                        showAlert(
                            'Lỗi',
                            error.response?.data?.message || 'Không thể xóa phòng chiếu.',
                            'error'
                        );
                    }, 100);
                }
            },
            closeAlert
        );
    };

    // ======================================================
    // BULK CREATE HANDLERS 🆕
    // ======================================================

    const handleOpenBulkModal = () => {
        setBulkCinemaId('');
        setSelectedRoomTypes([]);
        setIsBulkModalOpen(true);
    };

    const handleToggleRoomType = (type) => {
        setSelectedRoomTypes(prev => {
            if (prev.includes(type)) {
                return prev.filter(t => t !== type);
            } else {
                return [...prev, type];
            }
        });
    };

    const handleSelectAllRoomTypes = () => {
        const allTypes = Object.keys(DEFAULT_ROOM_COUNT);
        if (selectedRoomTypes.length === allTypes.length) {
            setSelectedRoomTypes([]);
        } else {
            setSelectedRoomTypes(allTypes);
        }
    };

    const handleBulkCreate = async () => {
        if (!bulkCinemaId) {
            showAlert('Lỗi', 'Vui lòng chọn rạp chiếu.', 'error');
            return;
        }

        if (selectedRoomTypes.length === 0) {
            showAlert('Lỗi', 'Vui lòng chọn ít nhất một loại phòng.', 'error');
            return;
        }

        setBulkLoading(true);

        try {
            const res = await api.post('/api/rooms/bulk', {
                cinema_id: Number(bulkCinemaId),
                room_types: selectedRoomTypes
            });

            setIsBulkModalOpen(false);

            const createdCount = res.data?.data?.created || 0;
            const totalCount = res.data?.data?.total || 0;

            const successMessage = `Tạo thành công ${createdCount}/${totalCount} phòng. Ghế đã được tự động tạo cho từng phòng!`;

            setTimeout(() => {
                showAlert('Thành công', successMessage, 'success');
            }, 100);

            fetchRooms(1, search);

        } catch (error) {
            console.error('BULK CREATE ERROR:', error);
            showAlert('Lỗi', error.response?.data?.message || 'Không thể tạo phòng hàng loạt.', 'error');
        } finally {
            setBulkLoading(false);
        }
    };

    // ======================================================
    // HELPER: RENDER TYPE BADGE
    // ======================================================

    const renderTypeBadge = (type) => {
        const config = roomTypeConfig[type] || {
            bg: '#e2e8f0',
            color: '#475569',
            icon: <Monitor size={14} />
        };
        const displayName = roomTypeMap[type] || type;

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
                {config.icon}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
                    }}>
                        <Monitor size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-heading)' }}>
                            {row.room_name}
                        </div>
                        <small style={{
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px'
                        }}>
                            <Building2 size={13} /> Room ID: #{row.room_id}
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
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '700',
                        color: 'var(--text-heading)'
                    }}>
                        <Layout size={15} style={{ color: 'var(--silver-primary)' }} />
                        {row.cinema_name}
                    </div>
                    <div style={{
                        marginTop: '7px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '13px'
                    }}>
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
                        className="admin-action-btn edit-btn"
                        onClick={() => handleOpenEdit(row)}
                        title="Chỉnh sửa"
                    >
                        <Edit size={16} />
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
            label: 'Tên phòng',
            name: 'room_name',
            type: 'text',
            placeholder: 'Ví dụ: Phòng 01',
            required: true
        },
        {
            label: 'Loại phòng',
            name: 'room_type',
            type: 'select',
            required: true,
            options: [
                { label: '-- Chọn loại phòng --', value: '' },
                { label: 'Phòng 2D', value: '2D' },
                { label: 'Phòng 3D', value: '3D' },
                { label: 'Phòng IMAX', value: 'IMAX' },
                { label: 'Phòng VIP', value: 'VIP' }
            ]
        },
        {
            label: 'Rạp chiếu',
            name: 'cinema_id',
            type: 'select',
            required: true,
            options: [
                { label: '-- Chọn rạp --', value: '' },
                ...cinemas.map(cinema => ({
                    label: `${cinema.cinema_name} (${cinema.city})`,
                    value: cinema.cinema_id
                }))
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
                title="Quản lý phòng chiếu"
                subtitle="Quản lý toàn bộ phòng chiếu trong hệ thống"
                icon={<Monitor size={30} />}
                buttonText="Thêm phòng chiếu"
                onAdd={handleOpenAdd}
                searchValue={search}
                onSearchChange={setSearch}
                extraButton={
                    <button
                        className="admin-btn admin-btn-primary"
                        onClick={handleOpenBulkModal}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                            border: 'none'
                        }}
                    >
                        <Zap size={18} />
                        Tạo hàng loạt
                    </button>
                }
            >
                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <>
                        <AdminTable columns={columns} data={rooms} />
                        <AdminPagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </AdminPage>

            {/* ==================================================
                FORM MODAL
            ================================================== */}

            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title={editingRoom ? 'Cập nhật phòng chiếu' : 'Thêm phòng chiếu'}
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
                    submitText={editingRoom ? 'Lưu thay đổi' : 'Thêm phòng chiếu'}
                />
            </AdminModal>

            {/* ==================================================
                BULK CREATE MODAL 🆕
            ================================================== */}

            <AdminModal
                open={isBulkModalOpen}
                onClose={() => {
                    if (!bulkLoading) setIsBulkModalOpen(false);
                }}
                title="Tạo phòng hàng loạt"
                type="default"
                variant="custom"
                size="lg"
            >
                <div className="bulk-create-container">
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        Hệ thống sẽ tự động tạo số lượng phòng cho từng hạng và tự động tạo ghế tương ứng.
                    </p>

                    {/* Chọn rạp */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                            Chọn rạp <span style={{ color: 'red' }}>*</span>
                        </label>
                        <select
                            className="form-control"
                            value={bulkCinemaId}
                            onChange={(e) => setBulkCinemaId(e.target.value)}
                            disabled={bulkLoading}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                fontSize: '14px'
                            }}
                        >
                            <option value="">-- Chọn rạp --</option>
                            {cinemas.map(c => (
                                <option key={c.cinema_id} value={c.cinema_id}>
                                    {c.cinema_name} ({c.city})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Chọn hạng phòng */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <label style={{ fontWeight: '600' }}>
                                Chọn hạng phòng <span style={{ color: 'red' }}>*</span>
                            </label>
                            <button
                                type="button"
                                onClick={handleSelectAllRoomTypes}
                                disabled={bulkLoading}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary-color)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}
                            >
                                {selectedRoomTypes.length === Object.keys(DEFAULT_ROOM_COUNT).length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                            {Object.keys(DEFAULT_ROOM_COUNT).map(type => {
                                const config = roomTypeConfig[type];
                                const isChecked = selectedRoomTypes.includes(type);
                                const count = DEFAULT_ROOM_COUNT[type];

                                return (
                                    <div
                                        key={type}
                                        onClick={() => !bulkLoading && handleToggleRoomType(type)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            border: isChecked ? `2px solid ${config.color}` : '2px solid var(--border-color)',
                                            background: isChecked ? `${config.bg}66` : 'var(--bg-card)',
                                            cursor: bulkLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            opacity: bulkLoading ? 0.6 : 1
                                        }}
                                    >
                                        <span style={{ color: config.color, fontSize: '18px' }}>
                                            {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {config.icon}
                                            <span style={{ fontWeight: '600' }}>{roomTypeMap[type]}</span>
                                        </span>
                                        <span style={{
                                            background: '#e2e8f0',
                                            color: '#475569',
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            marginLeft: 'auto'
                                        }}>
                                            {count} phòng
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Thông tin tóm tắt */}
                    {selectedRoomTypes.length > 0 && (
                        <div style={{
                            padding: '14px 18px',
                            borderRadius: '10px',
                            background: 'var(--bg-secondary)',
                            marginTop: '16px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{ fontWeight: '600' }}>
                                    Tổng số phòng sẽ tạo:
                                </span>
                                <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                                    {selectedRoomTypes.reduce((sum, type) => sum + DEFAULT_ROOM_COUNT[type], 0)} phòng
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {selectedRoomTypes.map(type => (
                                    <span key={type} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {roomTypeMap[type]}: <strong>{DEFAULT_ROOM_COUNT[type]}</strong>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Nút hành động */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => setIsBulkModalOpen(false)}
                            disabled={bulkLoading}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            onClick={handleBulkCreate}
                            disabled={bulkLoading || !bulkCinemaId || selectedRoomTypes.length === 0}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                border: 'none'
                            }}
                        >
                            {bulkLoading ? (
                                <>
                                    <Loader2 size={18} className="spin-icon" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <Zap size={18} />
                                    Tạo {selectedRoomTypes.reduce((sum, type) => sum + DEFAULT_ROOM_COUNT[type], 0)} phòng
                                </>
                            )}
                        </button>
                    </div>
                </div>
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