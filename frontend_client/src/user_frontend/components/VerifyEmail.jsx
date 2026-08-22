import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import '../styles/VerifyEmail.css';

const VerifyEmail = ({ show = false, onClose = () => {} }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!show) return; // ✅ Nếu không hiển thị thì không chạy

        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Token xác thực không hợp lệ');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await api.get(`/api/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(response.data.message || 'Xác thực email thành công!');

                setTimeout(() => {
                    onClose();
                    navigate('/login');
                }, 3000);

            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Xác thực email thất bại');
            }
        };

        verifyEmail();
    }, [searchParams, navigate, show, onClose]);

    if (!show) return null; // ✅ Nếu không hiển thị thì return null

    return (
        <div className="verify-container">
            <div className="verify-card">
                {status === 'verifying' && (
                    <>
                        <div className="spinner"></div>
                        <h3>Đang xác thực tài khoản...</h3>
                        <p>Vui lòng đợi trong giây lát</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="icon-success">✅</div>
                        <h2 style={{ color: '#28a745' }}>Xác thực thành công!</h2>
                        <p>{message}</p>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            Chuyển đến trang đăng nhập sau 3 giây...
                        </p>
                        <button
                            className="btn-login"
                            onClick={() => {
                                onClose();
                                navigate('/login');
                            }}
                        >
                            Đăng nhập ngay
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="icon-error">❌</div>
                        <h2 style={{ color: '#dc3545' }}>Xác thực thất bại</h2>
                        <p>{message}</p>
                        <div className="error-actions">
                            <button
                                className="btn-retry"
                                onClick={() => {
                                    onClose();
                                    navigate('/resend-verification');
                                }}
                            >
                                Gửi lại email xác thực
                            </button>
                            <button
                                className="btn-back"
                                onClick={() => {
                                    onClose();
                                    navigate('/login');
                                }}
                            >
                                Quay lại đăng nhập
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;