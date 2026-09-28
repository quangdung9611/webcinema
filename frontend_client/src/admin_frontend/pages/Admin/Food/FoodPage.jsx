import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../../api/api';
import {
    Popcorn,
    Edit,
    Trash2,
    Loader2,
    Tag,
    CircleDollarSign,
    CircleCheck,
    CircleX,
    UtensilsCrossed,
    CupSoda,       // ⭐ Cho Drink
    Utensils,      // ⭐ Cho Combo
    Cookie,        // ⭐ Cho Snack
    Sandwich,      // ⭐ Cho Break (Bánh mì)
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';
import AdminPagination from '../../../components/AdminPagination';

// ==========================================================
// HELPERS
// ==========================================================
const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `https://api.quangdungcinema.id.vn/uploads/foods/${image}`;
};

const DEFAULT_IMAGE = 'https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-food.jpg';

const initialFormData = {
    product_name: '',
    price: '',
    category: 'Popcorn',
    status: '1'
};

// ⭐ Danh sách category
const CATEGORY_OPTIONS = [
    { label: 'Bắp rang', value: 'Popcorn' },
    { label: 'Nước uống', value: 'Drink' },
    { label: 'Combo', value: 'Combo' },
    { label: 'Snack', value: 'Snack' },
    { label: 'Bánh mì', value: 'Break' },
    { label: 'Khác', value: 'Other' }
];

const CATEGORY_LABEL_MAP = {
    Popcorn: 'Bắp rang',
    Drink: 'Nước uống',
    Combo: 'Combo',
    Snack: 'Snack',
    Break: 'Bánh mì',
    Other: 'Khác'
};

// ⭐ Map category → Lucide icon component
const CATEGORY_ICON_MAP = {
    Popcorn: Popcorn,
    Drink: CupSoda,
    Combo: Utensils,
    Snack: Cookie,
    Break: Sandwich,
    Other: UtensilsCrossed
};

