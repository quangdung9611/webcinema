import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
    Percent,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

/* =====================================================
    API
===================================================== */
const API_URL = 'https://api.quangdungcinema.id.vn/api/coupons';

/* =====================================================
    INITIAL FORM
===================================================== */
const initialFormData = {
    coupon_code: '',
    discount_value: '',
    expiry_date: ''
};

const CouponPage = () => {
    /* =====================================================
        STATES
    ===================================================== */
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

    /* =====================================================
        ALERT MODAL
    ===================================================== */
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
        setAlertModal(prev => ({ ...prev, open: false }));
    };

    /* =====================================================
        FETCH DATA
    ===================================================== */
    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_URL);
            // response trả về { success: true, data: [...] }
            setCoupons(res.data?.data || res.data || []);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải danh sách mã giảm giá.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    /* =====================================================
        OPEN ADD / EDIT
    ===================================================== */
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

    /* =====================================================
        VALIDATE FORM
    ===================================================== */
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

        return errors;
    };

    /* =====================================================
        HANDLE CHANGE
    ===================================================== */
    const handleChange = (e) => {
        const { name, value } = e.target;

        // Tự động viết hoa mã coupon
        const finalValue = name === 'coupon_code' ? value.toUpperCase() : value;

        setFormData(prev => ({ ...prev, [name]: finalValue }));

        // Xóa lỗi field đang sửa
        setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

    /* =====================================================
        SUBMIT
    ===================================================== */
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

            // Dữ liệu gửi lên (không cần FormData vì không có file)
            const payload = {
                coupon_code: formData.coupon_code.trim(),
                discount_value: Number(formData.discount_value),
                expiry_date: formData.expiry_date
            };

            if (editingCoupon) {
                // PUT /:coupon_id (RESTful)
                await axios.put(`${API_URL}/${editingCoupon.coupon_id}`, payload);
                showAlert('Thành công', 'Cập nhật mã giảm giá thành công.', 'success');
            } else {
                // POST /
                await axios.post(API_URL, payload);
                showAlert('Thành công', 'Thêm mã giảm giá thành công.', 'success');
            }

            setIsFormOpen(false);
            fetchCoupons();
        } catch (error) {
            const backendField = error.response?.data?.field;
            const backendError = error.response?.data?.message || error.response?.data?.error;

            if (backendField) {
                setFormErrors({ [backendField]: backendError });
                return;
            }

            showAlert('Lỗi', backendError || 'Đã xảy ra lỗi hệ thống.', 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    /* =====================================================
        DELETE
    ===================================================== */
    const handleDelete = (coupon) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa mã "${coupon.coupon_code}"?`,
            'warning',
            async () => {
                try {
                    await axios.delete(`${API_URL}/${coupon.coupon_id}`);
                    closeAlert();
                    fetchCoupons();
                    showAlert('Thành công', 'Xóa mã giảm giá thành công.', 'success');
                } catch (error) {
                    showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa mã giảm giá.', 'error');
                }
            },
            closeAlert
        );
    };

    /* =====================================================
        HELPERS FORMAT
    ===================================================== */
    const formatCurrency = (amount) => Number(amount).toLocaleString('vi-VN') + 'đ';
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('vi-VN');

    /* =====================================================
        FILTER
    ===================================================== */
    const filteredCoupons = coupons.filter(coupon =>
        coupon.coupon_code?.toLowerCase().includes(search.toLowerCase())
    );

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */
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

    /* =====================================================
        FORM FIELDS
    ===================================================== */
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

    /* =====================================================
        ALERT ICON
    ===================================================== */
    const renderAlertIcon = () => {
        switch (alertModal.type) {
            case 'success': return <CheckCircle2 size={58} color="#22c55e" />;
            case 'error': return <XCircle size={58} color="#ef4444" />;
            case 'warning': return <AlertTriangle size={58} color="#f59e0b" />;
            default: return <Info size={58} color="#3b82f6" />;
        }
    };

    /* =====================================================
        RENDER
    ===================================================== */
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
                    <AdminTable columns={columns} data={filteredCoupons} />
                )}
            </AdminPage>

            {/* FORM MODAL */}
            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingCoupon ? 'Cập nhật mã giảm giá' : 'Thêm mã giảm giá'}
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

            {/* ALERT MODAL */}
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
                        <button className="admin-confirm-btn" onClick={alertModal.onConfirm || closeAlert}>
                            Xác nhận
                        </button>
                    </div>
                </div>
            </AdminModal>
        </>
    );
};

export default CouponPage;