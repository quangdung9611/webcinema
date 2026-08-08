import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Newspaper,
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
    return `https://api.quangdungcinema.id.vn/uploads/news/${image}`;
};

const initialFormData = {
    title: '',
    slug: '',
    content: ''
};

// ==========================================================
// COMPONENT
// ==========================================================
const NewsPage = () => {
    // ======================================================
    // STATES
    // ======================================================
    const [news, setNews] = useState([]);
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
    const [editingNews, setEditingNews] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [newsImageFile, setNewsImageFile] = useState(null);
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
    // FETCH NEWS (GIỐNG MOVIEPAGE)
    // ======================================================
    const fetchNews = useCallback(async (page = 1, keyword = '') => {
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
            const res = await api.get('/api/news/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            // ✅ LẤY TRỰC TIẾP TỪ res.data (giống MoviePage)
            const newsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setNews(newsData);
            setPagination(paginationData);

        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request bị hủy');
                return;
            }
            console.error('FETCH NEWS ERROR:', error);
            setNews([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách tin tức.', 'error');
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
        fetchNews(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchNews]);

    // ======================================================
    // SEARCH - DEBOUNCE 400ms
    // ======================================================
    const prevSearchRef = useRef('');

    useEffect(() => {
        const currentSearch = search;
        const prevSearch = prevSearchRef.current;

        if (currentSearch === prevSearch) return;
        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchNews(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchNews]);

    // ======================================================
    // PAGE CHANGE
    // ======================================================
    const handlePageChange = (page) => {
        fetchNews(page, search);
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
            newErrors.title = 'Vui lòng nhập tiêu đề bài viết.';
        } else if (formData.title.trim().length < 5) {
            newErrors.title = 'Tiêu đề bài viết phải chứa ít nhất 5 ký tự.';
        }
        if (!formData.content.trim()) {
            newErrors.content = 'Vui lòng nhập nội dung chi tiết bài viết.';
        }
        if (!editingNews && !newsImageFile) {
            newErrors.news_image = 'Vui lòng chọn hình ảnh đại diện bài viết.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ======================================================
    // HANDLE MODAL ACTIONS
    // ======================================================
    const handleOpenAdd = () => {
        setEditingNews(null);
        setFormData(initialFormData);
        setErrors({});
        setNewsImageFile(null);
        setFilePreviews({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingNews(item);
        setFormData({
            title: item.title || '',
            slug: item.slug || '',
            content: item.content || ''
        });
        setErrors({});
        setNewsImageFile(null);
        setFilePreviews(
            item.news_image
                ? {
                      news_image: {
                          url: getImageUrl(item.news_image),
                          name: item.news_image
                      }
                  }
                : {}
        );
        setIsFormOpen(true);
    };

    // ======================================================
    // HANDLE FORM CHANGE
    // ======================================================
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }

        if (name === 'news_image') {
            const file = files[0];
            setNewsImageFile(file);
            if (file) {
                if (filePreviews.news_image?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(filePreviews.news_image.url);
                }
                setFilePreviews({
                    news_image: {
                        url: URL.createObjectURL(file),
                        name: file.name
                    }
                });
            } else {
                setFilePreviews({});
            }
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
            submitData.append('content', formData.content.trim());

            if (newsImageFile) {
                submitData.append('news_image', newsImageFile);
            }

            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            if (editingNews) {
                await api.put(`/api/news/${editingNews.news_id}`, submitData, config);
                setIsFormOpen(false);
                fetchNews(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật bài viết thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/news', submitData, config);
                setIsFormOpen(false);
                fetchNews(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Đăng bài viết mới thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showAlert('Lỗi', error.response?.data?.message || 'Không thể lưu bài viết.', 'error');
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    // ======================================================
    // HANDLE DELETE
    // ======================================================
    const handleDelete = (item) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa bài viết "${item.title}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/news/${item.news_id}`);
                    closeAlert();

                    const newPage = news.length === 1 && pagination.page > 1
                        ? pagination.page - 1
                        : pagination.page;
                    await fetchNews(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa bài viết thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE NEWS ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', 'Không thể xóa bài viết.', 'error');
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
        e.target.style.display = 'none';
    };

    // ======================================================
    // TABLE COLUMNS
    // ======================================================
    const columns = [
        {
            title: 'Hình ảnh',
            key: 'news_image',
            render: (row) => (
                <img
                    src={getImageUrl(row.news_image)}
                    alt="news"
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
            title: 'Ngày đăng',
            key: 'created_at',
            render: (row) =>
                new Date(row.created_at).toLocaleDateString('vi-VN')
        },
        {
            title: 'Xem',
            key: 'slug',
            render: (row) => (
                <a
                    href={`/news/${row.slug}`}
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
            label: 'Tiêu đề bài viết',
            name: 'title',
            type: 'text',
            placeholder: 'Nhập tiêu đề tin tức'
        },
        {
            label: 'Đường dẫn (Slug)',
            name: 'slug',
            type: 'text',
            disabled: true
        },
        {
            label: 'Hình ảnh đại diện',
            name: 'news_image',
            type: 'file'
        },
        {
            label: 'Nội dung chi tiết',
            name: 'content',
            type: 'textarea',
            placeholder: 'Nhập nội dung bài viết...'
        }
    ];

    // ======================================================
    // HANDLE CLOSE FORM
    // ======================================================
    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingNews(null);
        setErrors({});
        setNewsImageFile(null);
        setFilePreviews({});
    };

    // ======================================================
    // RENDER
    // ======================================================
    return (
        <>
            <AdminPage
                title="Quản lý tin tức"
                subtitle="Quản lý toàn bộ bài viết hệ thống"
                icon={<Newspaper size={30} />}
                buttonText="Thêm bài viết"
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
                        <AdminTable columns={columns} data={news} />
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
                title={editingNews ? 'Cập nhật bài viết' : 'Thêm bài viết mới'}
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
                    submitText={editingNews ? 'Lưu thay đổi' : 'Đăng bài viết'}
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

export default NewsPage;