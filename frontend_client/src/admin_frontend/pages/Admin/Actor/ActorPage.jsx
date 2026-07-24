import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Smile,
    Edit,
    Trash2,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

const API_URL = 'https://api.quangdungcinema.id.vn/api/actors';

// Hàm lấy URL ảnh
const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) {
        return image;
    }
    return `https://api.quangdungcinema.id.vn/uploads/actors/${image}`;
};

const DEFAULT_AVATAR =
    'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-avatar.jpg';

// ✅ Thêm slug vào initialFormData
const initialFormData = {
    name: '',
    slug: '',          // thêm trường slug
    gender: 'Nam',
    nationality: 'Việt Nam',
    birthday: '',
    biography: ''
};

const ActorPage = () => {
    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingActor, setEditingActor] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [actorAvatarFile, setActorAvatarFile] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Alert Modal
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

    // Fetch actors
    const fetchActors = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_URL);
            setActors(res.data);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải danh sách diễn viên.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActors();
    }, []);

    // Tạo slug tự động từ name
    const generateSlug = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/([^0-9a-z-\s])/g, '')
            .replace(/(\s+)/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleOpenAdd = () => {
        setEditingActor(null);
        setFormData(initialFormData);
        setActorAvatarFile(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (actor) => {
        setEditingActor(actor);
        setFormData({
            name: actor.name || '',
            slug: actor.slug || '',      // ✅ lấy slug từ actor
            gender: actor.gender || 'Nam',
            nationality: actor.nationality || 'Việt Nam',
            birthday: actor.birthday ? actor.birthday.substring(0, 10) : '',
            biography: actor.biography || ''
        });
        setActorAvatarFile(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (name === 'actor_avatar') {
            setActorAvatarFile(files[0]);
            return;
        }

        // ✅ Nếu thay đổi name, tự động cập nhật slug
        if (name === 'name') {
            setFormData(prev => ({
                ...prev,
                name: value,
                slug: generateSlug(value)
            }));
            setFormErrors(prev => ({ ...prev, [name]: '' }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

    // Validate form
    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = 'Vui lòng nhập tên diễn viên';
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Tên diễn viên phải từ 2 ký tự';
        }
        if (!formData.gender) {
            errors.gender = 'Vui lòng chọn giới tính';
        }
        if (!formData.nationality.trim()) {
            errors.nationality = 'Vui lòng nhập quốc tịch';
        }
        if (!formData.birthday) {
            errors.birthday = 'Vui lòng chọn ngày sinh';
        }
        if (!formData.biography.trim()) {
            errors.biography = 'Vui lòng nhập tiểu sử';
        } else if (formData.biography.trim().length < 5) {
            errors.biography = 'Tiểu sử quá ngắn';
        }
        return errors;
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

            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('gender', formData.gender);
            submitData.append('nationality', formData.nationality.trim());
            submitData.append('birthday', formData.birthday);
            submitData.append('biography', formData.biography.trim());

            // ✅ Gửi slug lên backend
            const slug = formData.slug || generateSlug(formData.name.trim());
            submitData.append('slug', slug);

            if (actorAvatarFile) {
                submitData.append('actor_avatar', actorAvatarFile);
            }

            let url = API_URL;
            let method = 'post';

            if (editingActor) {
                url = `${API_URL}/${editingActor.actor_id}`;
                method = 'put';
            } else {
                url = API_URL;
                method = 'post';
            }

            await axios({
                method,
                url,
                data: submitData,
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsFormOpen(false);
            showAlert(
                'Thành công',
                editingActor ? 'Cập nhật diễn viên thành công.' : 'Thêm diễn viên thành công.',
                'success'
            );
            fetchActors();
        } catch (error) {
            const backendError = error.response?.data?.message || error.response?.data?.error || 'Đã xảy ra lỗi.';
            if (error.response?.data?.field) {
                setFormErrors({ [error.response.data.field]: backendError });
            } else {
                showAlert('Lỗi', backendError, 'error');
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = (actor) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${actor.name}"?`,
            'warning',
            async () => {
                try {
                    await axios.delete(`${API_URL}/${actor.actor_id}`);
                    closeAlert();
                    fetchActors();
                    showAlert('Thành công', 'Xóa diễn viên thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', 'Không thể xóa diễn viên.', 'error');
                }
            },
            closeAlert
        );
    };

    // Filter
    const filteredActors = actors.filter(actor => {
        const keyword = search.toLowerCase();
        return (
            actor.name?.toLowerCase().includes(keyword) ||
            actor.nationality?.toLowerCase().includes(keyword)
        );
    });

    // Columns
    const columns = [
        {
            title: 'Avatar',
            key: 'actor_avatar',
            render: (row) => (
                <img
                    src={getImageUrl(row.actor_avatar) || DEFAULT_AVATAR}
                    alt={row.name}
                    style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '50%'
                    }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_AVATAR;
                    }}
                />
            )
        },
        { title: 'Họ tên', key: 'name' },
        {
            title: 'Giới tính',
            key: 'gender',
            render: (row) => (
                <span className={`status-badge ${row.gender === 'Nam' ? 'used' : 'pending'}`}>
                    {row.gender}
                </span>
            )
        },
        { title: 'Quốc tịch', key: 'nationality' },
        {
            title: 'Ngày sinh',
            key: 'birthday',
            render: (row) => (
                row.birthday
                    ? new Date(row.birthday).toLocaleDateString('vi-VN')
                    : '---'
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

    // ✅ Thêm trường Slug vào formFields (giống MoviePage)
    const formFields = [
        {
            label: 'Họ tên',
            name: 'name',
            type: 'text',
            placeholder: 'Nhập tên diễn viên'
        },
        {
            label: 'Slug',
            name: 'slug',
            type: 'text',
            placeholder: 'Slug tự động',
            disabled: true   // không cho chỉnh sửa
        },
        {
            label: 'Giới tính',
            name: 'gender',
            type: 'select',
            options: [
                { label: 'Nam', value: 'Nam' },
                { label: 'Nữ', value: 'Nữ' },
                { label: 'Khác', value: 'Khác' }
            ]
        },
        {
            label: 'Quốc tịch',
            name: 'nationality',
            type: 'text',
            placeholder: 'Ví dụ: Việt Nam'
        },
        {
            label: 'Ngày sinh',
            name: 'birthday',
            type: 'date'
        },
        {
            label: 'Avatar',
            name: 'actor_avatar',
            type: 'file'
        },
        {
            label: 'Tiểu sử',
            name: 'biography',
            type: 'textarea',
            placeholder: 'Nhập tiểu sử diễn viên'
        }
    ];

    const renderAlertIcon = () => {
        switch (alertModal.type) {
            case 'success':
                return <CheckCircle2 size={58} color="#22c55e" />;
            case 'error':
                return <XCircle size={58} color="#ef4444" />;
            case 'warning':
                return <AlertTriangle size={58} color="#f59e0b" />;
            default:
                return <Info size={58} color="#3b82f6" />;
        }
    };

    return (
        <>
            <AdminPage
                title="Quản lý diễn viên"
                subtitle="Quản lý toàn bộ diễn viên hệ thống"
                icon={<Smile size={30} />}
                buttonText="Thêm diễn viên"
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
                    <AdminTable columns={columns} data={filteredActors} />
                )}
            </AdminPage>

            {/* Form Modal */}
            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingActor ? 'Cập nhật diễn viên' : 'Thêm diễn viên'}
            >
                {actorAvatarFile && (
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <img
                            src={URL.createObjectURL(actorAvatarFile)}
                            alt="preview"
                            style={{
                                width: '140px',
                                height: '140px',
                                objectFit: 'cover',
                                borderRadius: '50%'
                            }}
                        />
                    </div>
                )}
                {editingActor && !actorAvatarFile && editingActor.actor_avatar && (
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <img
                            src={getImageUrl(editingActor.actor_avatar)}
                            alt="preview"
                            style={{
                                width: '140px',
                                height: '140px',
                                objectFit: 'cover',
                                borderRadius: '50%'
                            }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = DEFAULT_AVATAR;
                            }}
                        />
                    </div>
                )}
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingActor ? 'Lưu thay đổi' : 'Thêm diễn viên'}
                />
            </AdminModal>

            {/* Alert Modal */}
            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
                size="sm"
            >
                <div className="admin-alert-content">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                        {renderAlertIcon()}
                    </div>
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

export default ActorPage;