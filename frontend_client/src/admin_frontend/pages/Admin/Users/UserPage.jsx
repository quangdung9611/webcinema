import React, {
    useEffect,
    useState,
    useRef,
    useCallback
} from 'react';

import api from '../../../../api/api';

import {
    Users,
    Edit,
    Trash2,
    Loader2
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';


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
// INITIAL FORM DATA
// ==========================================================

const initialFormData = {
    username: '',
    full_name: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    role: 'customer'
};


// ==========================================================
// COMPONENT
// ==========================================================

const UserPage = () => {

    // ======================================================
    // DATA
    // ======================================================

    const [users, setUsers] = useState([]);

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

    const [editingUser, setEditingUser] = useState(null);

    const [formData, setFormData] = useState(
        initialFormData
    );

    const [userAvatarFile, setUserAvatarFile] = useState(null);

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
    // FETCH USERS
    // ======================================================

    const fetchUsers = useCallback(
        async (
            page = 1,
            keyword = ''
        ) => {

            // ----------------------------------------------
            // CHỐNG FETCH TRÙNG
            // ----------------------------------------------

            if (isFetching.current) {
                console.log(
                    '⏳ Đang fetch, bỏ qua lần gọi mới'
                );

                return;
            }


            // ----------------------------------------------
            // HỦY REQUEST CŨ
            // ----------------------------------------------

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }


            const controller =
                new AbortController();

            abortControllerRef.current =
                controller;

            isFetching.current = true;

            setLoading(true);


            try {

                // ------------------------------------------
                // API
                // ------------------------------------------

                const res = await api.get(
                    '/api/users/paginated',
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
                // USERS DATA
                // ------------------------------------------

                const usersData =
                    Array.isArray(
                        res.data?.data
                    )
                        ? res.data.data
                        : [];


                // ------------------------------------------
                // PAGINATION DATA
                // ------------------------------------------

                const paginationData =
                    res.data?.pagination || {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 1,
                        hasPreviousPage: false,
                        hasNextPage: false
                    };


                setUsers(usersData);

                setPagination(
                    paginationData
                );

            } catch (error) {

                // ------------------------------------------
                // REQUEST BỊ HỦY
                // ------------------------------------------

                if (
                    error.name === 'AbortError' ||
                    error.code === 'ERR_CANCELED'
                ) {
                    console.log(
                        '🛑 Request users bị hủy'
                    );

                    return;
                }


                // ------------------------------------------
                // ERROR
                // ------------------------------------------

                console.error(
                    'FETCH USERS ERROR:',
                    error
                );


                setUsers([]);

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
                    'Không thể tải danh sách người dùng.',
                    'error'
                );

            } finally {

                setLoading(false);

                isFetching.current = false;


                if (
                    abortControllerRef.current ===
                    controller
                ) {
                    abortControllerRef.current =
                        null;
                }
            }
        },
        []
    );


    // ======================================================
    // INITIAL FETCH
    // ======================================================

    useEffect(() => {

        fetchUsers(1, '');

        return () => {

            if (
                abortControllerRef.current
            ) {
                abortControllerRef.current.abort();
            }
        };

    }, [fetchUsers]);


    // ======================================================
    // SEARCH DEBOUNCE
    // ======================================================

    const prevSearchRef =
        useRef('');


    useEffect(() => {

        const currentSearch = search;

        const previousSearch =
            prevSearchRef.current;


        if (
            currentSearch ===
            previousSearch
        ) {
            return;
        }


        prevSearchRef.current =
            currentSearch;


        const timer = setTimeout(() => {

            fetchUsers(
                1,
                currentSearch
            );

        }, 400);


        return () => {
            clearTimeout(timer);
        };

    }, [search, fetchUsers]);


    // ======================================================
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (page) => {

        fetchUsers(
            page,
            search
        );
    };


    // ======================================================
    // VALIDATE FORM
    // ======================================================

    const validateForm = () => {

        const errors = {};


        // ----------------------------------------------
        // USERNAME
        // ----------------------------------------------

        if (
            !formData.username.trim()
        ) {

            errors.username =
                'Vui lòng nhập username';

        } else if (
            formData.username.trim().length < 6
        ) {

            errors.username =
                'Username phải từ 6 ký tự trở lên';
        }


        // ----------------------------------------------
        // FULL NAME
        // ----------------------------------------------

        if (
            !formData.full_name.trim()
        ) {

            errors.full_name =
                'Vui lòng nhập họ tên';

        } else if (
            formData.full_name.trim().length < 8
        ) {

            errors.full_name =
                'Họ tên phải từ 8 ký tự trở lên';
        }


        // ----------------------------------------------
        // EMAIL
        // ----------------------------------------------

        if (
            !formData.email.trim()
        ) {

            errors.email =
                'Vui lòng nhập email';

        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formData.email
            )
        ) {

            errors.email =
                'Email không đúng định dạng';
        }


        // ----------------------------------------------
        // PHONE
        // ----------------------------------------------

        if (
            !formData.phone.trim()
        ) {

            errors.phone =
                'Vui lòng nhập số điện thoại';

        } else if (
            !/^[0-9]{10}$/.test(
                formData.phone
            )
        ) {

            errors.phone =
                'Số điện thoại phải đúng 10 số';
        }


        // ----------------------------------------------
        // PASSWORD
        // ----------------------------------------------

        if (
            !editingUser &&
            !formData.password.trim()
        ) {

            errors.password =
                'Vui lòng nhập mật khẩu';

        } else if (
            formData.password &&
            !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(
                formData.password
            )
        ) {

            errors.password =
                'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt';
        }


        // ----------------------------------------------
        // ADDRESS
        // ----------------------------------------------

        if (
            !formData.address.trim()
        ) {

            errors.address =
                'Vui lòng nhập địa chỉ';

        } else if (
            formData.address.trim().length < 5
        ) {

            errors.address =
                'Địa chỉ quá ngắn';
        }


        return errors;
    };


    // ======================================================
    // OPEN ADD FORM
    // ======================================================

    const handleOpenAdd = () => {

        setEditingUser(null);

        setFormData({
            ...initialFormData
        });

        setUserAvatarFile(null);

        setFormErrors({});

        setIsFormOpen(true);
    };


    // ======================================================
    // OPEN EDIT FORM
    // ======================================================

    const handleOpenEdit = (user) => {

        setEditingUser(user);

        setFormErrors({});

        setUserAvatarFile(null);


        setFormData({

            username:
                user.username || '',

            full_name:
                user.full_name || '',

            phone:
                user.phone || '',

            address:
                user.address || '',

            email:
                user.email || '',

            password:
                '',

            role:
                user.role || 'customer'
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

        setEditingUser(null);

        setFormErrors({});

        setUserAvatarFile(null);
    };


    // ======================================================
    // HANDLE FORM CHANGE
    // ======================================================

    const handleChange = (e) => {

        const {
            name,
            value,
            files
        } = e.target;


        // ----------------------------------------------
        // AVATAR
        // ----------------------------------------------

        if (
            name === 'user_avatar'
        ) {

            setUserAvatarFile(
                files?.[0] || null
            );

            return;
        }


        // ----------------------------------------------
        // FORM DATA
        // ----------------------------------------------

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));


        // ----------------------------------------------
        // CLEAR ERROR
        // ----------------------------------------------

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


        // ----------------------------------------------
        // VALIDATE
        // ----------------------------------------------

        const errors =
            validateForm();


        if (
            Object.keys(errors).length > 0
        ) {

            setFormErrors(errors);

            return;
        }


        try {

            setSubmitLoading(true);

            setFormErrors({});


            // ------------------------------------------
            // FORM DATA
            // ------------------------------------------

            const submitData =
                new FormData();


            Object.entries(
                formData
            ).forEach(
                ([key, value]) => {

                    // Không gửi password rỗng
                    // khi update

                    if (
                        key === 'password' &&
                        editingUser &&
                        !value
                    ) {
                        return;
                    }


                    submitData.append(
                        key,
                        value
                    );
                }
            );


            // ------------------------------------------
            // AVATAR
            // ------------------------------------------

            if (
                userAvatarFile
            ) {

                submitData.append(
                    'user_avatar',
                    userAvatarFile
                );
            }


            // ------------------------------------------
            // UPDATE
            // ------------------------------------------

            if (editingUser) {

                await api.put(
                    `/api/users/${editingUser.user_id}`,
                    submitData,
                    {
                        headers: {
                            'Content-Type':
                                'multipart/form-data'
                        }
                    }
                );


                // Đóng form trước
                setIsFormOpen(false);

                setEditingUser(null);

                setUserAvatarFile(null);

                setFormErrors({});


                // Reload
                fetchUsers(
                    pagination.page,
                    search
                );


                // Success modal
                setTimeout(() => {

                    showAlert(
                        'Thành công',
                        'Cập nhật người dùng thành công.',
                        'success'
                    );

                }, 100);


            // ------------------------------------------
            // CREATE
            // ------------------------------------------

            } else {

                await api.post(
                    '/api/users',
                    submitData,
                    {
                        headers: {
                            'Content-Type':
                                'multipart/form-data'
                        }
                    }
                );


                setIsFormOpen(false);

                setEditingUser(null);

                setUserAvatarFile(null);

                setFormErrors({});


                fetchUsers(
                    pagination.page,
                    search
                );


                setTimeout(() => {

                    showAlert(
                        'Thành công',
                        'Thêm người dùng thành công.',
                        'success'
                    );

                }, 100);
            }

        } catch (error) {

            console.error(
                'SUBMIT USER ERROR:',
                error
            );


            // ------------------------------------------
            // BACKEND FIELD ERROR
            // ------------------------------------------

            const backendField =
                error.response?.data?.field;


            const backendError =
                error.response?.data?.error;


            if (
                backendField
            ) {

                setFormErrors({
                    [backendField]:
                        backendError ||
                        'Dữ liệu không hợp lệ.'
                });

                return;
            }


            // ------------------------------------------
            // GENERAL ERROR
            // ------------------------------------------

            showAlert(
                'Lỗi',
                backendError ||
                    error.response?.data?.message ||
                    'Đã xảy ra lỗi.',
                'error'
            );

        } finally {

            setSubmitLoading(false);
        }
    };


    // ======================================================
    // DELETE USER
    // ======================================================

    const handleDelete = (user) => {

        showAlert(
            'Xác nhận xóa',

            `Bạn có chắc muốn xóa "${user.username}"?`,

            'warning',

            // ==========================================
            // CONFIRM
            // ==========================================

            async () => {

                try {

                    await api.delete(
                        `/api/users/${user.user_id}`
                    );


                    // ----------------------------------
                    // ĐÓNG CONFIRM
                    // ----------------------------------

                    closeAlert();


                    // ----------------------------------
                    // TÍNH PAGE MỚI
                    // ----------------------------------

                    const currentPage =
                        pagination.page;


                    const newPage =
                        users.length === 1 &&
                        currentPage > 1
                            ? currentPage - 1
                            : currentPage;


                    // ----------------------------------
                    // RELOAD DATA
                    // ----------------------------------

                    await fetchUsers(
                        newPage,
                        search
                    );


                    // ----------------------------------
                    // SUCCESS
                    // ----------------------------------

                    setTimeout(() => {

                        showAlert(
                            'Thành công',
                            'Xóa người dùng thành công.',
                            'success'
                        );

                    }, 100);


                } catch (error) {

                    console.error(
                        'DELETE USER ERROR:',
                        error
                    );


                    closeAlert();


                    setTimeout(() => {

                        showAlert(
                            'Lỗi',

                            error.response?.data?.error ||
                                error.response?.data?.message ||
                                'Không thể xóa người dùng.',

                            'error'
                        );

                    }, 100);
                }
            },

            // ==========================================
            // CANCEL
            // ==========================================

            closeAlert
        );
    };


    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [

        // ----------------------------------------------
        // ID
        // ----------------------------------------------

        {
            title: 'ID',

            key: 'user_id',

            render: (row) =>
                `#${row.user_id}`
        },


        // ----------------------------------------------
        // AVATAR
        // ----------------------------------------------

        {
            title: 'Avatar',

            key: 'user_avatar',

            render: (row) => {

                if (
                    !row.user_avatar
                ) {

                    return (
                        <span
                            style={{
                                color: '#888'
                            }}
                        >
                            —
                        </span>
                    );
                }


                const avatarSrc =
                    getAvatarUrl(
                        row.user_avatar
                    );


                return (
                    <img
                        src={avatarSrc}
                        alt="avatar"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                        }}
                    />
                );
            }
        },


        // ----------------------------------------------
        // USERNAME
        // ----------------------------------------------

        {
            title: 'Username',
            key: 'username'
        },


        // ----------------------------------------------
        // FULL NAME
        // ----------------------------------------------

        {
            title: 'Họ tên',
            key: 'full_name'
        },


        // ----------------------------------------------
        // EMAIL
        // ----------------------------------------------

        {
            title: 'Email',
            key: 'email'
        },


        // ----------------------------------------------
        // PHONE
        // ----------------------------------------------

        {
            title: 'Số điện thoại',
            key: 'phone'
        },


        // ----------------------------------------------
        // POINTS
        // ----------------------------------------------

        {
            title: 'Điểm',
            key: 'points'
        },


        // ----------------------------------------------
        // ROLE
        // ----------------------------------------------

        {
            title: 'Vai trò',

            key: 'role',

            render: (row) => (
                <span
                    className={`status-badge ${row.role}`}
                >
                    {row.role}
                </span>
            )
        },


        // ----------------------------------------------
        // ACTIONS
        // ----------------------------------------------

        {
            title: 'Thao tác',

            key: 'actions',

            render: (row) => (
                <div className="admin-table-actions">

                    <button
                        type="button"
                        className="admin-action-btn edit-btn"
                        onClick={() =>
                            handleOpenEdit(row)
                        }
                        title="Chỉnh sửa"
                    >
                        <Edit size={16} />
                    </button>


                    <button
                        type="button"
                        className="admin-action-btn delete-btn"
                        onClick={() =>
                            handleDelete(row)
                        }
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
            label: 'Username',

            name: 'username',

            type: 'text',

            placeholder:
                'Nhập username',

            required: true
        },


        {
            label: 'Họ tên',

            name: 'full_name',

            type: 'text',

            placeholder:
                'Nhập họ tên',

            required: true
        },


        {
            label: 'Email',

            name: 'email',

            type: 'email',

            placeholder:
                'example@gmail.com',

            required: true
        },


        {
            label: 'Số điện thoại',

            name: 'phone',

            type: 'text',

            placeholder:
                '09xxxxxxxx',

            required: true
        },


        {
            label: 'Mật khẩu',

            name: 'password',

            type: 'password',

            placeholder:
                editingUser
                    ? 'Để trống nếu không đổi mật khẩu'
                    : 'Nhập mật khẩu',

            required: !editingUser
        },


        {
            label: 'Vai trò',

            name: 'role',

            type: 'select',

            required: true,

            options: [

                {
                    label: 'Khách hàng',
                    value: 'customer'
                },

                {
                    label: 'Quản trị viên',
                    value: 'admin'
                }

            ]
        },


        {
            label: 'Địa chỉ',

            name: 'address',

            type: 'textarea',

            placeholder:
                'Nhập địa chỉ',

            required: true
        },


        {
            label: 'Avatar',

            name: 'user_avatar',

            type: 'file'
        }
    ];


    // ======================================================
    // FILE PREVIEWS
    // ======================================================

    const filePreviews = {};


    if (
        editingUser &&
        editingUser.user_avatar
    ) {

        filePreviews.user_avatar = {

            url: getAvatarUrl(
                editingUser.user_avatar
            ),

            name:
                editingUser.user_avatar
        };
    }


    // ======================================================
    // ALERT VARIANT
    // ======================================================

    const alertVariant =
        alertModal.onConfirm
            ? 'confirm'
            : 'alert';


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

                icon={
                    <Users size={30} />
                }

                buttonText="Thêm User"

                onAdd={handleOpenAdd}

                searchValue={search}

                onSearchChange={setSearch}
            >

                {/* ==============================================
                    LOADING
                ============================================== */}

                {loading ? (

                    <div className="admin-loading">

                        <Loader2
                            size={32}
                            className="spin-icon"
                        />

                        <span>
                            Đang tải dữ liệu...
                        </span>

                    </div>

                ) : (

                    <>

                        {/* ======================================
                            TABLE
                        ====================================== */}

                        <AdminTable
                            columns={columns}
                            data={users}
                        />


                        {/* ======================================
                            PAGINATION
                        ====================================== */}

                        <AdminPagination

                            currentPage={
                                pagination.page
                            }

                            totalPages={
                                pagination.totalPages
                            }

                            onPageChange={
                                handlePageChange
                            }
                        />

                    </>
                )}

            </AdminPage>


            {/* ==================================================
                FORM MODAL
            ================================================== */}

            <AdminModal

                open={isFormOpen}

                onClose={
                    handleCloseForm
                }

                title={
                    editingUser
                        ? 'Cập nhật người dùng'
                        : 'Thêm người dùng'
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
                        editingUser
                            ? 'Lưu thay đổi'
                            : 'Thêm người dùng'
                    }

                    filePreviews={
                        filePreviews
                    }
                />

            </AdminModal>


            {/* ==================================================
                ALERT / CONFIRM MODAL
            ================================================== */}

            <AdminModal

                open={
                    alertModal.open
                }

                onClose={
                    closeAlert
                }

                title={
                    alertModal.title
                }

                type={
                    alertModal.type
                }

                variant={
                    alertVariant
                }

                size="sm"

                onConfirm={
                    alertModal.onConfirm ||
                    closeAlert
                }

                onCancel={
                    alertModal.onCancel ||
                    closeAlert
                }

                confirmText="Xác nhận"

                cancelText="Hủy"
            >

                <div className="admin-alert-content">

                    <p>
                        {alertModal.message}
                    </p>

                </div>

            </AdminModal>

        </>
    );
};


export default UserPage;