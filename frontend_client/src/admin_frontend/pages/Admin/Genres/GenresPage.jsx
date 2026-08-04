import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Theater,
    Edit,
    Trash2,
    Loader2,
    Tag,
    Hash,
    Navigation,
    Sparkles,
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

// ==========================================================
// CONSTANTS
// ==========================================================
const initialFormData = {
    genre_name: '',
    slug: ''
};

// ==========================================================
// COMPONENT
// ==========================================================
const GenresPage = () => {
    // ======================================================
    // STATES
    // ======================================================
    const [genres, setGenres] = useState([]);
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
    const [editingGenre, setEditingGenre] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        onCancel: null
    });

    // ======================================================
    // ALERT HANDLER
    // ======================================================
    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, type, onConfirm, onCancel });
    };

    const closeAlert = () => setAlertModal((prev) => ({ ...prev, open: false }));

    // ======================================================
    // FETCH GENRES (PAGINATION + SEARCH)
    // ======================================================
    const fetchGenres = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/genres', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const responseData = res.data?.data;
            const genresData = responseData?.data || [];
            const paginationData = responseData?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1
            };

            setGenres(genresData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('FETCH GENRES ERROR:', error);
            showAlert('Lỗi', 'Không thể tải danh sách thể loại.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    // Khởi tạo lần đầu
    useEffect(() => {
        fetchGenres(1, '');
    }, []);

    // ======================================================
    // SEARCH DEBOUNCE
    // ======================================================
    const prevSearchRef = useRef('');
    useEffect(() => {
        if (search === prevSearchRef.current) return;
        prevSearchRef.current = search;

        const timer = setTimeout(() => fetchGenres(1, search), 400);
        return () => clearTimeout(timer);
    }, [search, fetchGenres]);

    const handlePageChange = (page) => fetchGenres(page, search);

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
        if (!formData.genre_name.trim()) {
            errors.genre_name = 'Vui lòng nhập tên thể loại';
        } else if (formData.genre_name.trim().length < 2) {
            errors.genre_name = 'Tên thể loại phải từ 2 ký tự trở lên';
        }
        return errors;
    };

    // ======================================================
    // HANDLE MODAL ACTIONS
    // ======================================================
    const handleOpenAdd = () => {
        setEditingGenre(null);
        setFormData(initialFormData);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (genre) => {
        setEditingGenre(genre);
        setFormData({
            genre_name: genre.genre_name || '',
            slug: genre.slug || ''
        });
        setFormErrors({});
        setIsFormOpen(true);
    };

    // ======================================================
    // HANDLE FORM CHANGE
    // ======================================================
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'genre_name') {
            setFormData((prev) => ({
                ...prev,
                genre_name: value,
                slug: generateSlug(value)
            }));

            // Real-time validation
            let errorMessage = '';
            if (!value.trim()) {
                errorMessage = 'Vui lòng nhập tên thể loại';
            } else if (value.trim().length < 2) {
                errorMessage = 'Tên thể loại phải từ 2 ký tự trở lên';
            }
            setFormErrors((prev) => ({ ...prev, genre_name: errorMessage }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
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
            setFormErrors({});

            if (editingGenre) {
                await api.put(`/api/genres/${editingGenre.genre_id}`, formData);
                showAlert('Thành công', 'Cập nhật thể loại thành công.', 'success');
            } else {
                await api.post('/api/genres', formData);
                showAlert('Thành công', 'Thêm thể loại thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchGenres(pagination.page, search);
        } catch (error) {
            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.error;

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
    // HANDLE DELETE
    // ======================================================
    const handleDelete = (genre) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${genre.genre_name}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/genres/${genre.genre_id}`);
                    closeAlert();

                    const newPage = genres.length === 1 && pagination.page > 1
                        ? pagination.page - 1
                        : pagination.page;
                    fetchGenres(newPage, search);
                    showAlert('Thành công', 'Xóa thể loại thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', 'Không thể xóa thể loại.', 'error');
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
            title: 'ID',
            key: 'genre_id',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                    <Hash size={16} />
                    <span>#{row.genre_id}</span>
                </div>
            )
        },
        {
            title: 'Tên thể loại',
            key: 'genre_name',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#ede9fe',
                        color: '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Tag size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700' }}>{row.genre_name}</div>
                        <small style={{ color: '#94a3b8' }}>Thể loại phim</small>
                    </div>
                </div>
            )
        },
        {
            title: 'Slug',
            key: 'slug',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                    <Navigation size={15} />
                    <span>{row.slug}</span>
                </div>
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: () => (
                <span className="status-badge used">
                    <Sparkles size={14} /> Hoạt động
                </span>
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
            label: 'Tên thể loại',
            name: 'genre_name',
            type: 'text',
            placeholder: 'Nhập tên thể loại'
        },
        {
            label: 'Slug',
            name: 'slug',
            type: 'text',
            placeholder: 'Slug tự động',
            disabled: true
        }
    ];

    // ======================================================
    // HELPER: RENDER ALERT ICON
    // ======================================================
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

    // ======================================================
    // RENDER
    // ======================================================
    return (
        <>
            <AdminPage
                title="Quản lý thể loại"
                subtitle="Quản lý toàn bộ thể loại phim"
                icon={<Theater size={30} />}
                buttonText="Thêm thể loại"
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
                        <AdminTable columns={columns} data={genres} />
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
                title={editingGenre ? 'Cập nhật thể loại' : 'Thêm thể loại'}
            >
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingGenre ? 'Lưu thay đổi' : 'Thêm thể loại'}
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

export default GenresPage;