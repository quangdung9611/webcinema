// pages/admin/NewsPage.js
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
// IMAGE URL HELPERS
// ==========================================================
const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `https://api.quangdungcinema.id.vn/uploads/news/${image}`;
};

// ==========================================================
// INITIAL FORM
// ==========================================================
const initialFormData = {
    title: '',
    slug: '',
    content: '',
    likes: 0
};

// ==========================================================
// COMPONENT
// ==========================================================
const NewsPage = () => {

    // DATA
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    // SEARCH & PAGINATION
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
    });

    // CHỐNG GỌI TRÙNG
    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    // FORM
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNews, setEditingNews] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [newsImageFile, setNewsImageFile] = useState(null);
    const [newsBackdropFile, setNewsBackdropFile] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // ALERT MODAL
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
        setAlertModal((prev) => ({
            ...prev,
            open: false,
            onConfirm: null,
            onCancel: null
        }));
    };

    // FETCH NEWS
    const fetchNews = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/news/paginated', {
                params: { page, limit: 20, search: keyword.trim() },
                signal: controller.signal
            });

            setNews(res.data?.data || []);
            setPagination(res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });

        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
            console.error('FETCH NEWS ERROR:', error);
            showAlert('Lỗi', 'Không thể tải danh sách tin tức.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    // MOUNT
    useEffect(() => {
        fetchNews(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchNews]);

    // SEARCH DEBOUNCE
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

    // PAGE CHANGE
    const handlePageChange = (page) => {
        fetchNews(page, search);
    };

    // VALIDATE FORM
    const validateForm = () => {
        const errors = {};
        if (!formData.title.trim()) errors.title = 'Vui lòng nhập tiêu đề bài viết.';
        if (!formData.content.trim()) errors.content = 'Vui lòng nhập nội dung bài viết.';
        if (!editingNews && !newsImageFile) {
            errors.news_image = 'Vui lòng chọn file hình ảnh cho bài viết.';
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

    // OPEN ADD / EDIT
    const handleOpenAdd = () => {
        setEditingNews(null);
        setFormData(initialFormData);
        setNewsImageFile(null);
        setNewsBackdropFile(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingNews(item);
        setFormData({
            title: item.title || '',
            slug: item.slug || '',
            content: item.content || '',
            likes: item.likes || 0
        });
        setNewsImageFile(null);
        setNewsBackdropFile(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingNews(null);
        setFormErrors({});
        setNewsImageFile(null);
        setNewsBackdropFile(null);
    };

    // HANDLE CHANGE
    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));

        if (name === 'news_image') {
            setNewsImageFile(files?.[0] || null);
            return;
        }
        if (name === 'news_backdrop') {
            setNewsBackdropFile(files?.[0] || null);
            return;
        }
        if (name === 'title') {
            setFormData(prev => ({ ...prev, title: value, slug: generateSlug(value) }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // SUBMIT
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSubmitLoading(true);
            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => submitData.append(key, value));
            if (newsImageFile) submitData.append('news_image', newsImageFile);
            if (newsBackdropFile) submitData.append('news_backdrop', newsBackdropFile);

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingNews) {
                await api.put(`/api/news/${editingNews.news_id}`, submitData, config);
                setIsFormOpen(false);
                fetchNews(pagination.page, search);
                showAlert('Thành công', 'Cập nhật bài viết thành công.', 'success');
            } else {
                await api.post('/api/news', submitData, config);
                setIsFormOpen(false);
                fetchNews(pagination.page, search);
                showAlert('Thành công', 'Thêm bài viết thành công.', 'success');
            }
        } catch (error) {
            console.error('SUBMIT NEWS ERROR:', error);
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

    // DELETE
    const handleDelete = (item) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa bài viết "${item.title}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/news/${item.news_id}`);
                    closeAlert();
                    const currentPage = pagination.page;
                    const newPage = news.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchNews(newPage, search);
                    showAlert('Thành công', 'Xóa bài viết thành công.', 'success');
                } catch (error) {
                    console.error('DELETE NEWS ERROR:', error);
                    closeAlert();
                    showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa bài viết.', 'error');
                }
            },
            closeAlert
        );
    };

    // TABLE COLUMNS
    const columns = [
        {
            title: 'Hình ảnh',
            key: 'news_image',
            render: (row) => (
                <img
                    src={getImageUrl(row.news_image)}
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
            title: 'Ngày đăng',
            key: 'created_at',
            render: (row) => new Date(row.created_at).toLocaleDateString('vi-VN')
        },
        {
            title: 'Xem',
            key: 'slug',
            render: (row) => (
                <a href={`/news/detail/${row.slug}`} target="_blank" rel="noreferrer" style={{ color: '#06b6d4' }}>
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

    // FORM FIELDS
    const formFields = [
        { label: 'Tiêu đề bài viết', name: 'title', type: 'text', placeholder: 'Nhập tiêu đề tin tức' },
        { label: 'Slug', name: 'slug', type: 'text', placeholder: 'Slug tự động', disabled: true },
        { label: 'Hình ảnh đại diện', name: 'news_image', type: 'file' },
        { label: 'Hình ảnh ngang (Backdrop)', name: 'news_backdrop', type: 'file' },
        { label: 'Likes', name: 'likes', type: 'number', placeholder: '0' },
        { label: 'Nội dung', name: 'content', type: 'textarea', placeholder: 'Nhập nội dung bài viết', rows: 10 }
    ];

    // FILE PREVIEWS
    const filePreviews = {};
    if (editingNews) {
        if (editingNews.news_image) {
            filePreviews['news_image'] = {
                url: getImageUrl(editingNews.news_image),
                name: editingNews.news_image
            };
        }
        if (editingNews.news_backdrop) {
            filePreviews['news_backdrop'] = {
                url: getImageUrl(editingNews.news_backdrop),
                name: editingNews.news_backdrop
            };
        }
    }

    // RENDER
    return (
        <>
            <AdminPage
                title="Quản lý tin tức"
                subtitle="Quản lý toàn bộ tin tức trong hệ thống"
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

            {/* FORM MODAL */}
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
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingNews ? 'Lưu thay đổi' : 'Thêm bài viết'}
                    filePreviews={filePreviews}
                />
            </AdminModal>

            {/* ALERT / CONFIRM MODAL */}
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