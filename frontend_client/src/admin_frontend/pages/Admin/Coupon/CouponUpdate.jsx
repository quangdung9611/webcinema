import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

// Import tài nguyên (Dùng chung style với UserUpdate cho đồng bộ)
import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

const CouponUpdate = () => {
    const { id } = useParams(); // Lấy coupon_id từ URL
    const navigate = useNavigate();

    // --- 1. QUẢN LÝ STATE ---
    const [formData, setFormData] = useState({
        coupon_code: '',
        discount_value: '',
        expiry_date: ''
    });

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // --- 2. EFFECT: LẤY DỮ LIỆU CŨ CỦA MÃ GIẢM GIÁ ---
    useEffect(() => {
        const fetchCoupon = async () => {
            try {
                // Lấy danh sách để tìm mã tương ứng (hoặc dùng API get by ID nếu Dũng có)
                const res = await axios.get(`https://api.quangdungcinema.id.vn/api/coupons/all`);
                const coupon = res.data.data.find(c => c.coupon_id === parseInt(id));
                
                if (coupon) {
                    // Format lại ngày từ DB (YYYY-MM-DD) để input type="date" hiểu được
                    const formattedDate = coupon.expiry_date.split('T')[0];
                    
                    setFormData({ 
                        coupon_code: coupon.coupon_code || '',
                        discount_value: coupon.discount_value || '',
                        expiry_date: formattedDate || ''
                    });
                }
            } catch (err) {
                showNotice('error', 'LỖI TẢI DỮ LIỆU', 'Không thể lấy thông tin mã giảm giá từ máy chủ.');
            }
        };
        fetchCoupon();
    }, [id]);

    // --- 3. CÁC HÀM TRỢ GIÚP (HELPERS) ---
    const showNotice = (type, title, message, onConfirm = null) => {
        setModal({
            show: true,
            type,
            title,
            message,
            onConfirm: onConfirm || (() => setModal(prev => ({ ...prev, show: false })))
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: value 
        }));
    };

    // --- 4. XỬ LÝ CẬP NHẬT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Kiểm tra logic ngày tháng
        const selectedDate = new Date(formData.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            showNotice('error', 'SAI NGÀY', 'Ngày hết hạn không được ở quá khứ.');
            return;
        }

        try {
            await axios.put(`https://api.quangdungcinema.id.vn/api/coupons/update/${id}`, formData);
            
            showNotice(
                'success',
                'CẬP NHẬT THÀNH CÔNG',
                `Mã giảm giá ${formData.coupon_code} đã được cập nhật.`,
                () => {
                    setModal(prev => ({ ...prev, show: false }));
                    navigate('/coupons');
                }
            );
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Lỗi khi lưu thông tin mã giảm giá.';
            showNotice('error', 'CẬP NHẬT THẤT BẠI', errorMsg);
        }
    };

    // --- 5. GIAO DIỆN (RENDER) ---
    return (
        <div className="update-user-wrapper">
            <Modal {...modal} onCancel={() => setModal(prev => ({ ...prev, show: false }))} />

            <h2>CHỈNH SỬA MÃ GIẢM GIÁ</h2>
            <p className="update-subtitle">Sửa thông tin Coupon ID: <strong>#{id}</strong></p>
            
            <form onSubmit={handleSubmit}>
                <div className="update-form-grid">
                    
                    {/* Mã Code */}
                    <div className="update-field full-width">
                        <label>Mã khuyến mãi (Code)</label>
                        <input 
                            name="coupon_code"
                            value={formData.coupon_code} 
                            onChange={handleInputChange} 
                            placeholder="Nhập mã (ví dụ: GIAM50K)"
                            style={{ textTransform: 'uppercase' }}
                            required
                        />
                    </div>

                    {/* Số tiền giảm */}
                    <div className="update-field">
                        <label>Số tiền giảm (VNĐ)</label>
                        <input 
                            name="discount_value"
                            type="number"
                            value={formData.discount_value} 
                            onChange={handleInputChange} 
                            placeholder="Nhập số tiền"
                            required
                        />
                    </div>

                    {/* Ngày hết hạn */}
                    <div className="update-field">
                        <label>Ngày hết hạn</label>
                        <input 
                            name="expiry_date"
                            type="date" 
                            value={formData.expiry_date} 
                            onChange={handleInputChange} 
                            required
                        />
                    </div>

                </div>

                <div className="update-actions">
                    <button 
                        type="button" 
                        className="btn-go-back" 
                        onClick={() => navigate('/coupons')}
                    >
                        Quay lại
                    </button>
                    
                    <button 
                        type="submit" 
                        className="btn-submit-update"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CouponUpdate;