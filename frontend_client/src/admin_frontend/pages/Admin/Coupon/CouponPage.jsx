import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Ticket,
    Edit,
    Trash2,
    Loader2,
    CalendarDays,
    BadgeDollarSign,
    Tag,
    CircleDollarSign,
    Clock3,
    Percent
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// CONSTANTS & HELPERS
// ==========================================================
const initialFormData = {
    coupon_code: '',
    discount_value: '',
    expiry_date: ''
};

// ==========================================================
// COMPONENT
// ==========================================================
const CouponPage = () => {
    // ------------------------------------------------------
    // STATES
    // ------------------------------------------------------
    const [coupons, setCoupons] = useState([]);
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
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

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

    // ------------------------------------------------------
    // FETCH COUPONS - GIỐNG MoviePage
    // ------------------------------------------------------
    const fetchCoupons = useCallback(async (page = 1, keyword = '') => {
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
            const res = await api.get('/api/coupons/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            // ✅ Lấy trực tiếp từ res.data giống MoviePage
            const couponsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setCoupons(couponsData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log('🛑 Request bị hủy');
                return;
            }
            console.error('FETCH COUPONS ERROR:', error);
            setCoupons([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách mã giảm giá.', 'error');
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
        fetchCoupons(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchCoupons]);

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
            fetchCoupons(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchCoupons]);

    const handlePageChange = (page) => {
        fetchCoupons(page, search);
    };

    // ------------------------------------------------------
    // VALIDATE FORM
    // ------------------------------------------------------
    const validateForm = () => {
        const errors = {};
        if (!formData.coupon_code.trim()) {
            errors.coupon_code = 'Vui lòng nhập mã giảm giá';
        } else if (formData.coupon_code.trim().length < 3) {
            errors.coupon_code = 'Mã giảm giá phải từ 3 ký tự trở lên';
        }
        if (!formData.discount_value) {
            errors.discount_value = 'Vui lòng nhập số tiền giảm';
        } else if (Number(formData.discount_value) <= 0) {
            errors.discount_value = 'Số tiền giảm phải lớn hơn 0';
        }
        if (!formData.expiry_date) {
            errors.expiry_date = 'Vui lòng chọn ngày hết hạn';
        } else {
            const selectedDate = new Date(formData.expiry_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                errors.expiry_date = 'Ngày hết hạn không được ở quá khứ';
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ------------------------------------------------------
    // HANDLE MODAL ACTIONS
    // ------------------------------------------------------
    const handleOpenAdd = () => {
        setEditingCoupon(null);
        setFormData(initialFormData);
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (coupon) => {
        const formattedDate = coupon.expiry_date?.split('T')[0] || '';
        setEditingCoupon(coupon);
        setFormData({
            coupon_code: coupon.coupon_code || '',
            discount_value: coupon.discount_value || '',
            expiry_date: formattedDate
        });
        setFormErrors({});
        setIsFormOpen(true);
    };

    // ------------------------------------------------------
    // HANDLE CLOSE FORM
    // ------------------------------------------------------
    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingCoupon(null);
        setFormErrors({});
    };

    // ------------------------------------------------------
    // HANDLE CHANGE
    // ------------------------------------------------------
    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'coupon_code' ? value.toUpperCase() : value;
        setFormData((prev) => ({ ...prev, [name]: finalValue }));
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }
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

            const payload = {
                coupon_code: formData.coupon_code.trim(),
                discount_value: Number(formData.discount_value),
                expiry_date: formData.expiry_date
            };

            if (editingCoupon) {
                await api.put(`/api/coupons/${editingCoupon.coupon_id}`, payload);
                setIsFormOpen(false);
                fetchCoupons(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật mã giảm giá thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/coupons', payload);
                setIsFormOpen(false);
                fetchCoupons(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Thêm mã giảm giá thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            console.error('SUBMIT COUPON ERROR:', error);
            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.message || error.response?.data?.error || 'Đã xảy ra lỗi hệ thống.';
            if (backendField) {
                setFormErrors({ [backendField]: backendError });
                return;
            }
            showAlert('Lỗi', backendError, 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    // ------------------------------------------------------
    // HANDLE DELETE
    // ------------------------------------------------------
    const handleDelete = (coupon) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa mã "${coupon.coupon_code}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/coupons/${coupon.coupon_id}`);
                    closeAlert();

                    const currentPage = pagination.page;
                    const newPage = coupons.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchCoupons(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa mã giảm giá thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE COUPON ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa mã giảm giá.', 'error');
                    }, 100);
                }
            },
            closeAlert
        );
    };

    // ------------------------------------------------------
    // HELPERS FORMAT
    // ------------------------------------------------------
    const formatCurrency = (amount) => Number(amount).toLocaleString('vi-VN') + 'đ';
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('vi-VN');

    // ------------------------------------------------------
    // TABLE COLUMNS
    // ------------------------------------------------------
    const columns = [
        {
            title: 'ID',
            key: 'coupon_id',
            render: (row) => <strong>#{row.coupon_id}</strong>
        },
        {
            title: 'Mã giảm giá',
            key: 'coupon_code',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                        color: '#f97316',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)'
                    }}>
                        <Tag size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Percent size={15} /> {row.coupon_code}
                        </div>
                        <small style={{ color: '#94a3b8' }}>Coupon giảm giá</small>
                    </div>
                </div>
            )
        },
        {
            title: 'Giảm giá',
            key: 'discount_value',
            render: (row) => (
                <div className="status-badge used" style={{ gap: '6px' }}>
                    <CircleDollarSign size={15} /> {formatCurrency(row.discount_value)}
                </div>
            )
        },
        {
            title: 'Ngày hết hạn',
            key: 'expiry_date',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'rgba(59,130,246,0.1)',
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Clock3 size={16} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '600' }}>{formatDate(row.expiry_date)}</div>
                        <small style={{ color: '#94a3b8' }}>Hạn sử dụng</small>
                    </div>
                </div>
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
    // FORM FIELDS
    // ------------------------------------------------------
    const formFields = [
        {
            label: 'Mã giảm giá',
            name: 'coupon_code',
            type: 'text',
            placeholder: 'Ví dụ: GIAM50K'
        },
        {
            label: 'Số tiền giảm',
            name: 'discount_value',
            type: 'number',
            placeholder: 'Ví dụ: 50000'
        },
        {
            label: 'Ngày hết hạn',
            name: 'expiry_date',
            type: 'date'
        }
    ];

    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------
    return (
        <>
            <AdminPage
                title="Quản lý mã giảm giá"
                subtitle="Quản lý toàn bộ coupon trong hệ thống"
                icon={<Ticket size={30} />}
                buttonText="Thêm mã giảm giá"
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
                        <AdminTable columns={columns} data={coupons} />
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
                title={editingCoupon ? 'Cập nhật mã giảm giá' : 'Thêm mã giảm giá'}
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
                    submitText={editingCoupon ? 'Lưu thay đổi' : 'Thêm mã giảm giá'}
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

export default CouponPage;