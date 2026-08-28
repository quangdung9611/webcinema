import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    // 🔥 Rate limit states
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // 🔥 Countdown timer
    useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) return;

        const timer = setInterval(() => {
            setRateLimitTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRateLimited(false);
                    setMessage('');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

    const handleSendLink = async () => {
        if (!email.trim()) {
            setMessage('Vui lòng nhập email');
            setMessageType('error');
            return;
        }

        if (isRateLimited) {
            setMessage(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            setMessageType('error');
            return;
        }

        setMessage('');
        setLoading(true);

        try {
            const res = await api.post('/api/auth/forgot-password', { email });

            setMessage(res.data.message || 'Liên kết đặt lại mật khẩu đã được gửi tới email của bạn');
            setMessageType('success');
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không gửi được liên kết. Vui lòng thử lại!';
            
            if (status === 429) {
                const remaining = errorData.data?.remaining;
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                const maxAttempts = errorData.data?.maxAttempts || 3;
                
                let displayMessage = `⚠️ Bạn chỉ được gửi tối đa ${maxAttempts} lần.`;
                if (remaining !== undefined && remaining >= 0) {
                    displayMessage += ` Còn ${remaining} lần thử.`;
                }
                displayMessage += ` Vui lòng thử lại sau ${remainingSeconds} giây.`;
                
                setMessage(displayMessage);
                setMessageType('error');
                
                // 🔥 Bắt đầu timer
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else {
                setMessage(errorMessage);
                setMessageType('error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendLink();
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="forgot-icon-wrapper">
                    <Mail size={42} className="forgot-icon" />
                </div>

                <h2>QUÊN MẬT KHẨU</h2>
                <p className="auth-subtitle">
                    Nhập email đăng ký để nhận liên kết đặt lại mật khẩu
                </p>

                {message && (
                    <div className={`forgot-message ${messageType}`}>
                        {messageType === 'success' ? (
                            <CheckCircle size={18} />
                        ) : (
                            <AlertCircle size={18} />
                        )}
                        <span>{message}</span>
                    </div>
                )}

                <div className="auth-form-wrapper">
                    <form onSubmit={(e) => e.preventDefault()} noValidate>
                        <div className="form-group">
                            <label>Email đăng ký</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={loading || isRateLimited}
                                autoComplete="email"
                            />
                        </div>

                        <div className="button-group">
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang gửi..."
                                disabled={loading || isRateLimited}
                                className="btn-user"
                                spinnerColor="#000000"
                                onClick={handleSendLink}
                            >
                                {isRateLimited ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        ĐANG CHỜ
                                        <span style={{ 
                                            background: 'rgba(255,255,255,0.2)', 
                                            padding: '2px 8px', 
                                            borderRadius: '4px', 
                                            fontWeight: 'bold' 
                                        }}>
                                            {rateLimitTimeLeft}s
                                        </span>
                                    </span>
                                ) : (
                                    'GỬI LIÊN KẾT'
                                )}
                            </LoadingButton>
                        </div>
                    </form>
                </div>

                <div className="auth-footer">
                    <button
                        type="button"
                        className="btn-link back-btn"
                        onClick={() => navigate('/login')}
                    >
                        <ArrowLeft size={16} />
                        Quay lại đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;