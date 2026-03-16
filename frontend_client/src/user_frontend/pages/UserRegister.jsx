import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Modal from '../../admin_frontend/components/Modal';
import '../styles/UserAuth.css';

const UserRegister = () => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        phone: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    
    // Quản lý trạng thái Modal
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: ''
    });

    const navigate = useNavigate();

    const validate = () => {
        let tempErrors = {};
        if (!formData.full_name || formData.full_name.length < 8) {
            tempErrors.full_name = "Họ tên phải từ 8 ký tự trở lên";
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            tempErrors.password = "Mật khẩu yếu! Cần ít nhất 8 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt";
        }
        if (!/^[0-9]{10}$/.test(formData.phone)) {
            tempErrors.phone = "Số điện thoại phải đúng 10 chữ số";
        }
        if (!formData.username) tempErrors.username = "Tên đăng nhập không được để trống";
        if (!formData.email) tempErrors.email = "Email không được để trống";

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // [CẬP NHẬT]: Dù đăng ký thường không trả về token ngay, 
            // nhưng ta chủ động dọn dẹp sessionStorage cũ nếu có lỡ bám lại từ trước
            sessionStorage.removeItem('usertoken'); 

            await axios.post('http://localhost:5000/api/auth/register', formData);
            
            setModalConfig({
                show: true,
                type: 'success',
                title: 'Đăng ký thành công!',
                message: 'Chào mừng Bạn gia nhập Cinema Star. Bạn sẽ được chuyển đến trang đăng nhập ngay bây giờ.'
            });

            // Chuyển hướng sau khi user xem thông báo
            setTimeout(() => navigate('/login'), 2500);
            
        } catch (err) {
            const serverMsg = err.response?.data?.message;
            const field = err.response?.data?.field;

            if (field) {
                setErrors({ [field]: serverMsg });
            } else {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'Thất bại',
                    message: serverMsg || 'Đã có lỗi xảy ra, vui lòng thử lại!'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG KÝ</h2>
                <form onSubmit={handleRegister} noValidate>
                    <div className="form-group">
                        <label>Tên đăng nhập</label>
                        <input 
                            type="text" 
                            name="username" 
                            className={`auth-input ${errors.username ? 'input-error' : ''}`} 
                            value={formData.username}
                            onChange={handleChange} 
                        />
                        {errors.username && <span className="error-text">{errors.username}</span>}
                    </div>

                    <div className="form-group">
                        <label>Họ và tên</label>
                        <input 
                            type="text" 
                            name="full_name" 
                            className={`auth-input ${errors.full_name ? 'input-error' : ''}`} 
                            value={formData.full_name}
                            onChange={handleChange} 
                        />
                        {errors.full_name && <span className="error-text">{errors.full_name}</span>}
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            name="email" 
                            className={`auth-input ${errors.email ? 'input-error' : ''}`} 
                            value={formData.email}
                            onChange={handleChange} 
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label>Mật khẩu</label>
                        <input 
                            type="password" 
                            name="password" 
                            className={`auth-input ${errors.password ? 'input-error' : ''}`} 
                            value={formData.password}
                            onChange={handleChange} 
                        />
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label>Số điện thoại</label>
                        <input 
                            type="text" 
                            name="phone" 
                            className={`auth-input ${errors.phone ? 'input-error' : ''}`} 
                            value={formData.phone}
                            onChange={handleChange} 
                        />
                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>

                    <button type="submit" className="btn-user" disabled={loading}>
                        {loading ? "ĐANG XỬ LÝ..." : "ĐĂNG KÝ NGAY"}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>Đã có tài khoản? </span>
                    <Link to="/login" className="btn-link">Đăng nhập</Link>
                </div>
            </div>

            <Modal 
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={() => setModalConfig({ ...modalConfig, show: false })}
            />
        </div>
    );
};

export default UserRegister;