import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, MailCheck, Sparkles, PartyPopper } from 'lucide-react';
import api from '../../api/api';
import socketService from '../../api/socket';
import '../styles/VerifyEmail.css';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');
    const [userData, setUserData] = useState(null);
    const [countdown, setCountdown] = useState(5);

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

                if (response.data?.success) {
                    setStatus('success');
                    setMessage(response.data.message || 'Xác thực email thành công!');
                    setUserData(response.data.data || null);
                    
                    localStorage.setItem('email_verified', 'true');

                    // 🆕 Gửi sự kiện qua socket
                    const socket = socketService.getSocket();
                    if (socket && socket.connected) {
                        socket.emit('email_verified', {
                            email: response.data.data?.email,
                            full_name: response.data.data?.full_name,
                            success: true
                        });
                        console.log('📨 [SOCKET] Đã emit sự kiện email_verified');
                    } else {
                        console.warn('⚠️ [SOCKET] Chưa kết nối, lưu vào sessionStorage');
                        sessionStorage.setItem('email_verified_success', 'true');
                    }

                    // ✅ Bắt đầu countdown để đóng tab
                    const timer = setInterval(() => {
                        setCountdown(prev => {
                            if (prev <= 1) {
                                clearInterval(timer);
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                    return () => clearInterval(timer);

                } else {
                    throw new Error(response.data?.message || 'Xác thực thất bại');
                }

            } catch (error) {
                console.error('❌ [VERIFY] Lỗi:', error);
                setStatus('error');
                setMessage(error.response?.data?.message || error.message || 'Xác thực email thất bại');
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    // ✅ Render trạng thái đang xác thực
    if (status === 'verifying') {
        return (
            <div className="verify-page-container">
                <div className="verify-page-card verify-card-verifying">
                    <div className="verify-icon-wrapper">
                        <div className="verify-spinner">
                            <Loader size={48} className="spin-animation" color="#4ade80" />
                        </div>
                    </div>
                    <h2 className="verify-title">Đang xác thực tài khoản</h2>
                    <p className="verify-subtitle">Vui lòng đợi trong giây lát...</p>
                    <div className="verify-progress-bar">
                        <div className="verify-progress-fill animate-progress"></div>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ Render trạng thái thành công - Giao diện đẹp
    if (status === 'success') {
        return (
            <div className="verify-page-container">
                <div className="verify-page-card verify-card-success">
                    {/* Hiệu ứng confetti nền */}
                    <div className="verify-confetti-bg">
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                    </div>

                    <div className="verify-icon-wrapper success">
                        <div className="verify-icon-circle">
                            <CheckCircle size={56} color="#4ade80" strokeWidth={1.5} />
                        </div>
                        <div className="verify-icon-sparkle">
                            <Sparkles size={24} color="#fbbf24" />
                        </div>
                    </div>

                    <h2 className="verify-title success">Xác thực thành công! 🎉</h2>
                    
                    {userData && (
                        <div className="verify-user-info">
                            <div className="verify-user-avatar">
                                {userData.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="verify-user-detail">
                                <p className="verify-user-name">
                                    <strong>{userData.full_name}</strong>
                                </p>
                                <p className="verify-user-email">
                                    <MailCheck size={16} />
                                    {userData.email}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="verify-success-badge">
                        <PartyPopper size={18} />
                        <span>Tài khoản đã được kích hoạt</span>
                    </div>

                    <p className="verify-message">{message}</p>

                    <div className="verify-actions">
                        <div className="verify-countdown">
                            <div className="verify-countdown-ring">
                                <svg width="60" height="60" viewBox="0 0 60 60">
                                    <circle
                                        cx="30"
                                        cy="30"
                                        r="26"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="4"
                                    />
                                    <circle
                                        cx="30"
                                        cy="30"
                                        r="26"
                                        fill="none"
                                        stroke="#4ade80"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeDasharray="163.36"
                                        strokeDashoffset={163.36 * (1 - countdown / 5)}
                                        transform="rotate(-90 30 30)"
                                        className="countdown-circle"
                                    />
                                </svg>
                                <span className="countdown-number">{countdown}</span>
                            </div>
                            <p className="countdown-text">Tự động đóng sau</p>
                        </div>

                        <button
                            className="verify-btn verify-btn-primary"
                            onClick={() => window.close()}
                        >
                            Đóng tab ngay
                        </button>
                    </div>

                    <p className="verify-hint">
                        💡 Sau khi đóng tab, trang đăng ký sẽ tự động cập nhật
                    </p>
                </div>
            </div>
        );
    }

    // ✅ Render trạng thái lỗi
    return (
        <div className="verify-page-container">
            <div className="verify-page-card verify-card-error">
                <div className="verify-icon-wrapper error">
                    <div className="verify-icon-circle error">
                        <XCircle size={56} color="#f87171" strokeWidth={1.5} />
                    </div>
                </div>

                <h2 className="verify-title error">Xác thực thất bại</h2>
                <p className="verify-error-message">{message}</p>

                <div className="verify-error-actions">
                    <button
                        className="verify-btn verify-btn-retry"
                        onClick={() => navigate('/resend-verification')}
                    >
                        Gửi lại email xác thực
                    </button>
                    <button
                        className="verify-btn verify-btn-secondary"
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