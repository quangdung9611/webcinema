import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    BookOpen,
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

const API_URL = 'https://api.quangdungcinema.id.vn/api/blog-cinema';

// =============================================
// HELPER: LẤY URL ẢNH (HỖ TRỢ CLOUDINARY + LOCAL)
// =============================================
const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) {
        return image;
    }
    return `https://api.quangdungcinema.id.vn/uploads/blog_cinema/${image}`;
};

const DEFAULT_IMAGE =
    'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-blog.jpg';

/* =====================================================
    INITIAL FORM DATA (chỉ các trường có trong DB)
===================================================== */
const initialFormData = {
    blog_id: '',
    title: '',
    slug: '',
    description: '',
    likes: 0,
    is_active: 1
};

const BlogCinemaPage = () => {

    /* =====================================================
        STATES
    ===================================================== */
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [blogImageFile, setBlogImageFile] = useState(null);
    const [preview, setPreview] = useState(null);

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
        CLEANUP PREVIEW
    ===================================================== */
    useEffect(() => {
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    /* =====================================================
        FETCH BLOGS
    ===================================================== */
    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_URL);
            setBlogs(res.data);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải danh sách blog từ máy chủ.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
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
        setEditingBlog(null);
        setFormData(initialFormData);
        setErrors({});
        setBlogImageFile(null);
        setPreview(null);
        setIsFormOpen(true);
    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */
    const handleOpenEdit = (item) => {
        setEditingBlog(item);
        setFormData({
            blog_id: item.blog_id || '',
            title: item.title || '',
            slug: item.slug || '',
            description: item.description || '',
            likes: item.likes || 0,
            is_active: item.is_active ?? 1
        });
        setErrors({});
        setPreview(
            item.blog_image ? getImageUrl(item.blog_image) : DEFAULT_IMAGE
        );
        setBlogImageFile(null);
        setIsFormOpen(true);
    };

    /* =====================================================
        CHANGE FORM
    ===================================================== */
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        if (name === 'blog_image') {
            const file = files[0];
            setBlogImageFile(file);
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

    /* =====================================================
        VALIDATE FORM
    ===================================================== */
    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Vui lòng nhập tiêu đề blog.';
        } else if (formData.title.trim().length < 5) {
            newErrors.title = 'Tiêu đề blog phải từ 5 ký tự trở lên.';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Vui lòng nhập mô tả blog.';
        }

        if (!editingBlog && !blogImageFile) {
            newErrors.blog_image = 'Vui lòng chọn ảnh blog.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /* =====================================================
        SUBMIT
    ===================================================== */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSubmitLoading(true);

            const submitData = new FormData();
            submitData.append('title', formData.title.trim());
            submitData.append('slug', formData.slug);
            submitData.append('description', formData.description.trim());
            submitData.append('likes', formData.likes || 0);
            submitData.append('is_active', formData.is_active);

            if (blogImageFile) {
                submitData.append('blog_image', blogImageFile);
            }

            const token = sessionStorage.getItem('usertoken');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token && { Authorization: `Bearer ${token}` })
                }
            };

            if (editingBlog) {
                // ✅ SỬA: bỏ /update/ để khớp với router mới
                await axios.put(`${API_URL}/${editingBlog.blog_id}`, submitData, config);
                showAlert('Thành công', 'Cập nhật blog thành công.', 'success');
            } else {
                await axios.post(API_URL, submitData, config);
                showAlert('Thành công', 'Tạo blog mới thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchBlogs();
        } catch (error) {
            showAlert(
                'Lỗi hệ thống',
                error.response?.data?.message || 'Không thể lưu blog.',
                'error'
            );
        } finally {
            setSubmitLoading(false);
        }
    };

    /* =====================================================
        DELETE BLOG
    ===================================================== */
    const handleDelete = (item) => {
        showAlert(
            'Xác nhận xóa Blog',
            `Hành động này không thể hoàn tác. Bạn có chắc muốn xóa blog "${item.title}" khỏi hệ thống?`,
            'warning',
            async () => {
                try {
                    const token = sessionStorage.getItem('usertoken');
                    const config = {
                        headers: {
                            ...(token && { Authorization: `Bearer ${token}` })
                        }
                    };
                    await axios.delete(`${API_URL}/${item.blog_id}`, config);
                    closeAlert();
                    fetchBlogs();
                    showAlert('Thành công', 'Xóa blog thành công.', 'success');
                } catch (error) {
                    showAlert(
                        'Lỗi',
                        error.response?.data?.message || 'Không thể xóa blog.',
                        'error'
                    );
                }
            },
            closeAlert
        );
    };

    /* =====================================================
        FILTER BLOGS
    ===================================================== */
    const filteredBlogs = blogs.filter(item => {
        const keyword = search.toLowerCase();
        return (
            item.title?.toLowerCase().includes(keyword) ||
            item.description?.toLowerCase().includes(keyword)
        );
    });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */
    const columns = [
        {
            title: 'Hình ảnh',
            key: 'blog_image',
            render: (row) => (
                <img
                    src={getImageUrl(row.blog_image) || DEFAULT_IMAGE}
                    alt="blog"
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
                <span className={row.is_active ? 'status-badge success' : 'status-badge danger'}>
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
                <a
                    href={`/blog/${row.slug}`}
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

    /* =====================================================
        FORM FIELDS (chỉ các trường có trong DB)
    ===================================================== */
    const formFields = [
        {
            label: 'Tiêu đề Blog',
            name: 'title',
            type: 'text',
            placeholder: 'Nhập tiêu đề blog điện ảnh'
        },
        {
            label: 'Slug',
            name: 'slug',
            type: 'text',
            disabled: true,
            placeholder: 'Tự động tạo từ tiêu đề'
        },
        {
            label: 'Mô tả ngắn',
            name: 'description',
            type: 'textarea',
            placeholder: 'Nhập mô tả ngắn cho blog'
        },
        {
            label: 'Hình ảnh Blog',
            name: 'blog_image',
            type: 'file'
        },
        {
            label: 'Likes',
            name: 'likes',
            type: 'number',
            placeholder: '0'
        },
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
                title="Quản lý Blog Cinema"
                subtitle="Quản lý toàn bộ bài viết Blog điện ảnh"
                icon={<BookOpen size={30} />}
                buttonText="Thêm Blog"
                onAdd={handleOpenAdd}
                searchValue={search}
                onSearchChange={setSearch}
            >
                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang đồng bộ dữ liệu Blog...</span>
                    </div>
                ) : (
                    <AdminTable columns={columns} data={filteredBlogs} />
                )}
            </AdminPage>

            {/* ==========================================
                FORM MODAL
            ========================================== */}
            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingBlog ? 'Cập nhật Blog Cinema' : 'Thêm Blog Cinema mới'}
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
                    submitText={editingBlog ? 'Lưu thay đổi Blog' : 'Đăng Blog'}
                />
            </AdminModal>

            {/* ==========================================
                ALERT MODAL
            ========================================== */}
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
                                Hủy bỏ
                            </button>
                        )}
                        <button className="admin-confirm-btn" onClick={alertModal.onConfirm || closeAlert}>
                            Xác nhận hành động
                        </button>
                    </div>
                </div>
            </AdminModal>
        </>
    );
};

export default BlogCinemaPage;