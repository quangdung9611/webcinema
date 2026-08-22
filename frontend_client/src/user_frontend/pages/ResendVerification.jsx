import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../styles/ResendVerification.css';

const ResendVerification = ({ onClose = () => {} }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // ✅ Validate email real-time
    const [emailError, setEmailError] = useState('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        
        if (!value.trim()) {
            setEmailError('Vui lòng nhập email');
        } else if (!emailRegex.test(value)) {
            setEmailError('Email không hợp lệ');
        } else {
            setEmailError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email.trim() || !emailRegex.test(email)) {
            setEmailError('Vui lòng nhập email hợp lệ');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await api.post('/api/auth/resend-verification', { email });
            setMessage(response.data.message || 'Email xác thực đã được gửi lại!');
            setIsSuccess(true);
            
            // Tự động đóng sau 3 giây
            setTimeout(() => {
                onClose();
                navigate('/login');
            }, 3000);
        } catch (error) {
            setError(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
            setIsSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="resend-content">
            <div className="resend-icon">📧</div>
            <p className="resend-subtitle">Nhập email của bạn để nhận lại link xác thực</p>

            {message && <div className="resend-success">{message}</div>}
            {error && <div className="resend-error">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group-resend">
                    <input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="Nhập địa chỉ email"
                        className={emailError ? 'input-error' : ''}
                        required
                        disabled={loading || isSuccess}
                    />
                    {emailError && <span className="error-text-resend">{emailError}</span>}
                </div>
                <button 
                    type="submit" 
                    className="btn-send-resend" 
                    disabled={loading || isSuccess || !!emailError}
                >
                    {loading ? 'Đang gửi...' : 'Gửi lại email xác thực'}
                </button>
            </form>

            <div className="resend-links">
                <button className="link-btn" onClick={onClose}>Quay lại</button>
                <span>|</span>
                <button className="link-btn" onClick={() => {
                    onClose();
                    navigate('/register');
                }}>
                    Đăng ký tài khoản
                </button>
            </div>
        </div>
    );
};

export default ResendVerification;