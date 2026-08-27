import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import { Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';

import Modal from '../components/Modal';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const UserRegisterPin = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { userId, email, full_name } = location.state || {};

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Kiểm tra nếu không có userId → quay lại bước 1
    if (!userId) {
        navigate('/register');
        return null;
    }

    // ==========================================
    // VALIDATE
    // ==========================================

    const validate = () => {
        const tempErrors = {};

        if (!pin) {
            tempErrors.pin = 'Vui lòng nhập mã PIN';
        } else if (!/^\d{6}$/.test(pin)) {
            tempErrors.pin = 'Mã PIN phải là 6 chữ số';
        }

        if (!confirmPin) {
            tempErrors.confirmPin = 'Vui lòng xác nhận mã PIN';
        } else if (pin !== confirmPin) {
            tempErrors.confirmPin = 'Mã PIN xác nhận không khớp';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    // ==========================================
    // BƯỚC 2: THIẾT LẬP PIN
    // ==========================================

    const handleSetupPin = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);

        try {
            const response = await api.post('/api/users/setup-pin', {
                pin: pin
            });

            if (response.data.success) {
                setModalConfig({
                    show: true,
                    type: 'success',
                    title: '🎉 Đăng ký thành công!',
                    message: `Chào mừng ${full_name || 'bạn'} đến với Cinema Star!\n\nTài khoản đã được tạo và mã PIN đã được thiết lập thành công.\nVui lòng kiểm tra email ${email} để xác thực tài khoản.`
                });
            }

        } catch (err) {
            console.error('Setup PIN Error:', err);
            const serverMsg = err.response?.data?.message || 'Không thể thiết lập mã PIN. Vui lòng thử lại!';
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Thất bại',
                message: serverMsg
            });
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // HANDLE MODAL CLOSE
    // ==========================================

    const handleModalClose = () => {
        setModalConfig({ ...modalConfig, show: false });
        if (modalConfig.type === 'success') {
            navigate('/login');
        }
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="auth-container">
            <div className="auth-card">
                {/* STEP INDICATOR */}
                <div className="step-indicator">
                    <span className="step-done">✓</span>
                    <span className="step-line"></span>
                    <span className="step-active">2</span>
                </div>

                <h2>🔐 THIẾT LẬP MÃ PIN</h2>
                <p className="auth-subtitle">
                    Bước 2: Tạo mã PIN bảo mật cho giao dịch
                </p>

                {/* THÔNG TIN USER */}
                <div className="user-info-box">
                    <Shield size={18} />
                    <span>
                        <strong>{full_name || 'Bạn'}</strong> đang thiết lập mã PIN cho tài khoản
                        <strong> {email}</strong>
                    </span>
                </div>

                <div className="auth-form-wrapper">
                    <form onSubmit={handleSetupPin} noValidate>
                        {/* PIN */}
                        <div className="form-group">
                            <label>Mã PIN thanh toán</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    name="pin"
                                    className={`auth-input ${errors.pin ? 'input-error' : ''}`}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Nhập 6 chữ số"
                                    maxLength="6"
                                    autoComplete="off"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPin(!showPin)}
                                    tabIndex="-1"
                                >
                                    {showPin ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {errors.pin && <span className="error-text">{errors.pin}</span>}
                            <small className="input-hint">
                                🔐 Mã PIN dùng để xác thực giao dịch thanh toán (6 chữ số)
                            </small>
                        </div>

                        {/* CONFIRM PIN */}
                        <div className="form-group">
                            <label>Xác nhận mã PIN</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPin ? 'text' : 'password'}
                                    name="confirmPin"
                                    className={`auth-input ${errors.confirmPin ? 'input-error' : ''}`}
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Nhập lại 6 chữ số"
                                    maxLength="6"
                                    autoComplete="off"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                                    tabIndex="-1"
                                >
                                    {showConfirmPin ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {errors.confirmPin && <span className="error-text">{errors.confirmPin}</span>}
                        </div>

                        <div className="button-group">
                            <LoadingButton
                                type="submit"
                                loading={loading}
                                loadingText="Đang thiết lập PIN..."
                                disabled={loading}
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
                        onClick={() => navigate('/register')}
                    >
                        <ArrowLeft size={16} />
                        Quay lại bước 1
                    </button>
                </div>
            </div>

            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={handleModalClose}
            />
        </div>
    );
};

export default UserRegisterPin;