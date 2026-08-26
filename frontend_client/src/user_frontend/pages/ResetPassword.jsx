import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/api';
import { LockKeyhole, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import '../styles/ForgotPassword.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); // Token từ Link trên email

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [status, setStatus] = useState('form'); // 'form' | 'success' | 'error'

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Link không hợp lệ. Vui lòng yêu cầu gửi lại.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!newPassword.trim()) {
            setMessage('Vui lòng nhập mật khẩu mới');
            setMessageType('error');
            return;
        }

        if (newPassword.length < 8) {
            setMessage('Mật khẩu phải có ít nhất 8 ký tự');
            setMessageType('error');
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage('Mật khẩu xác nhận không khớp');
            setMessageType('error');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            // ✅ Bước 1: Gọi API submit-new-password (Nhập mật khẩu mới -> Backend gửi OTP)
            const res = await api.post('/api/auth/submit-new-password', {
                token,
                newPassword
            });

            setMessage(res.data.message || 'Mã OTP xác nhận đã được gửi tới email của bạn');
            setMessageType('success');

            // ✅ Chuyển sang trang VerifyOTP để nhập OTP
            setTimeout(() => {
                navigate('/verify-otp', { 
                    state: { 
                        email: res.data.email,
                        newPassword
                    }
                });
            }, 1500);

        } catch (err) {
            setMessage(err.response?.data?.message || 'Không thể đặt lại mật khẩu');
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    // Hiển thị lỗi nếu không có token
    if (status === 'error') {
        return (
            <div className="forgot-password-container">
                <div className="forgot-password-card">
                    <div className="forgot-icon">
                        <AlertCircle size={42} />
                    </div>
                    <h2>LINK KHÔNG HỢP LỆ</h2>
                    <p className="forgot-subtitle">{message}</p>
                    <button className="forgot-btn" onClick={() => navigate('/forgot-password')}>
                        Gửi lại liên kết
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="forgot-icon">
                    <LockKeyhole size={42} />
                </div>
                <h2>ĐẶT LẠI MẬT KHẨU</h2>
                <p className="forgot-subtitle">Nhập mật khẩu mới cho tài khoản của bạn</p>

                {message && (
                    <div className={`forgot-message ${messageType}`}>
                        {messageType === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span>{message}</span>
                    </div>
                )}

                <div className="forgot-form">
                    <label>Mật khẩu mới</label>
                    <input
                        type="password"
                        placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />

                    <label>Xác nhận mật khẩu</label>
                    <input
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    <button className="forgot-btn" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Đang gửi OTP...' : 'Xác nhận'}
                    </button>
                </div>

                <div className="forgot-actions">
                    <button className="forgot-link-btn" onClick={() => navigate('/forgot-password')}>
                        <ArrowLeft size={16} /> Quay lại
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;