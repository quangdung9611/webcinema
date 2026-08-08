import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Smile,
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
// HELPERS & CONSTANTS
// ==========================================================
const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `https://api.quangdungcinema.id.vn/uploads/actors/${image}`;
};

const DEFAULT_AVATAR = 'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-avatar.jpg';

const initialFormData = {
    name: '',
    slug: '',
    gender: 'Nam',
    nationality: 'Việt Nam',
    birthday: '',
    biography: ''
};

// ==========================================================
// COMPONENT
// ==========================================================
const ActorPage = () => {
    // ======================================================
    // STATES
    // ======================================================
    const [actors, setActors] = useState([]);
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
    const [editingActor, setEditingActor] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [actorAvatarFile, setActorAvatarFile] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [filePreviews, setFilePreviews] = useState({});

    // ======================================================
    // ALERT MODAL (giống UserPage)
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
    // FETCH ACTORS - GIỐNG MoviePage
    // ======================================================
    const fetchActors = useCallback(async (page = 1, keyword = '') => {
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
            const res = await api.get('/api/actors/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const actorsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setActors(actorsData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request bị hủy');
                return;
            }
            console.error('FETCH ACTORS ERROR:', error);
            setActors([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách diễn viên.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    // ======================================================
    // MOUNT
    // ======================================================
    useEffect(() => {
        fetchActors(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchActors]);

    // ======================================================
    // SEARCH DEBOUNCE
    // ======================================================
    const prevSearchRef = useRef('');
    useEffect(() => {
        const currentSearch = search;
        const prevSearch = prevSearchRef.current;

        if (currentSearch === prevSearch) return;
        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchActors(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchActors]);

    const handlePageChange = (page) => {
        fetchActors(page, search);
    };

    // ======================================================
    // SLUG GENERATOR
    // ======================================================
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

    // ======================================================
    // VALIDATE FORM
    // ======================================================
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
        if (!editingActor && !actorAvatarFile) {
            errors.actor_avatar = 'Vui lòng chọn ảnh đại diện';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ======================================================
    // HANDLE MODAL ACTIONS
    // ======================================================
    const handleOpenAdd = () => {
        setEditingActor(null);
        setFormData(initialFormData);
        setActorAvatarFile(null);
        setFormErrors({});
        setFilePreviews({});
        setIsFormOpen(true);
    };

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
        setActorAvatarFile(null);
        setFormErrors({});
        setFilePreviews(
            actor.actor_avatar
                ? {
                      actor_avatar: {
                          url: getImageUrl(actor.actor_avatar),
                          name: actor.actor_avatar
                      }
                  }
                : {}
        );
        setIsFormOpen(true);
    };

    // ======================================================
    // HANDLE CLOSE FORM
    // ======================================================
    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingActor(null);
        setFormErrors({});
        setActorAvatarFile(null);
        setFilePreviews({});
    };

    // ======================================================
    // HANDLE FORM CHANGE
    // ======================================================
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }

        if (name === 'actor_avatar') {
            const file = files?.[0] || null;
            setActorAvatarFile(file);
            if (file) {
                if (filePreviews.actor_avatar?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(filePreviews.actor_avatar.url);
                }
                setFilePreviews({
                    actor_avatar: {
                        url: URL.createObjectURL(file),
                        name: file.name
                    }
                });
            } else {
                setFilePreviews({});
            }
            return;
        }

        if (name === 'name') {
            setFormData((prev) => ({
                ...prev,
                name: value,
                slug: generateSlug(value)
            }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ======================================================
    // HANDLE SUBMIT
    // ======================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSubmitLoading(true);
            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('gender', formData.gender);
            submitData.append('nationality', formData.nationality.trim());
            submitData.append('birthday', formData.birthday);
            submitData.append('biography', formData.biography.trim());
            submitData.append('slug', formData.slug || generateSlug(formData.name.trim()));

            if (actorAvatarFile) {
                submitData.append('actor_avatar', actorAvatarFile);
            }

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingActor) {
                await api.put(`/api/actors/${editingActor.actor_id}`, submitData, config);
                setIsFormOpen(false);
                fetchActors(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật diễn viên thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/actors', submitData, config);
                setIsFormOpen(false);
                fetchActors(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Thêm diễn viên thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            console.error('SUBMIT ACTOR ERROR:', error);
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

    // ======================================================
    // HANDLE DELETE
    // ======================================================
    const handleDelete = (actor) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${actor.name}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/actors/${actor.actor_id}`);
                    closeAlert();
                    const currentPage = pagination.page;
                    const newPage = actors.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchActors(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa diễn viên thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE ACTOR ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', 'Không thể xóa diễn viên.', 'error');
                    }, 100);
                }
            },
            closeAlert
        );
    };

    // ======================================================
    // HELPER: IMAGE ERROR HANDLER
    // ======================================================
    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = DEFAULT_AVATAR;
    };

    // ======================================================
    // TABLE COLUMNS
    // ======================================================
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
                    onError={handleImageError}
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
            render: (row) =>
                row.birthday
                    ? new Date(row.birthday).toLocaleDateString('vi-VN')
                    : '---'
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

    // ======================================================
    // FORM FIELDS
    // ======================================================
    const formFields = [
        { label: 'Họ tên', name: 'name', type: 'text', placeholder: 'Nhập tên diễn viên' },
        { label: 'Slug', name: 'slug', type: 'text', placeholder: 'Slug tự động', disabled: true },
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
        { label: 'Quốc tịch', name: 'nationality', type: 'text', placeholder: 'Ví dụ: Việt Nam' },
        { label: 'Ngày sinh', name: 'birthday', type: 'date' },
        { label: 'Avatar', name: 'actor_avatar', type: 'file' },
        { label: 'Tiểu sử', name: 'biography', type: 'textarea', placeholder: 'Nhập tiểu sử diễn viên' }
    ];

    // ======================================================
    // RENDER
    // ======================================================
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
                    <>
                        <AdminTable columns={columns} data={actors} />
                        <AdminPagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </AdminPage>

            {/* ==================================================
                FORM MODAL (giống UserPage)
            ================================================== */}
            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title={editingActor ? 'Cập nhật diễn viên' : 'Thêm diễn viên'}
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
                    submitText={editingActor ? 'Lưu thay đổi' : 'Thêm diễn viên'}
                    filePreviews={filePreviews}
                />
            </AdminModal>

            {/* ==================================================
                ALERT / CONFIRM MODAL (giống UserPage)
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

export default ActorPage;