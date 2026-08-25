import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import {
    AlertCircle,
    Eye,
    EyeOff,
    CheckCircle,
} from 'lucide-react';

import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { notifyLogin } from '../../utils/authCleanup';

import ForgotPassword from '../components/ForgotPassword';
import LoadingButton from '../components/LoadingButton';
import SuccessModal from '../components/SuccessModal';

import '../styles/UserAuth.css';


const UserLogin = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    const [errors, setErrors] = useState({});

    const [loading, setLoading] = useState(false);

    const [serverError, setServerError] = useState('');

    const [showPassword, setShowPassword] = useState(false);

    const [showForgotModal, setShowForgotModal] = useState(false);

    const [successMessage, setSuccessMessage] = useState('');

    const [showLoginSuccessModal, setShowLoginSuccessModal] =
        useState(false);

    const [loginSuccessMessage, setLoginSuccessMessage] =
        useState('');

    const [loggedInUser, setLoggedInUser] =
        useState(null);


    /* =====================================================
        HOOKS
    ===================================================== */

    const navigate = useNavigate();

    const location = useLocation();

    const {
        user,
        isLoading,
    } = useAuth();


    /* =====================================================
        KIỂM TRA STATE TỪ VERIFY EMAIL
    ===================================================== */

    useEffect(() => {

        if (!location.state?.verified) {
            return;
        }

        setSuccessMessage(
            location.state.message ||
            'Email đã được xác thực thành công! Vui lòng đăng nhập.'
        );

        window.history.replaceState(
            {},
            document.title
        );

        const timer = setTimeout(() => {

            setSuccessMessage('');

        }, 5000);


        return () => {

            clearTimeout(timer);

        };

    }, [location.state]);


    /* =====================================================
        NẾU ĐÃ LOGIN THÌ REDIRECT VỀ TRANG CHỦ
    ===================================================== */

    useEffect(() => {

        if (
            user &&
            !isLoading &&
            !showLoginSuccessModal
        ) {

            navigate('/', {
                replace: true,
            });

        }

    }, [
        user,
        isLoading,
        showLoginSuccessModal,
        navigate,
    ]);


    /* =====================================================
        VALIDATE
    ===================================================== */

    const validate = () => {

        const tempErrors = {};

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!formData.email.trim()) {

            tempErrors.email =
                'Vui lòng nhập email';

        } else if (
            !emailRegex.test(
                formData.email.trim()
            )
        ) {

            tempErrors.email =
                'Email không hợp lệ';

        }


        if (!formData.password.trim()) {

            tempErrors.password =
                'Vui lòng nhập mật khẩu';

        } else if (
            formData.password.length < 6
        ) {

            tempErrors.password =
                'Mật khẩu phải có ít nhất 6 ký tự';

        }


        setErrors(tempErrors);


        return (
            Object.keys(tempErrors).length === 0
        );

    };


    /* =====================================================
        HANDLE INPUT
    ===================================================== */

    const handleChange = (event) => {

        const {
            name,
            value,
            type,
            checked,
        } = event.target;


        setFormData((prev) => ({

            ...prev,

            [name]:
                type === 'checkbox'
                    ? checked
                    : value,

        }));


        if (errors[name]) {

            setErrors((prev) => ({

                ...prev,

                [name]: '',

            }));

        }


        if (serverError) {

            setServerError('');

        }


        if (successMessage) {

            setSuccessMessage('');

        }

    };


    /* =====================================================
        LOGIN
    ===================================================== */

    const handleLogin = async (event) => {

        event.preventDefault();


        if (!validate()) {
            return;
        }


        setLoading(true);

        setServerError('');

        setSuccessMessage('');

        setErrors({});


        try {

            const response = await api.post(
                '/api/auth/login',
                {
                    email:
                        formData.email.trim(),

                    password:
                        formData.password,

                    rememberMe:
                        formData.rememberMe,
                }
            );


            const responseUser =
                response?.data?.user ||
                response?.data?.data?.user ||
                null;


            /* =============================================
                EMAIL CHƯA XÁC THỰC
            ============================================= */

            if (
                responseUser &&
                !responseUser.email_verified
            ) {

                setServerError(
                    'Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.'
                );

                return;

            }


            /* =============================================
                LOGIN THÀNH CÔNG

                Reset cache trước để /me lấy dữ liệu mới.
            ============================================= */

            api.resetUserCache();

            /* =============================================
                🔥 PHÁT EVENT USER LOGGED IN NGAY
                Để AuthContext tự fetch user & connect socket
            ============================================= */

            notifyLogin(responseUser);


            /* =============================================
                LƯU USER TẠM ĐỂ HIỂN THỊ MODAL
            ============================================= */

            setLoggedInUser(responseUser);


            setLoginSuccessMessage(
                `Chào mừng ${
                    responseUser?.full_name ||
                    responseUser?.username ||
                    'bạn'
                } quay trở lại!`
            );


            setShowLoginSuccessModal(true);


        } catch (error) {

            console.error(
                '🔴 [LOGIN] Login error:',
                error
            );


            const errorData =
                error?.response?.data ||
                {};


            const errorCode =
                errorData?.code;


            const errorMessage =
                errorData?.message ||
                'Tài khoản hoặc mật khẩu không chính xác';


            /* =============================================
                401 KHI ĐANG LOGIN

                Không forceLogout ở đây.

                Vì api interceptor có thể phát
                sessionExpired, SessionGuard sẽ xử lý.

                Nhưng request /login bị sai mật khẩu
                cũng có thể trả 401 nên chỉ hiển thị
                lỗi login bình thường.
            ============================================= */

            if (
                errorData?.field === 'email'
            ) {

                setErrors((prev) => ({

                    ...prev,

                    email:
                        errorMessage,

                }));

                return;

            }


            if (
                errorData?.field === 'password'
            ) {

                setErrors((prev) => ({

                    ...prev,

                    password:
                        errorMessage,

                }));

                return;

            }


            /* =============================================
                EMAIL CHƯA XÁC THỰC
            ============================================= */

            if (
                errorCode ===
                'EMAIL_NOT_VERIFIED'
            ) {

                setServerError(
                    errorMessage ||
                    'Vui lòng xác thực email trước khi đăng nhập.'
                );

                return;

            }


            /* =============================================
                LOGIN ERROR
            ============================================= */

            setServerError(
                errorMessage
            );


        } finally {

            setLoading(false);

        }

    };


    /* =====================================================
        LOGIN SUCCESS CONFIRM
    ===================================================== */

    const handleLoginSuccessConfirm = () => {

        setShowLoginSuccessModal(false);

        setLoggedInUser(null);


        navigate('/', {
            replace: true,
        });

    };


    /* =====================================================
        RENDER
    ===================================================== */

    return (

        <div className="auth-container">

            <div className="auth-card">

                <h2>
                    ĐĂNG NHẬP
                </h2>


                <p className="auth-subtitle">

                    Chào mừng bạn quay trở lại Cinema Star

                </p>


                {/* ============================================
                    EMAIL VERIFIED SUCCESS
                ============================================ */}

                {successMessage && (

                    <div
                        className="success-message"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            backgroundColor: '#22c55e20',
                            border: '1px solid #22c55e',
                            borderRadius: '8px',
                            color: '#22c55e',
                            marginBottom: '16px',
                        }}
                    >

                        <CheckCircle size={20} />

                        <span>
                            {successMessage}
                        </span>

                    </div>

                )}


                {/* ============================================
                    SERVER ERROR
                ============================================ */}

                {serverError && (

                    <div className="error-message">

                        <AlertCircle size={18} />

                        <span>
                            {serverError}
                        </span>

                    </div>

                )}


                {/* ============================================
                    LOGIN FORM
                ============================================ */}

                <form
                    onSubmit={handleLogin}
                    noValidate
                >

                    {/* EMAIL */}

                    <div className="form-group">

                        <label>
                            Email address
                        </label>


                        <input
                            id="login-email"
                            type="email"
                            name="email"
                            placeholder="example@gmail.com"
                            className={`auth-input ${
                                errors.email
                                    ? 'input-error'
                                    : ''
                            }`}
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="email"
                            disabled={loading}
                        />


                        {errors.email && (

                            <span className="error-text">

                                {errors.email}

                            </span>

                        )}

                    </div>


                    {/* PASSWORD */}

                    <div className="form-group">

                        <label>
                            Password
                        </label>


                        <div className="password-wrapper">

                            <input
                                type={
                                    showPassword
                                        ? 'text'
                                        : 'password'
                                }
                                name="password"
                                placeholder="••••••••"
                                className={`auth-input ${
                                    errors.password
                                        ? 'input-error'
                                        : ''
                                }`}
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="current-password"
                                disabled={loading}
                            />


                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() =>
                                    setShowPassword(
                                        (prev) =>
                                            !prev
                                    )
                                }
                                tabIndex="-1"
                                disabled={loading}
                            >

                                {showPassword
                                    ? <Eye size={18} />
                                    : <EyeOff size={18} />
                                }

                            </button>

                        </div>


                        {errors.password && (

                            <span className="error-text">

                                {errors.password}

                            </span>

                        )}

                    </div>


                    {/* OPTIONS */}

                    <div className="form-options">

                        <label className="remember-me">

                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={
                                    formData.rememberMe
                                }
                                onChange={handleChange}
                                disabled={loading}
                            />

                            Remember me

                        </label>


                        <button
                            type="button"
                            className="forgot-link"
                            onClick={() =>
                                setShowForgotModal(true)
                            }
                            disabled={loading}
                        >

                            Forgot password?

                        </button>

                    </div>


                    {/* SUBMIT */}

                    <LoadingButton
                        type="submit"
                        loading={loading}
                        loadingText="Đang đăng nhập..."
                        disabled={loading}
                        className="btn-user"
                        spinnerColor="#000000"
                    >

                        SIGN IN

                    </LoadingButton>

                </form>


                {/* ============================================
                    REGISTER
                ============================================ */}

                <div className="auth-footer">

                    <span>
                        Chưa có tài khoản?
                    </span>


                    <Link
                        to="/register"
                        className="btn-link"
                    >

                        Đăng ký ngay

                    </Link>

                </div>

            </div>


            {/* ================================================
                FORGOT PASSWORD
            ================================================ */}

            {showForgotModal && (

                <ForgotPassword
                    onClose={() =>
                        setShowForgotModal(false)
                    }
                />

            )}


            {/* ================================================
                LOGIN SUCCESS MODAL
            ================================================ */}

            <SuccessModal
                isOpen={
                    showLoginSuccessModal
                }
                onConfirm={
                    handleLoginSuccessConfirm
                }
                onClose={
                    handleLoginSuccessConfirm
                }
                title="🎉 Đăng nhập thành công!"
                message={
                    loginSuccessMessage
                }
                confirmText="Vào trang chủ"
                autoClose={true}
                autoCloseDelay={3000}
            />

        </div>

    );

};


export default UserLogin;