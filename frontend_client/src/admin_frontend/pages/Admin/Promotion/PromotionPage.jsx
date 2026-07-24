import React, { useEffect, useState } from 'react';
import axios from 'axios';
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

const API_URL = 'https://api.quangdungcinema.id.vn/api/promotions';

// =============================================
// HELPER: LẤY URL ẢNH (HỖ TRỢ CLOUDINARY + LOCAL)
// GIỐNG MovieCard
// =============================================
const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) {
        return image;
    }
    return `https://api.quangdungcinema.id.vn/uploads/promotions/${image}`;
};

const DEFAULT_IMAGE =
    'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-promotion.jpg';

/* ==========================================
    INITIAL DATA (chỉ các trường có trong DB)
========================================== */
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
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [promotionImageFile, setPromotionImageFile] = useState(null);
    const [preview, setPreview] = useState(null);

    /* ==========================================
        ALERT
    ========================================== */
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

    /* ==========================================
        FETCH DATA
    ========================================== */
    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API_URL);
            setPromotions(res.data);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải danh sách khuyến mãi.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    /* ==========================================
        CLEAN PREVIEW
    ========================================== */
    useEffect(() => {
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    /* ==========================================
        SLUG
    ========================================== */
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

    /* ==========================================
        OPEN ADD
    ========================================== */
    const handleOpenAdd = () => {
        setEditingPromotion(null);
        setFormData(initialFormData);
        setErrors({});
        setPromotionImageFile(null);
        setPreview(null);
        setIsFormOpen(true);
    };

    /* ==========================================
        OPEN EDIT
    ========================================== */
    const handleOpenEdit = (item) => {
        setEditingPromotion(item);
        setFormData({
            title: item.title || '',
            slug: item.slug || '',
            description: item.description || '',
            likes: item.likes || 0,
            is_active: item.is_active ?? 1
        });

        // ✅ Dùng helper getImageUrl để hỗ trợ Cloudinary + local
        setPreview(
            item.promotion_image ? getImageUrl(item.promotion_image) : DEFAULT_IMAGE
        );
        setPromotionImageFile(null);
        setErrors({});
        setIsFormOpen(true);
    };

    /* ==========================================
        CHANGE
    ========================================== */
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        if (name === 'promotion_image') {
            const file = files[0];
            setPromotionImageFile(file);
            if (file) {
                if (preview && preview.startsWith('blob:')) {
                    URL.revokeObjectURL(preview);
                }
                setPreview(URL.createObjectURL(file));
            }
            return;
        }

        if (name === 'title') {
            setFormData(prev => ({
                ...prev,
                title: value,
                slug: generateSlug(value)
            }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /* ==========================================
        VALIDATE
    ========================================== */
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

    /* ==========================================
        SUBMIT
    ========================================== */
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

            if (promotionImageFile) {
                submitData.append('promotion_image', promotionImageFile);
            }

            const token = sessionStorage.getItem('usertoken');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token && { Authorization: `Bearer ${token}` })
                }
            };

            if (editingPromotion) {
              await axios.put(`${API_URL}/${editingPromotion.promotion_id}`, submitData, config);
                showAlert('Thành công', 'Cập nhật khuyến mãi thành công.', 'success');
            } else {
                await axios.post(API_URL, submitData, config);
                showAlert('Thành công', 'Tạo khuyến mãi mới thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchPromotions();
        } catch (error) {
            showAlert('Lỗi', error.response?.data?.message || 'Không thể lưu dữ liệu.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    /* ==========================================
        DELETE
    ========================================== */
    const handleDelete = (item) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa khuyến mãi "${item.title}"?`,
            'warning',
            async () => {
                try {
                    const token = sessionStorage.getItem('usertoken');
                    await axios.delete(`${API_URL}/${item.promotion_id}`, {
                        data: { token }
                    });
                    closeAlert();
                    fetchPromotions();
                    showAlert('Thành công', 'Xóa khuyến mãi thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', 'Không thể xóa khuyến mãi.', 'error');
                }
            },
            closeAlert
        );
    };

    /* ==========================================
        FILTER
    ========================================== */
    const filteredPromotions = promotions.filter(item => {
        const keyword = search.toLowerCase();
        return (
            item.title?.toLowerCase().includes(keyword) ||
            item.description?.toLowerCase().includes(keyword)
        );
    });

    /* ==========================================
        TABLE COLUMNS
    ========================================== */
    const columns = [
        {
            title: 'Hình ảnh',
            key: 'promotion_image',
            render: (row) => (
                <img
                    src={getImageUrl(row.promotion_image) || DEFAULT_IMAGE}
                    alt="promotion"
                    style={{
                        width: '120px',
                        height: '70px',
                        objectFit: 'cover',
                        borderRadius: '10px'
                    }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_IMAGE;
                    }}
                />
            )
        },
        {
            title: 'Tiêu đề',
            key: 'title'
        },
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
                    {row.is_active ? 'Đang hoạt động' : 'Đã ẩn'}
                </span>
            )
        },
        {
            title: 'Ngày tạo',
            key: 'created_at',
            render: (row) =>
                row.full_date ||
                new Date(row.created_at).toLocaleDateString('vi-VN')
        },
        {
            title: 'Xem',
            key: 'slug',
            render: (row) => (
                <a
                    href={`/promotion/${row.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#06b6d4' }}
                >
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

    /* ==========================================
        FORM FIELDS
    ========================================== */
    const formFields = [
        {
            label: 'Tiêu đề khuyến mãi',
            name: 'title',
            type: 'text'
        },
        {
            label: 'Slug',
            name: 'slug',
            type: 'text',
            disabled: true
        },
        {
            label: 'Mô tả ngắn',
            name: 'description',
            type: 'textarea'
        },
        {
            label: 'Hình ảnh',
            name: 'promotion_image',
            type: 'file'
        },
        {
            label: 'Likes',
            name: 'likes',
            type: 'number'
        },
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

    /* ==========================================
        ALERT ICON
    ========================================== */
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

    /* ==========================================
        RENDER
    ========================================== */
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
                    <AdminTable columns={columns} data={filteredPromotions} />
                )}
            </AdminPage>

            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingPromotion ? 'Cập nhật khuyến mãi' : 'Thêm khuyến mãi mới'}
            >
                {preview && (
                    <div style={{ marginBottom: '20px' }}>
                        <img
                            src={preview}
                            alt="preview"
                            style={{
                                width: '100%',
                                height: '220px',
                                objectFit: 'cover',
                                borderRadius: '12px'
                            }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = DEFAULT_IMAGE;
                            }}
                        />
                    </div>
                )}
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingPromotion ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
                />
            </AdminModal>

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
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
                                Hủy bỏ
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

export default PromotionPage;