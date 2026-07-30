import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

const API_URL = 'https://api.quangdungcinema.id.vn/api/banners';

const PAGE_OPTIONS = [
    { label: 'Trang chủ', value: 'HOME' },
    { label: 'Khuyến mãi', value: 'PROMOTION' },
    { label: 'Rạp chiếu', value: 'CINEMA' },
    { label: 'Bài viết đánh giá', value: 'FILM_REVIEW' },
    { label: 'Blog điện ảnh', value: 'BLOG' }
];

const initialFormData = {
    page: 'HOME',
    image_url: '',
    is_active: true
};

const BannerPage = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
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

    // =============================================
    // Helper – Lấy token từ localStorage
    // =============================================
    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Không tìm thấy token, vui lòng đăng nhập lại');
            return {};
        }
        return { Authorization: `Bearer ${token}` };
    };

    // =============================================
    // Alert Modal
    // =============================================
    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, type, onConfirm, onCancel });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, open: false }));
    };

    // =============================================
    // Fetch banners
    // =============================================
    const fetchBanners = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_URL);
            const bannersData = res.data?.data || res.data || [];
            setBanners(Array.isArray(bannersData) ? bannersData : []);
        } catch (error) {
            console.error('Fetch banners error:', error);
            showAlert('Lỗi', 'Không thể tải danh sách banner.', 'error');
            setBanners([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    // =============================================
    // Validate form
    // =============================================
    const validateForm = () => {
        const errors = {};
        if (!formData.page) {
            errors.page = 'Vui lòng chọn trang';
        }
        if (!formData.image_url.trim()) {
            errors.image_url = 'Vui lòng nhập URL ảnh';
        } else if (!/^https?:\/\/.+/.test(formData.image_url.trim())) {
            errors.image_url = 'URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)';
        }
        return errors;
    };

    // =============================================
    // Open add / edit
    // =============================================
    const handleOpenAdd = () => {
        setEditingBanner(null);
        setFormData(initialFormData);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (banner) => {
        setEditingBanner(banner);
        setFormErrors({});
        setFormData({
            page: banner.page || 'HOME',
            image_url: banner.image_url || '',
            is_active: banner.is_active === 1 || banner.is_active === true
        });
        setIsFormOpen(true);
    };

    // =============================================
    // Handle change
    // =============================================
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));
        setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

    // =============================================
    // Submit (Create / Update)
    // =============================================
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

            const payload = {
                page: formData.page,
                image_url: formData.image_url.trim(),
                is_active: formData.is_active ? 1 : 0
            };

            const headers = getAuthHeader();

            if (editingBanner) {
                await axios.put(`${API_URL}/${editingBanner.banner_id}`, payload, { headers });
                showAlert('Thành công', 'Cập nhật banner thành công.', 'success');
            } else {
                await axios.post(API_URL, payload, { headers });
                showAlert('Thành công', 'Thêm banner thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchBanners();
        } catch (error) {
            console.error('Submit banner error:', error);
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

    // =============================================
    // Delete
    // =============================================
    const handleDelete = (banner) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa banner "${banner.page}" (ID: ${banner.banner_id})?`,
            'warning',
            async () => {
                try {
                    const headers = getAuthHeader();
                    await axios.delete(`${API_URL}/${banner.banner_id}`, { headers });
                    closeAlert();
                    fetchBanners();
                    showAlert('Thành công', 'Xóa banner thành công.', 'success');
                } catch (error) {
                    console.error('Delete banner error:', error);
                    showAlert('Lỗi', 'Không thể xóa banner.', 'error');
                }
            },
            closeAlert
        );
    };

    // =============================================
    // Filter
    // =============================================
    const filteredBanners = (banners || []).filter(banner => {
        const keyword = search.toLowerCase();
        return (
            banner.page?.toLowerCase().includes(keyword) ||
            banner.banner_id?.toString().includes(keyword) ||
            banner.image_url?.toLowerCase().includes(keyword)
        );
    });

    // =============================================
    // Table columns
    // =============================================
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
                    BLOG: 'Blog điện ảnh'
                };
                return <span className="status-badge page-badge">{pageMap[row.page] || row.page}</span>;
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
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `<span style="color:#888;font-size:12px;">Không tải được</span>`;
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
                            <CheckCircle size={14} />
                            Hoạt động
                        </>
                    ) : (
                        <>
                            <XCircle size={14} />
                            Ẩn
                        </>
                    )}
                </span>
            )
        },
        {
            title: 'Ngày tạo',
            key: 'created_at',
            render: (row) => {
                if (!row.created_at) return '—';
                const date = new Date(row.created_at);
                return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
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
    // Form fields
    // =============================================
    const formFields = [
        {
            label: 'Trang hiển thị',
            name: 'page',
            type: 'select',
            options: PAGE_OPTIONS,
            required: true
        },
        {
            label: 'URL ảnh (Cloudinary)',
            name: 'image_url',
            type: 'text',
            placeholder: 'https://res.cloudinary.com/.../banner.png',
            required: true
        },
        {
            label: 'Hoạt động',
            name: 'is_active',
            type: 'checkbox',
            description: 'Bật để hiển thị banner trên trang'
        }
    ];

    // =============================================
    // File previews (cho image_url)
    // =============================================
    const filePreviews = {};
    if (editingBanner && editingBanner.image_url) {
        filePreviews['image_url'] = {
            url: editingBanner.image_url,
            name: editingBanner.image_url.split('/').pop() || 'banner.png'
        };
    }

    // =============================================
    // RENDER
    // =============================================
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
                    <AdminTable columns={columns} data={filteredBanners} />
                )}
            </AdminPage>

            {/* FORM MODAL */}
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

export default BannerPage;