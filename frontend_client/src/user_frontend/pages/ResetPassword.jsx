import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/api';
import { LockKeyhole, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
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
    const [fieldErrors, setFieldErrors] = useState({}); // 🔥 Lỗi theo field

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Link không hợp lệ. Vui lòng yêu cầu gửi lại.');
        }
    }, [token]);

    // 🔥 Xóa lỗi field khi người dùng nhập
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

            const res = await api.post('/api/auth/submit-new-password', {
                token,
                newPassword
            });

            setMessage(res.data.message || 'Mã OTP xác nhận đã được gửi tới email của bạn');
            setMessageType('success');

            setTimeout(() => {
                navigate('/verify-otp', { 
                    state: { 
                        email: res.data.email,
                        newPassword,
                        token
                    }
                });
            }, 1500);

        } catch (err) {
            const status = err.response?.status;
            const field = err.response?.data?.field;
            const errorMessage = err.response?.data?.message || 'Không thể đặt lại mật khẩu';
            
            // 🔥 Nếu có lỗi field cụ thể
            if (field === 'newPassword') {
                setFieldErrors({ newPassword: errorMessage });
            } else if (field === 'confirmPassword') {
                setFieldErrors({ confirmPassword: errorMessage });
            } else if (status === 429) {
                // Rate limit - hiển thị ở message chung
                setMessage(`⚠️ ${errorMessage}`);
                setMessageType('error');
            } else {
                setMessage(errorMessage);
                setMessageType('error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Hiển thị lỗi nếu không có token
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
                {/* Icon */}
                <div className="forgot-icon-wrapper">
                    <LockKeyhole size={42} className="forgot-icon" />
                </div>

                <h2>ĐẶT LẠI MẬT KHẨU</h2>
                <p className="auth-subtitle">Nhập mật khẩu mới cho tài khoản của bạn</p>

                {/* Message chung (success hoặc error không thuộc field) */}
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
                        {/* MẬT KHẨU MỚI */}
                        <div className="form-group">
                            <label>Mật khẩu mới</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className={`auth-input ${fieldErrors.newPassword ? 'input-error' : ''}`}
                                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                                    value={newPassword}
                                    onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                    disabled={loading}
                                >
                                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {fieldErrors.newPassword && (
                                <span className="error-text">{fieldErrors.newPassword}</span>
                            )}
                        </div>

                        {/* XÁC NHẬN MẬT KHẨU */}
                        <div className="form-group">
                            <label>Xác nhận mật khẩu</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className={`auth-input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                                    placeholder="Nhập lại mật khẩu"
                                    value={confirmPassword}
                                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                                    disabled={loading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex="-1"
                                    disabled={loading}
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
                                loadingText="Đang gửi OTP..."
                                disabled={loading}
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                XÁC NHẬN
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
        </div>
    );
};

export default ResetPassword;