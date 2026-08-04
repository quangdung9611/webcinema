import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Gift,
    Edit,
    Trash2,
    Loader2,
    Eye,
    Heart,
    ExternalLink,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `https://api.quangdungcinema.id.vn/uploads/promotions/${image}`;
};

const DEFAULT_IMAGE = 'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-promotion.jpg';

const initialFormData = {
    title: '',
    slug: '',
    description: '',
    likes: 0,
    is_active: 1
};

const PromotionPage = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1, limit: 20, total: 0, totalPages: 1,
        hasNextPage: false, hasPreviousPage: false
    });

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [promotionImageFile, setPromotionImageFile] = useState(null);
    const [filePreviews, setFilePreviews] = useState({});

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

    const closeAlert = () => setAlertModal(prev => ({ ...prev, open: false }));

    const fetchPromotions = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/promotions', {
                params: { page, limit: 20, search: keyword.trim() },
                signal: controller.signal
            });

            const responseData = res.data?.data;
            const promotionsData = responseData?.data || [];
            const paginationData = responseData?.pagination || {
                page: 1, limit: 20, total: 0, totalPages: 1
            };

            setPromotions(promotionsData);
            setPagination(paginationData);

        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('FETCH PROMOTIONS ERROR:', error);
            showAlert('Lỗi', 'Không thể tải danh sách khuyến mãi.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) abortControllerRef.current = null;
        }
    }, []);

    useEffect(() => { fetchPromotions(1, ''); }, []);

    const prevSearchRef = useRef('');
    useEffect(() => {
        if (search === prevSearchRef.current) return;
        prevSearchRef.current = search;
        const timer = setTimeout(() => fetchPromotions(1, search), 400);
        return () => clearTimeout(timer);
    }, [search, fetchPromotions]);

    const handlePageChange = (page) => fetchPromotions(page, search);

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
        setEditingPromotion(null);
        setFormData(initialFormData);
        setErrors({});
        setPromotionImageFile(null);
        setFilePreviews({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingPromotion(item);
        setFormData({
            title: item.title || '',
            slug: item.slug || '',
            description: item.description || '',
            likes: item.likes || 0,
            is_active: item.is_active ?? 1
        });
        setErrors({});
        setPromotionImageFile(null);
        if (item.promotion_image) {
            setFilePreviews({
                promotion_image: { url: getImageUrl(item.promotion_image), name: item.promotion_image }
            });
        } else {
            setFilePreviews({});
        }
        setIsFormOpen(true);
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

        if (name === 'promotion_image') {
            const file = files[0];
            setPromotionImageFile(file);
            if (file) {
                if (filePreviews.promotion_image?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(filePreviews.promotion_image.url);
                }
                const blobUrl = URL.createObjectURL(file);
                setFilePreviews({ promotion_image: { url: blobUrl, name: file.name } });
            } else {
                setFilePreviews({});
            }
            return;
        }

        if (name === 'title') {
            setFormData(prev => ({ ...prev, title: value, slug: generateSlug(value) }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Vui lòng nhập tiêu đề khuyến mãi.';
        } else if (formData.title.trim().length < 5) {
            newErrors.title = 'Tiêu đề phải từ 5 ký tự trở lên.';
        }
        if (!editingPromotion && !promotionImageFile) {
            newErrors.promotion_image = 'Vui lòng chọn ảnh khuyến mãi.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSubmitLoading(true);
            const submitData = new FormData();
            submitData.append('title', formData.title.trim());
            submitData.append('slug', formData.slug);
            submitData.append('description', formData.description || '');
            submitData.append('likes', formData.likes);
            submitData.append('is_active', formData.is_active);
            if (promotionImageFile) submitData.append('promotion_image', promotionImageFile);

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingPromotion) {
                await api.put(`/api/promotions/${editingPromotion.promotion_id}`, submitData, config);
                showAlert('Thành công', 'Cập nhật khuyến mãi thành công.', 'success');
            } else {
                await api.post('/api/promotions', submitData, config);
                showAlert('Thành công', 'Tạo khuyến mãi mới thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchPromotions(pagination.page, search);
        } catch (error) {
            showAlert('Lỗi', error.response?.data?.message || 'Không thể lưu dữ liệu.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = (item) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa khuyến mãi "${item.title}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/promotions/${item.promotion_id}`);
                    closeAlert();
                    const newPage = promotions.length === 1 && pagination.page > 1
                        ? pagination.page - 1
                        : pagination.page;
                    fetchPromotions(newPage, search);
                    showAlert('Thành công', 'Xóa khuyến mãi thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', 'Không thể xóa khuyến mãi.', 'error');
                }
            },
            closeAlert
        );
    };

    const columns = [
        {
            title: 'Hình ảnh',
            key: 'promotion_image',
            render: (row) => (
                <img
                    src={getImageUrl(row.promotion_image) || DEFAULT_IMAGE}
                    alt="promotion"
                    style={{ width: '120px', height: '70px', objectFit: 'cover', borderRadius: '10px' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE; }}
                />
            )
        },
        { title: 'Tiêu đề', key: 'title' },
        {
            title: 'Lượt xem',
            key: 'views',
            render: (row) => <span className="status-badge"><Eye size={12} /> {row.views || 0}</span>
        },
        {
            title: 'Lượt thích',
            key: 'likes',
            render: (row) => <span className="status-badge"><Heart size={12} /> {row.likes || 0}</span>
        },
        {
            title: 'Trạng thái',
            key: 'is_active',
            render: (row) => (
                <span className={`status-badge ${row.is_active ? 'success' : 'danger'}`}>
                    {row.is_active ? 'Đang hoạt động' : 'Đã ẩn'}
                </span>
            )
        },
        { title: 'Ngày tạo', key: 'full_date' },
        {
            title: 'Xem',
            key: 'slug',
            render: (row) => (
                <a href={`/promotion/${row.slug}`} target="_blank" rel="noreferrer" style={{ color: '#06b6d4' }}>
                    <ExternalLink size={18} />
                </a>
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

    const formFields = [
        { label: 'Tiêu đề khuyến mãi', name: 'title', type: 'text', placeholder: 'Nhập tiêu đề' },
        { label: 'Slug', name: 'slug', type: 'text', disabled: true },
        { label: 'Mô tả ngắn', name: 'description', type: 'textarea', placeholder: 'Nhập mô tả' },
        { label: 'Hình ảnh', name: 'promotion_image', type: 'file' },
        { label: 'Likes', name: 'likes', type: 'number', placeholder: '0' },
        {
            label: 'Trạng thái',
            name: 'is_active',
            type: 'select',
            options: [
                { value: 1, label: 'Hiển thị' },
                { value: 0, label: 'Ẩn' }
            ]
        }
    ];

    const filePreviews = {};
    if (editingPromotion && editingPromotion.promotion_image) {
        filePreviews['promotion_image'] = {
            url: getImageUrl(editingPromotion.promotion_image),
            name: editingPromotion.promotion_image
        };
    }

    const renderAlertIcon = () => {
        switch (alertModal.type) {
            case 'success': return <CheckCircle2 size={58} color="#22c55e" />;
            case 'error': return <XCircle size={58} color="#ef4444" />;
            case 'warning': return <AlertTriangle size={58} color="#f59e0b" />;
            default: return <Info size={58} color="#3b82f6" />;
        }
    };

    return (
        <>
            <AdminPage
                title="Quản lý khuyến mãi"
                subtitle="Quản lý toàn bộ chương trình khuyến mãi"
                icon={<Gift size={30} />}
                buttonText="Thêm khuyến mãi"
                onAdd={handleOpenAdd}
                searchValue={search}
                onSearchChange={setSearch}
            >
                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu khuyến mãi...</span>
                    </div>
                ) : (
                    <>
                        <AdminTable columns={columns} data={promotions} />
                        <AdminPagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    </>
                )}
            </AdminPage>

            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingPromotion ? 'Cập nhật khuyến mãi' : 'Thêm khuyến mãi mới'}
            >
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingPromotion ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
                    filePreviews={filePreviews}
                />
            </AdminModal>

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
                            <button className="admin-cancel-btn" onClick={alertModal.onCancel}>Hủy bỏ</button>
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

export default PromotionPage;