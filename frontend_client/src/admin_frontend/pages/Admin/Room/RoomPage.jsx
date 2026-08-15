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
    Sparkles
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

// Map giá trị room_type sang tên hiển thị (đúng với CSDL)
const roomTypeMap = {
    '2D': 'Phòng 2D',
    '3D': 'Phòng 3D',
    '4DMAX': 'Phòng 4DMAX',
    'IMAX': 'Phòng IMAX',
    'VIP': 'Phòng VIP'
};

// Cấu hình màu sắc và icon cho từng loại phòng
const roomTypeConfig = {
    '2D': { bg: '#e0f2fe', color: '#0284c7', icon: <CircleDot size={14} /> },
    '3D': { bg: '#ede9fe', color: '#7c3aed', icon: <Layers3 size={14} /> },
    '4DMAX': { bg: '#fef3c7', color: '#d97706', icon: <Sparkles size={14} /> },
    'IMAX': { bg: '#dcfce7', color: '#16a34a', icon: <Tv2 size={14} /> },
    'VIP': { bg: '#fce4ec', color: '#e91e63', icon: <Crown size={14} /> }
};

// ==========================================================
// COMPONENT
// ==========================================================
const RoomPage = () => {
    // ------------------------------------------------------
    // STATES
    // ------------------------------------------------------
    const [rooms, setRooms] = useState([]);
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

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

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

    // ------------------------------------------------------
    // FETCH ROOMS
    // ------------------------------------------------------
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
                console.log('🛑 Request bị hủy');
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

    // ------------------------------------------------------
    // FETCH CINEMAS
    // ------------------------------------------------------
    const fetchCinemas = useCallback(async () => {
        try {
            const res = await api.get('/api/cinemas');
            const cinemaList = res.data?.data || [];
            setCinemas(cinemaList);
        } catch (error) {
            console.error('Fetch cinemas error:', error);
        }
    }, []);

    // ------------------------------------------------------
    // MOUNT
    // ------------------------------------------------------
    useEffect(() => {
        fetchRooms(1, '');
        fetchCinemas();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchRooms, fetchCinemas]);

    // ------------------------------------------------------
    // SEARCH DEBOUNCE
    // ------------------------------------------------------
    const prevSearchRef = useRef('');
    useEffect(() => {
        const currentSearch = search;
        const prevSearch = prevSearchRef.current;

        if (currentSearch === prevSearch) return;
        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchRooms(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchRooms]);

    const handlePageChange = (page) => {
        fetchRooms(page, search);
    };

    // ------------------------------------------------------
    // VALIDATE FORM
    // ------------------------------------------------------
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
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ------------------------------------------------------
    // HANDLE MODAL ACTIONS
    // ------------------------------------------------------
    const handleOpenAdd = () => {
        setEditingRoom(null);
        setFormData(initialFormData);
        setFormErrors({});
        setIsFormOpen(true);
    };

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

    // ------------------------------------------------------
    // HANDLE CLOSE FORM
    // ------------------------------------------------------
    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingRoom(null);
        setFormErrors({});
    };

    // ------------------------------------------------------
    // HANDLE CHANGE
    // ------------------------------------------------------
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ------------------------------------------------------
    // HANDLE SUBMIT
    // ------------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSubmitLoading(true);
            setFormErrors({});

            if (editingRoom) {
                await api.put(`/api/rooms/${editingRoom.room_id}`, formData);
                setIsFormOpen(false);
                fetchRooms(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật phòng chiếu thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/rooms', formData);
                setIsFormOpen(false);
                fetchRooms(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Thêm phòng chiếu thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            console.error('SUBMIT ROOM ERROR:', error);
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
                        showAlert('Lỗi', error.response?.data?.error || 'Không thể xóa phòng chiếu.', 'error');
                    }, 100);
                }
            },
            closeAlert
        );
    };

    // ------------------------------------------------------
    // HELPER: RENDER TYPE BADGE (hiển thị tên đầy đủ)
    // ------------------------------------------------------
    const renderTypeBadge = (type) => {
        const config = roomTypeConfig[type] || { bg: '#e2e8f0', color: '#475569', icon: <Monitor size={14} /> };
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

    // ------------------------------------------------------
    // TABLE COLUMNS
    // ------------------------------------------------------
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
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{row.room_name}</div>
                        <small style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#0f172a' }}>
                        <Layout size={15} /> {row.cinema_name}
                    </div>
                    <div style={{ marginTop: '7px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                        <MapPin size={13} /> {row.city}
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
                        className="admin-action-btn edit-btn"
                        onClick={() => handleOpenEdit(row)}
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() => handleDelete(row)}
                    >
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
            label: 'Tên phòng',
            name: 'room_name',
            type: 'text',
            placeholder: 'Ví dụ: Phòng 01'
        },
        {
            label: 'Loại phòng',
            name: 'room_type',
            type: 'select',
            options: [
                { label: '-- Chọn loại phòng --', value: '' },
                { label: 'Phòng 2D', value: '2D' },
                { label: 'Phòng 3D', value: '3D' },
                { label: 'Phòng 4DMAX', value: '4DMAX' },
                { label: 'Phòng IMAX', value: 'IMAX' },
                { label: 'Phòng VIP', value: 'VIP' }
            ]
        },
        {
            label: 'Rạp chiếu',
            name: 'cinema_id',
            type: 'select',
            options: [
                { label: '-- Chọn rạp --', value: '' },
                ...cinemas.map(cinema => ({
                    label: `${cinema.cinema_name} (${cinema.city})`,
                    value: cinema.cinema_id
                }))
            ]
        }
    ];

    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------
    return (
        <>
            <AdminPage
                title="Quản lý phòng chiếu"
                subtitle="Quản lý toàn bộ phòng chiếu trong hệ thống"
                icon={<Monitor size={30} />}
                buttonText="Thêm phòng chiếu"
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
                ALERT / CONFIRM MODAL
            ================================================== */}
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

export default RoomPage;