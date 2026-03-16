import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

// Import tài nguyên
import '../../../styles/UserUpdate.css'; 
import Modal from '../../../components/Modal';

const UserUpdate = () => {
    const { user_id } = useParams();
    const navigate = useNavigate();

    // --- 1. QUẢN LÝ STATE (Đã thêm address và role) ---
    const [formData, setFormData] = useState({
        full_name: '', 
        email: '', 
        phone: '', 
        role: 'customer', // Mặc định để tránh lỗi select
        address: '', 
        password: ''
    });

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // --- 2. EFFECT: LẤY DỮ LIỆU CŨ ---
    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Lấy danh sách hoặc API get by ID nếu bạn có
                const res = await axios.get(`http://localhost:5000/api/users`);
                const user = res.data.find(u => u.user_id === parseInt(user_id));
                
                if (user) {
                    // Đổ dữ liệu cũ vào form, riêng password luôn để trống để bảo mật
                    setFormData({ 
                        full_name: user.full_name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        role: user.role || 'customer',
                        address: user.address || '',
                        password: '' 
                    });
                }
            } catch (err) {
                showNotice('error', 'LỖI TẢI DỮ LIỆU', 'Không thể lấy thông tin người dùng từ máy chủ.');
            }
        };
        fetchUser();
    }, [user_id]);

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
        
        // Kiểm tra sơ bộ địa chỉ trước khi gửi
        if (formData.address && formData.address.length < 5) {
            showNotice('error', 'DỮ LIỆU YẾU', 'Địa chỉ cần nhập chi tiết hơn (ít nhất 5 ký tự).');
            return;
        }

        try {
            await axios.put(`http://localhost:5000/api/users/update/${user_id}`, formData);
            
            showNotice(
                'success',
                'CẬP NHẬT THÀNH CÔNG',
                `Thông tin của ${formData.full_name} đã được lưu lại.`,
                () => {
                    setModal(prev => ({ ...prev, show: false }));
                    navigate('/admin/users');
                }
            );
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Đã có lỗi xảy ra trong quá trình lưu dữ liệu.';
            showNotice('error', 'CẬP NHẬT THẤT BẠI', errorMsg);
        }
    };

    // --- 5. GIAO DIỆN (RENDER) ---
    return (
        <div className="update-user-wrapper">
            <Modal {...modal} />

            <h2>CHỈNH SỬA HỒ SƠ</h2>
            <p className="update-subtitle">Sửa thông tin User ID: <strong>#{user_id}</strong></p>
            
            <form onSubmit={handleSubmit}>
                <div className="update-form-grid">
                    
                    {/* Họ tên */}
                    <div className="update-field">
                        <label>Họ và tên</label>
                        <input 
                            name="full_name"
                            value={formData.full_name} 
                            onChange={handleInputChange} 
                            placeholder="Nhập họ tên"
                            required
                        />
                    </div>

                    {/* Số điện thoại */}
                    <div className="update-field">
                        <label>Số điện thoại</label>
                        <input 
                            name="phone"
                            value={formData.phone} 
                            onChange={handleInputChange} 
                            placeholder="Số điện thoại"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="update-field">
                        <label>Email liên hệ</label>
                        <input 
                            name="email"
                            type="email" 
                            value={formData.email} 
                            onChange={handleInputChange} 
                            placeholder="email@example.com"
                            required
                        />
                    </div>

                    {/* Vai trò (Role) - Bổ sung mới */}
                    <div className="update-field">
                        <label>Vai trò hệ thống</label>
                        <select name="role" value={formData.role} onChange={handleInputChange}>
                            <option value="customer">Khách hàng</option>
                            <option value="admin">Quản trị viên</option>
                        </select>
                    </div>

                    {/* Địa chỉ - Bổ sung mới (Dùng textarea cho rộng) */}
                    <div className="update-field full-width">
                        <label>Địa chỉ</label>
                        <textarea 
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Số nhà, tên đường..."
                            rows="2"
                        />
                    </div>

                    {/* Mật khẩu */}
                    <div className="update-field full-width">
                        <label>Mật khẩu mới (Để trống nếu không muốn đổi)</label>
                        <input 
                            name="password"
                            type="password" 
                            value={formData.password}
                            placeholder="Nhập mật khẩu mới nếu muốn thay đổi" 
                            onChange={handleInputChange} 
                        />
                    </div>
                </div>

                <div className="update-actions">
                    <button 
                        type="button" 
                        className="btn-go-back" 
                        onClick={() => navigate('/admin/users')}
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

export default UserUpdate;