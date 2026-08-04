import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Image,
    Edit,
    Trash2,
    Loader2,
    Eye,
    CheckCircle,
    XCircle
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

const PAGE_OPTIONS = [
    { label: 'Trang chủ', value: 'HOME' },
    { label: 'Khuyến mãi', value: 'PROMOTION' },
    { label: 'Rạp chiếu', value: 'CINEMA' },
    { label: 'Bài viết đánh giá', value: 'FILM_REVIEW' },
    { label: 'Blog điện ảnh', value: 'BLOG' },
    { label: 'Diễn viên', value: 'ACTOR' }
];

const initialFormData = {
    page: 'HOME',
    is_active: true
};

const BannerPage = () => {
    const [banners, setBanners] = useState([]);
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
    const [editingBanner, setEditingBanner] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [bannerImageFile, setBannerImageFile] = useState(null);
    const [formErrors, setFormErrors] = useState({});

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

    // ======================================================
    // FETCH BANNERS (PAGINATION + SEARCH)
    // ======================================================
    const fetchBanners = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/banners', {
                params: { page, limit: 20, search: keyword.trim() },
                signal: controller.signal
            });

            const responseData = res.data?.data;
            const bannersData = responseData?.data || [];
            const paginationData = responseData?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1
            };

            setBanners(bannersData);
            setPagination(paginationData);

        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('FETCH BANNERS ERROR:', error);
            showAlert('Lỗi', 'Không thể tải danh sách banner.', 'error');
            setBanners([]);
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        fetchBanners(1, '');
    }, []);

    // ======================================================
    // SEARCH DEBOUNCE
    // ======================================================
    const prevSearchRef = useRef('');
    useEffect(() => {
        if (search === prevSearchRef.current) return;
        prevSearchRef.current = search;

        const timer = setTimeout(() => fetchBanners(1, search), 400);
        return () => clearTimeout(timer);
    }, [search, fetchBanners]);

    const handlePageChange = (page) => fetchBanners(page, search);

    // ======================================================
    // VALIDATE FORM
    // ======================================================
    const validateForm = () => {
        const errors = {};
        if (!formData.page) {
            errors.page = 'Vui lòng chọn trang';
        }
        if (!bannerImageFile && !editingBanner) {
            errors.image_url = 'Vui lòng chọn file ảnh';
        }
        if (bannerImageFile && !bannerImageFile.type.startsWith('image/')) {
            errors.image_url = 'Vui lòng chọn file ảnh (jpg, png, ...)';
        }
        return errors;
    };

    // ======================================================
    // HANDLE MODAL ACTIONS
    // ======================================================
    const handleOpenAdd = () => {
        setEditingBanner(null);
        setFormData(initialFormData);
        setBannerImageFile(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (banner) => {
        setEditingBanner(banner);
        setFormErrors({});
        setBannerImageFile(null);
        setFormData({
            page: banner.page || 'HOME',
            is_active: banner.is_active === 1 || banner.is_active === true
        });
        setIsFormOpen(true);
    };

    // ======================================================
    // HANDLE FORM CHANGE
    // ======================================================
    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;

        if (name === 'image_url') {
            setBannerImageFile(files[0]);
            return;
        }

        const newValue = type === 'checkbox' ? checked : value;
        setFormData((prev) => ({ ...prev, [name]: newValue }));
        setFormErrors((prev) => ({ ...prev, [name]: '' }));
    };

    // ======================================================
    // HANDLE SUBMIT
    // ======================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        try {
            setSubmitLoading(true);
            const submitData = new FormData();
            submitData.append('page', formData.page);
            submitData.append('is_active', formData.is_active ? 1 : 0);
            if (bannerImageFile) {
                submitData.append('image_url', bannerImageFile);
            }

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingBanner) {
                await api.put(`/api/banners/${editingBanner.banner_id}`, submitData, config);
                showAlert('Thành công', 'Cập nhật banner thành công.', 'success');
            } else {
                await api.post('/api/banners', submitData, config);
                showAlert('Thành công', 'Thêm banner thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchBanners(pagination.page, search);
        } catch (error) {
            const backendField = error.response?.data?.field;
            const backendMessage = error.response?.data?.message || 'Đã xảy ra lỗi.';
            if (backendField) {
                setFormErrors({ [backendField]: backendMessage });
            } else {
                showAlert('Lỗi', backendMessage, 'error');
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    // ======================================================
    // HANDLE DELETE
    // ======================================================
    const handleDelete = (banner) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa banner "${banner.page}" (ID: ${banner.banner_id})?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/banners/${banner.banner_id}`);
                    closeAlert();

                    const newPage = banners.length === 1 && pagination.page > 1
                        ? pagination.page - 1
                        : pagination.page;
                    fetchBanners(newPage, search);
                    showAlert('Thành công', 'Xóa banner thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', 'Không thể xóa banner.', 'error');
                }
            },
            closeAlert
        );
    };

    // ======================================================
    // COLUMNS
    // ======================================================
    const columns = [
        {
            title: 'ID',
            key: 'banner_id',
            render: (row) => `#${row.banner_id}`
        },
        {
            title: 'Trang',
            key: 'page',
            render: (row) => {
                const pageMap = {
                    HOME: 'Trang chủ',
                    PROMOTION: 'Khuyến mãi',
                    CINEMA: 'Rạp chiếu',
                    FILM_REVIEW: 'Bài viết đánh giá',
                    BLOG: 'Blog điện ảnh',
                    ACTOR: 'Diễn viên'
                };
                return (
                    <span className="status-badge page-badge">
                        {pageMap[row.page] || row.page}
                    </span>
                );
            }
        },
        {
            title: 'Ảnh banner',
            key: 'image_url',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                        src={row.image_url}
                        alt="banner"
                        style={{
                            width: '60px',
                            height: '36px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    />
                    <a
                        href={row.image_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--silver-primary)', fontSize: '12px' }}
                    >
                        <Eye size={16} />
                    </a>
                </div>
            )
        },
        {
            title: 'Trạng thái',
            key: 'is_active',
            render: (row) => (
                <span className={`status-badge ${row.is_active ? 'active' : 'inactive'}`}>
                    {row.is_active ? (
                        <>
                            <CheckCircle size={14} /> Hoạt động
                        </>
                    ) : (
                        <>
                            <XCircle size={14} /> Ẩn
                        </>
                    )}
                </span>
            )
        },
        {
            title: 'Ngày tạo',
            key: 'created_at',
            render: (row) =>
                row.created_at
                    ? new Date(row.created_at).toLocaleDateString('vi-VN')
                    : '—'
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
        {
            label: 'Trang hiển thị',
            name: 'page',
            type: 'select',
            options: PAGE_OPTIONS,
            required: true
        },
        {
            label: 'Ảnh banner',
            name: 'image_url',
            type: 'file',
            required: !editingBanner
        },
        {
            label: 'Hoạt động',
            name: 'is_active',
            type: 'checkbox',
            description: 'Bật để hiển thị banner trên trang'
        }
    ];

    const filePreviews = {};
    if (editingBanner && editingBanner.image_url) {
        filePreviews['image_url'] = {
            url: editingBanner.image_url,
            name: editingBanner.image_url.split('/').pop() || 'banner.png'
        };
    }

    // ======================================================
    // RENDER
    // ======================================================
    return (
        <>
            <AdminPage
                title="Quản lý Banner"
                subtitle="Quản lý banner quảng cáo trên các trang"
                icon={<Image size={30} />}
                buttonText="Thêm Banner"
                onAdd={handleOpenAdd}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Tìm theo ID, trang, URL..."
            >
                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <>
                        <AdminTable columns={columns} data={banners} />
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
                title={editingBanner ? 'Cập nhật banner' : 'Thêm banner mới'}
            >
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingBanner ? 'Lưu thay đổi' : 'Thêm banner'}
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
                    <p>{alertModal.message}</p>
                    <div className="admin-alert-actions">
                        {alertModal.onCancel && (
                            <button className="admin-cancel-btn" onClick={alertModal.onCancel}>
                                Hủy
                            </button>
                        )}
                        <button
                            className="admin-confirm-btn"
                            onClick={alertModal.onConfirm || closeAlert}
                        >
                            Xác nhận
                        </button>
                    </div>
                </div>
            </AdminModal>
        </>
    );
};

export default BannerPage;