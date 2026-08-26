import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import { ShieldCheck, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import '../styles/ForgotPassword.css';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Nhận email và mật khẩu mới từ trang ResetPassword
    const email = location.state?.email || '';
    const newPassword = location.state?.newPassword || '';

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false); // 👈 State hiển thị modal

    // Kiểm tra nếu thiếu email hoặc mật khẩu
    if (!email || !newPassword) {
        return (
            <div className="forgot-password-container">
                <div className="forgot-password-card">
                    <div className="forgot-icon">
                        <AlertCircle size={42} />
                    </div>
                    <h2>LỖI DỮ LIỆU</h2>
                    <p className="forgot-subtitle">Vui lòng thực hiện lại quy trình đặt lại mật khẩu.</p>
                    <button className="forgot-btn" onClick={() => navigate('/forgot-password')}>
                        Quay lại
                    </button>
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

        try {
            setLoading(true);
            setMessage('');

            // ✅ Gọi API verify-otp-and-reset để hoàn tất đổi mật khẩu
            const res = await api.post('/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword
            });

            setMessage(res.data.message || 'Đặt lại mật khẩu thành công!');
            setMessageType('success');

            // ✅ HIỆN MODAL THÀNH CÔNG NGAY TẠI CHỖ
            setShowSuccessModal(true);

        } catch (err) {
            setMessage(err.response?.data?.message || 'OTP không hợp lệ');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        try {
            setResendLoading(true);
            setMessage('');

            // ✅ Gửi lại OTP xác nhận (dùng lại mật khẩu mới đã nhập)
            const res = await api.post('/api/auth/submit-new-password', {
                token: location.state?.token, // Nếu có token gửi lại
                newPassword
            });

            setMessage(res.data.message || 'OTP đã được gửi lại');
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

            {/* 🎉 MODAL THÀNH CÔNG */}
            {showSuccessModal && (
                <div className="modal-overlay" onClick={() => navigate('/login')}>
                    <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-icon" style={{ textAlign: 'center', fontSize: '60px' }}>✅</div>
                            <h2 style={{ textAlign: 'center', color: '#4ade80' }}>Đặt lại mật khẩu thành công!</h2>
                            <p style={{ textAlign: 'center' }}>
                                Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập lại.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                                <button className="btn-login" onClick={() => navigate('/login')}>
                                    Đăng nhập ngay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerifyOTP;