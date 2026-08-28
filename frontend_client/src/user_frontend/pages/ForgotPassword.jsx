import React, { useState } from 'react';
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

    const handleSendLink = async () => {
        if (!email.trim()) {
            setMessage('Vui lòng nhập email');
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
            setMessage(err.response?.data?.message || 'Không gửi được liên kết. Vui lòng thử lại!');
            setMessageType('error');
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
                {/* Icon */}
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
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>

                        <div className="button-group">
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang gửi..."
                                disabled={loading}
                                className="btn-user"
                                spinnerColor="#000000"
                                onClick={handleSendLink}
                            >
                                GỬI LIÊN KẾT
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