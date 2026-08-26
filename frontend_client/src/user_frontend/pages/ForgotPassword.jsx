import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import '../styles/ForgotPassword.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const handleSendLink = async () => {
        if (!email.trim()) {
            setMessage('Vui lòng nhập email');
            setMessageType('error');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            // ✅ Endpoint đúng: POST /api/auth/forgot-password
            const res = await api.post('/api/auth/forgot-password', { email });

            setMessage(res.data.message || 'Liên kết đặt lại mật khẩu đã được gửi tới email của bạn');
            setMessageType('success');

            // ✅ KHÔNG chuyển trang, chỉ hiện thông báo để người dùng kiểm tra email
        } catch (err) {
            setMessage(err.response?.data?.message || 'Không gửi được liên kết');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="forgot-icon">
                    <Mail size={42} />
                </div>
                <h2>QUÊN MẬT KHẨU</h2>
                <p className="forgot-subtitle">Nhập email đăng ký để nhận liên kết đặt lại mật khẩu</p>

                {message && (
                    <div className={`forgot-message ${messageType}`}>
                        {messageType === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span>{message}</span>
                    </div>
                )}

                <div className="forgot-form">
                    <label>Email đăng ký</label>
                    <input
                        type="email"
                        placeholder="Nhập email của bạn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button className="forgot-btn" onClick={handleSendLink} disabled={loading}>
                        {loading ? 'Đang gửi...' : 'Gửi liên kết'}
                    </button>
                </div>

                <div className="forgot-actions">
                    <button className="forgot-link-btn" onClick={() => navigate('/login')}>
                        Quay lại đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;