// ⭐ Map category → màu sắc riêng cho icon
const CATEGORY_COLOR_MAP = {
    Popcorn: { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' },
    Drink:   { bg: 'linear-gradient(135deg, #cffafe, #a5f3fc)', color: '#0891b2' },
    Combo:   { bg: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', color: '#db2777' },
    Snack:   { bg: 'linear-gradient(135deg, #ffedd5, #fed7aa)', color: '#ea580c' },
    Break:   { bg: 'linear-gradient(135deg, #fef9c3, #fde047)', color: '#ca8a04' },
    Other:   { bg: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4f46e5' }
};

// ==========================================================
// COMPONENT
// ==========================================================
const FoodPage = () => {
    const [foods, setFoods] = useState([]);
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
    const [editingFood, setEditingFood] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [foodImage, setFoodImage] = useState(null);
    const [filePreviews, setFilePreviews] = useState({});
    const [formErrors, setFormErrors] = useState({});

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
    // FETCH FOODS
    // ------------------------------------------------------
    const fetchFoods = useCallback(async (page = 1, keyword = '') => {
        if (isFetching.current) return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        isFetching.current = true;
        setLoading(true);

        try {
            const res = await api.get('/api/foods/paginated', {
                params: {
                    page,
                    limit: 20,
                    search: keyword.trim()
                },
                signal: controller.signal
            });

            const foodsData = res.data?.data || [];
            const paginationData = res.data?.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            };

            setFoods(foodsData);
            setPagination(paginationData);
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
            console.error('FETCH FOODS ERROR:', error);
            setFoods([]);
            setPagination({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 1,
                hasPreviousPage: false,
                hasNextPage: false
            });
            showAlert('Lỗi', 'Không thể tải danh sách đồ ăn.', 'error');
        } finally {
            setLoading(false);
            isFetching.current = false;
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        fetchFoods(1, '');
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchFoods]);

    const prevSearchRef = useRef('');
    useEffect(() => {
        const currentSearch = search;
        const prevSearch = prevSearchRef.current;

        if (currentSearch === prevSearch) return;
        prevSearchRef.current = currentSearch;

        const timer = setTimeout(() => {
            fetchFoods(1, currentSearch);
        }, 400);

        return () => clearTimeout(timer);
    }, [search, fetchFoods]);

    const handlePageChange = (page) => {
        fetchFoods(page, search);
    };

    // ------------------------------------------------------
    // VALIDATE FORM
    // ------------------------------------------------------
    const validateForm = () => {
        const errors = {};
        if (!formData.product_name.trim()) {
            errors.product_name = 'Vui lòng nhập tên sản phẩm.';
        }
        if (!formData.price) {
            errors.price = 'Vui lòng nhập giá sản phẩm.';
        } else if (Number(formData.price) <= 0) {
            errors.price = 'Giá sản phẩm phải lớn hơn 0.';
        } else if (!Number.isInteger(Number(formData.price))) {
            errors.price = 'Giá sản phẩm phải là số nguyên.';
        }
        if (!formData.category) {
            errors.category = 'Vui lòng chọn danh mục.';
        }
        const validCategories = CATEGORY_OPTIONS.map(opt => opt.value);
        if (formData.category && !validCategories.includes(formData.category)) {
            errors.category = 'Danh mục không hợp lệ.';
        }
        if (!editingFood && !foodImage) {
            errors.food_image = 'Vui lòng chọn hình ảnh sản phẩm.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ------------------------------------------------------
    // HANDLE MODAL ACTIONS
    // ------------------------------------------------------
    const handleOpenAdd = () => {
        setEditingFood(null);
        setFormData(initialFormData);
        setFoodImage(null);
        setFilePreviews({});
        setFormErrors({});
        setIsFormOpen(true);
    };

    const handleOpenEdit = (food) => {
        setEditingFood(food);
        setFormData({
            product_name: food.product_name || '',
            price: String(food.price || ''),
            category: food.category || 'Popcorn',
            status: String(food.status ?? '1')
        });
        setFoodImage(null);
        setFormErrors({});
        if (food.food_image) {
            setFilePreviews({
                food_image: {
                    url: getImageUrl(food.food_image),
                    name: food.food_image
                }
            });
        } else {
            setFilePreviews({});
        }
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        if (submitLoading) return;
        setIsFormOpen(false);
        setEditingFood(null);
        setFormErrors({});
        setFoodImage(null);
        setFilePreviews({});
    };

    // ------------------------------------------------------
    // HANDLE FORM CHANGE
    // ------------------------------------------------------
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }

        if (name === 'food_image') {
            const file = files?.[0] || null;
            setFoodImage(file);
            if (file) {
                if (filePreviews.food_image?.url?.startsWith('blob:')) {
                    URL.revokeObjectURL(filePreviews.food_image.url);
                }
                const blobUrl = URL.createObjectURL(file);
                setFilePreviews({
                    food_image: { url: blobUrl, name: file.name }
                });
            } else {
                setFilePreviews({});
            }
            return;
        }

        if (name === 'price') {
            const cleanValue = value.replace(/[^0-9]/g, '');
            setFormData((prev) => ({ ...prev, [name]: cleanValue }));
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

            const submitData = new FormData();

            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'price') {
                    const intPrice = Math.round(Number(value) || 0);
                    submitData.append(key, String(intPrice));
                } else {
                    submitData.append(key, value);
                }
            });

            if (foodImage) {
                submitData.append('food_image', foodImage);
            }

            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            if (editingFood) {
                await api.put(`/api/foods/${editingFood.product_id}`, submitData, config);
                setIsFormOpen(false);
                fetchFoods(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Cập nhật sản phẩm thành công.', 'success');
                }, 100);
            } else {
                await api.post('/api/foods', submitData, config);
                setIsFormOpen(false);
                fetchFoods(pagination.page, search);
                setTimeout(() => {
                    showAlert('Thành công', 'Thêm sản phẩm thành công.', 'success');
                }, 100);
            }
        } catch (error) {
            console.error('SUBMIT FOOD ERROR:', error);
            const backendError = error.response?.data?.message || 'Đã xảy ra lỗi hệ thống.';
            if (error.response?.data?.field) {
                setFormErrors({ [error.response.data.field]: backendError });
                return;
            }
            showAlert('Lỗi', backendError, 'error');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = (food) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${food.product_name}"?`,
            'warning',
            async () => {
                try {
                    await api.delete(`/api/foods/${food.product_id}`);
                    closeAlert();

                    const currentPage = pagination.page;
                    const newPage = foods.length === 1 && currentPage > 1
                        ? currentPage - 1
                        : currentPage;
                    await fetchFoods(newPage, search);
                    setTimeout(() => {
                        showAlert('Thành công', 'Xóa sản phẩm thành công.', 'success');
                    }, 100);
                } catch (error) {
                    console.error('DELETE FOOD ERROR:', error);
                    closeAlert();
                    setTimeout(() => {
                        showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa sản phẩm.', 'error');
                    }, 100);
                }
            },
            closeAlert
        );
    };

    const formatCurrency = (amount) => {
        return Number(amount).toLocaleString('vi-VN') + 'đ';
    };

    // ------------------------------------------------------
    // ⭐ COMPONENT: Category Badge — dùng Lucide icon
    // ------------------------------------------------------
    const CategoryBadge = ({ category }) => {
        const IconComponent = CATEGORY_ICON_MAP[category] || UtensilsCrossed;
        const colors = CATEGORY_COLOR_MAP[category] || CATEGORY_COLOR_MAP.Other;
        const label = CATEGORY_LABEL_MAP[category] || category;

        return (
            <span
                className="status-badge used"
                style={{
                    gap: '8px',
                    paddingLeft: '6px',
                    display: 'inline-flex',
                    alignItems: 'center'
                }}
            >
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: colors.bg,
                        color: colors.color
                    }}
                >
                    <IconComponent size={14} strokeWidth={2.4} />
                </span>
                {label}
            </span>
        );
    };

    // ------------------------------------------------------
    // TABLE COLUMNS
    // ------------------------------------------------------
    const columns = [
        {
            title: 'Hình ảnh',
            key: 'food_image',
            render: (row) => (
                <img
                    src={getImageUrl(row.food_image) || DEFAULT_IMAGE}
                    alt={row.product_name}
                    style={{
                        width: '72px',
                        height: '72px',
                        objectFit: 'cover',
                        borderRadius: '14px',
                        border: '2px solid rgba(255,255,255,0.08)'
                    }}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_IMAGE;
                    }}
                />
            )
        },
        {
            title: 'Tên sản phẩm',
            key: 'product_name',
            render: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <UtensilsCrossed size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700' }}>{row.product_name}</div>
                        <small style={{ color: '#94a3b8' }}>#{row.product_id}</small>
                    </div>
                </div>
            )
        },
        {
            title: 'Danh mục',
            key: 'category',
            // ⭐ Dùng component CategoryBadge
            render: (row) => <CategoryBadge category={row.category} />
        },
        {
            title: 'Giá',
            key: 'price',
            render: (row) => (
                <span className="status-badge" style={{ gap: '6px' }}>
                    <CircleDollarSign size={15} /> {formatCurrency(row.price)}
                </span>
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (row) => (
                <span className={`status-badge ${Number(row.status) === 1 ? 'used' : 'expired'}`} style={{ gap: '6px' }}>
                    {Number(row.status) === 1 ? <CircleCheck size={14} /> : <CircleX size={14} />}
                    {Number(row.status) === 1 ? 'Đang bán' : 'Ngừng bán'}
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

    // ------------------------------------------------------
    // FORM FIELDS
    // ------------------------------------------------------
    const formFields = [
        {
            label: 'Tên sản phẩm',
            name: 'product_name',
            type: 'text',
            placeholder: 'Nhập tên đồ ăn hoặc nước uống'
        },
        {
            label: 'Giá sản phẩm',
            name: 'price',
            type: 'number',
            placeholder: 'Ví dụ: 79000',
            step: 1,
            min: 0,
            inputMode: 'numeric'
        },
        {
            label: 'Danh mục',
            name: 'category',
            type: 'select',
            options: CATEGORY_OPTIONS
        },
        {
            label: 'Trạng thái',
            name: 'status',
            type: 'select',
            options: [
                { label: 'Đang bán', value: '1' },
                { label: 'Ngừng bán', value: '0' }
            ]
        },
        {
            label: 'Hình ảnh sản phẩm',
            name: 'food_image',
            type: 'file'
        }
    ];

    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------
    return (
        <>
            <AdminPage
                title="Quản lý đồ ăn"
                subtitle="Quản lý toàn bộ đồ ăn và thức uống"
                icon={<Popcorn size={30} />}
                buttonText="Thêm sản phẩm"
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
                        <AdminTable columns={columns} data={foods} />
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
                onClose={handleCloseForm}
                title={editingFood ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
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
                    submitText={editingFood ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                    filePreviews={filePreviews}
                />
            </AdminModal>

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

export default FoodPage;