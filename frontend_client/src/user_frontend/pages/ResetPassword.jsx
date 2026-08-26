import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import '../styles/VerifyEmail.css'; // Dùng chung CSS

const ResetPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Nhận resetToken từ state khi chuyển từ trang nhập OTP
    const resetToken = location.state?.resetToken;
    
    // Trạng thái
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [status, setStatus] = useState('form'); // 'form' | 'success' | 'error'
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(10);

    // Nếu không có resetToken, hiển thị lỗi
    if (!resetToken) {
        setStatus('error');
        setMessage('Không có token đặt lại mật khẩu. Vui lòng thực hiện lại quy trình.');
    }

    // ==========================================================
    // Xử lý đặt lại mật khẩu mới
    // ==========================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        // Kiểm tra mật khẩu nhập lại
        if (newPassword !== confirmPassword) {
            setFormError('Mật khẩu nhập lại không khớp.');
            return;
        }

        if (newPassword.length < 8) {
            setFormError('Mật khẩu phải có ít nhất 8 ký tự.');
            return;
        }

        setLoading(true);

        try {
            console.log('🔵 [RESET] Đang đặt lại mật khẩu với token:', resetToken);
            
            // ✅ Gọi API đúng endpoint của luồng OTP
            const response = await api.post('/api/auth/reset-password', {
                resetToken,
                newPassword
            });
            
            console.log('✅ [RESET] Đặt lại mật khẩu thành công:', response.data);
            
            if (response.data.success) {
                setStatus('success');
                setMessage(response.data.message || 'Đặt lại mật khẩu thành công!');
                
                // Tự động chuyển sang trang đăng nhập sau 10 giây
                const timer = setInterval(() => {
                    setCountdown(prev => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            navigate('/login', { 
                                state: { 
                                    resetSuccess: true,
                                    message: 'Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập.'
                                }
                            });
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

                return () => clearInterval(timer);
            } else {
                throw new Error(response.data.message || 'Đặt lại mật khẩu thất bại');
            }

        } catch (error) {
            console.error('❌ [RESET] Lỗi đặt lại mật khẩu:', error);
            setFormError(error.response?.data?.message || error.message || 'Đặt lại mật khẩu thất bại.');
        } finally {
            setLoading(false);
        }
    };

    // ==========================================================
    // HIỂN THỊ TRẠNG THÁI
    // ==========================================================

    // 1. Hiển thị form nhập mật khẩu mới
    if (status === 'form') {
        return (
            <div className="verify-page-container">
                <div className="verify-page-card" style={{ maxWidth: '450px' }}>
                    <div className="icon-info">🔑</div>
                    <h2 style={{ color: '#fff' }}>Đặt lại mật khẩu</h2>
                    <p className="verify-message">Vui lòng nhập mật khẩu mới cho tài khoản của bạn</p>

                    {formError && (
                        <div style={{ 
                            color: '#f87171', 
                            background: 'rgba(248,113,113,0.1)', 
                            padding: '10px', 
                            borderRadius: '8px', 
                            marginBottom: '16px',
                            fontSize: '14px'
                        }}>
                            ❌ {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Mật khẩu mới</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Tối thiểu 8 ký tự"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #444',
                                    background: '#1a1a2e',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Nhập lại mật khẩu mới</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Nhập lại mật khẩu"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #444',
                                    background: '#1a1a2e',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-login"
                            disabled={loading}
                            style={{ width: '100%' }}
                        >
                            {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 2. Đặt lại mật khẩu thành công
    if (status === 'success') {
        return (
            <div className="verify-page-container">
                <div className="verify-page-card">
                    <div className="icon-success">✅</div>
                    <h2 style={{ color: '#4ade80' }}>Đặt lại mật khẩu thành công!</h2>
                    <p className="verify-message">{message}</p>
                    <p className="sub-text">
                        Chuyển đến trang đăng nhập sau <strong>{countdown}</strong> giây...
                    </p>
                    <button
                        className="btn-login"
                        onClick={() => navigate('/login', { 
                            state: { 
                                resetSuccess: true,
                                message: 'Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập.'
                            }
                        })}
                    >
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        );
    }

    // 3. Lỗi (Không có token)
    return (
        <div className="verify-page-container">
            <div className="verify-page-card">
                <div className="icon-error">❌</div>
                <h2 style={{ color: '#f87171' }}>Đặt lại mật khẩu thất bại</h2>
                <p className="verify-error">{message}</p>
                <div className="error-actions">
                    <button
                        className="btn-retry"
                        onClick={() => navigate('/forgot-password')}
                    >
                        Gửi lại liên kết
                    </button>
                    <button
                        className="btn-back"
                        onClick={() => navigate('/login')}
                    >
                        Quay lại đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;