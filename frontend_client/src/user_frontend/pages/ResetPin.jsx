import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import ForgotPinModal from '../components/ForgotPinModal';
import '../styles/UserAuth.css';

const ResetPin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const email = location.state?.email || '';
    const otp = location.state?.otp || '';
    const returnTo = location.state?.returnTo || '/';

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const pinRefs = useRef([]);
    const confirmPinRefs = useRef([]);

    // ✅ Nếu không có email hoặc otp -> về forgot-pin
    if (!email || !otp) {
        navigate('/forgot-pin');
        return null;
    }

    const handlePinChange = (index, value, type) => {
        const clean = value.replace(/\D/g, '').slice(-1);
        if (type === 'pin') {
            const newPin = pin.split('');
            newPin[index] = clean;
            setPin(newPin.join(''));
            if (clean && index < 5) pinRefs.current[index + 1]?.focus();
        } else {
            const newConfirm = confirmPin.split('');
            newConfirm[index] = clean;
            setConfirmPin(newConfirm.join(''));
            if (clean && index < 5) confirmPinRefs.current[index + 1]?.focus();
        }
        if (error) setError('');
    };

    const handlePinKeyDown = (index, e, type) => {
        if (e.key === 'Backspace' && (type === 'pin' ? !pin[index] : !confirmPin[index]) && index > 0) {
            if (type === 'pin') pinRefs.current[index - 1]?.focus();
            else confirmPinRefs.current[index - 1]?.focus();
        }
    };

    // ✅ Đổi PIN
    const handleChangePin = async () => {
        if (!/^\d{6}$/.test(pin)) {
            setError('Vui lòng nhập đủ 6 số PIN mới');
            return;
        }

        if (pin !== confirmPin) {
            setError('Mã PIN xác nhận không khớp');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/verify-otp-and-change-pin', {
                email,
                otp,
                newPin: pin
            });

            if (response.data.success) {
                setShowSuccessModal(true);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Không thể đổi mã PIN';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
        navigate(returnTo);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐỔI MÃ PIN</h2>
                <p className="auth-subtitle">Nhập mã PIN mới (6 số)</p>

                {error && (
                    <div className="forgot-message error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="form-group">
                    <label>Mã PIN mới</label>
                    <div className="pin-input-container">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <input
                                key={index}
                                ref={(el) => (pinRefs.current[index] = el)}
                                type={showPin ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={1}
                                value={pin[index] || ''}
                                onChange={(e) => handlePinChange(index, e.target.value, 'pin')}
                                onKeyDown={(e) => handlePinKeyDown(index, e, 'pin')}
                                className="pin-box"
                                disabled={loading}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPin(!showPin)}
                        style={{ marginTop: '8px' }}
                    >
                        {showPin ? <Eye size={18} /> : <EyeOff size={18} />}
                        <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                            {showPin ? 'Ẩn PIN' : 'Hiện PIN'}
                        </span>
                    </button>
                </div>

                <div className="form-group">
                    <label>Xác nhận mã PIN mới</label>
                    <div className="pin-input-container">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <input
                                key={index}
                                ref={(el) => (confirmPinRefs.current[index] = el)}
                                type={showConfirmPin ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={1}
                                value={confirmPin[index] || ''}
                                onChange={(e) => handlePinChange(index, e.target.value, 'confirm')}
                                onKeyDown={(e) => handlePinKeyDown(index, e, 'confirm')}
                                className="pin-box"
                                disabled={loading}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                        style={{ marginTop: '8px' }}
                    >
                        {showConfirmPin ? <Eye size={18} /> : <EyeOff size={18} />}
                        <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                            {showConfirmPin ? 'Ẩn PIN' : 'Hiện PIN'}
                        </span>
                    </button>
                    {pin && confirmPin && pin.length === 6 && confirmPin.length === 6 && pin !== confirmPin && (
                        <span className="error-text">Mã PIN xác nhận không khớp</span>
                    )}
                </div>

                <div className="button-group" style={{ marginTop: '20px' }}>
                    <button className="btn-user back-btn" onClick={() => navigate('/forgot-pin')}>
                        <ArrowLeft size={16} /> Quay lại
                    </button>
                    <LoadingButton
                        type="button"
                        loading={loading}
                        loadingText="Đang đổi PIN..."
                        onClick={handleChangePin}
                        disabled={loading || pin.length < 6 || confirmPin.length < 6 || pin !== confirmPin}
                        className="btn-user"
                        spinnerColor="#000000"
                    >
                        XÁC NHẬN ĐỔI PIN
                    </LoadingButton>
                </div>
            </div>

            <ForgotPinModal
                isOpen={showSuccessModal}
                onClose={handleModalClose}
                email={email}
            />
        </div>
    );
};

export default ResetPin;