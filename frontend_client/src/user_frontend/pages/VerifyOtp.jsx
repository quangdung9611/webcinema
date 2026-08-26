import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import { ShieldCheck, AlertCircle, CheckCircle, ArrowLeft, Mail } from 'lucide-react';
import '../styles/ForgotPassword.css';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const handleVerifyOTP = async () => {
        if (!otp.trim()) {
            setMessage('Vui lòng nhập OTP');
            setMessageType('error');
            return;
        }

        try {
            setLoading(true);
            setMessage('');
            
            // ✅ Endpoint đúng: POST /api/auth/verify-reset-otp
            const res = await api.post('/api/auth/verify-reset-otp', {
                email,
                otp
            });

            setMessage('Xác thực OTP thành công');
            setMessageType('success');

            // ✅ Lấy resetToken và chuyển sang trang ResetPassword
            setTimeout(() => {
                navigate('/reset-password', { 
                    state: { 
                        resetToken: res.data.resetToken,
                        email
                    }
                });
            }, 1500);

        } catch (err) {
            setMessage(err.response?.data?.message || 'OTP không hợp lệ');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!email) {
            setMessage('Email không hợp lệ. Vui lòng quay lại nhập lại.');
            setMessageType('error');
            return;
        }

        try {
            setResendLoading(true);
            setMessage('');
            
            // ✅ Gửi lại OTP
            const res = await api.post('/api/auth/forgot-password', { email });

            setMessage(res.data.message || 'OTP đã được gửi lại tới email của bạn');
            setMessageType('success');

        } catch (err) {
            setMessage(err.response?.data?.message || 'Không thể gửi lại OTP');
            setMessageType('error');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="forgot-icon">
                    <ShieldCheck size={42} />
                </div>
                <h2>XÁC THỰC OTP</h2>
                <p className="forgot-subtitle">Nhập mã OTP gửi đến <strong>{email}</strong></p>

                {message && (
                    <div className={`forgot-message ${messageType}`}>
                        {messageType === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span>{message}</span>
                    </div>
                )}

                <div className="forgot-form">
                    <label>Nhập mã OTP (6 số)</label>
                    <input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                    />
                    <button className="forgot-btn" onClick={handleVerifyOTP} disabled={loading}>
                        {loading ? 'Đang xác thực...' : 'Xác nhận OTP'}
                    </button>
                </div>

                <div className="forgot-actions">
                    <button 
                        className="forgot-btn-secondary" 
                        onClick={handleResendOTP} 
                        disabled={resendLoading}
                    >
                        {resendLoading ? 'Đang gửi...' : 'Gửi lại OTP'}
                    </button>

                    <button 
                        className="forgot-link-btn" 
                        onClick={() => navigate('/forgot-password')}
                    >
                        <ArrowLeft size={16} /> Quay lại nhập email
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;