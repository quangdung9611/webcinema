import React, {
    useEffect,
    useState
} from 'react';

import axios from 'axios';

import {
    Ticket,
    Edit,
    Trash2,
    Loader2,
    CalendarDays,
    BadgeDollarSign
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

/* =====================================================
    API
===================================================== */

const COUPON_API =
    'https://api.quangdungcinema.id.vn/api/coupons';

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

    const [submitLoading, setSubmitLoading] =
        useState(false);

    const [search, setSearch] = useState('');

    const [isFormOpen, setIsFormOpen] =
        useState(false);

    const [editingCoupon, setEditingCoupon] =
        useState(null);

    const [formData, setFormData] =
        useState(initialFormData);

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
        FETCH DATA
    ===================================================== */

    const fetchCoupons = async () => {

        setLoading(true);

        try {

            const res = await axios.get(
                `${COUPON_API}/all`
            );

            if (res.data.success) {

                setCoupons(res.data.data);

            }

        } catch (error) {

            showAlert(
                'Lỗi',
                'Không thể tải danh sách mã giảm giá.'
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchCoupons();

    }, []);

    /* =====================================================
        OPEN ADD
    ===================================================== */

    const handleOpenAdd = () => {

        setEditingCoupon(null);

        setFormData(initialFormData);

        setFormErrors({});

        setIsFormOpen(true);

    };

    /* =====================================================
        OPEN EDIT
    ===================================================== */

    const handleOpenEdit = (coupon) => {

        const formattedDate =
            coupon.expiry_date
                ?.split('T')[0];

        setEditingCoupon(coupon);

        setFormErrors({});

        setFormData({
            coupon_code:
                coupon.coupon_code || '',

            discount_value:
                coupon.discount_value || '',

            expiry_date:
                formattedDate || ''
        });

        setIsFormOpen(true);

    };

    /* =====================================================
        VALIDATE FORM
    ===================================================== */

    const validateForm = () => {

        const errors = {};

        /* COUPON CODE */

        if (
            !formData.coupon_code.trim()
        ) {

            errors.coupon_code =
                'Vui lòng nhập mã giảm giá';

        } else if (
            formData.coupon_code.trim().length < 3
        ) {

            errors.coupon_code =
                'Mã giảm giá phải từ 3 ký tự trở lên';

        }

        /* DISCOUNT VALUE */

        if (
            !formData.discount_value
        ) {

            errors.discount_value =
                'Vui lòng nhập số tiền giảm';

        } else if (
            Number(formData.discount_value) <= 0
        ) {

            errors.discount_value =
                'Số tiền giảm phải lớn hơn 0';

        }

        /* EXPIRY DATE */

        if (
            !formData.expiry_date
        ) {

            errors.expiry_date =
                'Vui lòng chọn ngày hết hạn';

        } else {

            const selectedDate =
                new Date(formData.expiry_date);

            const today =
                new Date();

            today.setHours(
                0,
                0,
                0,
                0
            );

            if (
                selectedDate < today
            ) {

                errors.expiry_date =
                    'Ngày hết hạn không được ở quá khứ';

            }

        }

        return errors;

    };

    /* =====================================================
        HANDLE CHANGE
    ===================================================== */

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        const finalValue =
            name === 'coupon_code'
                ? value.toUpperCase()
                : value;

        /* UPDATE FORM */

        setFormData(prev => ({
            ...prev,
            [name]: finalValue
        }));

        /* REALTIME VALIDATION */

        let errorMessage = '';

        switch (name) {

            case 'coupon_code':

                if (
                    !finalValue.trim()
                ) {

                    errorMessage =
                        'Vui lòng nhập mã giảm giá';

                } else if (
                    finalValue.trim().length < 3
                ) {

                    errorMessage =
                        'Mã giảm giá phải từ 3 ký tự trở lên';

                }

                break;

            case 'discount_value':

                if (
                    !finalValue
                ) {

                    errorMessage =
                        'Vui lòng nhập số tiền giảm';

                } else if (
                    Number(finalValue) <= 0
                ) {

                    errorMessage =
                        'Số tiền giảm phải lớn hơn 0';

                }

                break;

            case 'expiry_date':

                if (
                    !finalValue
                ) {

                    errorMessage =
                        'Vui lòng chọn ngày hết hạn';

                } else {

                    const selectedDate =
                        new Date(finalValue);

                    const today =
                        new Date();

                    today.setHours(
                        0,
                        0,
                        0,
                        0
                    );

                    if (
                        selectedDate < today
                    ) {

                        errorMessage =
                            'Ngày hết hạn không được ở quá khứ';

                    }

                }

                break;

            default:
                break;

        }

        /* SET ERROR */

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

        const errors =
            validateForm();

        if (
            Object.keys(errors).length > 0
        ) {

            setFormErrors(errors);

            return;

        }

        try {

            setSubmitLoading(true);

            setFormErrors({});

            if (editingCoupon) {

                await axios.put(
                    `${COUPON_API}/update/${editingCoupon.coupon_id}`,
                    formData
                );

                showAlert(
                    'Thành công',
                    'Cập nhật mã giảm giá thành công.'
                );

            } else {

                await axios.post(
                    `${COUPON_API}/create`,
                    formData
                );

                showAlert(
                    'Thành công',
                    'Thêm mã giảm giá thành công.'
                );

            }

            setIsFormOpen(false);

            fetchCoupons();

        } catch (error) {

            const backendField =
                error.response?.data?.field;

            const backendError =
                error.response?.data?.error ||
                error.response?.data?.message;

            /* BACKEND FIELD ERROR */

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
                'Đã xảy ra lỗi hệ thống.'
            );

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

            async () => {

                try {

                    await axios.delete(
                        `${COUPON_API}/delete/${coupon.coupon_id}`
                    );

                    closeAlert();

                    fetchCoupons();

                } catch (error) {

                    showAlert(
                        'Lỗi',
                        error.response?.data?.message ||
                        'Không thể xóa mã giảm giá.'
                    );

                }

            },

            closeAlert
        );

    };

    /* =====================================================
        FORMAT
    ===================================================== */

    const formatCurrency = (amount) => {

        return Number(amount)
            .toLocaleString('vi-VN') + 'đ';

    };

    const formatDate = (dateStr) => {

        return new Date(dateStr)
            .toLocaleDateString('vi-VN');

    };

    /* =====================================================
        FILTER
    ===================================================== */

    const filteredCoupons =
        coupons.filter(coupon => {

            return coupon.coupon_code
                ?.toLowerCase()
                .includes(search.toLowerCase());

        });

    /* =====================================================
        TABLE COLUMNS
    ===================================================== */

    const columns = [

        {
            title: 'ID',
            key: 'coupon_id',

            render: (row) => (

                <strong>
                    #{row.coupon_id}
                </strong>

            )
        },

        {
            title: 'Mã giảm giá',
            key: 'coupon_code',

            render: (row) => (

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}
                >

                    <div
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: '#fff7ed',
                            color: '#f97316',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >

                        <Ticket size={18} />

                    </div>

                    <div>

                        <div
                            style={{
                                fontWeight: '700',
                                color: '#f97316'
                            }}
                        >
                            {row.coupon_code}
                        </div>

                    </div>

                </div>

            )
        },

        {
            title: 'Giảm giá',
            key: 'discount_value',

            render: (row) => (

                <div
                    className="status-badge"
                >

                    <BadgeDollarSign
                        size={14}
                        style={{
                            marginRight: '4px'
                        }}
                    />

                    {formatCurrency(
                        row.discount_value
                    )}

                </div>

            )
        },

        {
            title: 'Ngày hết hạn',
            key: 'expiry_date',

            render: (row) => (

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >

                    <CalendarDays size={15} />

                    {formatDate(
                        row.expiry_date
                    )}

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
            label: 'Mã giảm giá',
            name: 'coupon_code',
            type: 'text',

            placeholder:
                'Ví dụ: GIAM50K'
        },

        {
            label: 'Số tiền giảm',
            name: 'discount_value',
            type: 'number',

            placeholder:
                'Ví dụ: 50000'
        },

        {
            label: 'Ngày hết hạn',
            name: 'expiry_date',
            type: 'date'
        }

    ];

    /* =====================================================
        RENDER
    ===================================================== */

    return (

        <>

            <AdminPage

                title="Quản lý mã giảm giá"

                subtitle="Quản lý toàn bộ coupon trong hệ thống"

                icon={
                    <Ticket size={30} />
                }

                buttonText="Thêm mã giảm giá"

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
                            data={filteredCoupons}
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
                    editingCoupon
                        ? 'Cập nhật mã giảm giá'
                        : 'Thêm mã giảm giá'
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
                        editingCoupon
                            ? 'Lưu thay đổi'
                            : 'Thêm mã giảm giá'
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

export default CouponPage;