// pages/admin/CinemaPage.js
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
    Image,
    Clock
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// HELPERS: LẤY URL BACKDROP
// ==========================================================
const getBackdropUrl = (backdrop) => {
    if (!backdrop) return '';
    if (backdrop.startsWith('http://') || backdrop.startsWith('https://')) return backdrop;
    return `https://api.quangdungcinema.id.vn/uploads/backdrops/${backdrop}`;
};

// ==========================================================
// INITIAL FORM
// ==========================================================
const initialFormData = {
    cinema_name: '',
    address: '',
    city: '',
    slug: '',
    hotline: '',
    map_link: '',
    weekday_open: '08:00',
    weekday_close: '23:30',
    weekend_open: '08:00',
    weekend_close: '24:00'
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
    const [cinemaBackdropFile, setCinemaBackdropFile] = useState(null);
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

    // ------------------------------------------------------
    // FETCH CINEMAS
    // ------------------------------------------------------
    const fetchCinemas = useCallback(async (page = 1, keyword = '') => {
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
            const res = await api.get('/api/cinemas/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const cinemasData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setCinemas(cinemasData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request bị hủy');
                return;
            }
            console.error('FETCH CINEMAS ERROR:', error);
            setCinemas([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách rạp.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    // ------------------------------------------------------
    // MOUNT
    // ------------------------------------------------------
    useEffect(() => {
        fetchCinemas(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchCinemas]);

    // ------------------------------------------------------
    // SEARCH DEBOUNCE
    // ------------------------------------------------------
    const prevSearchRef = useRef('');
    useEffect(() => {
        const currentSearch = search;
        const prevSearch = prevSearchRef.current;

        if (currentSearch === prevSearch) return;
        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchCinemas(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchCinemas]);

    const handlePageChange = (page) => {
        fetchCinemas(page, search);
    };

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
        } else if (!/^[0-9]{8,15}$/.test(formData.hotline.trim())) {
            errors.hotline = 'Hotline không hợp lệ (8-15 chữ số)';
        }
        if (!formData.map_link.trim()) {
            errors.map_link = 'Vui lòng nhập iframe Google Map';
        } else {
            const trimmedMapLink = formData.map_link.trim();
            if (!trimmedMapLink.includes('<iframe') || !trimmedMapLink.includes('</iframe>')) {
                errors.map_link = 'Vui lòng nhập đúng thẻ iframe Google Map (ví dụ: <iframe src="..."></iframe>)';
            }
        }

        // 👉 VALIDATE GIỜ HOẠT ĐỘNG
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!formData.weekday_open || !timeRegex.test(formData.weekday_open)) {
            errors.weekday_open = 'Giờ mở cửa ngày thường không hợp lệ (HH:MM)';
        }
        if (!formData.weekday_close || !timeRegex.test(formData.weekday_close)) {
            errors.weekday_close = 'Giờ đóng cửa ngày thường không hợp lệ (HH:MM)';
        }
        if (!formData.weekend_open || !timeRegex.test(formData.weekend_open)) {
            errors.weekend_open = 'Giờ mở cửa cuối tuần không hợp lệ (HH:MM)';
        }
        if (!formData.weekend_close || !timeRegex.test(formData.weekend_close)) {
            errors.weekend_close = 'Giờ đóng cửa cuối tuần không hợp lệ (HH:MM)';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ------------------------------------------------------
    // HANDLE MODAL ACTIONS
    // ------------------------------------------------------
    const handleOpenAdd = () => {
        setEditingCinema(null);
        setFormData(initialFormData);
        setCinemaBackdropFile(null);
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
            map_link: cinema.map_link || '',
            weekday_open: cinema.weekday_open || '08:00',
            weekday_close: cinema.weekday_close || '23:30',
            weekend_open: cinema.weekend_open || '08:00',
            weekend_close: cinema.weekend_close || '24:00'
        });
        setCinemaBackdropFile(null);
        setIsFormOpen(true);
    };

    // ------------------------------------------------------
    // HANDLE CLOSE FORM
    // ------------------------------------------------------
    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingCinema(null);
        setFormErrors({});
        setCinemaBackdropFile(null);
    };

    // ------------------------------------------------------
    // HANDLE CHANGE
    // ------------------------------------------------------
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }

        if (name === 'cinema_backdrop') {
            setCinemaBackdropFile(files?.[0] || null);
            return;
        }

        if (name === 'cinema_name') {
            setFormData((prev) => ({
                ...prev,
                cinema_name: value,
                slug: generateSlug(value)
            }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ------------------------------------------------------
    // HANDLE SUBMIT
    // ------------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSubmitLoading(true);
            setFormErrors({});

            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => submitData.append(key, value));
            if (cinemaBackdropFile) submitData.append('cinema_backdrop', cinemaBackdropFile);

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (editingCinema) {
                await api.put(`/api/cinemas/${editingCinema.cinema_id}`, submitData, config);
                setIsFormOpen(false);
                fetchCinemas(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật rạp thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/cinemas', submitData, config);
                setIsFormOpen(false);
                fetchCinemas(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Thêm rạp thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            console.error('SUBMIT CINEMA ERROR:', error);
            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.message || 'Đã xảy ra lỗi.';
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

                    const currentPage = pagination.page;
                    const newPage = cinemas.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchCinemas(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa rạp thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE CINEMA ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', 'Không thể xóa rạp.', 'error');
                    }, 100);
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
            title: 'Giờ hoạt động',
            key: 'operating_hours',
            render: (row) => (
                <div style={{ fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                        <Clock size={14} />
                        <span>Ngày thường: <strong>{row.weekday_open || '08:00'} - {row.weekday_close || '23:30'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', marginTop: '2px' }}>
                        <Clock size={14} />
                        <span>Cuối tuần: <strong>{row.weekend_open || '08:00'} - {row.weekend_close || '24:00'}</strong></span>
                    </div>
                </div>
            )
        },
        {
            title: 'Google Map',
            key: 'map_link',
            render: (row) => (
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        if (row.map_link && row.map_link.includes('<iframe')) {
                            const win = window.open('', '_blank', 'width=800,height=600');
                            if (win) {
                                win.document.write(`
                                    <html>
                                        <head>
                                            <title>Google Map - ${row.cinema_name}</title>
                                            <style>
                                                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; }
                                                iframe { width: 100%; height: 100vh; border: none; }
                                            </style>
                                        </head>
                                        <body>
                                            ${row.map_link}
                                        </body>
                                    </html>
                                `);
                                win.document.close();
                            }
                        } else {
                            window.open(row.map_link, '_blank');
                        }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', textDecoration: 'none', cursor: 'pointer' }}
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
            title: 'Backdrop',
            key: 'cinema_backdrop',
            render: (row) => (
                row.cinema_backdrop ? (
                    <img
                        src={getBackdropUrl(row.cinema_backdrop)}
                        alt="backdrop"
                        style={{ width: '100px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                ) : <span style={{ color: '#94a3b8' }}>Chưa có</span>
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

    // ------------------------------------------------------
    // FORM FIELDS (THÊM 4 TRƯỜNG GIỜ HOẠT ĐỘNG)
    // ------------------------------------------------------
    const formFields = [
        { label: 'Tên rạp', name: 'cinema_name', type: 'text', placeholder: 'Nhập tên rạp' },
        { label: 'Slug', name: 'slug', type: 'text', placeholder: 'Slug tự động', disabled: true },
        { label: 'Thành phố', name: 'city', type: 'text', placeholder: 'Ví dụ: Hồ Chí Minh' },
        { label: 'Hotline', name: 'hotline', type: 'text', placeholder: 'Ví dụ: 19006017' },
        {
            label: 'Google Map Iframe',
            name: 'map_link',
            type: 'textarea',
            placeholder: `Dán thẻ iframe Google Map vào đây, ví dụ:\n<iframe src="https://www.google.com/maps/embed?pb=..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`,
            rows: 4
        },
        { label: 'Backdrop', name: 'cinema_backdrop', type: 'file' },
        { label: 'Địa chỉ', name: 'address', type: 'textarea', placeholder: 'Nhập địa chỉ chi tiết' },
        
        // 👉 THÊM 4 TRƯỜNG GIỜ HOẠT ĐỘNG
        {
            label: '🕐 Giờ mở cửa (Thứ 2 - Thứ 6)',
            name: 'weekday_open',
            type: 'time',
            placeholder: '08:00'
        },
        {
            label: '🕐 Giờ đóng cửa (Thứ 2 - Thứ 6)',
            name: 'weekday_close',
            type: 'time',
            placeholder: '23:30'
        },
        {
            label: '🕐 Giờ mở cửa (Thứ 7 - Chủ nhật)',
            name: 'weekend_open',
            type: 'time',
            placeholder: '08:00'
        },
        {
            label: '🕐 Giờ đóng cửa (Thứ 7 - Chủ nhật)',
            name: 'weekend_close',
            type: 'time',
            placeholder: '24:00'
        }
    ];

    // ------------------------------------------------------
    // FILE PREVIEWS
    // ------------------------------------------------------
    const filePreviews = {};
    if (editingCinema && editingCinema.cinema_backdrop) {
        filePreviews['cinema_backdrop'] = {
            url: getBackdropUrl(editingCinema.cinema_backdrop),
            name: editingCinema.cinema_backdrop
        };
    }

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

            {/* FORM MODAL */}
            <AdminModal
                open={isFormOpen}
                onClose={handleCloseForm}
                title={editingCinema ? 'Cập nhật rạp' : 'Thêm rạp'}
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
                    submitText={editingCinema ? 'Lưu thay đổi' : 'Thêm rạp'}
                    filePreviews={filePreviews}
                />
            </AdminModal>

            {/* ALERT MODAL */}
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

export default CinemaPage;