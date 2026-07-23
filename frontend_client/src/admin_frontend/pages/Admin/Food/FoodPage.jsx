import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Popcorn,
    Edit,
    Trash2,
    Loader2,
    Package,
    BadgeDollarSign,
    ImagePlus,
    Tag,
    CircleDollarSign,
    CircleCheck,
    CircleX,
    UtensilsCrossed
} from 'lucide-react';

import AdminPage from '../../../components/AdminPage';
import AdminTable from '../../../components/AdminTable';
import AdminModal from '../../../components/AdminModal';
import AdminForm from '../../../components/AdminForm';

const API_URL = 'https://api.quangdungcinema.id.vn/api/foods';

const initialFormData = {
    product_name: '',
    price: '',
    category: 'Popcorn',
    status: '1'
};

const FoodPage = () => {

    const [foods, setFoods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingFood, setEditingFood] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [foodImage, setFoodImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Alert Modal
    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = (title, message, onConfirm = null, onCancel = null) => {
        setAlertModal({ open: true, title, message, onConfirm, onCancel });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, open: false }));
    };

    // Fetch foods
    const fetchFoods = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_URL);
            setFoods(res.data.data || []);
        } catch (error) {
            showAlert('Lỗi', 'Không thể tải danh sách đồ ăn.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFoods();
    }, []);

    // Cleanup preview
    useEffect(() => {
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    // Validate
    const validateForm = () => {
        const errors = {};
        if (!formData.product_name.trim()) {
            errors.product_name = 'Vui lòng nhập tên sản phẩm.';
        }
        if (!formData.price) {
            errors.price = 'Vui lòng nhập giá sản phẩm.';
        } else if (Number(formData.price) <= 0) {
            errors.price = 'Giá sản phẩm phải lớn hơn 0.';
        }
        if (!formData.category) {
            errors.category = 'Vui lòng chọn danh mục.';
        }
        if (!editingFood && !foodImage) {
            errors.food_image = 'Vui lòng chọn hình ảnh sản phẩm.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Open Add
    const handleOpenAdd = () => {
        setEditingFood(null);
        setFormData(initialFormData);
        setFoodImage(null);
        setPreview(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    // Open Edit
    const handleOpenEdit = (food) => {
        setEditingFood(food);
        setFormData({
            product_name: food.product_name || '',
            price: food.price || '',
            category: food.category || 'Popcorn',
            status: String(food.status ?? '1')
        });
        setPreview(
            food.food_image
                ? `https://api.quangdungcinema.id.vn/uploads/foods/${food.food_image}`
                : null
        );
        setFoodImage(null);
        setFormErrors({});
        setIsFormOpen(true);
    };

    // Change handler
    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }

        if (name === 'food_image') {
            const file = files[0];
            setFoodImage(file);
            if (file) {
                if (preview && preview.startsWith('blob:')) {
                    URL.revokeObjectURL(preview);
                }
                setPreview(URL.createObjectURL(file));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSubmitLoading(true);

            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                submitData.append(key, value);
            });
            if (foodImage) {
                submitData.append('food_image', foodImage);
            }

            if (editingFood) {
                await axios.put(`${API_URL}/update/${editingFood.product_id}`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showAlert('Thành công', 'Cập nhật sản phẩm thành công.');
            } else {
                await axios.post(`${API_URL}/create`, submitData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showAlert('Thành công', 'Thêm sản phẩm thành công.');
            }

            setIsFormOpen(false);
            fetchFoods();
        } catch (error) {
            showAlert('Lỗi', error.response?.data?.message || 'Đã xảy ra lỗi hệ thống.');
        } finally {
            setSubmitLoading(false);
        }
    };

    // Delete
    const handleDelete = (food) => {
        showAlert(
            'Xác nhận xóa',
            `Bạn có chắc muốn xóa "${food.product_name}"?`,
            async () => {
                try {
                    await axios.delete(`${API_URL}/delete/${food.product_id}`);
                    closeAlert();
                    fetchFoods();
                } catch (error) {
                    showAlert('Lỗi', error.response?.data?.message || 'Không thể xóa sản phẩm.');
                }
            },
            closeAlert
        );
    };

    // Filter
    const filteredFoods = foods.filter(food => {
        const keyword = search.toLowerCase();
        return (
            food.product_name?.toLowerCase().includes(keyword) ||
            food.category?.toLowerCase().includes(keyword)
        );
    });

    // Format currency
    const formatCurrency = (amount) => {
        return Number(amount).toLocaleString('vi-VN') + 'đ';
    };

    // Columns
    const columns = [
        {
            title: 'Hình ảnh',
            key: 'food_image',
            render: (row) => (
                <img
                    src={`https://api.quangdungcinema.id.vn/uploads/foods/${row.food_image}`}
                    alt={row.product_name}
                    style={{
                        width: '72px',
                        height: '72px',
                        objectFit: 'cover',
                        borderRadius: '14px',
                        border: '2px solid rgba(255,255,255,0.08)'
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
            render: (row) => (
                <span className="status-badge used" style={{ gap: '6px' }}>
                    <Tag size={14} /> {row.category}
                </span>
            )
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

    // Form fields
    const formFields = [
        {
            label: 'Tên sản phẩm',
            name: 'product_name',
            type: 'text',
            icon: <Package size={16} />,
            placeholder: 'Nhập tên đồ ăn hoặc nước uống'
        },
        {
            label: 'Giá sản phẩm',
            name: 'price',
            type: 'number',
            icon: <BadgeDollarSign size={16} />,
            placeholder: 'Ví dụ: 79000'
        },
        {
            label: 'Danh mục',
            name: 'category',
            type: 'select',
            icon: <Tag size={16} />,
            options: [
                { label: 'Bắp rang', value: 'Popcorn' },
                { label: 'Nước uống', value: 'Drink' },
                { label: 'Combo', value: 'Combo' },
                { label: 'Snack', value: 'Snack' },
                { label: 'Khác', value: 'Other' }
            ]
        },
        {
            label: 'Trạng thái',
            name: 'status',
            type: 'select',
            icon: <CircleCheck size={16} />,
            options: [
                { label: 'Đang bán', value: '1' },
                { label: 'Ngừng bán', value: '0' }
            ]
        },
        {
            label: 'Hình ảnh sản phẩm',
            name: 'food_image',
            type: 'file',
            icon: <ImagePlus size={16} />
        }
    ];

    // Render
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
                    <AdminTable columns={columns} data={filteredFoods} />
                )}
            </AdminPage>

            <AdminModal
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingFood ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
            >
                {preview && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                        <img
                            src={preview}
                            alt="preview"
                            style={{
                                width: '120px',
                                height: '120px',
                                objectFit: 'cover',
                                borderRadius: '16px',
                                border: '3px solid rgba(255,255,255,0.08)'
                            }}
                        />
                    </div>
                )}
                <AdminForm
                    fields={formFields}
                    formData={formData}
                    errors={formErrors}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    loading={submitLoading}
                    submitText={editingFood ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                />
            </AdminModal>

            <AdminModal
                open={alertModal.open}
                onClose={closeAlert}
                title={alertModal.title}
            >
                <div className="admin-alert-content">
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

export default FoodPage;