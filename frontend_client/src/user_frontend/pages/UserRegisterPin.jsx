import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Shield, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

import LoadingButton from '../components/LoadingButton';
import Modal from '../components/Modal';
import EmailVerificationSentModal from '../components/EmailVerificationSentModal';
import VerifySuccessModal from '../components/VerifySuccessModal';
import socketService from '../../api/socket';
import '../styles/UserAuth.css';

const UserRegisterPin = () => {
    const navigate = useNavigate();

    const tempData = JSON.parse(sessionStorage.getItem('register_temp') || '{}');
    const { temp_token, username, full_name, email, phone, password, address } = tempData;

    const [pinValues, setPinValues] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState(''); // 🆕 Lỗi hiển thị trên form

    // Modal states
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Socket listener ref
    const isListeningRef = useRef(false);
    const socketListenerRef = useRef(null);

    useEffect(() => {
        // 🆕 Kiểm tra token trước khi vào trang
        if (!temp_token || !username || !email) {
            setErrorMessage('Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!');
            // Không tự động navigate, để người dùng bấm nút
        } else {
            inputRefs.current[0]?.focus();
        }
    }, [temp_token, username, email, navigate]);

    // Cleanup socket listener khi unmount
    useEffect(() => {
        return () => {
            if (isListeningRef.current) {
                const socket = socketService.getSocket();
                if (socket && socketListenerRef.current) {
                    socket.off('email_verified', socketListenerRef.current);
                    socketListenerRef.current = null;
                    isListeningRef.current = false;
                    console.log('🔴 [SOCKET] Đã hủy listener email_verified');
                }
            }
        };
    }, []);

    // Hàm lắng nghe sự kiện email-verified từ Socket
    const listenForEmailVerification = () => {
        const socket = socketService.getSocket();
        
        if (!socket || !socket.connected) {
            console.warn('⚠️ [SOCKET] Chưa kết nối, thử kết nối...');
            socketService.connect(email);
            setTimeout(() => {
                const newSocket = socketService.getSocket();
                if (newSocket && newSocket.connected) {
                    listenForEmailVerification();
                }
            }, 1000);
            return;
        }

        const handleEmailVerified = (data) => {
            console.log('✅ [SOCKET] Nhận được sự kiện email_verified:', data);

            if (data.success && data.email === email) {
                // Đóng modal kiểm tra email
                setShowVerifyModal(false);
                
                // Hiện modal thành công + countdown
                setShowSuccessModal(true);
                setCountdown(3);
                
                // Bắt đầu countdown
                startCountdown();
                
                // Hủy lắng nghe sau khi đã nhận được sự kiện
                if (socketListenerRef.current) {
                    socket.off('email_verified', socketListenerRef.current);
                    socketListenerRef.current = null;
                    isListeningRef.current = false;
                }
            }
        };

        socketListenerRef.current = handleEmailVerified;
        socket.on('email_verified', handleEmailVerified);
        isListeningRef.current = true;

        // Đăng ký theo dõi email với server
        socket.emit('register-email-watcher', { email });
        console.log(`📡 [SOCKET] Đang lắng nghe sự kiện xác thực cho email: ${email}`);
    };

    // Countdown để chuyển về Login
    const startCountdown = () => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/login', {
                        state: {
                            verified: true,
                            message: 'Xác thực email thành công! Vui lòng đăng nhập.'
                        }
                    });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleChange = (index, value) => {
        const cleanValue = value.replace(/\D/g, '').slice(-1);
        const newPinValues = [...pinValues];
        newPinValues[index] = cleanValue;
        setPinValues(newPinValues);
        setErrors({});
        setErrorMessage(''); // Xóa lỗi khi nhập
        if (cleanValue && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pinValues[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const validate = () => {
        const pin = pinValues.join('');
        if (pin.length !== 6) {
            setErrors({ pin: 'Vui lòng nhập đủ 6 chữ số' });
            return false;
        }
        return true;
    };

    // 🆕 Hàm xử lý quay lại Register
    const handleGoBackToRegister = () => {
        sessionStorage.removeItem('register_temp');
        navigate('/register');
    };

    const handleSetupPin = async (e) => {
        e.preventDefault();
        
        // 🆕 Kiểm tra token trước khi gọi API
        if (!temp_token) {
            setErrorMessage('Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!');
            return;
        }

        if (!validate()) return;

        const pin = pinValues.join('');
        setLoading(true);
        setErrorMessage('');

        try {
            const response = await api.post('/api/auth/complete-registration', {
                temp_token,
                pin,
                username,
                full_name,
                email,
                phone,
                password,
                address: address || ''
            });

            if (response.data.success) {
                // Xóa session storage
                sessionStorage.removeItem('register_temp');
                
                // Hiển thị modal "Vui lòng kiểm tra email"
                setShowVerifyModal(true);
                
                // Bắt đầu lắng nghe socket
                listenForEmailVerification();
            } else {
                // 🆕 Xử lý khi API trả về success = false
                setErrorMessage(response.data.message || 'Có lỗi xảy ra, vui lòng thử lại!');
            }

        } catch (err) {
            console.error('❌ Setup PIN Error:', err);
            
            // 🆕 Xử lý lỗi 401 - Token hết hạn
            if (err.response?.status === 401) {
                setErrorMessage('Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!');
                // Không tự động chuyển trang, để người dùng bấm nút
                return;
            }

            // 🆕 Xử lý lỗi 400 - Validation
            if (err.response?.status === 400) {
                const field = err.response?.data?.field;
                const message = err.response?.data?.message;
                if (field === 'pin') {
                    setErrors({ pin: message });
                } else {
                    setErrorMessage(message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!');
                }
                return;
            }

            // 🆕 Lỗi khác
            const serverMsg = err.response?.data?.message || err.message || 'Không thể hoàn tất đăng ký. Vui lòng thử lại!';
            setErrorMessage(serverMsg);
        } finally {
            setLoading(false);
        }
    };

    // Đóng modal kiểm tra email (khách bấm "Đã hiểu")
    const handleVerifyModalClose = () => {
        setShowVerifyModal(false);
        
        // Dừng lắng nghe nếu khách đóng modal
        if (isListeningRef.current && socketListenerRef.current) {
            const socket = socketService.getSocket();
            if (socket) {
                socket.off('email_verified', socketListenerRef.current);
                socketListenerRef.current = null;
                isListeningRef.current = false;
                console.log('🔴 [SOCKET] Đã hủy listener do người dùng đóng modal');
            }
        }
    };

    // Đóng modal thành công (nếu khách bấm sớm)
    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        navigate('/login', {
            state: {
                verified: true,
                message: 'Xác thực email thành công! Vui lòng đăng nhập.'
            }
        });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="step-indicator">
                    <span className="step-done">✓</span>
                    <span className="step-line"></span>
                    <span className="step-active">2</span>
                </div>

                <h2>🔐 THIẾT LẬP MÃ PIN</h2>
                <p className="auth-subtitle">Bước 2: Tạo mã PIN bảo mật cho giao dịch</p>

                <div className="user-info-box">
                    <Shield size={18} />
                    <span>
                        <strong>{full_name || 'Bạn'}</strong> đang thiết lập mã PIN cho tài khoản
                        <strong> {email}</strong>
                    </span>
                </div>

                {/* 🆕 Hiển thị lỗi trên form */}
                {errorMessage && (
                    <div className="error-message" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 59, 92, 0.12)',
                        border: '1px solid rgba(255, 59, 92, 0.3)',
                        borderRadius: '8px',
                        color: '#ff6b8a',
                        marginBottom: '16px'
                    }}>
                        <AlertCircle size={18} />
                        <span>{errorMessage}</span>
                        {errorMessage.includes('hết hạn') && (
                            <button
                                onClick={handleGoBackToRegister}
                                style={{
                                    marginLeft: 'auto',
                                    padding: '4px 12px',
                                    background: 'rgba(255, 59, 92, 0.15)',
                                    border: '1px solid rgba(255, 59, 92, 0.2)',
                                    borderRadius: '4px',
                                    color: '#ff6b8a',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}
                            >
                                Đăng ký lại
                            </button>
                        )}
                    </div>
                )}

                <div className="auth-form-wrapper">
                    <form onSubmit={handleSetupPin} noValidate>
                        <div className="pin-input-container">
                            {pinValues.map((val, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={val}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className={`pin-box ${errors.pin ? 'input-error' : ''}`}
                                    disabled={loading}
                                    autoComplete="one-time-code"
                                />
                            ))}
                        </div>

                        {errors.pin && <span className="error-text pin-error">{errors.pin}</span>}
                        
                        <div className="input-hint center-text" style={{ marginTop: '10px' }}>
                            🔐 Mã PIN dùng để xác thực giao dịch thanh toán (6 chữ số)
                        </div>

                        <div className="button-group" style={{ marginTop: '20px' }}>
                            <LoadingButton
                                type="submit"
                                loading={loading}
                                loadingText="Đang thiết lập PIN..."
                                disabled={loading || !temp_token}
                                className="btn-user"
                                spinnerColor="#ffffff"
                            >
                                HOÀN TẤT ĐĂNG KÝ
                            </LoadingButton>
                        </div>
                    </form>
                </div>

                <div className="auth-footer">
                    <button
                        type="button"
                        className="btn-link back-btn"
                        onClick={handleGoBackToRegister}
                    >
                        <ArrowLeft size={16} />
                        Quay lại bước 1
                    </button>
                </div>
            </div>

            {/* MODAL 1: "Vui lòng kiểm tra email" */}
            <EmailVerificationSentModal
                show={showVerifyModal}
                onConfirm={handleVerifyModalClose}
                onClose={handleVerifyModalClose}
                email={email}
                full_name={full_name}
                confirmText="Đã hiểu"
                autoClose={false}
            />

            {/* MODAL 2: "Xác thực thành công" */}
            <VerifySuccessModal
                show={showSuccessModal}
                full_name={full_name}
                countdown={countdown}
                onClose={handleSuccessModalClose}
            />
        </div>
    );
};

export default UserRegisterPin;