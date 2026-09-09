import React, {
    useEffect,
    useState,
    useRef,
    useCallback
} from 'react';

import api from '../../../../api/api';

import {
    Users,
    Eye,
    Trash2,
    Loader2,
    X,
    Check,
    AlertCircle
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminPagination from '../../../components/AdminPagination';
import AdminModal from '../../../components/AdminModal';

import '../../../styles/UserPage.css';


// ==========================================================
// AVATAR URL
// ==========================================================

const getAvatarUrl = (avatar) => {
    if (!avatar) return '';

    if (
        avatar.startsWith('http://') ||
        avatar.startsWith('https://')
    ) {
        return avatar;
    }

    return `https://api.quangdungcinema.id.vn/uploads/avatars/${avatar}`;
};


// ==========================================================
// COMPONENT
// ==========================================================

const UserPage = () => {

    // ======================================================
    // STATE
    // ======================================================

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });


    // ======================================================
    // REFS
    // ======================================================

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);
    const prevSearchRef = useRef('');


    // ======================================================
    // HELPERS
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
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    // ======================================================
    // FETCH USERS
    // ======================================================

    const fetchUsers = useCallback(
        async (page = 1, keyword = '') => {
            if (isFetching.current) return;

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;
            isFetching.current = true;
            setLoading(true);

            try {
                const res = await api.get('/api/users/paginated', {
                    params: {
                        page,
                        limit: 20,
                        search: keyword.trim()
                    },
                    signal: controller.signal
                });

                setUsers(res.data?.data || []);
                setPagination(
                    res.data?.pagination || {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 1,
                        hasPreviousPage: false,
                        hasNextPage: false
                    }
                );

            } catch (error) {
                if (
                    error.name === 'AbortError' ||
                    error.code === 'ERR_CANCELED'
                ) {
                    return;
                }

                console.error('FETCH USERS ERROR:', error);
                setUsers([]);
                showAlert('Lỗi', 'Không thể tải danh sách người dùng.', 'error');
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
    // EFFECTS
    // ======================================================

    useEffect(() => {
        fetchUsers(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchUsers]);

    useEffect(() => {
        const currentSearch = search;
        const previousSearch = prevSearchRef.current;

        if (currentSearch === previousSearch) return;

        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchUsers(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchUsers]);


    // ======================================================
    // HANDLERS
    // ======================================================

    const handlePageChange = (page) => {
        fetchUsers(page, search);
    };

    const handleOpenView = (user) => {
        setViewingUser(user);
        setIsViewOpen(true);
    };

    const handleCloseView = () => {
        setIsViewOpen(false);
        setViewingUser(null);
    };

    const handleDelete = (user) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${user.username}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/users/${user.user_id}`);
                    closeAlert();

                    const currentPage = pagination.page;
                    const newPage =
                        users.length === 1 && currentPage > 1
                            ? currentPage - 1
                            : currentPage;

                    await fetchUsers(newPage, search);

                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa người dùng thành công.', 'success');
                    }, 100);

                } catch (error) {
                    console.error('DELETE USER ERROR:', error);
                    closeAlert();

                    setTimeout(() => {
                        showAlert(
                            'Lỗi',
                            error.response?.data?.message ||
                            'Không thể xóa người dùng.',
                            'error'
                        );
                    }, 100);
                }
            },
            closeAlert
        );
    };


    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [
        {
            title: 'ID',
            key: 'user_id',
            render: (row) => `#${row.user_id}`
        },
        {
            title: 'Avatar',
            key: 'user_avatar',
            render: (row) => {
                if (!row.user_avatar) {
                    return <span className="user-avatar-placeholder">—</span>;
                }

                return (
                    <img
                        src={getAvatarUrl(row.user_avatar)}
                        alt="avatar"
                        className="user-avatar-table"
                    />
                );
            }
        },
        {
            title: 'Username',
            key: 'username'
        },
        {
            title: 'Họ tên',
            key: 'full_name'
        },
        {
            title: 'Email',
            key: 'email'
        },
        {
            title: 'Số điện thoại',
            key: 'phone'
        },
        {
            title: 'Điểm',
            key: 'points'
        },
        {
            title: 'Vai trò',
            key: 'role',
            render: (row) => (
                <span className={`user-role-badge ${row.role}`}>
                    {row.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                </span>
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (row) => (
                <span className={`user-status-badge ${row.status}`}>
                    {row.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                </span>
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (row) => (
                <div className="user-actions">
                    <button
                        type="button"
                        className="user-action-btn view-btn"
                        onClick={() => handleOpenView(row)}
                        title="Xem chi tiết"
                    >
                        <Eye size={16} />
                    </button>

                    <button
                        type="button"
                        className="user-action-btn delete-btn"
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
    // RENDER VIEW MODAL CONTENT
    // ======================================================

    const renderViewContent = () => {
        if (!viewingUser) return null;

        const fields = [
            { label: 'Username', value: viewingUser.username },
            { label: 'Họ tên', value: viewingUser.full_name },
            { label: 'Email', value: viewingUser.email },
            { label: 'Số điện thoại', value: viewingUser.phone },
            { label: 'Địa chỉ', value: viewingUser.address || '—' },
            {
                label: 'Vai trò',
                value: viewingUser.role,
                render: (val) => (
                    <span className={`user-role-badge ${val}`}>
                        {val === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                    </span>
                )
            },
            {
                label: 'Trạng thái',
                value: viewingUser.status,
                render: (val) => (
                    <span className={`user-status-badge ${val}`}>
                        {val === 'active' ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                )
            },
            { label: 'Điểm tích lũy', value: viewingUser.points || 0 },
            { label: 'Ngày tạo', value: formatDate(viewingUser.created_at) },
            { label: 'Lần đăng nhập cuối', value: formatDate(viewingUser.last_login_at) || 'Chưa đăng nhập' }
        ];

        return (
            <div className="user-view-content">
                {/* Avatar */}
                {viewingUser.user_avatar && (
                    <div className="user-view-avatar-wrapper">
                        <img
                            src={getAvatarUrl(viewingUser.user_avatar)}
                            alt="avatar"
                            className="user-view-avatar"
                        />
                    </div>
                )}

                {/* Info Grid */}
                <div className="user-view-grid">
                    {fields.map((field) => (
                        <div
                            key={field.label}
                            className={`user-view-item ${
                                field.label === 'Địa chỉ' ? 'full-width' : ''
                            }`}
                        >
                            <label className="user-view-label">{field.label}</label>
                            <div className="user-view-value">
                                {field.render ? field.render(field.value) : field.value}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };


    // ======================================================
    // RENDER
    // ======================================================

    return (
        <>
            {/* ==================================================
                ADMIN PAGE
            ================================================== */}

            <AdminPage
                title="Quản lý người dùng"
                subtitle="Quản lý toàn bộ tài khoản hệ thống"
                icon={<Users size={30} />}
                searchValue={search}
                onSearchChange={setSearch}
            >
                {loading ? (
                    <div className="user-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <>
                        <AdminTable columns={columns} data={users} />
                        <AdminPagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </AdminPage>


            {/* ==================================================
                VIEW MODAL
            ================================================== */}

            <AdminModal
                open={isViewOpen}
                onClose={handleCloseView}
                title="👤 Thông tin người dùng"
                type="default"
                size="lg"
                confirmText="Đóng"
                onConfirm={handleCloseView}
                showCancel={false}
            >
                {renderViewContent()}
            </AdminModal>


            {/* ==================================================
                ALERT / CONFIRM MODAL
            ================================================== */}

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                variant={alertModal.onConfirm ? 'confirm' : 'alert'}
                size="sm"
                onConfirm={alertModal.onConfirm || closeAlert}
                onCancel={alertModal.onCancel || closeAlert}
                confirmText="Xác nhận"
                cancelText="Hủy"
            >
                <div className="user-alert-content">
                    <p>{alertModal.message}</p>
                </div>
            </AdminModal>
        </>
    );
};


export default UserPage;