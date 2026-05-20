import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

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

const API_URL = 'https://api.quangdungcinema.id.vn/api/news';

const initialFormData = {
    title: '',
    slug: '',
    content: ''
};

const NewsPage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [news, setNews] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingNews, setEditingNews] = useState(null);

    const [formData, setFormData] = useState(initialFormData);

    // Bổ sung state lưu trữ error-text cho từng trường dữ liệu giống UserPage
    const [errors, setErrors] = useState({});

    const [imageFile, setImageFile] = useState(null);

    const [preview, setPreview] = useState(null);

    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    /* =====================================================
        FETCH NEWS
    ===================================================== */

    const fetchNews = async () => {

        setLoading(true);

        try {

            const res = await axios.get(API_URL);

            setNews(res.data);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách tin tức.'
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchNews();

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

        setEditingNews(null);

        setFormData(initialFormData);

        setErrors({}); // Reset error-text khi mở form thêm mới

        setImageFile(null);

        setPreview(null);

        setIsFormOpen(true);

    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */

    const handleOpenEdit = (item) => {

        setEditingNews(item);

        setFormData({
            title: item.title || '',
            slug: item.slug || '',
            content: item.content || ''
        });

        setErrors({}); // Reset error-text khi mở form chỉnh sửa

        setPreview(
            item.image_url
                ? `https://api.quangdungcinema.id.vn/uploads/news/${item.image_url}`
                : null
        );

        setImageFile(null);

        setIsFormOpen(true);

    };

    /* =====================================================
        CHANGE FORM
    ===================================================== */

    const handleChange = (e) => {

        const { name, value, files } = e.target;

        // Xóa thông báo lỗi của field đó khi người dùng bắt đầu nhập lại dữ liệu
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        if (name === 'newsImage') {

            const file = files[0];

            setImageFile(file);

            if (file) {

                setPreview(
                    URL.createObjectURL(file)
                );

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

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

    };

    /* =====================================================
        VALIDATE FORM
    ===================================================== */

    const validateForm = () => {

        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Vui lòng nhập tiêu đề bài viết.';
        }

        if (!formData.content.trim()) {
            newErrors.content = 'Vui lòng nhập nội dung bài viết.';
        }

        // Nếu thêm bài viết mới thì bắt buộc phải chọn hình ảnh
        if (!editingNews && !imageFile) {
            newErrors.newsImage = 'Vui lòng chọn hình ảnh đại diện cho bài viết.';
        }

        setErrors(newErrors);

        // Trả về true nếu không có lỗi nào
        return Object.keys(newErrors).length === 0;

    };

    /* =====================================================
        SUBMIT
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        // Chạy hàm validate dữ liệu đầu vào trước khi submit
        if (!validateForm()) return;

        try {

            const submitData = new FormData();

            submitData.append(
                'title',
                formData.title
            );

            submitData.append(
                'slug',
                formData.slug
            );

            submitData.append(
                'content',
                formData.content
            );

            if (imageFile) {

                submitData.append(
                    'newsImage',
                    imageFile
                );

            }

            if (editingNews) {

                await axios.put(
                    `${API_URL}/update/${editingNews.news_id}`,
                    submitData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                showAlert(
                    'Thành công',
                    'Cập nhật bài viết thành công.'
                );

            } else {

                await axios.post(
                    API_URL,
                    submitData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                showAlert(
                    'Thành công',
                    'Thêm bài viết thành công.'
                );

            }

            setIsFormOpen(false);

            fetchNews();

        } catch (error) {

            // Nếu Backend trả về lỗi validation cụ thể, map thẳng vào ô input
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                showAlert(
                    'Lỗi',
                    error.response?.data?.message ||
                    'Đã xảy ra lỗi khi lưu bài viết.'
                );
            }

        }

    };

    /* =====================================================
        DELETE NEWS
    ===================================================== */

    const handleDelete = (item) => {

        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${item.title}"?`,

            async () => {

                try {

                    await axios.delete(
                        `${API_URL}/${item.news_id}`
                    );

                    closeAlert();

                    fetchNews();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        'Không thể xóa bài viết.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FILTER NEWS
    ===================================================== */

    const filteredNews = news.filter(item => {

        const keyword = search.toLowerCase();

        return (
            item.title?.toLowerCase().includes(keyword)
        );

    });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [

        {
            title: 'Hình ảnh',
            key: 'image_url',

            render: (row) => (

                <img
                    src={`https://api.quangdungcinema.id.vn/uploads/news/${row.image_url}`}
                    alt="news"
                    style={{
                        width: '120px',
                        height: '70px',
                        objectFit: 'cover',
                        borderRadius: '10px'
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
                    <Eye size={12} />
                    {row.views || 0}
                </span>

            )
        },

        {
            title: 'Lượt thích',
            key: 'likes',

            render: (row) => (

                <span className="status-badge">
                    <Heart size={12} />
                    {row.likes || 0}
                </span>

            )
        },

        {
            title: 'Ngày đăng',
            key: 'created_at',

            render: (row) =>
                new Date(row.created_at)
                    .toLocaleDateString('vi-VN')
        },

        {
            title: 'Xem',
            key: 'slug',

            render: (row) => (

                <a
                    href={`/news/${row.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        color: '#06b6d4'
                    }}
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

    /* =====================================================
        FORM FIELDS
    ===================================================== */

    const formFields = [

        {
            label: 'Tiêu đề',
            name: 'title',
            type: 'text',
            placeholder: 'Nhập tiêu đề bài viết'
        },

        {
            label: 'Slug',
            name: 'slug',
            type: 'text',
            placeholder: 'Slug tự động',
            disabled: true
        },

        {
            label: 'Hình ảnh',
            name: 'newsImage',
            type: 'file'
        },

        {
            label: 'Nội dung',
            name: 'content',
            type: 'textarea',
            placeholder: 'Nhập nội dung bài viết'
        }

    ];

    /* =====================================================
        RENDER
    ===================================================== */

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
                            data={filteredNews}
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
                    editingNews
                        ? 'Cập nhật bài viết'
                        : 'Thêm bài viết'
                }
            >

                {
                    preview && (

                        <div
                            style={{
                                marginBottom: '20px'
                            }}
                        >

                            <img
                                src={preview}
                                alt="preview"
                                style={{
                                    width: '100%',
                                    height: '220px',
                                    objectFit: 'cover',
                                    borderRadius: '12px'
                                }}
                            />

                        </div>

                    )
                }

                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={errors} // Truyền errors object xuống component AdminForm giống UserPage
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    submitText={
                        editingNews
                            ? 'Lưu thay đổi'
                            : 'Thêm bài viết'
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

export default NewsPage;