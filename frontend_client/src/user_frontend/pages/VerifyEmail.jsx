import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../styles/VerifyEmail.css';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(10);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Token xác thực không hợp lệ');
            return;
        }

        const verifyEmail = async () => {
            try {
                console.log('🔵 [VERIFY] Bắt đầu xác thực với token:', token);
                
                // ✅ Gọi API xác thực
                const response = await api.get(`/api/auth/verify-email?token=${token}`);
                console.log('✅ [VERIFY] Response:', response.data);
                
                if (response.data.success) {
                    setStatus('success');
                    setMessage(response.data.message || 'Xác thực email thành công!');
                    setUserData(response.data.data?.user || null);
                    
                    // ✅ Lưu thông báo đã xác thực
                    localStorage.setItem('email_verified', 'true');
                    
                    // ✅ Tự động chuyển sang trang đăng nhập sau 10 giây
                    const timer = setInterval(() => {
                        setCountdown(prev => {
                            if (prev <= 1) {
                                clearInterval(timer);
                                // ✅ Chuyển sang login với state thông báo
                                navigate('/login', { 
                                    state: { 
                                        verified: true,
                                        message: 'Email đã được xác thực thành công! Vui lòng đăng nhập.'
                                    }
                                });
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);

                    return () => clearInterval(timer);
                } else {
                    throw new Error(response.data.message || 'Xác thực thất bại');
                }

            } catch (error) {
                console.error('❌ [VERIFY] Lỗi:', error);
                setStatus('error');
                setMessage(error.response?.data?.message || error.message || 'Xác thực email thất bại');
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    // ✅ Nếu đã xác thực thành công, hiển thị thông báo
    if (status === 'success') {
        return (
            <div className="verify-page-container">
                <div className="verify-page-card">
                    <div className="icon-success">✅</div>
                    <h2 style={{ color: '#4ade80' }}>Xác thực thành công!</h2>
                    <p className="verify-message">{message}</p>
                    {userData && (
                        <div className="user-info" style={{ margin: '10px 0', padding: '10px', background: '#1a1a2e', borderRadius: '8px' }}>
                            <p>👤 <strong>{userData.full_name}</strong></p>
                            <p>📧 {userData.email}</p>
                            <p style={{ color: '#4ade80' }}>✅ Email đã được xác thực</p>
                        </div>
                    )}
                    <p className="sub-text">
                        Chuyển đến trang đăng nhập sau <strong>{countdown}</strong> giây...
                    </p>
                    <button
                        className="btn-login"
                        onClick={() => navigate('/login', { 
                            state: { 
                                verified: true,
                                message: 'Email đã được xác thực thành công! Vui lòng đăng nhập.'
                            }
                        })}
                    >
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        );
    }

    // ✅ Đang xác thực
    if (status === 'verifying') {
        return (
            <div className="verify-page-container">
                <div className="verify-page-card">
                    <div className="spinner"></div>
                    <h3>Đang xác thực tài khoản...</h3>
                    <p>Vui lòng đợi trong giây lát</p>
                </div>
            </div>
        );
    }

    // ✅ Lỗi
    return (
        <div className="verify-page-container">
            <div className="verify-page-card">
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
            </div>
        </div>
    );
};

export default VerifyEmail;