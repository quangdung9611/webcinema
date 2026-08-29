import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/api';
import { LockKeyhole, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
import ResetPasswordSuccessModal from '../components/ResetPasswordSuccessModal';
import '../styles/UserAuth.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [status, setStatus] = useState('form');
    const [fieldErrors, setFieldErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Link không hợp lệ. Vui lòng yêu cầu gửi lại.');
        }
    }, [token]);

    const handleFieldChange = (field, value) => {
        if (field === 'newPassword') {
            setNewPassword(value);
            if (fieldErrors.newPassword) {
                setFieldErrors(prev => ({ ...prev, newPassword: '' }));
            }
        } else if (field === 'confirmPassword') {
            setConfirmPassword(value);
            if (fieldErrors.confirmPassword) {
                setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
            }
        }
        if (message) setMessage('');
        if (messageType) setMessageType('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setFieldErrors({});

        if (isRateLimited) {
            setMessage(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            setMessageType('error');
            return;
        }

        // Validate
        let hasError = false;
        const errors = {};

        if (!newPassword.trim()) {
            errors.newPassword = 'Vui lòng nhập mật khẩu mới';
            hasError = true;
        } else if (newPassword.length < 8) {
            errors.newPassword = 'Mật khẩu phải có ít nhất 8 ký tự';
            hasError = true;
        }

        if (!confirmPassword.trim()) {
            errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
            hasError = true;
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
            hasError = true;
        }

        if (hasError) {
            setFieldErrors(errors);
            return;
        }

        try {
            setLoading(true);

            // ✅ Gọi API reset password trực tiếp
            const res = await api.post('/api/auth/reset-password', {
                resetToken: token,
                newPassword
            });

            setMessage(res.data.message || 'Đặt lại mật khẩu thành công!');
            setMessageType('success');
            
            // ✅ Hiển thị modal thành công
            setShowSuccessModal(true);

        } catch (err) {
            const status = err.response?.status;
            const field = err.response?.data?.field;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể đặt lại mật khẩu';
            
            if (field === 'newPassword') {
                setFieldErrors({ newPassword: errorMessage });
            } else if (field === 'confirmPassword') {
                setFieldErrors({ confirmPassword: errorMessage });
            } else if (status === 429) {
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

    // ✅ Xử lý đóng modal
    const handleModalConfirm = () => {
        setShowSuccessModal(false);
        navigate('/login');
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
        navigate('/login');
    };

    if (status === 'error') {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="forgot-icon-wrapper">
                        <AlertCircle size={42} className="forgot-icon" style={{ color: '#f87171' }} />
                    </div>
                    <h2>LINK KHÔNG HỢP LỆ</h2>
                    <p className="auth-subtitle">{message}</p>
                    <div className="button-group">
                        <button 
                            className="btn-user" 
                            onClick={() => navigate('/forgot-password')}
                        >
                            Gửi lại liên kết
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="forgot-icon-wrapper">
                    <LockKeyhole size={42} className="forgot-icon" />
                </div>

                <h2>ĐẶT LẠI MẬT KHẨU</h2>
                <p className="auth-subtitle">Nhập mật khẩu mới cho tài khoản của bạn</p>

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
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label>Mật khẩu mới</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={`auth-input ${fieldErrors.newPassword ? 'input-error' : ''}`}
                                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                                    value={newPassword}
                                    onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                                    disabled={loading || isRateLimited}
                                    autoComplete="new-password"
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
                            {fieldErrors.newPassword && (
                                <span className="error-text">{fieldErrors.newPassword}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Xác nhận mật khẩu</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className={`auth-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                                    placeholder="Nhập lại mật khẩu"
                                    value={confirmPassword}
                                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                                    disabled={loading || isRateLimited}
                                    autoComplete="new-password"
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
                            {fieldErrors.confirmPassword && (
                                <span className="error-text">{fieldErrors.confirmPassword}</span>
                            )}
                        </div>

                        <div className="button-group">
                            <LoadingButton
                                type="submit"
                                loading={loading}
                                loadingText="Đang xử lý..."
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
                                    'XÁC NHẬN ĐẶT LẠI'
                                )}
                            </LoadingButton>
                        </div>
                    </form>
                </div>

                <div className="auth-footer">
                    <button
                        type="button"
                        className="btn-link back-btn"
                        onClick={() => navigate('/forgot-password')}
                    >
                        <ArrowLeft size={16} />
                        Quay lại
                    </button>
                </div>
            </div>

            {/* ✅ Modal thành công */}
            <ResetPasswordSuccessModal
                show={showSuccessModal}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
            />
        </div>
    );
};

export default ResetPassword;