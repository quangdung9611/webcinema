import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

import {
    Theater,
    Plus,
    Edit,
    Trash2,
    Loader2
} from 'lucide-react';

import {
    useNavigate
} from 'react-router-dom';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

const API_URL = 'https://api.quangdungcinema.id.vn/api/genres';

const initialFormData = {
    genre_name: '',
    slug: ''
};

const GenresPage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const navigate = useNavigate();

    const [genres, setGenres] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingGenre, setEditingGenre] = useState(null);

    const [formData, setFormData] = useState(initialFormData);

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    /* =====================================================
        FETCH GENRES
    ===================================================== */

    const fetchGenres = async () => {

        setLoading(true);

        try {

            const res = await axios.get(API_URL);

            setGenres(res.data);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách thể loại.'
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchGenres();

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

        setEditingGenre(null);

        setFormData(initialFormData);

        setIsFormOpen(true);

    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */

    const handleOpenEdit = (genre) => {

        setEditingGenre(genre);

        setFormData({
            genre_name: genre.genre_name || '',
            slug: genre.slug || ''
        });

        setIsFormOpen(true);

    };

    /* =====================================================
        CHANGE FORM
    ===================================================== */

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        if (name === 'genre_name') {

            setFormData(prev => ({
                ...prev,
                genre_name: value,
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

        try {

            if (editingGenre) {

                await axios.put(
                    `${API_URL}/update/${editingGenre.genre_id}`,
                    formData
                );

                showAlert(
                    'Thành công',
                    'Cập nhật thể loại thành công.'
                );

            } else {

                await axios.post(
                    `${API_URL}/add`,
                    formData
                );

                showAlert(
                    'Thành công',
                    'Thêm thể loại thành công.'
                );

            }

            setIsFormOpen(false);

            fetchGenres();

        } catch (error) {

            showAlert(
                'Lỗi',
                error.response?.data?.error ||
                'Đã xảy ra lỗi.'
            );

        }

    };

    /* =====================================================
        DELETE GENRE
    ===================================================== */

    const handleDelete = (genre) => {

        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${genre.genre_name}"?`,

            async () => {

                try {

                    await axios.delete(
                        `${API_URL}/delete/${genre.genre_id}`
                    );

                    closeAlert();

                    fetchGenres();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        'Không thể xóa thể loại.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FILTER GENRES
    ===================================================== */

    const filteredGenres = genres.filter(item => {

        const keyword = search.toLowerCase();

        return (
            item.genre_name
                ?.toLowerCase()
                .includes(keyword)
        );

    });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [

        {
            title: 'ID',
            key: 'genre_id',

            render: (row) => (

                <strong>
                    #{row.genre_id}
                </strong>

            )
        },

        {
            title: 'Tên thể loại',
            key: 'genre_name',

            render: (row) => (

                <span className="movie-title-main">
                    {row.genre_name}
                </span>

            )
        },

        {
            title: 'Slug',
            key: 'slug',

            render: (row) => (

                <span className="ticket-code">
                    {row.slug}
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

    /* =====================================================
        FORM FIELDS
    ===================================================== */

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

    /* =====================================================
        RENDER
    ===================================================== */

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
                            data={filteredGenres}
                        />

                    )
                }

            </AdminPage>

            {/* =============================================
                FORM MODAL
            ============================================= */}

            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={
                    editingGenre
                        ? 'Cập nhật thể loại'
                        : 'Thêm thể loại'
                }
            >

                <AdminForm
                    fields={formFields}
                    formData={formData}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    submitText={
                        editingGenre
                            ? 'Lưu thay đổi'
                            : 'Thêm thể loại'
                    }
                />

            </AdminModal>

            {/* =============================================
                ALERT MODAL
            ============================================= */}

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

export default GenresPage;