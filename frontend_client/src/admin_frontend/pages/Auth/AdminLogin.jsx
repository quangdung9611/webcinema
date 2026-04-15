import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import { useAuth } from '../../../context/AuthContext'; 
import '../../styles/AdminAuth.css'; 

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // 🔥 Lấy api và checkAuth từ context
    const { checkAuth, admin, loading: authLoading, api } = useAuth(); 

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const navigate = useNavigate();

    // Tự động vào trang chủ nếu đã có session admin
    useEffect(() => {
        if (!authLoading && admin) {
            navigate('/', { replace: true }); 
        }
    }, [admin, authLoading, navigate]);

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
            /**
             * 🔥 DÙNG instance 'api' ĐÃ CÀI INTERCEPTOR:
             * Backend sẽ nhận được Origin: https://admin.quangdungcinema.id.vn
             * Từ đó nó sẽ set cookie domain chính xác là trang admin.
             */
            await api.post('/admin/api/auth/login', 
                { email, password, role_input: 'admin' }
            );

            // 2. Ép Context chạy lệnh /me để lấy thông tin admin ngay lập tức
            await checkAuth();

            // 3. Bắn event đồng bộ
            window.dispatchEvent(new Event('authChange'));

            setModalConfig({
                show: true,
                type: 'success',
                title: 'XÁC THỰC THÀNH CÔNG',
                message: `Chào mừng Quản trị viên hệ thống.`,
                onConfirm: () => {
                    setModalConfig(prev => ({ ...prev, show: false }));
                    navigate('/', { replace: true });
                }
            });

        } catch (err) {
            console.error("Admin Login Error:", err);
            setModalConfig({
                show: true,
                type: 'error',
                title: 'TRUY CẬP BỊ TỪ CHỐI',
                message: err.response?.data?.message || "Lỗi hệ thống hoặc sai tài khoản quản trị!",
                onConfirm: () => setModalConfig(prev => ({ ...prev, show: false }))
            });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <div className="admin-login-page">Đang kiểm tra quyền hạn...</div>;

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
                            autoComplete="email"
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
                            autoComplete="current-password"
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