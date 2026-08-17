// pages/admin/PromotionPage.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Gift,
    Edit,
    Trash2,
    Loader2,
    Eye,
    Heart,
    ExternalLink
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// IMAGE URL HELPERS
// ==========================================================
const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `https://api.quangdungcinema.id.vn/uploads/promotions/${image}`;
};

// ==========================================================
// INITIAL FORM
// ==========================================================
const initialFormData = {
    title: '',
    slug: '',
    description: '',
    likes: 0,
    is_active: 1
};

// ==========================================================
// COMPONENT
// ==========================================================
const PromotionPage = () => {

    // ======================================================
    // DATA
    // ======================================================
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    // ======================================================
    // SEARCH & PAGINATION
    // ======================================================
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });

    // ======================================================
    // CHỐNG GỌI TRÙNG
    // ======================================================
    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    // ======================================================
    // FORM
    // ======================================================
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [promotionImageFile, setPromotionImageFile] = useState(null);
    const [promotionBackdropFile, setPromotionBackdropFile] = useState(null);
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

    // ======================================================
    // FETCH PROMOTIONS
    // ======================================================
    const fetchPromotions = useCallback(async (page = 1, keyword = '') => {
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
            const res = await api.get('/api/promotions/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const promotionsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setPromotions(promotionsData);
            setPagination(paginationData);

        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request bị hủy');
                return;
            }
            console.error('FETCH PROMOTIONS ERROR:', error);
            setPromotions([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách khuyến mãi.', 'error');
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
        fetchPromotions(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchPromotions]);

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
            fetchPromotions(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchPromotions]);

    // ======================================================
    // PAGE CHANGE
    // ======================================================
    const handlePageChange = (page) => {
        fetchPromotions(page, search);
    };

    // ======================================================
    // VALIDATE FORM
    // ======================================================
    const validateForm = () => {
        const errors = {};
        if (!formData.title.trim()) errors.title = 'Vui lòng nhập tiêu đề khuyến mãi.';
        if (!formData.description.trim()) errors.description = 'Vui lòng nhập mô tả khuyến mãi.';
        if (!editingPromotion && !promotionImageFile) {
            errors.promotion_image = 'Vui lòng chọn file hình ảnh cho khuyến mãi.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

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
    // OPEN ADD / EDIT
    // ======================================================
    const handleOpenAdd = () => {
        setEditingPromotion(null);
        setFormData(initialFormData);
        setPromotionImageFile(null);
        setPromotionBackdropFile(null);
        setFormErrors({});
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
        setPromotionImageFile(null);
        setPromotionBackdropFile(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingPromotion(null);
        setFormErrors({});
        setPromotionImageFile(null);
        setPromotionBackdropFile(null);
    };

    // ======================================================
    // HANDLE CHANGE
    // ======================================================
    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));

        if (name === 'promotion_image') {
            setPromotionImageFile(files?.[0] || null);
            return;
        }
        if (name === 'promotion_backdrop') {
            setPromotionBackdropFile(files?.[0] || null);
            return;
        }
        if (name === 'title') {
            setFormData(prev => ({ ...prev, title: value, slug: generateSlug(value) }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // ======================================================
    // SUBMIT
    // ======================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        try {
            setSubmitLoading(true);
            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => submitData.append(key, value));
            if (promotionImageFile) submitData.append('promotion_image', promotionImageFile);
            if (promotionBackdropFile) submitData.append('promotion_backdrop', promotionBackdropFile);

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingPromotion) {
                await api.put(`/api/promotions/${editingPromotion.promotion_id}`, submitData, config);
                setIsFormOpen(false);
                fetchPromotions(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật khuyến mãi thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/promotions', submitData, config);
                setIsFormOpen(false);
                fetchPromotions(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Thêm khuyến mãi thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            console.error('SUBMIT PROMOTION ERROR:', error);
            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.message;
            if (backendField) {
                setFormErrors({ [backendField]: backendError });
                return;
            }
            showAlert('Lỗi', backendError || 'Đã xảy ra lỗi.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    // ======================================================
    // DELETE
    // ======================================================
    const handleDelete = (item) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa khuyến mãi "${item.title}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/promotions/${item.promotion_id}`);
                    closeAlert();
                    const currentPage = pagination.page;
                    const newPage = promotions.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchPromotions(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa khuyến mãi thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE PROMOTION ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa khuyến mãi.', 'error');
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
            title: 'Hình ảnh',
            key: 'promotion_image',
            render: (row) => (
                <img
                    src={getImageUrl(row.promotion_image)}
                    alt={row.title}
                    style={{ width: '70px', height: '100px', objectFit: 'cover', borderRadius: '10px' }}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/70x100?text=No+Image'; }}
                />
            )
        },
        { title: 'Tiêu đề', key: 'title' },
        {
            title: 'Lượt xem',
            key: 'views',
            render: (row) => (
                <span className="status-badge">
                    <Eye size={12} /> {row.views || 0}
                </span>
            )
        },
        {
            title: 'Lượt thích',
            key: 'likes',
            render: (row) => (
                <span className="status-badge">
                    <Heart size={12} /> {row.likes || 0}
                </span>
            )
        },
        {
            title: 'Trạng thái',
            key: 'is_active',
            render: (row) => (
                <span className={`status-badge ${row.is_active ? 'success' : 'danger'}`}>
                    {row.is_active ? 'Hiển thị' : 'Đã ẩn'}
                </span>
            )
        },
        {
            title: 'Ngày tạo',
            key: 'full_date'
        },
        {
            title: 'Xem',
            key: 'slug',
            render: (row) => (
                <a href={`/promotion/detail/${row.slug}`} target="_blank" rel="noreferrer" style={{ color: '#06b6d4' }}>
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

    // ======================================================
    // FORM FIELDS
    // ======================================================
    const formFields = [
        { label: 'Tiêu đề khuyến mãi', name: 'title', type: 'text', placeholder: 'Nhập tiêu đề khuyến mãi' },
        { label: 'Slug', name: 'slug', type: 'text', placeholder: 'Slug tự động', disabled: true },
        { label: 'Mô tả', name: 'description', type: 'textarea', placeholder: 'Nhập mô tả khuyến mãi' },
        { label: 'Hình ảnh', name: 'promotion_image', type: 'file' },
        { label: 'Hình ảnh ngang (Backdrop)', name: 'promotion_backdrop', type: 'file' },
        { label: 'Likes', name: 'likes', type: 'number', placeholder: '0' },
        {
            label: 'Trạng thái',
            name: 'is_active',
            type: 'select',
            options: [
                { label: 'Hiển thị', value: 1 },
                { label: 'Ẩn', value: 0 }
            ]
        }
    ];

    // ======================================================
    // FILE PREVIEWS
    // ======================================================
    const filePreviews = {};
    if (editingPromotion) {
        if (editingPromotion.promotion_image) {
            filePreviews['promotion_image'] = {
                url: getImageUrl(editingPromotion.promotion_image),
                name: editingPromotion.promotion_image
            };
        }
        if (editingPromotion.promotion_backdrop) {
            filePreviews['promotion_backdrop'] = {
                url: getImageUrl(editingPromotion.promotion_backdrop),
                name: editingPromotion.promotion_backdrop
            };
        }
    }

    // ======================================================
    // RENDER
    // ======================================================
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
                        <span>Đang tải dữ liệu...</span>
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

            {/* ==================================================
                FORM MODAL
            ================================================== */}
            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title={editingPromotion ? 'Cập nhật khuyến mãi' : 'Thêm khuyến mãi mới'}
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
                    submitText={editingPromotion ? 'Lưu thay đổi' : 'Thêm khuyến mãi'}
                    filePreviews={filePreviews}
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

export default PromotionPage;