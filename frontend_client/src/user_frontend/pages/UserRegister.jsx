// user_frontend/pages/UserRegister.jsx
// ============================================================
// USER REGISTER — PREMIUM CINEMATIC SILVER
// Layout cân đối 50/50, đồng bộ với UserRegisterPin
// Giữ nguyên toàn bộ logic đăng ký / CAPTCHA / API
// ============================================================

import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';

import {
    Eye,
    EyeOff,
    Film,
    ArrowRight,
    UserRound,
    User,
    Mail,
    Phone,
    LockKeyhole,
    MapPin,
    ShieldCheck,
    Ticket,
    Star,
    Zap,
} from 'lucide-react';

import Modal from '../components/Modal';
import LoadingButton from '../components/LoadingButton';
import Recaptcha from '../components/Recaptcha';
import '../styles/UserRegister.css';

const UserRegister = () => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [recaptchaToken, setRecaptchaToken] = useState('');
    const recaptchaRef = useRef(null);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'error',
        title: '',
        message: '',
    });

    const navigate = useNavigate();

    // =========================================================
    // VALIDATION
    // =========================================================

    const validateField = (
        name,
        value,
        password = formData.password,
        confirmPassword = formData.confirmPassword
    ) => {
        let error = '';

        switch (name) {
            case 'username': {
                const usernameRegex = /^[a-zA-Z0-9_.]{4,20}$/;

                if (!value.trim()) {
                    error = 'Tên đăng nhập không được để trống';
                } else if (!usernameRegex.test(value)) {
                    error =
                        'Tên đăng nhập 4-20 ký tự (chữ, số, _, .)';
                }

                break;
            }

            case 'full_name':
                if (!value.trim()) {
                    error = 'Họ tên không được để trống';
                } else if (value.trim().length < 6) {
                    error = 'Họ tên phải từ 6 ký tự trở lên';
                }
                break;

            case 'email': {
                const emailRegex =
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (!value.trim()) {
                    error = 'Email không được để trống';
                } else if (!emailRegex.test(value)) {
                    error = 'Email không hợp lệ';
                }

                break;
            }

            case 'phone': {
                const phoneRegex = /^[0-9]{10}$/;

                if (!value.trim()) {
                    error =
                        'Số điện thoại không được để trống';
                } else if (!phoneRegex.test(value)) {
                    error =
                        'Số điện thoại phải đúng 10 chữ số';
                }

                break;
            }

            case 'password': {
                const passwordRegex =
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

                if (!value.trim()) {
                    error = 'Mật khẩu không được để trống';
                } else if (!passwordRegex.test(value)) {
                    error =
                        'Mật khẩu cần 8+ ký tự, gồm chữ hoa, thường, số & ký tự đặc biệt';
                }

                break;
            }

            case 'confirmPassword':
                if (!value.trim()) {
                    error = 'Vui lòng nhập lại mật khẩu';
                } else if (value !== password) {
                    error = 'Mật khẩu xác nhận không khớp';
                }
                break;

            default:
                break;
        }

        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        const newPassword =
            name === 'password' ? value : formData.password;

        const newConfirmPassword =
            name === 'confirmPassword'
                ? value
                : formData.confirmPassword;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        const error = validateField(
            name,
            value,
            newPassword,
            newConfirmPassword
        );

        setErrors((prev) => ({
            ...prev,
            [name]: error,
        }));

        if (name === 'password' || name === 'confirmPassword') {
            const confirmError = validateField(
                'confirmPassword',
                newConfirmPassword,
                newPassword,
                newConfirmPassword
            );

            setErrors((prev) => ({
                ...prev,
                confirmPassword: confirmError,
            }));
        }
    };

    const validate = () => {
        const tempErrors = {};

        const fields = [
            'username',
            'full_name',
            'email',
            'phone',
            'password',
            'confirmPassword',
        ];

        fields.forEach((field) => {
            const error = validateField(
                field,
                formData[field]
            );

            if (error) {
                tempErrors[field] = error;
            }
        });

        setErrors(tempErrors);

        return Object.keys(tempErrors).length === 0;
    };

    // =========================================================
    // REGISTER
    // =========================================================

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!recaptchaToken) {
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Chưa xác thực CAPTCHA',
                message:
                    'Vui lòng tick vào ô "Tôi không phải là robot" để tiếp tục.',
            });

            return;
        }

        if (!validate()) return;

        setLoading(true);

        try {
            const response = await api.post(
                '/api/auth/register-step1',
                {
                    username: formData.username,
                    full_name: formData.full_name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    address: formData.address || '',
                    recaptchaToken,
                }
            );

            if (response.data.success) {
                const { temp_token, email, full_name } =
                    response.data.data;

                sessionStorage.setItem(
                    'register_temp',
                    JSON.stringify({
                        temp_token,
                        username: formData.username,
                        full_name:
                            full_name || formData.full_name,
                        email,
                        phone: formData.phone,
                        password: formData.password,
                        address: formData.address || '',
                    })
                );

                navigate('/register-pin');
            }
        } catch (err) {
            console.error('Register Error:', err);

            const serverMsg = err.response?.data?.message;
            const field = err.response?.data?.field;

            if (field === 'recaptcha') {
                recaptchaRef.current?.reset();
                setRecaptchaToken('');
            }

            if (field) {
                setErrors((prev) => ({
                    ...prev,
                    [field]: serverMsg,
                }));
            } else {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'Thất bại',
                    message:
                        serverMsg ||
                        'Đã có lỗi xảy ra, vui lòng thử lại!',
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setModalConfig({
            ...modalConfig,
            show: false,
        });
    };

    // =========================================================
    // FIELD COMPONENT HELPER
    // =========================================================

    const renderInput = ({
        id,
        name,
        label,
        icon: Icon,
        type = 'text',
        placeholder,
        autoComplete,
        error,
        value,
        toggle,
        onToggle,
        toggleState,
    }) => (
        <div className="register-field">
            <label htmlFor={id} className="register-field__label">
                <span>{label}</span>
            </label>

            <div className="register-field__wrap">
                <Icon
                    className="register-field__icon"
                    size={16}
                    strokeWidth={2}
                />

                <input
                    id={id}
                    type={type}
                    name={name}
                    placeholder={placeholder}
                    className={`register-field__input ${
                        error ? 'input-error' : ''
                    } ${toggle ? 'has-toggle' : ''}`}
                    value={value}
                    onChange={handleChange}
                    autoComplete={autoComplete}
                    disabled={loading}
                />

                {toggle && (
                    <button
                        type="button"
                        className="register-field__toggle"
                        onClick={onToggle}
                        tabIndex="-1"
                        disabled={loading}
                        aria-label="Hiện hoặc ẩn mật khẩu"
                    >
                        {toggleState ? (
                            <EyeOff size={16} />
                        ) : (
                            <Eye size={16} />
                        )}
                    </button>
                )}
            </div>

            {error && (
                <span className="register-field__error">
                    {error}
                </span>
            )}
        </div>
    );

    return (
        <div className="register-page">
            {/* ============================================
                BRAND LOGO
            ============================================ */}
            <div className="register-page__logo">
                <Film size={20} strokeWidth={2.4} />
                <span>Cinema Star</span>
            </div>

            {/* ============================================
                MAIN
            ============================================ */}
            <div className="register-shell">
                <div className="register-grid">
                    {/* ============================================
                        LEFT CONTENT
                    ============================================ */}
                    <section className="register-content">
                        <div className="register-content__badge">
                            <ShieldCheck
                                size={14}
                                strokeWidth={2.2}
                            />
                            <span>BƯỚC 1 / 2</span>
                        </div>

                        <div className="register-content__eyebrow">
                            MEMBER ACCESS
                        </div>

                        <h1 className="register-content__title">
                            TẠO TÀI KHOẢN
                        
                        </h1>

                        <p className="register-content__desc">
                            Chỉ mất 30 giây để bắt đầu. Nhận ngay
                            voucher chào mừng và trải nghiệm đặt
                            vé đỉnh cao.
                        </p>

                        <ul className="register-content__list">
                            <li>
                                <span className="register-content__icon">
                                    <Ticket
                                        size={16}
                                        strokeWidth={2}
                                    />
                                </span>
                                <span>
                                    Voucher chào mừng lên đến
                                    100K
                                </span>
                            </li>

                            <li>
                                <span className="register-content__icon">
                                    <Star
                                        size={16}
                                        strokeWidth={2}
                                    />
                                </span>
                                <span>
                                    Tích điểm đổi quà không giới
                                    hạn
                                </span>
                            </li>

                            <li>
                                <span className="register-content__icon">
                                    <Zap
                                        size={16}
                                        strokeWidth={2}
                                    />
                                </span>
                                <span>
                                    Ưu tiên đặt vé sớm cho thành
                                    viên
                                </span>
                            </li>
                        </ul>

                        {/* STEP INDICATOR */}
                        <div className="register-steps">
                            <div className="register-steps__item register-steps__item--active">
                                <div className="register-steps__num">
                                    1
                                </div>

                                <div className="register-steps__info">
                                    <div className="register-steps__label">
                                        Thông tin cơ bản
                                    </div>

                                    <div className="register-steps__hint">
                                        Đang thực hiện
                                    </div>
                                </div>
                            </div>

                            <div className="register-steps__line" />

                            <div className="register-steps__item">
                                <div className="register-steps__num">
                                    2
                                </div>

                                <div className="register-steps__info">
                                    <div className="register-steps__label">
                                        Tạo mã PIN
                                    </div>

                                    <div className="register-steps__hint">
                                        Tiếp theo
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="register-content__footer">
                            © 2026 Cinema Star — All rights
                            reserved.
                        </div>
                    </section>

                    {/* ============================================
                        RIGHT FORM
                    ============================================ */}
                    <section className="register-form-area">
                        <div className="register-form-card">
                            <div className="register-form-card__header">
                                <div className="register-form-card__eyebrow">
                                    CREATE ACCOUNT
                                </div>

                                <h2 className="register-form-card__title">
                                    ĐĂNG KÝ
                                </h2>

                                <p className="register-form-card__subtitle">
                                    Điền thông tin để tiếp tục
                                </p>
                            </div>

                            <form
                                className="register-form"
                                onSubmit={handleRegister}
                                noValidate
                            >
                                {/* USERNAME + FULL NAME */}
                                <div className="register-form__row">
                                    {renderInput({
                                        id: 'reg-username',
                                        name: 'username',
                                        label: 'Tên đăng nhập',
                                        icon: UserRound,
                                        placeholder:
                                            'dungnguyen_123',
                                        autoComplete: 'username',
                                        error: errors.username,
                                        value: formData.username,
                                    })}

                                    {renderInput({
                                        id: 'reg-fullname',
                                        name: 'full_name',
                                        label: 'Họ và tên',
                                        icon: User,
                                        placeholder: 'Nguyễn Văn A',
                                        autoComplete: 'name',
                                        error: errors.full_name,
                                        value: formData.full_name,
                                    })}
                                </div>

                                {/* EMAIL + PHONE */}
                                <div className="register-form__row">
                                    {renderInput({
                                        id: 'reg-email',
                                        name: 'email',
                                        label: 'Email',
                                        icon: Mail,
                                        type: 'email',
                                        placeholder:
                                            'example@gmail.com',
                                        autoComplete: 'email',
                                        error: errors.email,
                                        value: formData.email,
                                    })}

                                    {renderInput({
                                        id: 'reg-phone',
                                        name: 'phone',
                                        label: 'Số điện thoại',
                                        icon: Phone,
                                        type: 'tel',
                                        placeholder: '0123456789',
                                        autoComplete: 'tel',
                                        error: errors.phone,
                                        value: formData.phone,
                                    })}
                                </div>

                                {/* PASSWORD + CONFIRM */}
                                <div className="register-form__row">
                                    {renderInput({
                                        id: 'reg-password',
                                        name: 'password',
                                        label: 'Mật khẩu',
                                        icon: LockKeyhole,
                                        type: showPassword
                                            ? 'text'
                                            : 'password',
                                        placeholder: '••••••••',
                                        autoComplete:
                                            'new-password',
                                        error: errors.password,
                                        value: formData.password,
                                        toggle: true,
                                        toggleState: showPassword,
                                        onToggle: () =>
                                            setShowPassword(
                                                (prev) => !prev
                                            ),
                                    })}

                                    {renderInput({
                                        id: 'reg-confirm',
                                        name: 'confirmPassword',
                                        label:
                                            'Xác nhận mật khẩu',
                                        icon: LockKeyhole,
                                        type: showConfirmPassword
                                            ? 'text'
                                            : 'password',
                                        placeholder: '••••••••',
                                        autoComplete:
                                            'new-password',
                                        error: errors.confirmPassword,
                                        value: formData.confirmPassword,
                                        toggle: true,
                                        toggleState:
                                            showConfirmPassword,
                                        onToggle: () =>
                                            setShowConfirmPassword(
                                                (prev) => !prev
                                            ),
                                    })}
                                </div>

                                {/* ADDRESS */}
                                <div className="register-field register-field--full">
                                    <label
                                        htmlFor="reg-address"
                                        className="register-field__label"
                                    >
                                        <span>Địa chỉ</span>

                                        <small>
                                            Không bắt buộc
                                        </small>
                                    </label>

                                    <div className="register-field__wrap">
                                        <MapPin
                                            className="register-field__icon"
                                            size={16}
                                            strokeWidth={2}
                                        />

                                        <input
                                            id="reg-address"
                                            type="text"
                                            name="address"
                                            placeholder="123 Nguyễn Văn Trỗi, Q. Phú Nhuận, TP.HCM"
                                            className="register-field__input"
                                            value={formData.address}
                                            onChange={handleChange}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* CAPTCHA */}
                                <div className="register-recaptcha">
                                    <div className="register-recaptcha__head">
                                        <ShieldCheck
                                            size={15}
                                            strokeWidth={2}
                                        />
                                        <span>
                                            Xác minh bảo mật
                                        </span>
                                    </div>

                                    <Recaptcha
                                        ref={recaptchaRef}
                                        onChange={(token) =>
                                            setRecaptchaToken(
                                                token
                                            )
                                        }
                                        onExpired={() =>
                                            setRecaptchaToken('')
                                        }
                                    />
                                </div>

                                {errors.recaptcha && (
                                    <span className="register-field__error register-field__error--captcha">
                                        {errors.recaptcha}
                                    </span>
                                )}

                                {/* SUBMIT */}
                                <LoadingButton
                                    type="submit"
                                    loading={loading}
                                    loadingText="ĐANG TẠO TÀI KHOẢN..."
                                    disabled={loading}
                                    className="register-submit"
                                    spinnerColor="#0a0a0b"
                                >
                                    <span>TIẾP TỤC</span>
                                    <ArrowRight
                                        size={17}
                                        strokeWidth={2.4}
                                    />
                                </LoadingButton>
                            </form>

                            {/* FOOTER */}
                            <div className="register-footer">
                                <span>Đã có tài khoản?</span>

                                <Link
                                    to="/login"
                                    className="register-footer__link"
                                >
                                    ĐĂNG NHẬP
                                    <ArrowRight
                                        size={14}
                                        strokeWidth={2.4}
                                    />
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* ============================================
                MODAL
            ============================================ */}
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

export default UserRegister;