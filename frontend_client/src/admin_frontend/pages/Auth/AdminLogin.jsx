import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import '../../styles/AdminAuth.css'; 

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const navigate = useNavigate();

    const validate = () => {
        let tempErrors = {};
        if (!email) {
            tempErrors.email = "Email quản trị không được để trống";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            tempErrors.email = "Định dạng email không hợp lệ";
        }
        if (!password) {
            tempErrors.password = "Mật mã không được để trống";
        }
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // [CẬP NHẬT 1]: Gọi login qua cổng /api/admin để khớp với server.js mới
            const res = await axios.post('https://webcinema-zb8z.onrender.com/api/admin/auth/login', 
                { 
                    email, 
                    password,
                    role_input: 'admin' 
                },
                { withCredentials: true } 
            );

            // [CẬP NHẬT 2]: Lấy thông tin Admin qua cổng chuẩn đã test thành công
            const profileRes = await axios.get('https://webcinema-zb8z.onrender.com/api/admin/auth/me', {
                withCredentials: true
            });

            const adminData = profileRes.data.user || profileRes.data;

            // [CẬP NHẬT 3]: Bắn sự kiện để AuthContext và Header cập nhật lại thông tin Dũng
            window.dispatchEvent(new Event('authChange'));

            setModalConfig({
                show: true,
                type: 'success',
                title: 'XÁC THỰC THÀNH CÔNG',
                message: `Chào mừng Quản trị viên: ${adminData.full_name || adminData.username || 'Quang Dũng'}.`,
                onConfirm: () => {
                    setModalConfig({ ...modalConfig, show: false });
                    navigate('/admin/dashboard');
                }
            });

            // Tự động chuyển hướng sau 1.5s nếu người dùng không bấm xác nhận
            setTimeout(() => navigate('/admin/dashboard'), 1500);

        } catch (err) {
            console.error("Login Error:", err);
            setModalConfig({
                show: true,
                type: 'error',
                title: 'TRUY CẬP BỊ TỪ CHỐI',
                message: err.response?.data?.message || "Lỗi hệ thống hoặc sai tài khoản quản trị!",
                onConfirm: () => setModalConfig({ ...modalConfig, show: false })
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-card">
                <h2>ADMIN PANEL</h2>
                <p className="admin-subtitle">Hệ thống quản trị Cinema Star</p>
                <form onSubmit={handleAdminLogin} noValidate>
                    <div className="form-group">
                        <label>Email Quản Trị</label>
                        <input 
                            type="email" 
                            className={`admin-input ${errors.email ? 'input-error' : ''}`}
                            placeholder="admin@cinemastar.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email) setErrors({...errors, email: ''});
                            }}
                        />
                        {errors.email && <span className="admin-error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label>Mật Mã</label>
                        <input 
                            type="password" 
                            className={`admin-input ${errors.password ? 'input-error' : ''}`}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (errors.password) setErrors({...errors, password: ''});
                            }}
                        />
                        {errors.password && <span className="admin-error-text">{errors.password}</span>}
                    </div>

                    <button type="submit" className="btn-admin" disabled={loading}>
                        {loading ? "ĐANG XÁC THỰC..." : "XÁC THỰC HỆ THỐNG"}
                    </button>
                </form>
            </div>

            <Modal 
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
            />
        </div>
    );
};

export default AdminLogin;