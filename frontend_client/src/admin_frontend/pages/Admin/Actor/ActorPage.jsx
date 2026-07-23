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

const initialFormData = {
    name: '',
    slug: '',
    gender: 'Nam',
    nationality: 'Việt Nam',
    birthday: '',
    biography: ''
};

const ActorPage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingActor, setEditingActor] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [actorAvatarFile, setActorAvatarFile] = useState(null); // ✅ đổi tên
    const [preview, setPreview] = useState(null);
    const [errorText, setErrorText] = useState('');

    /* =====================================================
        ALERT MODAL
    ===================================================== */

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

    /* =====================================================
        FETCH ACTORS
    ===================================================== */

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

    /* =====================================================
        GENERATE SLUG
    ===================================================== */

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

    /* =====================================================
        OPEN ADD
    ===================================================== */

    const handleOpenAdd = () => {
        setEditingActor(null);
        setFormData(initialFormData);
        setActorAvatarFile(null);
        setPreview(null);
        setErrorText('');
        setIsFormOpen(true);
    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */

    const handleOpenEdit = (actor) => {
        setEditingActor(actor);
        setFormData({
            name: actor.name || '',
            slug: actor.slug || '',
            gender: actor.gender || 'Nam',
            nationality: actor.nationality || 'Việt Nam',
            birthday: actor.birthday ? actor.birthday.substring(0, 10) : '',
            biography: actor.biography || ''
        });

        // ✅ Hiển thị preview từ actor_avatar
        setPreview(
            actor.actor_avatar
                ? `https://api.quangdungcinema.id.vn/uploads/actors/${actor.actor_avatar}`
                : null
        );

        setActorAvatarFile(null);
        setErrorText('');
        setIsFormOpen(true);
    };

    /* =====================================================
        HANDLE CHANGE
    ===================================================== */

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (errorText) setErrorText('');

        // ✅ Xử lý file với tên field actor_avatar
        if (name === 'actor_avatar') {
            const file = files[0];
            setActorAvatarFile(file);
            if (file) {
                setPreview(URL.createObjectURL(file));
            }
            return;
        }

        if (name === 'name') {
            setFormData(prev => ({
                ...prev,
                name: value,
                slug: generateSlug(value)
            }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /* =====================================================
        SUBMIT
    ===================================================== */

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorText('');

        try {
            setSubmitLoading(true);

            const token = sessionStorage.getItem('usertoken');
            const submitData = new FormData();

            submitData.append('name', formData.name);
            submitData.append('slug', formData.slug);
            submitData.append('gender', formData.gender);
            submitData.append('nationality', formData.nationality);
            submitData.append('birthday', formData.birthday);
            submitData.append('biography', formData.biography);

            if (token) {
                submitData.append('token', token);
            }

            // ✅ Gửi file với key 'actor_avatar' (đồng bộ với backend)
            if (actorAvatarFile) {
                submitData.append('actor_avatar', actorAvatarFile);
            } else if (editingActor && editingActor.actor_avatar) {
                // Nếu không upload mới, vẫn gửi tên ảnh cũ để backend giữ nguyên
                submitData.append('actor_avatar', editingActor.actor_avatar);
            }

            if (editingActor) {
                await axios.put(`${API_URL}/update/${editingActor.actor_id}`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setIsFormOpen(false);
                showAlert('Thành công', 'Cập nhật diễn viên thành công.', 'success');
            } else {
                await axios.post(`${API_URL}/add`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setIsFormOpen(false);
                showAlert('Thành công', 'Thêm diễn viên thành công.', 'success');
            }

            fetchActors();

        } catch (error) {
            const msg = error.response?.data?.error || 'Đã xảy ra lỗi.';
            setErrorText(msg);
            showAlert('Lỗi', msg, 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    /* =====================================================
        DELETE ACTOR
    ===================================================== */

    const handleDelete = (actor) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${actor.name}"?`,
            'warning',
            async () => {
                try {
                    const token = sessionStorage.getItem('usertoken');
                    await axios.delete(`${API_URL}/delete/${actor.actor_id}`, {
                        data: { token }
                    });
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

    /* =====================================================
        FILTER ACTORS
    ===================================================== */

    const filteredActors = actors.filter(actor => {
        const keyword = search.toLowerCase();
        return (
            actor.name?.toLowerCase().includes(keyword) ||
            actor.slug?.toLowerCase().includes(keyword) ||
            actor.nationality?.toLowerCase().includes(keyword)
        );
    });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [
        {
            title: 'Avatar',
            key: 'actor_avatar',
            render: (row) => (
                <img
                    src={`https://api.quangdungcinema.id.vn/uploads/actors/${row.actor_avatar}`}
                    alt={row.name}
                    style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '50%'
                    }}
                />
            )
        },
        {
            title: 'Họ tên',
            key: 'name'
        },
        {
            title: 'Slug',
            key: 'slug'
        },
        {
            title: 'Giới tính',
            key: 'gender',
            render: (row) => (
                <span className={`status-badge ${row.gender === 'Nam' ? 'used' : 'pending'}`}>
                    {row.gender}
                </span>
            )
        },
        {
            title: 'Quốc tịch',
            key: 'nationality'
        },
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

    /* =====================================================
        FORM FIELDS
    ===================================================== */

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
            disabled: true
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
            name: 'actor_avatar', // ✅ đúng tên cột
            type: 'file'
        },
        {
            label: 'Tiểu sử',
            name: 'biography',
            type: 'textarea',
            placeholder: 'Nhập tiểu sử diễn viên'
        }
    ];

    /* =====================================================
        ALERT ICON
    ===================================================== */

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

    /* =====================================================
        RENDER
    ===================================================== */

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

            {/* =================================================
                FORM MODAL
            ================================================= */}

            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingActor ? 'Cập nhật diễn viên' : 'Thêm diễn viên'}
            >
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    {preview && (
                        <img
                            src={preview}
                            alt="preview"
                            style={{
                                width: '140px',
                                height: '140px',
                                objectFit: 'cover',
                                borderRadius: '50%'
                            }}
                        />
                    )}
                </div>

                {errorText && (
                    <div
                        className="admin-form-error"
                        style={{
                            color: '#ef4444',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fee2e2',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            marginBottom: '16px',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        {errorText}
                    </div>
                )}

                <AdminForm
                    fields={formFields}
                    formData={formData}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingActor ? 'Lưu thay đổi' : 'Thêm diễn viên'}
                />
            </AdminModal>

            {/* =================================================
                ALERT MODAL
            ================================================= */}

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