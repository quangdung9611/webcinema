import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Film,
    Edit,
    Trash2,
    Loader2,
    PlayCircle
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// POSTER / BACKDROP URL
// ==========================================================
const getPosterUrl = (poster) => {
    if (!poster) return '';
    if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
    return `https://api.quangdungcinema.id.vn/uploads/posters/${poster}`;
};

const getBackdropUrl = (backdrop) => {
    if (!backdrop) return '';
    if (backdrop.startsWith('http://') || backdrop.startsWith('https://')) return backdrop;
    return `https://api.quangdungcinema.id.vn/uploads/backdrops/${backdrop}`;
};

// ==========================================================
// INITIAL FORM
// ==========================================================
const initialFormData = {
    title: '',
    slug: '',
    director: '',
    nation: '',
    duration: '',
    age_rating: '0',
    release_date: '',
    status: 'Sắp chiếu',
    trailer_url: '',
    description: ''
};

// ==========================================================
// COMPONENT
// ==========================================================
const MoviePage = () => {

    // ======================================================
    // DATA
    // ======================================================
    const [movies, setMovies] = useState([]);
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
    const [editingMovie, setEditingMovie] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [moviePosterFile, setMoviePosterFile] = useState(null);
    const [movieBackdropFile, setMovieBackdropFile] = useState(null);
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
    // FETCH MOVIES
    // ======================================================
    const fetchMovies = useCallback(async (page = 1, keyword = '') => {
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
            const res = await api.get('/api/movies/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const moviesData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setMovies(moviesData);
            setPagination(paginationData);

        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request bị hủy');
                return;
            }
            console.error('FETCH MOVIES ERROR:', error);
            setMovies([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách phim.', 'error');
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
        fetchMovies(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchMovies]);

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
            fetchMovies(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchMovies]);

    // ======================================================
    // PAGE CHANGE
    // ======================================================
    const handlePageChange = (page) => {
        fetchMovies(page, search);
    };

    // ======================================================
    // VALIDATE FORM
    // ======================================================
    const validateForm = () => {
        const errors = {};
        if (!formData.title.trim()) errors.title = 'Vui lòng nhập tên phim.';
        if (!formData.director.trim()) errors.director = 'Vui lòng nhập tên đạo diễn.';
        if (!formData.nation.trim()) errors.nation = 'Vui lòng nhập quốc gia sản xuất.';
        if (!formData.duration || Number(formData.duration) <= 0) {
            errors.duration = 'Thời lượng phim phải lớn hơn 0 phút.';
        }
        if (!formData.release_date) errors.release_date = 'Vui lòng chọn ngày phát hành.';
        if (!editingMovie && !moviePosterFile) {
            errors.movie_poster = 'Vui lòng chọn file hình ảnh cho Poster.';
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
        setEditingMovie(null);
        setFormData(initialFormData);
        setMoviePosterFile(null);
        setMovieBackdropFile(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (movie) => {
        setEditingMovie(movie);
        setFormData({
            title: movie.title || '',
            slug: movie.slug || '',
            director: movie.director || '',
            nation: movie.nation || '',
            duration: movie.duration || '',
            age_rating: String(movie.age_rating || '0'),
            release_date: movie.release_date ? movie.release_date.substring(0, 10) : '',
            status: movie.status || 'Sắp chiếu',
            trailer_url: movie.trailer_url || '',
            description: movie.description || ''
        });
        setMoviePosterFile(null);
        setMovieBackdropFile(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingMovie(null);
        setFormErrors({});
        setMoviePosterFile(null);
        setMovieBackdropFile(null);
    };

    // ======================================================
    // HANDLE CHANGE
    // ======================================================
    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));

        if (name === 'movie_poster') {
            setMoviePosterFile(files?.[0] || null);
            return;
        }
        if (name === 'movie_backdrop') {
            setMovieBackdropFile(files?.[0] || null);
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
            if (moviePosterFile) submitData.append('movie_poster', moviePosterFile);
            if (movieBackdropFile) submitData.append('movie_backdrop', movieBackdropFile);

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingMovie) {
                await api.put(`/api/movies/${editingMovie.movie_id}`, submitData, config);
                setIsFormOpen(false);
                fetchMovies(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật phim thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/movies', submitData, config);
                setIsFormOpen(false);
                fetchMovies(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Thêm phim thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            console.error('SUBMIT MOVIE ERROR:', error);
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
    const handleDelete = (movie) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${movie.title}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/movies/${movie.movie_id}`);
                    closeAlert();
                    const currentPage = pagination.page;
                    const newPage = movies.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchMovies(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa phim thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE MOVIE ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa phim.', 'error');
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
            title: 'Poster',
            key: 'movie_poster',
            render: (row) => (
                <img
                    src={getPosterUrl(row.movie_poster)}
                    alt={row.title}
                    style={{ width: '70px', height: '100px', objectFit: 'cover', borderRadius: '10px' }}
                />
            )
        },
        { title: 'Tên phim', key: 'title' },
        { title: 'Đạo diễn', key: 'director' },
        { title: 'Thời lượng', key: 'duration', render: (row) => `${row.duration} phút` },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (row) => <span className={`status-badge ${row.status}`}>{row.status}</span>
        },
        {
            title: 'Trailer',
            key: 'trailer_url',
            render: (row) => (
                row.trailer_url ? (
                    <a href={row.trailer_url} target="_blank" rel="noreferrer" style={{ color: '#ef4444' }}>
                        <PlayCircle size={20} />
                    </a>
                ) : 'Chưa có'
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
        { label: 'Tên phim', name: 'title', type: 'text', placeholder: 'Nhập tên phim' },
        { label: 'Slug', name: 'slug', type: 'text', placeholder: 'Slug tự động', disabled: true },
        { label: 'Đạo diễn', name: 'director', type: 'text', placeholder: 'Tên đạo diễn' },
        { label: 'Quốc gia', name: 'nation', type: 'text', placeholder: 'Việt Nam, Mỹ...' },
        { label: 'Thời lượng', name: 'duration', type: 'number', placeholder: '120' },
        { label: 'Ngày phát hành', name: 'release_date', type: 'date' },
        {
            label: 'Độ tuổi',
            name: 'age_rating',
            type: 'select',
            options: [
                { label: 'P - Mọi lứa tuổi', value: '0' },
                { label: 'C13', value: '13' },
                { label: 'C16', value: '16' },
                { label: 'C18', value: '18' }
            ]
        },
        {
            label: 'Trạng thái',
            name: 'status',
            type: 'select',
            options: [
                { label: 'Sắp chiếu', value: 'Sắp chiếu' },
                { label: 'Đang chiếu', value: 'Đang chiếu' },
                { label: 'Ngừng chiếu', value: 'Ngừng chiếu' }
            ]
        },
        { label: 'Trailer URL', name: 'trailer_url', type: 'text', placeholder: 'https://youtube.com/...' },
        { label: 'Poster', name: 'movie_poster', type: 'file' },
        { label: 'Backdrop', name: 'movie_backdrop', type: 'file' },
        { label: 'Mô tả', name: 'description', type: 'textarea', placeholder: 'Nhập mô tả phim' }
    ];

    // ======================================================
    // FILE PREVIEWS
    // ======================================================
    const filePreviews = {};
    if (editingMovie) {
        if (editingMovie.movie_poster) {
            filePreviews['movie_poster'] = {
                url: getPosterUrl(editingMovie.movie_poster),
                name: editingMovie.movie_poster
            };
        }
        if (editingMovie.movie_backdrop) {
            filePreviews['movie_backdrop'] = {
                url: getBackdropUrl(editingMovie.movie_backdrop),
                name: editingMovie.movie_backdrop
            };
        }
    }

    // ======================================================
    // RENDER
    // ======================================================
    return (
        <>
            <AdminPage
                title="Quản lý phim"
                subtitle="Quản lý toàn bộ phim trong hệ thống"
                icon={<Film size={30} />}
                buttonText="Thêm phim"
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
                        <AdminTable columns={columns} data={movies} />
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
                title={editingMovie ? 'Cập nhật phim' : 'Thêm phim'}
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
                    submitText={editingMovie ? 'Lưu thay đổi' : 'Thêm phim'}
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

export default MoviePage;