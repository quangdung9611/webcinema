import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

import {
    Tv,
    Edit,
    Trash2,
    Loader2,
    MapPin,
    Building2,
    Navigation
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

const API_URL =
    'https://api.quangdungcinema.id.vn/api/cinemas';

const initialFormData = {
    cinema_name: '',
    address: '',
    city: '',
    slug: ''
};

const CinemaPage = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [cinemas, setCinemas] = useState([]);

    const [loading, setLoading] = useState(false);

    const [submitLoading, setSubmitLoading] =
        useState(false);

    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);

    const [editingCinema, setEditingCinema] =
        useState(null);

    const [formData, setFormData] =
        useState(initialFormData);

    /* =====================================================
        FORM ERRORS
    ===================================================== */

    const [formErrors, setFormErrors] =
        useState({});

    const [alertModal, setAlertModal] =
        useState({
            open: false,
            title: '',
            message: '',
            onConfirm: null,
            onCancel: null
        });

    /* =====================================================
        FETCH CINEMAS
    ===================================================== */

    const fetchCinemas = async () => {

        setLoading(true);

        try {

            const res =
                await axios.get(API_URL);

            setCinemas(res.data);

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách rạp.'
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchCinemas();

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
        VALIDATE FORM
    ===================================================== */

    const validateForm = () => {

        const errors = {};

        /* TÊN RẠP */

        if (!formData.cinema_name.trim()) {

            errors.cinema_name =
                'Vui lòng nhập tên rạp';

        } else if (
            formData.cinema_name.trim().length < 5
        ) {

            errors.cinema_name =
                'Tên rạp phải từ 5 ký tự trở lên';

        }

        /* THÀNH PHỐ */

        if (!formData.city.trim()) {

            errors.city =
                'Vui lòng nhập thành phố';

        } else if (
            formData.city.trim().length < 2
        ) {

            errors.city =
                'Tên thành phố quá ngắn';

        }

        /* ĐỊA CHỈ */

        if (!formData.address.trim()) {

            errors.address =
                'Vui lòng nhập địa chỉ';

        } else if (
            formData.address.trim().length < 5
        ) {

            errors.address =
                'Địa chỉ phải từ 5 ký tự trở lên';

        }

        return errors;

    };

    /* =====================================================
        OPEN ADD
    ===================================================== */

    const handleOpenAdd = () => {

        setEditingCinema(null);

        setFormData(initialFormData);

        setFormErrors({});

        setIsFormOpen(true);

    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */

    const handleOpenEdit = (cinema) => {

        setEditingCinema(cinema);

        setFormErrors({});

        setFormData({
            cinema_name:
                cinema.cinema_name || '',
            address:
                cinema.address || '',
            city:
                cinema.city || '',
            slug:
                cinema.slug || ''
        });

        setIsFormOpen(true);

    };

    /* =====================================================
        HANDLE CHANGE
    ===================================================== */

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        /* =================================================
            AUTO GENERATE SLUG
        ================================================= */

        if (name === 'cinema_name') {

            setFormData(prev => ({
                ...prev,
                cinema_name: value,
                slug: generateSlug(value)
            }));

        } else {

            setFormData(prev => ({
                ...prev,
                [name]: value
            }));

        }

        /* =================================================
            REALTIME VALIDATION
        ================================================= */

        let errorMessage = '';

        switch (name) {

            case 'cinema_name':

                if (!value.trim()) {

                    errorMessage =
                        'Vui lòng nhập tên rạp';

                } else if (
                    value.trim().length < 5
                ) {

                    errorMessage =
                        'Tên rạp phải từ 5 ký tự trở lên';

                }

                break;

            case 'city':

                if (!value.trim()) {

                    errorMessage =
                        'Vui lòng nhập thành phố';

                } else if (
                    value.trim().length < 2
                ) {

                    errorMessage =
                        'Tên thành phố quá ngắn';

                }

                break;

            case 'address':

                if (!value.trim()) {

                    errorMessage =
                        'Vui lòng nhập địa chỉ';

                } else if (
                    value.trim().length < 5
                ) {

                    errorMessage =
                        'Địa chỉ phải từ 5 ký tự trở lên';

                }

                break;

            default:
                break;

        }

        /* =================================================
            SET ERRORS
        ================================================= */

        setFormErrors(prev => ({
            ...prev,
            [name]: errorMessage
        }));

    };

    /* =====================================================
        SUBMIT
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        const errors = validateForm();

        if (
            Object.keys(errors).length > 0
        ) {

            setFormErrors(errors);

            return;

        }

        try {

            setSubmitLoading(true);

            setFormErrors({});

            if (editingCinema) {

                await axios.put(
                    `${API_URL}/update/${editingCinema.cinema_id}`,
                    formData
                );

                showAlert(
                    'Thành công',
                    'Cập nhật rạp thành công.'
                );

            } else {

                await axios.post(
                    `${API_URL}/add`,
                    formData
                );

                showAlert(
                    'Thành công',
                    'Thêm rạp thành công.'
                );

            }

            setIsFormOpen(false);

            fetchCinemas();

        } catch (error) {

            const backendField =
                error.response?.data?.field;

            const backendError =
                error.response?.data?.error;

            if (backendField) {

                setFormErrors({
                    [backendField]:
                        backendError
                });

                return;

            }

            showAlert(
                'Lỗi',
                backendError ||
                'Đã xảy ra lỗi.'
            );

        } finally {

            setSubmitLoading(false);

        }

    };

    /* =====================================================
        DELETE CINEMA
    ===================================================== */

    const handleDelete = (cinema) => {

        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${cinema.cinema_name}"?`,

            async () => {

                try {

                    await axios.delete(
                        `${API_URL}/delete/${cinema.cinema_id}`
                    );

                    closeAlert();

                    fetchCinemas();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        'Không thể xóa rạp.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FILTER
    ===================================================== */

    const filteredCinemas =
        cinemas.filter(cinema => {

            const keyword =
                search.toLowerCase();

            return (
                cinema.cinema_name
                    ?.toLowerCase()
                    .includes(keyword) ||

                cinema.city
                    ?.toLowerCase()
                    .includes(keyword) ||

                cinema.address
                    ?.toLowerCase()
                    .includes(keyword)
            );

        });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [

        {
            title: 'Tên rạp',
            key: 'cinema_name',

            render: (row) => (

                <div>
                    <div
                        style={{
                            fontWeight: '600'
                        }}
                    >
                        {row.cinema_name}
                    </div>

                    <small
                        style={{
                            color: '#94a3b8'
                        }}
                    >
                        #{row.cinema_id}
                    </small>
                </div>

            )
        },

        {
            title: 'Địa chỉ',
            key: 'address',

            render: (row) => (

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <MapPin size={16} />

                    <span>
                        {row.address}
                    </span>
                </div>

            )
        },

        {
            title: 'Thành phố',
            key: 'city',

            render: (row) => (

                <span className="status-badge used">
                    <Building2 size={14} />

                    {row.city}
                </span>

            )
        },

        {
            title: 'Slug',
            key: 'slug',

            render: (row) => (

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#94a3b8'
                    }}
                >
                    <Navigation size={14} />

                    <span>
                        {row.slug}
                    </span>
                </div>

            )
        },

        {
            title: 'Thao tác',
            key: 'actions',

            render: (row) => (

                <div className="admin-table-actions">

                    <button
                        className="admin-action-btn edit-btn"
                        onClick={() =>
                            handleOpenEdit(row)
                        }
                    >
                        <Edit size={16} />
                    </button>

                    <button
                        className="admin-action-btn delete-btn"
                        onClick={() =>
                            handleDelete(row)
                        }
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
            label: 'Tên rạp',
            name: 'cinema_name',
            type: 'text',
            placeholder: 'Nhập tên rạp'
        },

        {
            label: 'Slug',
            name: 'slug',
            type: 'text',
            placeholder: 'Slug tự động',
            disabled: true
        },

        {
            label: 'Thành phố',
            name: 'city',
            type: 'text',
            placeholder: 'Ví dụ: Hồ Chí Minh'
        },

        {
            label: 'Địa chỉ',
            name: 'address',
            type: 'textarea',
            placeholder: 'Nhập địa chỉ chi tiết'
        }

    ];

    /* =====================================================
        RENDER
    ===================================================== */

    return (

        <>

            <AdminPage

                title="Quản lý rạp chiếu"

                subtitle="Quản lý toàn bộ rạp trong hệ thống"

                icon={<Tv size={30} />}

                buttonText="Thêm rạp"

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
                            data={filteredCinemas}
                        />

                    )
                }

            </AdminPage>

            {/* =============================================
                FORM MODAL
            ============================================= */}

            <AdminModal
                open={isFormOpen}
                onClose={() =>
                    setIsFormOpen(false)
                }
                title={
                    editingCinema
                        ? 'Cập nhật rạp'
                        : 'Thêm rạp'
                }
            >

                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={
                        editingCinema
                            ? 'Lưu thay đổi'
                            : 'Thêm rạp'
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
                                    onClick={
                                        alertModal.onCancel
                                    }
                                >
                                    Hủy
                                </button>

                            )
                        }

                        <button
                            className="admin-confirm-btn"
                            onClick={
                                alertModal.onConfirm ||
                                closeAlert
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

export default CinemaPage;