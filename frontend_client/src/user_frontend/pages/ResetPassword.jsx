import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const token = location.state?.token || '';
    const email = location.state?.email || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // 🔥 Rate limit states
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // 🔥 Countdown timer
    React.useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) return;

        const timer = setInterval(() => {
            setRateLimitTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRateLimited(false);
                    setError('');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

    if (!token || !email) {
        navigate('/forgot-password');
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            return;
        }

        if (newPassword.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // ✅ Gửi OTP thay vì reset trực tiếp
            const response = await api.post('/api/auth/submit-new-password', {
                token,
                newPassword
            });

            if (response.data.success) {
                // ✅ Chuyển sang VerifyOTP với email và newPassword
                const expiresIn = response.data.data?.expiresIn || 300;
                navigate('/verify-otp', {
                    state: {
                        email: email,
                        newPassword: newPassword,
                        purpose: 'RESET_PASSWORD',
                        token: token,
                        expiresIn: expiresIn,
                        fromResetPassword: true
                    }
                });
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi yêu cầu';
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                const maxAttempts = errorData.data?.maxAttempts || 3;
                setError(`⚠️ Bạn chỉ được gửi tối đa ${maxAttempts} lần. Vui lòng thử lại sau ${remainingSeconds} giây.`);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <button 
                    className="btn-back" 
                    onClick={() => navigate('/forgot-password')}
                >
                    <ArrowLeft size={20} />
                </button>

                <h2>ĐẶT LẠI MẬT KHẨU</h2>
                <p className="auth-subtitle">
                    Nhập mật khẩu mới cho tài khoản <strong>{email}</strong>
                </p>

                {error && (
                    <div className="forgot-message error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Mật khẩu mới</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="auth-input"
                                placeholder="Nhập mật khẩu mới"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading || isRateLimited}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                                disabled={loading || isRateLimited}
                            >
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                        <span className="input-hint">
                            Mật khẩu có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt
                        </span>
                    </div>

                    <div className="form-group">
                        <label>Xác nhận mật khẩu</label>
                        <div className="password-wrapper">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="auth-input"
                                placeholder="Nhập lại mật khẩu mới"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading || isRateLimited}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex="-1"
                                disabled={loading || isRateLimited}
                            >
                                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="button-group">
                        <LoadingButton
                            type="submit"
                            loading={loading}
                            loadingText="Đang gửi OTP..."
                            disabled={loading || isRateLimited}
                            className="btn-user"
                            spinnerColor="#000000"
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
                                'GỬI OTP XÁC NHẬN'
                            )}
                        </LoadingButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;