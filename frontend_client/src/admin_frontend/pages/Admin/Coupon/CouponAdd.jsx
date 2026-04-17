import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Import tài nguyên (Dùng chung style với UserForm cho đồng bộ)
import '../../../styles/UserForm.css';
import Modal from '../../../components/Modal';

const CouponAdd = () => {
    const navigate = useNavigate();

    // ==========================================
    // 1. KHỞI TẠO STATE
    // ==========================================
    const [formData, setFormData] = useState({
        coupon_code: '',
        discount_value: '',
        expiry_date: ''
    });

    const [errors, setErrors] = useState({});

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // ==========================================
    // 2. LOGIC KIỂM TRA (VALIDATION)
    // ==========================================
    const validateForm = () => {
        let newErrors = {};

        if (!formData.coupon_code.trim()) {
            newErrors.coupon_code = "Mã giảm giá không được để trống";
        } else if (formData.coupon_code.length < 3) {
            newErrors.coupon_code = "Mã giảm giá phải từ 3 ký tự trở lên";
        }

        if (!formData.discount_value || formData.discount_value <= 0) {
            newErrors.discount_value = "Số tiền giảm phải lớn hơn 0";
        }

        if (!formData.expiry_date) {
            newErrors.expiry_date = "Vui lòng chọn ngày hết hạn";
        } else {
            const selectedDate = new Date(formData.expiry_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.expiry_date = "Ngày hết hạn không được ở quá khứ";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ==========================================
    // 3. XỬ LÝ SỰ KIỆN (HANDLERS)
    // ==========================================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            // Gửi dữ liệu lên API đã tạo ở CouponController
            await axios.post('https://api.quangdungcinema.id.vn/api/coupons/create', formData);
            
            // HIỆN MODAL THÀNH CÔNG
            setModal({
                show: true,
                type: 'success',
                title: 'THÀNH CÔNG',
                message: `Mã giảm giá ${formData.coupon_code} đã được tạo thành công!`,
                onConfirm: () => {
                    setModal({ show: false });
                    navigate('/coupons'); // Chuyển về danh sách mã
                }
            });
        } catch (err) {
            setModal({
                show: true,
                type: 'error',
                title: 'LỖI HỆ THỐNG',
                message: err.response?.data?.message || "Không thể tạo mã giảm giá. Vui lòng thử lại.",
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
        }
    };

    return (
        <div className="user-form-container">
            {/* Modal dùng chung */}
            <Modal {...modal} onCancel={() => setModal(prev => ({ ...prev, show: false }))} />
            
            <h2>THÊM MÃ GIẢM GIÁ MỚI</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Mã khuyến mãi (Coupon Code)</label>
                    <input 
                        name="coupon_code" 
                        placeholder="ví dụ: GIAM20K, DUNGCINEMA..." 
                        value={formData.coupon_code}
                        onChange={handleChange} 
                        style={{textTransform: 'uppercase'}} // Tự động viết hoa cho đẹp
                    />
                    {errors.coupon_code && <span className="error-text">{errors.coupon_code}</span>}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Số tiền giảm (VNĐ)</label>
                        <input 
                            name="discount_value" 
                            type="number" 
                            placeholder="ví dụ: 20000" 
                            value={formData.discount_value}
                            onChange={handleChange} 
                        />
                        {errors.discount_value && <span className="error-text">{errors.discount_value}</span>}
                    </div>
                    
                    <div className="form-group">
                        <label>Ngày hết hạn</label>
                        <input 
                            name="expiry_date" 
                            type="date" 
                            value={formData.expiry_date}
                            onChange={handleChange} 
                        />
                        {errors.expiry_date && <span className="error-text">{errors.expiry_date}</span>}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu mã giảm giá</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/coupons')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default CouponAdd;