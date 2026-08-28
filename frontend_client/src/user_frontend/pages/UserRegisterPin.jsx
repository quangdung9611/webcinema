import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Shield, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

import LoadingButton from '../components/LoadingButton';
import Modal from '../components/Modal';
import EmailVerificationSentModal from '../components/EmailVerificationSentModal';
import socketService from '../../api/socket';
import '../styles/UserAuth.css';

const UserRegisterPin = () => {
    const navigate = useNavigate();

    const tempData = JSON.parse(sessionStorage.getItem('register_temp') || '{}');
    const { temp_token, username, full_name, email, phone, password, address } = tempData;

    const [pinValues, setPinValues] = useState(['', '', '', '', '', '']);
    const [confirmPinValues, setConfirmPinValues] = useState(['', '', '', '', '', '']); // 🆕 Nhập lại PIN
    const inputRefs = useRef([]);
    const confirmInputRefs = useRef([]); // 🆕 Ref cho confirm PIN

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    // Modal states
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Socket listener ref
    const isListeningRef = useRef(false);
    const socketListenerRef = useRef(null);

    // Polling interval ref
    const pollingIntervalRef = useRef(null);

    // =========================================================
    // CHECK TOKEN ON MOUNT
    // =========================================================
    useEffect(() => {
        if (!temp_token || !username || !email) {
            setErrorMessage('Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!');
        } else {
            inputRefs.current[0]?.focus();
        }
    }, [temp_token, username, email]);

    // =========================================================
    // CLEANUP
    // =========================================================
    useEffect(() => {
        return () => {
            if (isListeningRef.current) {
                const socket = socketService.getSocket();
                if (socket && socketListenerRef.current) {
                    socket.off('email_verified', socketListenerRef.current);
                    socketListenerRef.current = null;
                    isListeningRef.current = false;
                }
            }
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, []);

    // =========================================================
    // POLLING SESSIONSTORAGE (FALLBACK)
    // =========================================================
    const startPollingSessionStorage = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        pollingIntervalRef.current = setInterval(() => {
            const verified = sessionStorage.getItem('email_verified_success');
            if (verified === 'true') {
                try {
                    const data = JSON.parse(sessionStorage.getItem('email_verified_data') || '{}');
                    
                    if (data.email === email) {
                        console.log('✅ [POLLING] Phát hiện email đã verified từ sessionStorage!');
                        
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        
                        setShowVerifyModal(false);
                        setShowSuccessModal(true);
                        setCountdown(3);
                        startCountdown();
                        
                        sessionStorage.removeItem('email_verified_success');
                        sessionStorage.removeItem('email_verified_data');
                    }
                } catch (error) {
                    console.error('❌ [POLLING] Lỗi parse data:', error);
                }
            }
        }, 2000);
    };

    // =========================================================
    // SOCKET LISTENER
    // =========================================================
    const setupSocketListener = () => {
        const socket = socketService.getSocket();
        if (!socket) {
            console.warn('⚠️ [SOCKET] Socket chưa sẵn sàng');
            return false;
        }

        if (socketListenerRef.current) {
            socket.off('email_verified', socketListenerRef.current);
        }

        const handleEmailVerified = (data) => {
            console.log('✅ [SOCKET] Nhận được sự kiện email_verified:', data);

            if (data.success && data.email === email) {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }

                setShowVerifyModal(false);
                setShowSuccessModal(true);
                setCountdown(3);
                startCountdown();
                
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
        
        if (socketService.registerEmailWatcher) {
            socketService.registerEmailWatcher(email);
        }
        
        console.log(`📡 [SOCKET] Đã setup listener cho email: ${email}`);
        return true;
    };

    // =========================================================
    // LẮNG NGHE SỰ KIỆN (SOCKET + POLLING FALLBACK)
    // =========================================================
    const listenForEmailVerification = () => {
        startPollingSessionStorage();
        
        const socket = socketService.getSocket();
        
        if (!socket || !socket.connected) {
            console.warn('⚠️ [SOCKET] Chưa kết nối, thử kết nối...');
            socketService.connect(email);
            setTimeout(() => {
                const newSocket = socketService.getSocket();
                if (newSocket && newSocket.connected) {
                    setupSocketListener();
                } else {
                    console.warn('⚠️ [SOCKET] Vẫn chưa kết nối, chỉ dùng polling fallback');
                }
            }, 1500);
        } else {
            setupSocketListener();
        }
    };

    // =========================================================
    // COUNTDOWN - TỰ ĐỘNG CHUYỂN VỀ LOGIN
    // =========================================================
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

    // =========================================================
    // 🆕 HANDLE PIN INPUT
    // =========================================================
    const handlePinChange = (index, value, isConfirm = false) => {
        const cleanValue = value.replace(/\D/g, '').slice(-1);
        
        if (isConfirm) {
            const newValues = [...confirmPinValues];
            newValues[index] = cleanValue;
            setConfirmPinValues(newValues);
            // Xóa lỗi confirm khi nhập
            if (errors.confirmPin) {
                setErrors(prev => ({ ...prev, confirmPin: '' }));
            }
            if (cleanValue && index < 5) {
                confirmInputRefs.current[index + 1]?.focus();
            }
        } else {
            const newValues = [...pinValues];
            newValues[index] = cleanValue;
            setPinValues(newValues);
            setErrors({});
            setErrorMessage('');
            if (cleanValue && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
            // Nếu đã nhập confirm, kiểm tra lại
            const confirmPin = confirmPinValues.join('');
            if (confirmPin.length === 6) {
                validatePinMatch(cleanValue ? newValues.join('') : pinValues.join(''), confirmPin);
            }
        }
    };

    // =========================================================
    // 🆕 VALIDATE PIN MATCH
    // =========================================================
    const validatePinMatch = (pin, confirmPin) => {
        if (pin.length === 6 && confirmPin.length === 6) {
            if (pin !== confirmPin) {
                setErrors(prev => ({ ...prev, confirmPin: 'Mã PIN xác nhận không khớp' }));
                return false;
            } else {
                setErrors(prev => ({ ...prev, confirmPin: '' }));
                return true;
            }
        }
        return true;
    };

    // =========================================================
    // 🆕 HANDLE CONFIRM PIN KEYDOWN (tự động focus về ô nhập lại)
    // =========================================================
    const handleConfirmKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !confirmPinValues[index] && index > 0) {
            confirmInputRefs.current[index - 1]?.focus();
        }
        // Khi nhập xong 6 số, tự động focus vào ô đầu của confirm PIN
        if (index === 5 && e.key !== 'Backspace') {
            const fullPin = pinValues.join('');
            if (fullPin.length === 6) {
                // Nếu confirm đã đủ 6 số, kiểm tra luôn
                setTimeout(() => {
                    const confirmPin = confirmPinValues.join('');
                    if (confirmPin.length === 6) {
                        validatePinMatch(fullPin, confirmPin);
                    }
                }, 100);
            }
        }
    };

    // =========================================================
    // HANDLE KEY DOWN (PIN chính)
    // =========================================================
    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pinValues[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        // Khi nhập xong 6 số, tự động focus vào ô đầu của confirm PIN
        if (index === 5 && e.key !== 'Backspace') {
            setTimeout(() => {
                if (!confirmInputRefs.current[0]) return;
                // Chỉ focus nếu confirm PIN chưa được nhập
                if (confirmPinValues.every(v => v === '')) {
                    confirmInputRefs.current[0]?.focus();
                }
            }, 50);
        }
    };

    // =========================================================
    // VALIDATE ALL
    // =========================================================
    const validateAll = () => {
        const pin = pinValues.join('');
        const confirmPin = confirmPinValues.join('');
        let isValid = true;

        if (pin.length !== 6) {
            setErrors(prev => ({ ...prev, pin: 'Vui lòng nhập đủ 6 chữ số' }));
            isValid = false;
        }

        if (confirmPin.length !== 6) {
            setErrors(prev => ({ ...prev, confirmPin: 'Vui lòng nhập lại đủ 6 chữ số' }));
            isValid = false;
        }

        if (pin.length === 6 && confirmPin.length === 6 && pin !== confirmPin) {
            setErrors(prev => ({ ...prev, confirmPin: 'Mã PIN xác nhận không khớp' }));
            isValid = false;
        }

        return isValid;
    };

    // =========================================================
    // HANDLE GO BACK
    // =========================================================
    const handleGoBackToRegister = () => {
        sessionStorage.removeItem('register_temp');
        navigate('/register');
    };

    // =========================================================
    // HANDLE SETUP PIN
    // =========================================================
    const handleSetupPin = async (e) => {
        e.preventDefault();
        
        if (!temp_token) {
            setErrorMessage('Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!');
            return;
        }

        if (!validateAll()) return;

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
                sessionStorage.removeItem('register_temp');
                setShowVerifyModal(true);
                listenForEmailVerification();
            } else {
                setErrorMessage(response.data.message || 'Có lỗi xảy ra, vui lòng thử lại!');
            }

        } catch (err) {
            console.error('❌ Setup PIN Error:', err);
            
            if (err.response?.status === 401) {
                setErrorMessage('Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!');
                return;
            }

            if (err.response?.status === 400) {
                const field = err.response?.data?.field;
                const message = err.response?.data?.message;
                if (field === 'pin') {
                    setErrors(prev => ({ ...prev, pin: message }));
                } else {
                    setErrorMessage(message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!');
                }
                return;
            }

            const serverMsg = err.response?.data?.message || err.message || 'Không thể hoàn tất đăng ký. Vui lòng thử lại!';
            setErrorMessage(serverMsg);
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // HANDLE MODAL CLOSE
    // =========================================================
    const handleVerifyModalClose = () => {
        setShowVerifyModal(false);
        
        if (isListeningRef.current && socketListenerRef.current) {
            const socket = socketService.getSocket();
            if (socket) {
                socket.off('email_verified', socketListenerRef.current);
                socketListenerRef.current = null;
                isListeningRef.current = false;
                console.log('🔴 [SOCKET] Đã hủy listener do người dùng đóng modal');
            }
        }
        
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    // =========================================================
    // RENDER
    // =========================================================
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
                        {/* 🆕 MÃ PIN */}
                        <div className="form-group">
                            <label>Mã PIN</label>
                            <div className="pin-input-container">
                                {pinValues.map((val, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={val}
                                        onChange={(e) => handlePinChange(index, e.target.value, false)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className={`pin-box ${errors.pin ? 'input-error' : ''}`}
                                        disabled={loading}
                                        autoComplete="one-time-code"
                                    />
                                ))}
                            </div>
                            {errors.pin && <span className="error-text pin-error">{errors.pin}</span>}
                        </div>

                        {/* 🆕 NHẬP LẠI MÃ PIN */}
                        <div className="form-group" style={{ marginTop: '8px' }}>
                            <label>Nhập lại mã PIN</label>
                            <div className="pin-input-container">
                                {confirmPinValues.map((val, index) => (
                                    <input
                                        key={`confirm-${index}`}
                                        ref={(el) => (confirmInputRefs.current[index] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={val}
                                        onChange={(e) => handlePinChange(index, e.target.value, true)}
                                        onKeyDown={(e) => handleConfirmKeyDown(index, e)}
                                        className={`pin-box ${errors.confirmPin ? 'input-error' : ''}`}
                                        disabled={loading}
                                        autoComplete="one-time-code"
                                    />
                                ))}
                            </div>
                            {errors.confirmPin && <span className="error-text pin-error">{errors.confirmPin}</span>}
                        </div>

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
                autoClose={false} // ✅ PHẢI LÀ false (giữ modal cứng)
            />

            {/* MODAL 2: "Xác thực thành công" */}
            <Modal
                show={showSuccessModal}
                type="success"
                title="🎉 Xác thực thành công!"
                confirmText={`Đăng nhập (${countdown}s)`}
                onConfirm={() => {
                    navigate('/login', {
                        state: {
                            verified: true,
                            message: 'Xác thực email thành công! Vui lòng đăng nhập.'
                        }
                    });
                }}
                onCancel={() => {
                    navigate('/login', {
                        state: {
                            verified: true,
                            message: 'Xác thực email thành công! Vui lòng đăng nhập.'
                        }
                    });
                }}
            >
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <div style={{
                        width: "70px", height: "70px", borderRadius: "50%",
                        background: "rgba(34, 197, 94, 0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 15px"
                    }}>
                        <CheckCircle size={40} color="#4ade80" />
                    </div>

                    <p style={{ color: "var(--text-heading)", fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
                        Chúc mừng {full_name || "bạn"}!
                    </p>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        Tài khoản của bạn đã được xác thực thành công! 🎊
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "10px" }}>
                        ⏳ Tự động chuyển đến trang đăng nhập sau <strong style={{ color: "#4ade80" }}>{countdown}</strong> giây...
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default UserRegisterPin;