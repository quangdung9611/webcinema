import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    BookOpen,
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
// HELPERS & CONSTANTS
// ==========================================================
const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `https://api.quangdungcinema.id.vn/uploads/blog_cinema/${image}`;
};

const DEFAULT_IMAGE = 'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-blog.jpg';

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
const BlogCinemaPage = () => {
    // ======================================================
    // STATES
    // ======================================================
    const [blogs, setBlogs] = useState([]);
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
    const [editingBlog, setEditingBlog] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [blogImageFile, setBlogImageFile] = useState(null);

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
    // FETCH BLOGS - GIỐNG MoviePage
    // ======================================================
    const fetchBlogs = useCallback(async (page = 1, keyword = '') => {
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
            const res = await api.get('/api/blog-cinema/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const blogsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setBlogs(blogsData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request bị hủy');
                return;
            }
            console.error('FETCH BLOGS ERROR:', error);
            setBlogs([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách blog.', 'error');
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
        fetchBlogs(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchBlogs]);

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
            fetchBlogs(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchBlogs]);

    const handlePageChange = (page) => {
        fetchBlogs(page, search);
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

    // ======================================================
    // HANDLE MODAL ACTIONS
    // ======================================================
    const handleOpenAdd = () => {
        setEditingBlog(null);
        setFormData(initialFormData);
        setErrors({});
        setBlogImageFile(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingBlog(item);
        setFormData({
            title: item.title || '',
            slug: item.slug || '',
            description: item.description || '',
            likes: item.likes || 0,
            is_active: item.is_active ?? 1
        });
        setErrors({});
        setBlogImageFile(null);
        setIsFormOpen(true);
    };

    // ======================================================
    // HANDLE CLOSE FORM
    // ======================================================
    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingBlog(null);
        setErrors({});
        setBlogImageFile(null);
    };

    // ======================================================
    // HANDLE FORM CHANGE
    // ======================================================
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }

        if (name === 'blog_image') {
            setBlogImageFile(files?.[0] || null);
            return;
        }

        if (name === 'title') {
            setFormData((prev) => ({
                ...prev,
                title: value,
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
            submitData.append('title', formData.title.trim());
            submitData.append('slug', formData.slug);
            submitData.append('description', formData.description.trim());
            submitData.append('likes', formData.likes || 0);
            submitData.append('is_active', formData.is_active);

            if (blogImageFile) {
                submitData.append('blog_image', blogImageFile);
            }

            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            if (editingBlog) {
                await api.put(`/api/blog-cinema/${editingBlog.blog_id}`, submitData, config);
                setIsFormOpen(false);
                fetchBlogs(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật blog thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/blog-cinema', submitData, config);
                setIsFormOpen(false);
                fetchBlogs(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Tạo blog mới thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            console.error('SUBMIT BLOG ERROR:', error);
            showAlert('Lỗi', error.response?.data?.message || 'Không thể lưu blog.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    // ======================================================
    // HANDLE DELETE
    // ======================================================
    const handleDelete = (item) => {
        showAlert(
            'Xác nhận xóa Blog',
            `Bạn có chắc muốn xóa blog "${item.title}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/blog-cinema/${item.blog_id}`);
                    closeAlert();

                    const currentPage = pagination.page;
                    const newPage = blogs.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchBlogs(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa blog thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE BLOG ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa blog.', 'error');
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
        e.target.src = DEFAULT_IMAGE;
    };

    // ======================================================
    // TABLE COLUMNS
    // ======================================================
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
                    onError={handleImageError}
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

    // ======================================================
    // FILE PREVIEWS
    // ======================================================
    const filePreviews = {};
    if (editingBlog && editingBlog.blog_image) {
        filePreviews['blog_image'] = {
            url: getImageUrl(editingBlog.blog_image),
            name: editingBlog.blog_image
        };
    }

    // ======================================================
    // RENDER
    // ======================================================
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
                    <>
                        <AdminTable columns={columns} data={blogs} />
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
                title={editingBlog ? 'Cập nhật Blog Cinema' : 'Thêm Blog Cinema mới'}
                type="default"
                size="lg"
            >
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingBlog ? 'Lưu thay đổi Blog' : 'Đăng Blog'}
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

export default BlogCinemaPage;