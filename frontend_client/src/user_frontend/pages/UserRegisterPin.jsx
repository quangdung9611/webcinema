import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Shield, ArrowLeft } from 'lucide-react';

import Modal from '../components/Modal';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const UserRegisterPin = () => {
    const navigate = useNavigate();

    // Lấy dữ liệu đã lưu từ Bước 1 (Bao gồm temp_token)
    const tempData = JSON.parse(sessionStorage.getItem('register_temp') || '{}');
    const { temp_token, username, full_name, email, phone, password, address } = tempData;

    // State cho 6 ô nhập
    const [pinValues, setPinValues] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'success',
        title: '',
        message: ''
    });

    // Kiểm tra nếu không có temp_token hoặc thông tin cơ bản → quay lại bước 1
    useEffect(() => {
        if (!temp_token || !username || !email) {
            navigate('/register');
        } else {
            inputRefs.current[0]?.focus();
        }
    }, [temp_token, username, email, navigate]);

    // ==========================================
    // HANDLE INPUT (Xử lý nhập số vào từng ô)
    // ==========================================

    const handleChange = (index, value) => {
        // Chỉ cho phép nhập số
        const cleanValue = value.replace(/\D/g, '');

        // Lấy ký tự cuối cùng (nếu user dán 1 lúc nhiều số)
        const char = cleanValue.slice(-1);

        const newPinValues = [...pinValues];
        newPinValues[index] = char;
        setPinValues(newPinValues);
        setErrors({});

        // Tự động nhảy sang ô tiếp theo nếu có nhập số
        if (char && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Nếu nhấn Backspace và ô hiện tại trống, nhảy về ô trước
        if (e.key === 'Backspace' && !pinValues[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // ==========================================
    // VALIDATE
    // ==========================================

    const validate = () => {
        const pin = pinValues.join('');

        if (pin.length !== 6) {
            setErrors({ pin: 'Vui lòng nhập đủ 6 chữ số' });
            return false;
        }

        return true;
    };

    // ==========================================
    // BƯỚC 2: HOÀN TẤT ĐĂNG KÝ
    // ==========================================

    const handleSetupPin = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const pin = pinValues.join('');
        setLoading(true);

        try {
            // GỌI API COMPLETE REGISTRATION (Tạo user + lưu PIN + gửi email)
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

                setModalConfig({
                    show: true,
                    type: 'success',
                    title: '🎉 Đăng ký thành công!',
                    message: `Chào mừng ${full_name || 'bạn'}! Vui lòng kiểm tra email ${email} để xác thực tài khoản.`
                });
            }

        } catch (err) {
            console.error('Setup PIN Error:', err);
            const serverMsg = err.response?.data?.message || err.message || 'Không thể hoàn tất đăng ký. Vui lòng thử lại!';
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
            // Chuyển sang trang thông báo xác thực email
            navigate('/verify-email-sent');
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