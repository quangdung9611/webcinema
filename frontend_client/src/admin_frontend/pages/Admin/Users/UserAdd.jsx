import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Import tài nguyên
import '../../../styles/UserForm.css';
import Modal from '../../../components/Modal';

const UserAdd = () => {
    const navigate = useNavigate();

    // ==========================================
    // 1. KHỞI TẠO STATE
    // ==========================================
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        phone: '',
        address: '', 
        role: 'customer' 
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
    // 2. LOGIC TRỢ GIÚP (HELPERS)
    // ==========================================

    const getPasswordStrength = (password) => {
        if (!password) return { label: '', color: '#ddd', width: '0%' };
        let points = 0;
        if (password.length >= 8) points++;
        if (/[A-Z]/.test(password)) points++;
        if (/[a-z]/.test(password)) points++;
        if (/[0-9]/.test(password)) points++;
        if (/[!@#$%^&*]/.test(password)) points++;

        switch (points) {
            case 1: case 2: return { label: 'Yếu', color: '#e74c3c', width: '33%' };
            case 3: case 4: return { label: 'Trung bình', color: '#f1c40f', width: '66%' };
            case 5: return { label: 'Mạnh', color: '#2ecc71', width: '100%' };
            default: return { label: 'Quá ngắn', color: '#95a5a6', width: '10%' };
        }
    };

    const validateForm = () => {
        let newErrors = {};

        if (!formData.username.trim()) newErrors.username = "Username không được để trống";
        if (!formData.email.includes('@')) newErrors.email = "Email không đúng định dạng";
        
        const strength = getPasswordStrength(formData.password);
        if (strength.width !== '100%') 
            newErrors.password = "Mật khẩu cần: 8+ ký tự, chữ Hoa, số và ký tự đặc biệt";

        if (!formData.full_name.trim() || formData.full_name.length < 8) 
            newErrors.full_name = "Họ và tên phải từ 8 ký tự trở lên";

        const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
        if (!phoneRegex.test(formData.phone)) 
            newErrors.phone = "Số điện thoại 10 số không hợp lệ";

        if (!formData.address.trim() || formData.address.length < 5)
            newErrors.address = "Địa chỉ không được để trống và phải rõ ràng (ít nhất 5 ký tự)";

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
            await axios.post('https://api.quangdungcinema.id.vn/api/users/add', formData);
            
            // HIỆN MODAL THÀNH CÔNG
            setModal({
                show: true,
                type: 'success',
                title: 'THÀNH CÔNG',
                message: `Tài khoản ${formData.full_name} đã được tạo thành công!`,
                onConfirm: () => {
                    setModal({ show: false });
                    navigate('/users');
                }
            });
        } catch (err) {
            // SỬA TẠI ĐÂY: Thay vì hiện chữ đỏ ở dưới, mình bung Modal lỗi luôn
            setModal({
                show: true,
                type: 'error',
                title: 'LỖI HỆ THỐNG',
                message: err.response?.data?.error || "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.",
                onConfirm: () => setModal(prev => ({ ...prev, show: false }))
            });
        }
    };

    const strength = getPasswordStrength(formData.password);

    return (
        <div className="user-form-container">
            {/* Modal dùng chung cho cả Success và Error */}
            <Modal {...modal} onCancel={() => setModal(prev => ({ ...prev, show: false }))} />
            
            <h2>THÊM NGƯỜI DÙNG MỚI</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label>Username</label>
                        <input name="username" placeholder="ví dụ: dung_admin" onChange={handleChange} />
                        {errors.username && <span className="error-text">{errors.username}</span>}
                    </div>
                    <div className="form-group">
                        <label>Họ và tên</label>
                        <input name="full_name" placeholder="Nhập tên đầy đủ (> 8 ký tự)" onChange={handleChange} />
                        {errors.full_name && <span className="error-text">{errors.full_name}</span>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Email</label>
                        <input name="email" type="email" placeholder="example@gmail.com" onChange={handleChange} />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label>Số điện thoại</label>
                        <input name="phone" placeholder="09xxxxxxxx" onChange={handleChange} />
                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>
                </div>

                <div className="form-group">
                    <label>Mật khẩu</label>
                    <input name="password" type="password" placeholder="••••••••" onChange={handleChange} />
                    {formData.password && (
                        <div className="strength-meter">
                            <div className="meter-bg">
                                <div className="meter-fill" style={{ width: strength.width, backgroundColor: strength.color }} />
                            </div>
                            <small style={{ color: strength.color }}>Mức độ: {strength.label}</small>
                        </div>
                    )}
                    {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <div className="form-group">
                    <label>Vai trò hệ thống</label>
                    <select name="role" value={formData.role} onChange={handleChange}>
                        <option value="customer">Khách hàng (Customer)</option>
                        <option value="admin">Quản trị viên (Admin)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Địa chỉ liên hệ</label>
                    <textarea 
                        name="address" 
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." 
                        rows="3"
                        onChange={handleChange}
                    ></textarea>
                    {errors.address && <span className="error-text">{errors.address}</span>}
                </div>

                {/* Đã loại bỏ phần hiển thị errors.server dạng text để dùng Modal */}

                <div className="form-actions">
                    <button type="submit" className="btn-save">Lưu người dùng</button>
                    <button type="button" className="btn-back" onClick={() => navigate('/users')}>Quay lại</button>
                </div>
            </form>
        </div>
    );
};

export default UserAdd;