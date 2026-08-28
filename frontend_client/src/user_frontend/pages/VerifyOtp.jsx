import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import { ShieldCheck, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const email = location.state?.email || '';
    const newPassword = location.state?.newPassword || '';

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    if (!email || !newPassword) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="forgot-icon-wrapper">
                        <AlertCircle size={42} className="forgot-icon" style={{ color: '#f87171' }} />
                    </div>
                    <h2>LỖI DỮ LIỆU</h2>
                    <p className="auth-subtitle">Vui lòng thực hiện lại quy trình đặt lại mật khẩu.</p>
                    <div className="button-group">
                        <button 
                            className="btn-user" 
                            onClick={() => navigate('/forgot-password')}
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleVerifyOTP = async () => {
        if (!otp.trim()) {
            setMessage('Vui lòng nhập OTP');
            setMessageType('error');
            return;
        }

        if (otp.length < 6) {
            setMessage('OTP phải có 6 chữ số');
            setMessageType('error');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            const res = await api.post('/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword
            });

            setMessage(res.data.message || 'Đặt lại mật khẩu thành công!');
            setMessageType('success');
            setShowSuccessModal(true);

        } catch (err) {
            const status = err.response?.status;
            const errorMessage = err.response?.data?.message || 'OTP không hợp lệ';
            
            // 🔥 Hiển thị thông báo rate limit
            if (status === 429) {
                setMessage(`⚠️ ${errorMessage}`);
            } else {
                setMessage(errorMessage);
            }
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        try {
            setResendLoading(true);
            setMessage('');

            const res = await api.post('/api/auth/submit-new-password', {
                token: location.state?.token,
                newPassword
            });

            setMessage(res.data.message || 'OTP đã được gửi lại');
            setMessageType('success');

        } catch (err) {
            const status = err.response?.status;
            const errorMessage = err.response?.data?.message || 'Không thể gửi lại OTP';
            
            // 🔥 Hiển thị thông báo rate limit
            if (status === 429) {
                setMessage(`⚠️ ${errorMessage}`);
            } else {
                setMessage(errorMessage);
            }
            setMessageType('error');
        } finally {
            setResendLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleVerifyOTP();
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="forgot-icon-wrapper">
                    <ShieldCheck size={42} className="forgot-icon" />
                </div>

                <h2>XÁC THỰC OTP</h2>
                <p className="auth-subtitle">
                    Nhập mã OTP gửi đến <strong style={{ color: 'var(--silver-primary)' }}>{email}</strong>
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
                            <label>Nhập mã OTP (6 số)</label>
                            <input
                                type="text"
                                className="auth-input"
                                maxLength={6}
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                onKeyPress={handleKeyPress}
                                disabled={loading || resendLoading}
                                autoComplete="one-time-code"
                                style={{ 
                                    textAlign: 'center', 
                                    letterSpacing: '8px',
                                    fontSize: 'var(--font-size-xl)',
                                    fontWeight: 'var(--fw-bold)'
                                }}
                            />
                            <div className="input-hint center-text" style={{ marginTop: '8px' }}>
                                📧 Mã OTP đã được gửi đến email của bạn
                            </div>
                        </div>

                        <div className="button-group">
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang xác thực..."
                                disabled={loading || resendLoading}
                                className="btn-user"
                                spinnerColor="#000000"
                                onClick={handleVerifyOTP}
                            >
                                XÁC NHẬN OTP
                            </LoadingButton>

                            <LoadingButton
                                type="button"
                                loading={resendLoading}
                                loadingText="Đang gửi..."
                                disabled={loading || resendLoading}
                                className="btn-user"
                                spinnerColor="#000000"
                                style={{ 
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'var(--text-secondary)',
                                    boxShadow: 'none'
                                }}
                                onClick={handleResendOTP}
                            >
                                GỬI LẠI OTP
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

            {showSuccessModal && (
                <div className="modal-overlay" onClick={() => navigate('/login')}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-icon" style={{ fontSize: '48px' }}>✅</div>
                        <h3 style={{ color: '#4ade80' }}>Đặt lại mật khẩu thành công!</h3>
                        <p>Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập lại.</p>
                        <button 
                            className="modal-btn" 
                            onClick={() => navigate('/login')}
                        >
                            Đăng nhập ngay
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerifyOTP;