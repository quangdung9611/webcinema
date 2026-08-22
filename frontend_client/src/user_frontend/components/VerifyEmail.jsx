import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../styles/VerifyEmail.css';

const VerifyEmail = ({ email, onClose = () => {} }) => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        // Không cần token nữa vì đã xử lý ở backend
        // Chỉ hiển thị thông báo kiểm tra email
        setStatus('success');
        setMessage(`Chúng tôi đã gửi email xác thực đến ${email}. Vui lòng kiểm tra hộp thư của bạn.`);

        // Đếm ngược và tự động đóng
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose();
                    navigate('/login');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [email, onClose, navigate]);

    const handleResend = async () => {
        try {
            await api.post('/api/auth/resend-verification', { email });
            setMessage('Email xác thực đã được gửi lại! Vui lòng kiểm tra hộp thư.');
            setStatus('success');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
            setStatus('error');
        }
    };

    return (
        <div className="verify-content">
            <div className="verify-icon">📧</div>
            
            {status === 'verifying' && (
                <>
                    <div className="spinner-small"></div>
                    <p>Đang xác thực...</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <p className="verify-message">{message}</p>
                    <p className="verify-note">
                        Chuyển đến trang đăng nhập sau <strong>{countdown}</strong> giây...
                    </p>
                    <div className="verify-actions">
                        <button className="btn-resend" onClick={handleResend}>
                            Gửi lại email
                        </button>
                        <button className="btn-login-small" onClick={() => {
                            onClose();
                            navigate('/login');
                        }}>
                            Đăng nhập ngay
                        </button>
                    </div>
                </>
            )}

            {status === 'error' && (
                <>
                    <p className="verify-error">{message}</p>
                    <button className="btn-resend" onClick={handleResend}>
                        Thử lại
                    </button>
                </>
            )}
        </div>
    );
};

export default VerifyEmail;