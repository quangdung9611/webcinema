import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Shield, ArrowLeft } from 'lucide-react';

// 🆕 Import EmailVerificationSentModal
import EmailVerificationSentModal from '../components/EmailVerificationSentModal';
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

    // 🆕 State cho modal thông báo
    const [showEmailModal, setShowEmailModal] = useState(false);

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

                // 🆕 Hiển thị modal thông báo (KHÔNG navigate)
                setShowEmailModal(true);
            }

        } catch (err) {
            console.error('Setup PIN Error:', err);
            const serverMsg = err.response?.data?.message || err.message || 'Không thể hoàn tất đăng ký. Vui lòng thử lại!';

            // Dùng window.alert tạm thời cho lỗi
            window.alert(serverMsg);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // HANDLE MODAL CLOSE (KHÔNG CHUYỂN TRANG)
    // ==========================================
    const handleEmailModalClose = () => {
        setShowEmailModal(false);
        // KHÔNG navigate('/login') tại đây
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

            {/* 🆕 Hiện thông báo - KHÔNG tự chuyển trang */}
            <EmailVerificationSentModal
                show={showEmailModal}
                onConfirm={handleEmailModalClose}
                onClose={handleEmailModalClose}
                email={email}
                full_name={full_name}
                confirmText="Đã hiểu"
            />
        </div>
    );
};

export default UserRegisterPin;