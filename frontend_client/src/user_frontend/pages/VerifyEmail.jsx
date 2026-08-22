import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../styles/VerifyEmail.css';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(10); // ✅ Đếm ngược 10 giây

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Token xác thực không hợp lệ');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await api.get(`/api/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(response.data.message || 'Xác thực email thành công!');

                // ✅ Tự động chuyển sang trang đăng nhập sau 10 giây
                const timer = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            navigate('/login');
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

                return () => clearInterval(timer);

            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Xác thực email thất bại');
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    return (
        <div className="verify-page-container">
            <div className="verify-page-card">
                {status === 'verifying' && (
                    <>
                        <div className="spinner"></div>
                        <h3>Đang xác thực tài khoản...</h3>
                        <p>Vui lòng đợi trong giây lát</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="icon-success">✅</div>
                        <h2 style={{ color: '#4ade80' }}>Xác thực thành công!</h2>
                        <p className="verify-message">{message}</p>
                        <p className="sub-text">
                            Chuyển đến trang đăng nhập sau <strong>{countdown}</strong> giây...
                        </p>
                        <button
                            className="btn-login"
                            onClick={() => navigate('/login')}
                        >
                            Đăng nhập ngay
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="icon-error">❌</div>
                        <h2 style={{ color: '#f87171' }}>Xác thực thất bại</h2>
                        <p className="verify-error">{message}</p>
                        <div className="error-actions">
                            <button
                                className="btn-retry"
                                onClick={() => navigate('/resend-verification')}
                            >
                                Gửi lại email xác thực
                            </button>
                            <button
                                className="btn-back"
                                onClick={() => navigate('/login')}
                            >
                                Quay lại đăng nhập
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;