import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

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

const API_URL = 'https://api.quangdungcinema.id.vn/api/movies';

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

const MoviePage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [movies, setMovies] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingMovie, setEditingMovie] = useState(null);

    const [formData, setFormData] = useState(initialFormData);

    const [posterFile, setPosterFile] = useState(null);

    const [backdropFile, setBackdropFile] = useState(null);

    // Thêm state để quản lý các thông báo lỗi của từng ô input trong form
    const [formErrors, setFormErrors] = useState({});

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    /* =====================================================
        FETCH MOVIES
    ===================================================== */

    const fetchMovies = async () => {

        setLoading(true);

        try {

            const res = await axios.get(API_URL);

            setMovies(res.data);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách phim.'
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchMovies();

    }, []);

    /* =====================================================
        ALERT MODAL
    ===================================================== */

    const showAlert = (
        title,
        message,
        onConfirm = null,
        onCancel = null
    ) => {

        setAlertModal({
            open: true,
            title,
            message,
            onConfirm,
            onCancel
        });

    };

    const closeAlert = () => {

        setAlertModal(prev => ({
            ...prev,
            open: false
        }));

    };

    /* =====================================================
        VALIDATE FORM
    ===================================================== */

    const validateForm = () => {

        const errors = {};

        if (!formData.title.trim()) {
            errors.title = 'Vui lòng nhập tên phim.';
        }

        if (!formData.director.trim()) {
            errors.director = 'Vui lòng nhập tên đạo diễn.';
        }

        if (!formData.nation.trim()) {
            errors.nation = 'Vui lòng nhập quốc gia sản xuất.';
        }

        if (!formData.duration) {
            errors.duration = 'Vui lòng nhập thời lượng phim.';
        } else if (Number(formData.duration) <= 0) {
            errors.duration = 'Thời lượng phim phải lớn hơn 0 phút.';
        }

        if (!formData.release_date) {
            errors.release_date = 'Vui lòng chọn ngày phát hành.';
        }

        // Khi thêm mới, bắt buộc phải chọn file Poster
        if (!editingMovie && !posterFile) {
            errors.posters = 'Vui lòng chọn file hình ảnh cho Poster.';
        }

        setFormErrors(errors);

        // Nếu object errors không có key nào nghĩa là dữ liệu hợp lệ (trả về true)
        return Object.keys(errors).length === 0;

    };

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

        setEditingMovie(null);

        setFormData(initialFormData);

        setPosterFile(null);

        setBackdropFile(null);

        // Reset lại các thông báo lỗi cũ khi mở form thêm mới
        setFormErrors({});

        setIsFormOpen(true);

    };

    /* =====================================================
        OPEN EDIT
    ==================================================== */

    const handleOpenEdit = (movie) => {

        setEditingMovie(movie);

        setFormData({
            title: movie.title || '',
            slug: movie.slug || '',
            director: movie.director || '',
            nation: movie.nation || '',
            duration: movie.duration || '',
            age_rating: movie.age_rating || '0',
            release_date: movie.release_date
                ? movie.release_date.substring(0, 10)
                : '',
            status: movie.status || 'Sắp chiếu',
            trailer_url: movie.trailer_url || '',
            description: movie.description || ''
        });

        setPosterFile(null);

        setBackdropFile(null);

        // Reset lại các thông báo lỗi cũ khi mở form chỉnh sửa
        setFormErrors({});

        setIsFormOpen(true);

    };

    /* =====================================================
        CHANGE FORM
    ===================================================== */

    const handleChange = (e) => {

        const { name, value, files } = e.target;

        // Xóa thông báo lỗi của input tương ứng khi người dùng bắt đầu sửa đổi dữ liệu
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        if (name === 'posters') {

            setPosterFile(files[0]);

            return;

        }

        if (name === 'backdrop_url') {

            setBackdropFile(files[0]);

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

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

    };

    /* =====================================================
        SUBMIT
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        // Thực hiện kiểm tra lỗi validation trước khi gửi dữ liệu lên server
        if (!validateForm()) {
            return;
        }

        try {

            const submitData = new FormData();

            Object.entries(formData).forEach(([key, value]) => {

                submitData.append(key, value);

            });

            if (posterFile) {

                submitData.append('posters', posterFile);

            }

            if (backdropFile) {

                submitData.append('backdrop_url', backdropFile);

            }

            if (editingMovie) {

                await axios.put(
                    `${API_URL}/update/${editingMovie.movie_id}`,
                    submitData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                showAlert(
                    'Thành công',
                    'Cập nhật phim thành công.'
                );

            } else {

                await axios.post(
                    `${API_URL}/add`,
                    submitData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                showAlert(
                    'Thành công',
                    'Thêm phim thành công.'
                );

            }

            setIsFormOpen(false);

            fetchMovies();

        } catch (error) {

            showAlert(
                'Lỗi',
                error.response?.data?.error ||
                'Đã xảy ra lỗi.'
            );

        }

    };

    /* =====================================================
        DELETE MOVIE
    ===================================================== */

    const handleDelete = (movie) => {

        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${movie.title}"?`,

            async () => {

                try {

                    await axios.delete(
                        `${API_URL}/${movie.movie_id}`
                    );

                    closeAlert();

                    fetchMovies();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        'Không thể xóa phim.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FILTER MOVIES
    ===================================================== */

    const filteredMovies = movies.filter(movie => {

        const keyword = search.toLowerCase();

        return (
            movie.title?.toLowerCase().includes(keyword) ||
            movie.director?.toLowerCase().includes(keyword) ||
            movie.nation?.toLowerCase().includes(keyword)
        );

    });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [

        {
            title: 'Poster',
            key: 'poster_url',

            render: (row) => (

                <img
                    src={`https://api.quangdungcinema.id.vn/uploads/posters/${row.poster_url}`}
                    alt={row.title}
                    style={{
                        width: '70px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '10px'
                    }}
                />

            )
        },

        {
            title: 'Tên phim',
            key: 'title'
        },

        {
            title: 'Đạo diễn',
            key: 'director'
        },

        {
            title: 'Thời lượng',
            key: 'duration',

            render: (row) => `${row.duration} phút`
        },

        {
            title: 'Trạng thái',
            key: 'status',

            render: (row) => (

                <span className={`status-badge ${row.status}`}>
                    {row.status}
                </span>

            )
        },

        {
            title: 'Trailer',
            key: 'trailer_url',

            render: (row) => (

                row.trailer_url ? (

                    <a
                        href={row.trailer_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            color: '#ef4444'
                        }}
                    >
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

    /* =====================================================
        FORM FIELDS
    ===================================================== */

    const formFields = [

        {
            label: 'Tên phim',
            name: 'title',
            type: 'text',
            placeholder: 'Nhập tên phim'
        },

        {
            label: 'Slug',
            name: 'slug',
            type: 'text',
            placeholder: 'Slug tự động',
            disabled: true
        },

        {
            label: 'Đạo diễn',
            name: 'director',
            type: 'text',
            placeholder: 'Tên đạo diễn'
        },

        {
            label: 'Quốc gia',
            name: 'nation',
            type: 'text',
            placeholder: 'Việt Nam, Mỹ...'
        },

        {
            label: 'Thời lượng',
            name: 'duration',
            type: 'number',
            placeholder: '120'
        },

        {
            label: 'Ngày phát hành',
            name: 'release_date',
            type: 'date'
        },

        {
            label: 'Độ tuổi',
            name: 'age_rating',
            type: 'select',

            options: [
                {
                    label: 'P - Mọi lứa tuổi',
                    value: '0'
                },
                {
                    label: 'C13',
                    value: '13'
                },
                {
                    label: 'C16',
                    value: '16'
                },
                {
                    label: 'C18',
                    value: '18'
                }
            ]
        },

        {
            label: 'Trạng thái',
            name: 'status',
            type: 'select',

            options: [
                {
                    label: 'Sắp chiếu',
                    value: 'Sắp chiếu'
                },
                {
                    label: 'Đang chiếu',
                    value: 'Đang chiếu'
                },
                {
                    label: 'Ngừng chiếu',
                    value: 'Ngừng chiếu'
                }
            ]
        },

        {
            label: 'Trailer URL',
            name: 'trailer_url',
            type: 'text',
            placeholder: 'https://youtube.com/...'
        },

        {
            label: 'Poster',
            name: 'posters',
            type: 'file'
        },

        {
            label: 'Backdrop',
            name: 'backdrop_url',
            type: 'file'
        },

        {
            label: 'Mô tả',
            name: 'description',
            type: 'textarea',
            placeholder: 'Nhập mô tả phim'
        }

    ];

    /* =====================================================
        RENDER
    ===================================================== */

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

                {
                    loading ? (

                        <div className="admin-loading">

                            <Loader2
                                size={32}
                                className="spin-icon"
                            />

                            <span>
                                Đang tải dữ liệu...
                            </span>

                        </div>

                    ) : (

                        <AdminTable
                            columns={columns}
                            data={filteredMovies}
                        />

                    )
                }

            </AdminPage>

            {/* =================================================
                FORM MODAL
            ================================================= */}

            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={
                    editingMovie
                        ? 'Cập nhật phim'
                        : 'Thêm phim'
                }
            >

                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors} // Truyền state errors vào để AdminForm map error text theo name
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    submitText={
                        editingMovie
                            ? 'Lưu thay đổi'
                            : 'Thêm phim'
                    }
                />

            </AdminModal>

            {/* =================================================
                ALERT MODAL
            ================================================= */}

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
            >

                <div className="admin-alert-content">

                    <p>
                        {alertModal.message}
                    </p>

                    <div className="admin-alert-actions">

                        {
                            alertModal.onCancel && (

                                <button
                                    className="admin-cancel-btn"
                                    onClick={alertModal.onCancel}
                                >
                                    Hủy
                                </button>

                            )
                        }

                        <button
                            className="admin-confirm-btn"
                            onClick={
                                alertModal.onConfirm || closeAlert
                            }
                        >
                            Xác nhận
                        </button>

                    </div>

                </div>

            </AdminModal>

        </>

    );

};

export default MoviePage;