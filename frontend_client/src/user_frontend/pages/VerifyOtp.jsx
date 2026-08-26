import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import { ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import '../styles/ForgotPassword.css';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
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
            </div>
        </div>
    );
};

export default VerifyOTP;