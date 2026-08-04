import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Tv,
    Edit,
    Trash2,
    Loader2,
    MapPin,
    Building2,
    Navigation,
    Phone,
    Map,
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
    cinema_name: '',
    address: '',
    city: '',
    slug: '',
    hotline: '',
    map_link: ''
};

const alertConfig = {
    success: { icon: <CheckCircle2 size={52} />, iconClass: 'success' },
    error: { icon: <XCircle size={52} />, iconClass: 'error' },
    warning: { icon: <AlertTriangle size={52} />, iconClass: 'warning' },
    info: { icon: <Info size={52} />, iconClass: 'info' },
    default: { icon: <Info size={52} />, iconClass: 'default' }
};

// ==========================================================
// COMPONENT
// ==========================================================
const CinemaPage = () => {
    // ------------------------------------------------------
    // STATES
    // ------------------------------------------------------
    const [cinemas, setCinemas] = useState([]);
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
    const [editingCinema, setEditingCinema] = useState(null);
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

    // ------------------------------------------------------
    // ALERT HANDLER
    // ------------------------------------------------------
    const showAlert = (title, message, type = 'default', onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, type, onConfirm, onCancel });
    };
    const closeAlert = () => setAlertModal((prev) => ({ ...prev, open: false }));

    // ------------------------------------------------------
    // FETCH CINEMAS (PAGINATION + SEARCH)
    // ------------------------------------------------------
    const fetchCinemas = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;
        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/cinemas', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const responseData = res.data?.data;
            const cinemasData = responseData?.data || [];
            const paginationData = responseData?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1
            };

            setCinemas(cinemasData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('FETCH CINEMAS ERROR:', error);
            showAlert('Lỗi', 'Không thể tải danh sách rạp.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => { fetchCinemas(1, ''); }, []);

    // ------------------------------------------------------
    // SEARCH DEBOUNCE
    // ------------------------------------------------------
    const prevSearchRef = useRef('');
    useEffect(() => {
        if (search === prevSearchRef.current) return;
        prevSearchRef.current = search;
        const timer = setTimeout(() => fetchCinemas(1, search), 400);
        return () => clearTimeout(timer);
    }, [search, fetchCinemas]);

    const handlePageChange = (page) => fetchCinemas(page, search);

    // ------------------------------------------------------
    // SLUG GENERATOR
    // ------------------------------------------------------
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

    // ------------------------------------------------------
    // VALIDATE FORM
    // ------------------------------------------------------
    const validateForm = () => {
        const errors = {};
        if (!formData.cinema_name.trim()) {
            errors.cinema_name = 'Vui lòng nhập tên rạp';
        } else if (formData.cinema_name.trim().length < 5) {
            errors.cinema_name = 'Tên rạp phải từ 5 ký tự trở lên';
        }
        if (!formData.city.trim()) {
            errors.city = 'Vui lòng nhập thành phố';
        } else if (formData.city.trim().length < 2) {
            errors.city = 'Tên thành phố quá ngắn';
        }
        if (!formData.address.trim()) {
            errors.address = 'Vui lòng nhập địa chỉ';
        } else if (formData.address.trim().length < 5) {
            errors.address = 'Địa chỉ phải từ 5 ký tự trở lên';
        }
        if (!formData.hotline.trim()) {
            errors.hotline = 'Vui lòng nhập hotline';
        } else if (!/^[0-9]{9,11}$/.test(formData.hotline.trim())) {
            errors.hotline = 'Hotline không hợp lệ';
        }
        if (!formData.map_link.trim()) {
            errors.map_link = 'Vui lòng nhập link Google Map';
        }
        return errors;
    };

    // ------------------------------------------------------
    // HANDLE MODAL ACTIONS
    // ------------------------------------------------------
    const handleOpenAdd = () => {
        setEditingCinema(null);
        setFormData(initialFormData);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (cinema) => {
        setEditingCinema(cinema);
        setFormErrors({});
        setFormData({
            cinema_name: cinema.cinema_name || '',
            address: cinema.address || '',
            city: cinema.city || '',
            slug: cinema.slug || '',
            hotline: cinema.hotline || '',
            map_link: cinema.map_link || ''
        });
        setIsFormOpen(true);
    };

    // ------------------------------------------------------
    // HANDLE CHANGE
    // ------------------------------------------------------
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'cinema_name') {
            setFormData((prev) => ({
                ...prev,
                cinema_name: value,
                slug: generateSlug(value)
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }

        // Realtime validation
        let errorMessage = '';
        switch (name) {
            case 'cinema_name':
                if (!value.trim()) errorMessage = 'Vui lòng nhập tên rạp';
                else if (value.trim().length < 5) errorMessage = 'Tên rạp phải từ 5 ký tự trở lên';
                break;
            case 'city':
                if (!value.trim()) errorMessage = 'Vui lòng nhập thành phố';
                else if (value.trim().length < 2) errorMessage = 'Tên thành phố quá ngắn';
                break;
            case 'address':
                if (!value.trim()) errorMessage = 'Vui lòng nhập địa chỉ';
                else if (value.trim().length < 5) errorMessage = 'Địa chỉ phải từ 5 ký tự trở lên';
                break;
            case 'hotline':
                if (!value.trim()) errorMessage = 'Vui lòng nhập hotline';
                else if (!/^[0-9]{9,11}$/.test(value.trim())) errorMessage = 'Hotline không hợp lệ';
                break;
            case 'map_link':
                if (!value.trim()) errorMessage = 'Vui lòng nhập link Google Map';
                break;
            default: break;
        }
        setFormErrors((prev) => ({ ...prev, [name]: errorMessage }));
    };

    // ------------------------------------------------------
    // HANDLE SUBMIT
    // ------------------------------------------------------
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

            if (editingCinema) {
                await api.put(`/api/cinemas/${editingCinema.cinema_id}`, formData);
                showAlert('Thành công', 'Cập nhật rạp thành công.', 'success');
            } else {
                await api.post('/api/cinemas', formData);
                showAlert('Thành công', 'Thêm rạp thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchCinemas(pagination.page, search);
        } catch (error) {
            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.error || 'Đã xảy ra lỗi.';
            if (backendField) {
                setFormErrors({ [backendField]: backendError });
            } else {
                showAlert('Lỗi', backendError, 'error');
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    // ------------------------------------------------------
    // HANDLE DELETE
    // ------------------------------------------------------
    const handleDelete = (cinema) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${cinema.cinema_name}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/cinemas/${cinema.cinema_id}`);
                    closeAlert();

                    const newPage = cinemas.length === 1 && pagination.page > 1
                        ? pagination.page - 1
                        : pagination.page;
                    fetchCinemas(newPage, search);
                    showAlert('Thành công', 'Xóa rạp thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', 'Không thể xóa rạp.', 'error');
                }
            },
            closeAlert
        );
    };

    // ------------------------------------------------------
    // TABLE COLUMNS
    // ------------------------------------------------------
    const columns = [
        {
            title: 'Tên rạp',
            key: 'cinema_name',
            render: (row) => (
                <div>
                    <div style={{ fontWeight: '600' }}>{row.cinema_name}</div>
                    <small style={{ color: '#94a3b8' }}>#{row.cinema_id}</small>
                </div>
            )
        },
        {
            title: 'Địa chỉ',
            key: 'address',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} />
                    <span>{row.address}</span>
                </div>
            )
        },
        {
            title: 'Hotline',
            key: 'hotline',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={16} />
                    <span>{row.hotline}</span>
                </div>
            )
        },
        {
            title: 'Google Map',
            key: 'map_link',
            render: (row) => (
                <a
                    href={row.map_link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', textDecoration: 'none' }}
                >
                    <Map size={15} />
                    Xem map
                </a>
            )
        },
        {
            title: 'Thành phố',
            key: 'city',
            render: (row) => (
                <span className="status-badge used">
                    <Building2 size={14} /> {row.city}
                </span>
            )
        },
        {
            title: 'Slug',
            key: 'slug',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                    <Navigation size={14} />
                    <span>{row.slug}</span>
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

    // ------------------------------------------------------
    // FORM FIELDS
    // ------------------------------------------------------
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
            label: 'Hotline',
            name: 'hotline',
            type: 'text',
            placeholder: 'Ví dụ: 19006017'
        },
        {
            label: 'Google Map Link',
            name: 'map_link',
            type: 'text',
            placeholder: 'Dán link Google Map'
        },
        {
            label: 'Địa chỉ',
            name: 'address',
            type: 'textarea',
            placeholder: 'Nhập địa chỉ chi tiết'
        }
    ];

    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------
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
                {loading ? (
                    <div className="admin-loading">
                        <Loader2 size={32} className="spin-icon" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <>
                        <AdminTable columns={columns} data={cinemas} />
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
                title={editingCinema ? 'Cập nhật rạp' : 'Thêm rạp'}
                type="info"
            >
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingCinema ? 'Lưu thay đổi' : 'Thêm rạp'}
                />
            </AdminModal>

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
                type={alertModal.type}
            >
                <div className="admin-alert-content">
                    <div className={`admin-alert-icon ${alertConfig[alertModal.type]?.iconClass}`}>
                        {alertConfig[alertModal.type]?.icon}
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

export default CinemaPage;