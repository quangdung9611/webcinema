import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Users,
    Edit,
    Trash2,
    Loader2,
    Camera
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

const API_URL = 'https://api.quangdungcinema.id.vn/api/users';

const initialFormData = {
    username: '',
    full_name: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    role: 'customer'
    // ❌ Đã xóa avatar khỏi form
};

const UserPage = () => {

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

    // State cho modal upload avatar
    const [avatarModal, setAvatarModal] = useState({
        open: false,
        userId: null,
        file: null,
        uploading: false
    });

    // =============================================
    // ALERT MODAL
    // =============================================

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, type, onConfirm, onCancel });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, open: false }));
    };

    // =============================================
    // FETCH USERS
    // =============================================

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_URL);
            const usersData = res.data?.data || res.data || [];
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải danh sách người dùng.', 'error');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // =============================================
    // PASSWORD STRENGTH
    // =============================================

    const getPasswordStrength = (password) => {
        if (!password) return { text: '', className: '' };
        if (password.length < 6) return { text: 'Mật khẩu yếu', className: 'weak' };
        if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
            return { text: 'Mật khẩu mạnh', className: 'strong' };
        }
        return { text: 'Mật khẩu trung bình', className: 'medium' };
    };

    // =============================================
    // VALIDATE FORM
    // =============================================

    const validateForm = () => {
        const errors = {};

        if (!formData.username.trim()) {
            errors.username = 'Vui lòng nhập username';
        } else if (formData.username.trim().length < 6) {
            errors.username = 'Username phải từ 6 ký tự trở lên';
        }

        if (!formData.full_name.trim()) {
            errors.full_name = 'Vui lòng nhập họ tên';
        } else if (formData.full_name.trim().length < 8) {
            errors.full_name = 'Họ tên phải từ 8 ký tự trở lên';
        }

        if (!formData.email.trim()) {
            errors.email = 'Vui lòng nhập email';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Email không đúng định dạng';
        }

        if (!formData.phone.trim()) {
            errors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^[0-9]{10}$/.test(formData.phone)) {
            errors.phone = 'Số điện thoại phải đúng 10 số';
        }

        if (!editingUser && !formData.password.trim()) {
            errors.password = 'Vui lòng nhập mật khẩu';
        } else if (
            formData.password &&
            !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(formData.password)
        ) {
            errors.password = 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt';
        }

        if (!formData.address.trim()) {
            errors.address = 'Vui lòng nhập địa chỉ';
        } else if (formData.address.trim().length < 5) {
            errors.address = 'Địa chỉ quá ngắn';
        }

        return errors;
    };

    // =============================================
    // OPEN ADD / EDIT
    // =============================================

    const handleOpenAdd = () => {
        setEditingUser(null);
        setFormData(initialFormData);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (user) => {
        setEditingUser(user);
        setFormErrors({});
        setFormData({
            username: user.username || '',
            full_name: user.full_name || '',
            phone: user.phone || '',
            address: user.address || '',
            email: user.email || '',
            password: '',
            role: user.role || 'customer'
        });
        setIsFormOpen(true);
    };

    // =============================================
    // UPLOAD AVATAR MODAL
    // =============================================

    const openAvatarModal = (userId) => {
        setAvatarModal({
            open: true,
            userId,
            file: null,
            uploading: false
        });
    };

    const closeAvatarModal = () => {
        setAvatarModal({
            open: false,
            userId: null,
            file: null,
            uploading: false
        });
    };

    const handleAvatarFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarModal(prev => ({ ...prev, file }));
        }
    };

    const handleUploadAvatar = async () => {
        if (!avatarModal.file) {
            showAlert('Lỗi', 'Vui lòng chọn file ảnh.', 'error');
            return;
        }

        setAvatarModal(prev => ({ ...prev, uploading: true }));

        const formData = new FormData();
        formData.append('avatar', avatarModal.file);

        try {
            await axios.post(
                `${API_URL}/avatar`,
                formData,
                {
                    withCredentials: true,
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );

            showAlert('Thành công', 'Đã cập nhật ảnh đại diện.', 'success');
            closeAvatarModal();
            fetchUsers(); // Refresh list
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải ảnh lên.', 'error');
        } finally {
            setAvatarModal(prev => ({ ...prev, uploading: false }));
        }
    };

    // =============================================
    // SUBMIT FORM
    // =============================================

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

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

            if (editingUser) {
                await axios.put(`${API_URL}/${editingUser.user_id}`, formData);
                showAlert('Thành công', 'Cập nhật người dùng thành công.', 'success');
            } else {
                await axios.post(`${API_URL}`, formData);
                showAlert('Thành công', 'Thêm người dùng thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchUsers();
        } catch (error) {
            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.error;

            if (backendField) {
                setFormErrors({ [backendField]: backendError });
                return;
            }

            showAlert('Lỗi', backendError || 'Đã xảy ra lỗi.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    // =============================================
    // DELETE USER
    // =============================================

    const handleDelete = (user) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${user.username}"?`,
            'warning',
            async () => {
                try {
                    await axios.delete(`${API_URL}/${user.user_id}`);
                    closeAlert();
                    fetchUsers();
                    showAlert('Thành công', 'Xóa người dùng thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', 'Không thể xóa người dùng.', 'error');
                }
            },
            closeAlert
        );
    };

    // =============================================
    // FILTER USERS
    // =============================================

    const filteredUsers = (users || []).filter(user => {
        const keyword = search.toLowerCase();
        return (
            user.username?.toLowerCase().includes(keyword) ||
            user.full_name?.toLowerCase().includes(keyword) ||
            user.email?.toLowerCase().includes(keyword) ||
            user.phone?.includes(keyword)
        );
    });

    // =============================================
    // TABLE COLUMNS
    // =============================================

    const columns = [
        {
            title: 'ID',
            key: 'user_id',
            render: (row) => `#${row.user_id}`
        },
        {
            title: 'Avatar',
            key: 'avatar',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {row.avatar ? (
                        <img
                            src={`https://api.quangdungcinema.id.vn/uploads/avatars/${row.avatar}`}
                            alt="avatar"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }}
                        />
                    ) : (
                        <span style={{ color: '#888' }}>—</span>
                    )}
                    <button
                        onClick={() => openAvatarModal(row.user_id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#aaa',
                            padding: '4px'
                        }}
                        title="Đổi avatar"
                    >
                        <Camera size={16} />
                    </button>
                </div>
            )
        },
        { title: 'Username', key: 'username' },
        { title: 'Họ tên', key: 'full_name' },
        { title: 'Email', key: 'email' },
        { title: 'Số điện thoại', key: 'phone' },
        { title: 'Điểm', key: 'points' },
        {
            title: 'Vai trò',
            key: 'role',
            render: (row) => (
                <span className={`status-badge ${row.role}`}>
                    {row.role}
                </span>
            )
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (row) => (
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

    // =============================================
    // FORM FIELDS (đã xóa avatar)
    // =============================================

    const formFields = [
        { label: 'Username', name: 'username', type: 'text', placeholder: 'Nhập username' },
        { label: 'Họ tên', name: 'full_name', type: 'text', placeholder: 'Nhập họ tên' },
        { label: 'Email', name: 'email', type: 'email', placeholder: 'example@gmail.com' },
        { label: 'Số điện thoại', name: 'phone', type: 'text', placeholder: '09xxxxxxxx' },
        {
            label: 'Mật khẩu',
            name: 'password',
            type: 'password',
            placeholder: editingUser ? 'Để trống nếu không đổi mật khẩu' : 'Nhập mật khẩu'
        },
        {
            label: 'Vai trò',
            name: 'role',
            type: 'select',
            options: [
                { label: 'Khách hàng', value: 'customer' },
                { label: 'Quản trị viên', value: 'admin' }
            ]
        },
        { label: 'Địa chỉ', name: 'address', type: 'textarea', placeholder: 'Nhập địa chỉ' }
    ];

    // =============================================
    // RENDER
    // =============================================

    return (
        <>
            <AdminPage
                title="Quản lý người dùng"
                subtitle="Quản lý toàn bộ tài khoản hệ thống"
                icon={<Users size={30} />}
                buttonText="Thêm User"
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
                    <AdminTable columns={columns} data={filteredUsers} />
                )}
            </AdminPage>

            {/* FORM MODAL */}
            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingUser ? 'Cập nhật người dùng' : 'Thêm người dùng'}
            >
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingUser ? 'Lưu thay đổi' : 'Thêm người dùng'}
                />
                {formData.password && (
                    <div className={`password-strength ${getPasswordStrength(formData.password).className}`}>
                        {getPasswordStrength(formData.password).text}
                    </div>
                )}
            </AdminModal>

            {/* AVATAR UPLOAD MODAL */}
            <AdminModal
                open={avatarModal.open}
                onClose={closeAvatarModal}
                title="Đổi ảnh đại diện"
            >
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        disabled={avatarModal.uploading}
                    />
                    {avatarModal.file && (
                        <div style={{ fontSize: '14px', color: '#aaa' }}>
                            Đã chọn: {avatarModal.file.name}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={closeAvatarModal}
                            style={{ padding: '8px 20px', background: '#333', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
                            disabled={avatarModal.uploading}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleUploadAvatar}
                            style={{ padding: '8px 20px', background: '#e8e8e8', border: 'none', borderRadius: '6px', color: '#000', cursor: 'pointer' }}
                            disabled={avatarModal.uploading || !avatarModal.file}
                        >
                            {avatarModal.uploading ? 'Đang tải...' : 'Cập nhật'}
                        </button>
                    </div>
                </div>
            </AdminModal>

            {/* ALERT MODAL */}
            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
            >
                <div className="admin-alert-content">
                    <p>{alertModal.message}</p>
                    <div className="admin-alert-actions">
                        {alertModal.onCancel && (
                            <button className="admin-cancel-btn" onClick={alertModal.onCancel}>
                                Hủy
                            </button>
                        )}
                        <button className="admin-confirm-btn" onClick={alertModal.onConfirm || closeAlert}>
                            Xác nhận
                        </button>
                    </div>
                </div>
            </AdminModal>
        </>
    );
};

export default UserPage;