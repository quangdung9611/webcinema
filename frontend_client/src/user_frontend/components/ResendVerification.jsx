import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import '../styles/ResendVerification.css';

const ResendVerification = ({ show = false, onClose = () => {} }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    if (!show) return null; // ✅ Nếu không hiển thị thì return null

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await api.post('/api/auth/resend-verification', { email });
            setMessage(response.data.message || 'Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.');
            setEmail('');
            // Tự động đóng modal sau 3 giây
            setTimeout(() => {
                onClose();
                navigate('/login');
            }, 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="resend-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>✕</button>
                <div className="icon-email">📧</div>
                <h2>Gửi lại email xác thực</h2>
                <p>Nhập email của bạn để nhận lại link xác thực</p>

                {message && <div className="success-message">{message}</div>}
                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập địa chỉ email"
                            required
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" className="btn-send" disabled={loading}>
                        {loading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
                    </button>
                </form>

                <div className="links">
                    <button className="btn-link-text" onClick={onClose}>Quay lại</button>
                    <span>|</span>
                    <button className="btn-link-text" onClick={() => {
                        onClose();
                        navigate('/register');
                    }}>
                        Đăng ký tài khoản
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResendVerification;