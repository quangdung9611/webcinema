// user_frontend/pages/UserRegisterPin.jsx
// ============================================================
// USER REGISTER PIN — PREMIUM CINEMATIC SILVER
// Đồng bộ visual với UserRegister
// Giữ nguyên toàn bộ logic: PIN / SOCKET / POLLING / VERIFY
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

import {
    Shield,
    ShieldCheck,
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Lock,
    PartyPopper,
    Hourglass,
    Lightbulb,
    Film,
    KeyRound,
    Sparkles,
    Mail,
    UserCheck,
} from 'lucide-react';

import LoadingButton from '../components/LoadingButton';
import Modal from '../components/Modal';
import EmailVerificationSentModal from '../components/EmailVerificationSentModal';
import socketService from '../../api/socket';
import '../styles/UserRegisterPin.css';

const UserRegisterPin = () => {
    const navigate = useNavigate();

    const tempData = JSON.parse(
        sessionStorage.getItem('register_temp') || '{}'
    );

    const {
        temp_token,
        username,
        full_name,
        email,
        phone,
        password,
        address,
    } = tempData;

    const [pinValues, setPinValues] = useState(['', '', '', '', '', '']);
    const [confirmPinValues, setConfirmPinValues] = useState([
        '', '', '', '', '', '',
    ]);

    const inputRefs = useRef([]);
    const confirmInputRefs = useRef([]);

    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [countdown, setCountdown] = useState(3);

    const isListeningRef = useRef(false);
    const socketListenerRef = useRef(null);
    const pollingIntervalRef = useRef(null);

    // =========================================================
    // CHECK TOKEN ON MOUNT
    // =========================================================
    useEffect(() => {
        if (!temp_token || !username || !email) {
            setErrorMessage(
                'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!'
            );
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
                    socket.off(
                        'email_verified',
                        socketListenerRef.current
                    );
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
            const verified = sessionStorage.getItem(
                'email_verified_success'
            );

            if (verified === 'true') {
                try {
                    const data = JSON.parse(
                        sessionStorage.getItem(
                            'email_verified_data'
                        ) || '{}'
                    );

                    if (data.email === email) {
                        if (pollingIntervalRef.current) {
                            clearInterval(
                                pollingIntervalRef.current
                            );
                            pollingIntervalRef.current = null;
                        }

                        setShowVerifyModal(false);
                        setShowSuccessModal(true);
                        setCountdown(3);
                        startCountdown();

                        sessionStorage.removeItem(
                            'email_verified_success'
                        );
                        sessionStorage.removeItem(
                            'email_verified_data'
                        );
                    }
                } catch (error) {
                    console.error(
                        '[POLLING] Lỗi parse data:',
                        error
                    );
                }
            }
        }, 2000);
    };

    // =========================================================
    // SOCKET LISTENER
    // =========================================================
    const setupSocketListener = () => {
        const socket = socketService.getSocket();

        if (!socket) return false;

        if (socketListenerRef.current) {
            socket.off(
                'email_verified',
                socketListenerRef.current
            );
        }

        const handleEmailVerified = (data) => {
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
                    socket.off(
                        'email_verified',
                        socketListenerRef.current
                    );
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

        return true;
    };

    // =========================================================
    // LẮNG NGHE SỰ KIỆN (SOCKET + POLLING FALLBACK)
    // =========================================================
    const listenForEmailVerification = () => {
        startPollingSessionStorage();

        const socket = socketService.getSocket();

        if (!socket || !socket.connected) {
            socketService.connect(email);

            setTimeout(() => {
                const newSocket = socketService.getSocket();
                if (newSocket && newSocket.connected) {
                    setupSocketListener();
                }
            }, 1500);
        } else {
            setupSocketListener();
        }
    };

    // =========================================================
    // COUNTDOWN
    // =========================================================
    const startCountdown = () => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/login', {
                        state: {
                            verified: true,
                            message:
                                'Xác thực email thành công! Vui lòng đăng nhập.',
                        },
                    });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // =========================================================
    // HANDLE PIN CHANGE
    // =========================================================
    const handlePinChange = (index, value, isConfirm = false) => {
        const cleanValue = value.replace(/\D/g, '').slice(-1);

        if (isConfirm) {
            const newValues = [...confirmPinValues];
            newValues[index] = cleanValue;
            setConfirmPinValues(newValues);

            if (errors.confirmPin) {
                setErrors((prev) => ({
                    ...prev,
                    confirmPin: '',
                }));
            }

            if (cleanValue && index < 5) {
                confirmInputRefs.current[index + 1]?.focus();
            }
        } else {
            const newValues = [...pinValues];
            newValues[index] = cleanValue;
            setPinValues(newValues);

            if (errors.pin) {
                setErrors((prev) => ({ ...prev, pin: '' }));
            }
            setErrorMessage('');

            if (cleanValue && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        }

        const currentPin = isConfirm
            ? pinValues.join('')
            : cleanValue
            ? newValues.join('')
            : pinValues.join('');

        const currentConfirm = isConfirm
            ? newValues.join('')
            : confirmPinValues.join('');

        if (currentPin.length === 6 && currentConfirm.length === 6) {
            if (currentPin !== currentConfirm) {
                setErrors((prev) => ({
                    ...prev,
                    confirmPin: 'Mã PIN xác nhận không khớp',
                }));
            } else {
                setErrors((prev) => ({
                    ...prev,
                    confirmPin: '',
                }));
            }
        }
    };

    // =========================================================
    // HANDLE KEY DOWN
    // =========================================================
    const handleConfirmKeyDown = (index, e) => {
        if (
            e.key === 'Backspace' &&
            !confirmPinValues[index] &&
            index > 0
        ) {
            confirmInputRefs.current[index - 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (
            e.key === 'Backspace' &&
            !pinValues[index] &&
            index > 0
        ) {
            inputRefs.current[index - 1]?.focus();
        }

        if (index === 5 && e.key !== 'Backspace') {
            setTimeout(() => {
                if (!confirmInputRefs.current[0]) return;
                if (confirmPinValues.every((v) => v === '')) {
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
        const newErrors = {};

        if (pin.length !== 6) {
            newErrors.pin = 'Vui lòng nhập đủ 6 chữ số';
            isValid = false;
        }

        if (confirmPin.length !== 6) {
            newErrors.confirmPin =
                'Vui lòng nhập lại đủ 6 chữ số';
            isValid = false;
        }

        if (
            pin.length === 6 &&
            confirmPin.length === 6 &&
            pin !== confirmPin
        ) {
            newErrors.confirmPin =
                'Mã PIN xác nhận không khớp';
            isValid = false;
        }

        setErrors(newErrors);
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
            setErrorMessage(
                'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!'
            );
            return;
        }

        if (!validateAll()) return;

        const pin = pinValues.join('');
        setLoading(true);
        setErrorMessage('');

        try {
            const response = await api.post(
                '/api/auth/complete-registration',
                {
                    temp_token,
                    pin,
                    username,
                    full_name,
                    email,
                    phone,
                    password,
                    address: address || '',
                }
            );

            if (response.data.success) {
                sessionStorage.removeItem('register_temp');
                setShowVerifyModal(true);
                listenForEmailVerification();
            } else {
                setErrorMessage(
                    response.data.message ||
                        'Có lỗi xảy ra, vui lòng thử lại!'
                );
            }
        } catch (err) {
            console.error('Setup PIN Error:', err);

            const status = err.response?.status;

            if (status === 401) {
                setErrorMessage(
                    'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại!'
                );
                return;
            }

            if (status === 429) {
                setErrorMessage(
                    err.response?.data?.message ||
                        'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.'
                );
                return;
            }

            if (status === 400) {
                const field = err.response?.data?.field;
                const message = err.response?.data?.message;

                if (field === 'pin') {
                    setErrors((prev) => ({
                        ...prev,
                        pin: message,
                    }));
                } else {
                    setErrorMessage(
                        message ||
                            'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại!'
                    );
                }
                return;
            }

            const serverMsg =
                err.response?.data?.message ||
                err.message ||
                'Không thể hoàn tất đăng ký. Vui lòng thử lại!';

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
                socket.off(
                    'email_verified',
                    socketListenerRef.current
                );
                socketListenerRef.current = null;
                isListeningRef.current = false;
            }
        }

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    // =========================================================
    // PIN INPUT RENDERER
    // =========================================================
    const renderPinBoxes = ({
        values,
        refs,
        isConfirm,
        showValue,
        onToggle,
        error,
    }) => (
        <div className="pin-input-group">
            <div className="pin-boxes">
                {values.map((val, index) => (
                    <input
                        key={index}
                        ref={(el) => (refs.current[index] = el)}
                        type={showValue ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={1}
                        className={`pin-box ${
                            val ? 'pin-box--filled' : ''
                        } ${error ? 'pin-box--error' : ''}`}
                        value={val}
                        onChange={(e) =>
                            handlePinChange(
                                index,
                                e.target.value,
                                isConfirm
                            )
                        }
                        onKeyDown={(e) =>
                            isConfirm
                                ? handleConfirmKeyDown(index, e)
                                : handleKeyDown(index, e)
                        }
                        disabled={loading}
                        autoComplete="one-time-code"
                        aria-label={`PIN digit ${index + 1}`}
                    />
                ))}
            </div>

            <button
                type="button"
                className="pin-toggle"
                onClick={onToggle}
                tabIndex="-1"
                disabled={loading}
                aria-label="Hiện hoặc ẩn mã PIN"
            >
                {showValue ? (
                    <EyeOff size={16} />
                ) : (
                    <Eye size={16} />
                )}
            </button>
        </div>
    );

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <div className="register-pin-page">
            {/* ============================================
                LOGO
            ============================================ */}
            <div className="register-pin-page__logo">
                <Film size={20} strokeWidth={2.4} />
                <span>Cinema Star</span>
            </div>

            {/* ============================================
                MAIN
            ============================================ */}
            <div className="register-pin-shell">
                <div className="register-pin-grid">
                    {/* ============================================
                        LEFT CONTENT
                    ============================================ */}
                    <section className="register-pin-content">
                        <div className="register-pin-content__badge">
                            <ShieldCheck
                                size={14}
                                strokeWidth={2.2}
                            />
                            <span>BƯỚC 2 / 2</span>
                        </div>

                        <div className="register-pin-content__eyebrow">
                            SECURITY PIN
                        </div>

                        <h1 className="register-pin-content__title">
                            THIẾT LẬP
                            <br />
                            MÃ PIN.
                        </h1>

                        <p className="register-pin-content__desc">
                            Mã PIN 6 chữ số bảo vệ mọi giao dịch
                            thanh toán của bạn. Hãy chọn con số
                            dễ nhớ nhưng khó đoán.
                        </p>

                        <ul className="register-pin-content__list">
                            <li>
                                <span className="register-pin-content__icon">
                                    <KeyRound
                                        size={16}
                                        strokeWidth={2}
                                    />
                                </span>
                                <span>
                                    Dùng để xác thực thanh toán vé
                                </span>
                            </li>

                            <li>
                                <span className="register-pin-content__icon">
                                    <Shield
                                        size={16}
                                        strokeWidth={2}
                                    />
                                </span>
                                <span>
                                    Mã hoá 2 lớp — an toàn tuyệt đối
                                </span>
                            </li>

                            <li>
                                <span className="register-pin-content__icon">
                                    <Sparkles
                                        size={16}
                                        strokeWidth={2}
                                    />
                                </span>
                                <span>
                                    Không chia sẻ PIN với bất kỳ ai
                                </span>
                            </li>
                        </ul>

                        {/* STEP INDICATOR */}
                        <div className="register-pin-steps">
                            <div className="register-pin-steps__item register-pin-steps__item--done">
                                <div className="register-pin-steps__num">
                                    <CheckCircle size={16} />
                                </div>

                                <div className="register-pin-steps__info">
                                    <div className="register-pin-steps__label">
                                        Thông tin cơ bản
                                    </div>

                                    <div className="register-pin-steps__hint">
                                        Đã hoàn tất
                                    </div>
                                </div>
                            </div>

                            <div className="register-pin-steps__line register-pin-steps__line--active" />

                            <div className="register-pin-steps__item register-pin-steps__item--active">
                                <div className="register-pin-steps__num">
                                    2
                                </div>

                                <div className="register-pin-steps__info">
                                    <div className="register-pin-steps__label">
                                        Tạo mã PIN
                                    </div>

                                    <div className="register-pin-steps__hint">
                                        Đang thực hiện
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="register-pin-content__footer">
                            © 2026 Cinema Star — All rights reserved.
                        </div>
                    </section>

                    {/* ============================================
                        RIGHT FORM
                    ============================================ */}
                    <section className="register-pin-form-area">
                        <div className="register-pin-form-card">
                            <div className="register-pin-form-card__header">
                                <div className="register-pin-form-card__eyebrow">
                                    SECURITY PIN
                                </div>

                                <h2 className="register-pin-form-card__title">
                                    TẠO MÃ PIN
                                </h2>

                                <p className="register-pin-form-card__subtitle">
                                    Nhập 6 chữ số để bảo vệ tài khoản
                                </p>
                            </div>

                            {/* USER INFO BOX */}
                            <div className="register-pin-user-box">
                                <div className="register-pin-user-box__icon">
                                    <UserCheck
                                        size={16}
                                        strokeWidth={2.2}
                                    />
                                </div>

                                <div className="register-pin-user-box__content">
                                    <div className="register-pin-user-box__label">
                                        Đang thiết lập cho
                                    </div>

                                    <div className="register-pin-user-box__value">
                                        <strong>
                                            {full_name || 'Bạn'}
                                        </strong>
                                        <span className="register-pin-user-box__sep">
                                            •
                                        </span>
                                        <span className="register-pin-user-box__email">
                                            {email}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ERROR MESSAGE */}
                            {errorMessage && (
                                <div className="register-pin-alert">
                                    <AlertCircle
                                        size={16}
                                        strokeWidth={2.2}
                                    />
                                    <span>{errorMessage}</span>

                                    {errorMessage.includes(
                                        'hết hạn'
                                    ) && (
                                        <button
                                            type="button"
                                            onClick={
                                                handleGoBackToRegister
                                            }
                                            className="register-pin-alert__btn"
                                        >
                                            Đăng ký lại
                                        </button>
                                    )}
                                </div>
                            )}

                            <form
                                className="register-pin-form"
                                onSubmit={handleSetupPin}
                                noValidate
                            >
                                {/* PIN */}
                                <div className="register-pin-field">
                                    <label className="register-pin-field__label">
                                        <span>Mã PIN</span>
                                        <small>6 chữ số</small>
                                    </label>

                                    {renderPinBoxes({
                                        values: pinValues,
                                        refs: inputRefs,
                                        isConfirm: false,
                                        showValue: showPin,
                                        onToggle: () =>
                                            setShowPin(
                                                (prev) => !prev
                                            ),
                                        error: errors.pin,
                                    })}

                                    {errors.pin && (
                                        <span className="register-pin-field__error">
                                            {errors.pin}
                                        </span>
                                    )}
                                </div>

                                {/* CONFIRM PIN */}
                                <div className="register-pin-field">
                                    <label className="register-pin-field__label">
                                        <span>
                                            Nhập lại mã PIN
                                        </span>
                                        <small>
                                            Xác nhận chính xác
                                        </small>
                                    </label>

                                    {renderPinBoxes({
                                        values: confirmPinValues,
                                        refs: confirmInputRefs,
                                        isConfirm: true,
                                        showValue: showConfirmPin,
                                        onToggle: () =>
                                            setShowConfirmPin(
                                                (prev) => !prev
                                            ),
                                        error: errors.confirmPin,
                                    })}

                                    {errors.confirmPin && (
                                        <span className="register-pin-field__error">
                                            {errors.confirmPin}
                                        </span>
                                    )}
                                </div>

                                {/* HINT */}
                                <div className="register-pin-hint">
                                    <Lightbulb
                                        size={14}
                                        strokeWidth={2}
                                    />
                                    <span>
                                        Mã PIN dùng để xác thực
                                        giao dịch thanh toán (6 chữ
                                        số). Không chia sẻ với bất
                                        kỳ ai.
                                    </span>
                                </div>

                                {/* SUBMIT */}
                                <LoadingButton
                                    type="submit"
                                    loading={loading}
                                    loadingText="ĐANG THIẾT LẬP..."
                                    disabled={loading || !temp_token}
                                    className="register-pin-submit"
                                    spinnerColor="#0a0a0b"
                                >
                                    <span>
                                        HOÀN TẤT ĐĂNG KÝ
                                    </span>
                                    <ArrowRight
                                        size={17}
                                        strokeWidth={2.4}
                                    />
                                </LoadingButton>
                            </form>

                            {/* FOOTER */}
                            <div className="register-pin-footer">
                                <button
                                    type="button"
                                    className="register-pin-footer__back"
                                    onClick={handleGoBackToRegister}
                                    disabled={loading}
                                >
                                    <ArrowLeft
                                        size={14}
                                        strokeWidth={2.4}
                                    />
                                    QUAY LẠI BƯỚC 1
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* ============================================
                MODAL 1: EMAIL VERIFICATION SENT
            ============================================ */}
            <EmailVerificationSentModal
                show={showVerifyModal}
                onConfirm={handleVerifyModalClose}
                onClose={handleVerifyModalClose}
                email={email}
                full_name={full_name}
                confirmText="Đã hiểu"
                autoClose={false}
            />

            {/* ============================================
                MODAL 2: SUCCESS
            ============================================ */}
            <Modal
                show={showSuccessModal}
                type="success"
                title={
                    <span className="modal-title-with-icon">
                        <PartyPopper size={22} />
                        Xác thực thành công!
                    </span>
                }
                confirmText={`Đăng nhập (${countdown}s)`}
                onConfirm={() =>
                    navigate('/login', {
                        state: {
                            verified: true,
                            message:
                                'Xác thực email thành công! Vui lòng đăng nhập.',
                        },
                    })
                }
                onCancel={() =>
                    navigate('/login', {
                        state: {
                            verified: true,
                            message:
                                'Xác thực email thành công! Vui lòng đăng nhập.',
                        },
                    })
                }
            >
                <div className="verify-success-content">
                    <div className="verify-success-icon-wrapper">
                        <CheckCircle size={40} color="#4ade80" />
                    </div>

                    <p className="verify-success-title">
                        Chúc mừng {full_name || 'bạn'}!
                    </p>

                    <p className="verify-success-text">
                        Tài khoản của bạn đã được xác thực
                        thành công!
                        <PartyPopper
                            size={18}
                            color="#4ade80"
                            className="verify-success-emoji"
                        />
                    </p>

                    <p className="verify-success-countdown">
                        <Hourglass size={14} />
                        <span>
                            Tự động chuyển đến trang đăng nhập
                            sau{' '}
                            <strong className="verify-countdown-number">
                                {countdown}
                            </strong>{' '}
                            giây...
                        </span>
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default UserRegisterPin;