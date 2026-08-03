
import React, { useEffect, useState } from 'react';
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
// INITIAL FORM
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

    const [currentPage, setCurrentPage] = useState(1);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });


    // ======================================================
    // FORM
    // ======================================================

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingUser, setEditingUser] = useState(null);

    const [formData, setFormData] = useState(initialFormData);

    const [userAvatarFile, setUserAvatarFile] = useState(null);

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
            open: false
        }));

    };


    // ======================================================
    // FETCH USERS
    // SERVER-SIDE SEARCH + SERVER-SIDE PAGINATION
    // ======================================================

    const fetchUsers = async (
        page = currentPage,
        keyword = search
    ) => {

        setLoading(true);

        try {

            const res = await api.get('/api/users', {

                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                }

            });


            /*
             * API:
             *
             * {
             *     success: true,
             *     data: {
             *         data: [...users],
             *         pagination: {
             *             page,
             *             limit,
             *             total,
             *             totalPages,
             *             hasPreviousPage,
             *             hasNextPage
             *         }
             *     }
             * }
             */

            const responseData = res.data?.data;

            const usersData =
                responseData?.data || [];

            const paginationData =
                responseData?.pagination || {
                    page,
                    limit: 20,
                    total: 0,
                    totalPages: 1,
                    hasPreviousPage: false,
                    hasNextPage: false
                };


            // ==================================================
            // USERS
            // ==================================================

            setUsers(
                Array.isArray(usersData)
                    ? usersData
                    : []
            );


            // ==================================================
            // PAGINATION
            // ==================================================

            setPagination(paginationData);


            // Đồng bộ page thực tế từ backend
            setCurrentPage(
                paginationData.page || page
            );


        } catch (error) {

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
                hasNextPage: false,
                hasPreviousPage: false
            });


            showAlert(
                'Lỗi',
                'Không thể tải danh sách người dùng.',
                'error'
            );


        } finally {

            setLoading(false);

        }

    };


    // ======================================================
    // INITIAL LOAD
    // ======================================================

    useEffect(() => {

        fetchUsers(1, '');

        // Chỉ chạy một lần khi component mount
        // eslint-disable-next-line react-hooks/exhaustive-deps

    }, []);


    // ======================================================
    // SEARCH
    // BACKEND SEARCH
    // ======================================================

    useEffect(() => {

        const timer = setTimeout(() => {

            setCurrentPage(1);

            fetchUsers(1, search);

        }, 400);


        return () => clearTimeout(timer);

        // eslint-disable-next-line react-hooks/exhaustive-deps

    }, [search]);


    // ======================================================
    // PAGE CHANGE
    // ======================================================

    const handlePageChange = (page) => {

        setCurrentPage(page);

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


        // ==================================================
        // USERNAME
        // ==================================================

        if (!formData.username.trim()) {

            errors.username =
                'Vui lòng nhập username';

        } else if (
            formData.username.trim().length < 6
        ) {

            errors.username =
                'Username phải từ 6 ký tự trở lên';

        }


        // ==================================================
        // FULL NAME
        // ==================================================

        if (!formData.full_name.trim()) {

            errors.full_name =
                'Vui lòng nhập họ tên';

        } else if (
            formData.full_name.trim().length < 8
        ) {

            errors.full_name =
                'Họ tên phải từ 8 ký tự trở lên';

        }


        // ==================================================
        // EMAIL
        // ==================================================

        if (!formData.email.trim()) {

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


        // ==================================================
        // PHONE
        // ==================================================

        if (!formData.phone.trim()) {

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


        // ==================================================
        // PASSWORD
        // ==================================================

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


        // ==================================================
        // ADDRESS
        // ==================================================

        if (!formData.address.trim()) {

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
    // OPEN ADD
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
    // OPEN EDIT
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

            password: '',

            role:
                user.role || 'customer'

        });


        setIsFormOpen(true);

    };


    // ======================================================
    // HANDLE CHANGE
    // ======================================================

    const handleChange = (e) => {

        const {
            name,
            value,
            files
        } = e.target;


        // ==================================================
        // AVATAR
        // ==================================================

        if (name === 'user_avatar') {

            setUserAvatarFile(
                files?.[0] || null
            );

            return;

        }


        // ==================================================
        // FORM DATA
        // ==================================================

        setFormData(prev => ({

            ...prev,

            [name]: value

        }));


        // ==================================================
        // CLEAR FIELD ERROR
        // ==================================================

        setFormErrors(prev => ({

            ...prev,

            [name]: ''

        }));

    };


    // ======================================================
    // SUBMIT
    // ======================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        // ==================================================
        // VALIDATE
        // ==================================================

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


            const submitData =
                new FormData();


            // ==================================================
            // FORM DATA
            // ==================================================

            Object.entries(formData).forEach(
                ([key, value]) => {

                    /*
                     * Khi edit:
                     * password rỗng thì không gửi.
                     */

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


            // ==================================================
            // AVATAR
            // ==================================================

            if (userAvatarFile) {

                submitData.append(
                    'user_avatar',
                    userAvatarFile
                );

            }


            // ==================================================
            // UPDATE
            // ==================================================

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


                showAlert(
                    'Thành công',
                    'Cập nhật người dùng thành công.',
                    'success'
                );

            }


            // ==================================================
            // CREATE
            // ==================================================

            else {

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


                showAlert(
                    'Thành công',
                    'Thêm người dùng thành công.',
                    'success'
                );

            }


            // ==================================================
            // CLOSE FORM
            // ==================================================

            setIsFormOpen(false);


            // ==================================================
            // RELOAD CURRENT PAGE
            // ==================================================

            fetchUsers(
                currentPage,
                search
            );


        } catch (error) {

            console.error(
                'SUBMIT USER ERROR:',
                error
            );


            const backendField =
                error.response?.data?.field;

            const backendError =
                error.response?.data?.error;


            // ==================================================
            // BACKEND FIELD ERROR
            // ==================================================

            if (backendField) {

                setFormErrors({

                    [backendField]:
                        backendError

                });

                return;

            }


            // ==================================================
            // GENERAL ERROR
            // ==================================================

            showAlert(
                'Lỗi',
                backendError ||
                'Đã xảy ra lỗi.',
                'error'
            );

        } finally {

            setSubmitLoading(false);

        }

    };


    // ======================================================
    // DELETE
    // ======================================================

    const handleDelete = (user) => {

        showAlert(

            'Xác nhận xóa',

            `Bạn có chắc muốn xóa "${user.username}"?`,

            'warning',

            async () => {

                try {

                    await api.delete(
                        `/api/users/${user.user_id}`
                    );


                    closeAlert();


                    // ==================================================
                    // PAGE AFTER DELETE
                    // ==================================================

                    const newPage =
                        users.length === 1 &&
                        currentPage > 1
                            ? currentPage - 1
                            : currentPage;


                    setCurrentPage(
                        newPage
                    );


                    // ==================================================
                    // RELOAD
                    // ==================================================

                    fetchUsers(
                        newPage,
                        search
                    );


                    showAlert(
                        'Thành công',
                        'Xóa người dùng thành công.',
                        'success'
                    );


                } catch (error) {

                    console.error(
                        'DELETE USER ERROR:',
                        error
                    );


                    showAlert(
                        'Lỗi',
                        error.response?.data?.error ||
                        'Không thể xóa người dùng.',
                        'error'
                    );

                }

            },

            closeAlert

        );

    };


    // ======================================================
    // TABLE COLUMNS
    // ======================================================

    const columns = [

        // ==================================================
        // ID
        // ==================================================

        {
            title: 'ID',

            key: 'user_id',

            render: (row) =>
                `#${row.user_id}`
        },


        // ==================================================
        // AVATAR
        // ==================================================

        {
            title: 'Avatar',

            key: 'user_avatar',

            render: (row) => {

                if (!row.user_avatar) {

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


        // ==================================================
        // USERNAME
        // ==================================================

        {
            title: 'Username',
            key: 'username'
        },


        // ==================================================
        // FULL NAME
        // ==================================================

        {
            title: 'Họ tên',
            key: 'full_name'
        },


        // ==================================================
        // EMAIL
        // ==================================================

        {
            title: 'Email',
            key: 'email'
        },


        // ==================================================
        // PHONE
        // ==================================================

        {
            title: 'Số điện thoại',
            key: 'phone'
        },


        // ==================================================
        // POINTS
        // ==================================================

        {
            title: 'Điểm',
            key: 'points'
        },


        // ==================================================
        // ROLE
        // ==================================================

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


        // ==================================================
        // ACTIONS
        // ==================================================

        {
            title: 'Thao tác',

            key: 'actions',

            render: (row) => (

                <div className="admin-table-actions">

                    <button
                        className="admin-action-btn edit-btn"
                        onClick={() =>
                            handleOpenEdit(row)
                        }
                    >
                        <Edit size={16} />
                    </button>


                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() =>
                            handleDelete(row)
                        }
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
            placeholder: 'Nhập username'
        },


        {
            label: 'Họ tên',
            name: 'full_name',
            type: 'text',
            placeholder: 'Nhập họ tên'
        },


        {
            label: 'Email',
            name: 'email',
            type: 'email',
            placeholder: 'example@gmail.com'
        },


        {
            label: 'Số điện thoại',
            name: 'phone',
            type: 'text',
            placeholder: '09xxxxxxxx'
        },


        {
            label: 'Mật khẩu',
            name: 'password',
            type: 'password',
            placeholder:
                editingUser
                    ? 'Để trống nếu không đổi mật khẩu'
                    : 'Nhập mật khẩu'
        },


        {
            label: 'Vai trò',
            name: 'role',
            type: 'select',

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
            placeholder: 'Nhập địa chỉ'
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

            url:
                getAvatarUrl(
                    editingUser.user_avatar
                ),

            name:
                editingUser.user_avatar

        };

    }


    // ======================================================
    // RENDER
    // ======================================================

    return (

        <>

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


                {/* ==================================================
                    TABLE
                ================================================== */}

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

                        <AdminTable

                            columns={columns}

                            data={users}

                        />


                        {/* ==================================================
                            SERVER-SIDE PAGINATION
                        ================================================== */}

                        <AdminPagination

                            currentPage={
                                pagination.page ||
                                currentPage
                            }

                            totalPages={
                                pagination.totalPages ||
                                1
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

                onClose={() =>
                    setIsFormOpen(false)
                }

                title={
                    editingUser
                        ? 'Cập nhật người dùng'
                        : 'Thêm người dùng'
                }

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

                    filePreviews={filePreviews}

                />

            </AdminModal>


            {/* ==================================================
                ALERT MODAL
            ================================================== */}

            <AdminModal

                open={alertModal.open}

                onClose={closeAlert}

                title={alertModal.title}

                type={alertModal.type}

                size="sm"

            >

                <div className="admin-alert-content">

                    <p>
                        {alertModal.message}
                    </p>


                    <div className="admin-alert-actions">

                        {alertModal.onCancel && (

                            <button
                                className="admin-cancel-btn"
                                onClick={
                                    alertModal.onCancel
                                }
                            >
                                Hủy
                            </button>

                        )}


                        <button
                            className="admin-confirm-btn"
                            onClick={
                                alertModal.onConfirm ||
                                closeAlert
                            }
                        >
                            Xác nhận
                        </button>

                    </div>

                </div>

            </AdminModal>

        </>

    );

};

export default UserPage;

