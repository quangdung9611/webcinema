import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';

import api from '../../api/api';

import ForgotPassword from '../components/ForgotPassword';
import LoadingButton from '../components/LoadingButton';

import '../styles/UserAuth.css';


const UserLogin = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const [errors, setErrors] = useState({});

    const [loading, setLoading] = useState(false);

    const [serverError, setServerError] = useState('');

    const [showPassword, setShowPassword] = useState(false);

    const [showForgotModal, setShowForgotModal] = useState(false);


    const navigate = useNavigate();

    const location = useLocation();


    /* =====================================================
        VALIDATE
    ===================================================== */

    const validate = () => {

        const tempErrors = {};

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        /* EMAIL */

        if (!formData.email.trim()) {

            tempErrors.email =
                'Vui lòng nhập email';

        }

        else if (!emailRegex.test(formData.email)) {

            tempErrors.email =
                'Email không hợp lệ';

        }


        /* PASSWORD */

        if (!formData.password.trim()) {

            tempErrors.password =
                'Vui lòng nhập mật khẩu';

        }

        else if (formData.password.length < 6) {

            tempErrors.password =
                'Mật khẩu phải có ít nhất 6 ký tự';

        }


        setErrors(tempErrors);

        return Object.keys(tempErrors).length === 0;
    };


    /* =====================================================
        HANDLE INPUT
    ===================================================== */

    const handleChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;


        setFormData(prev => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? checked
                    : value
        }));


        /* Clear field error */

        if (errors[name]) {

            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));

        }


        /* Clear server error */

        if (serverError) {

            setServerError('');

        }

    };


    /* =====================================================
        LOGIN
    ===================================================== */

    const handleLogin = async (e) => {

        e.preventDefault();


        /* Validate */

        if (!validate()) {

            return;

        }


        setLoading(true);

        setServerError('');


        try {

            /* =================================================
                LOGIN USER
            ================================================= */

            const response = await api.post(
                '/api/auth/login',
                {
                    email: formData.email.trim(),
                    password: formData.password

                    // Nếu backend hỗ trợ rememberMe:
                    // rememberMe: formData.rememberMe
                }
            );


            /* =================================================
                CHECK EMAIL VERIFIED
            ================================================= */

            if (
                response.data?.user &&
                !response.data.user.email_verified
            ) {

                setServerError(
                    'Vui lòng xác thực email trước khi đăng nhập. ' +
                    'Kiểm tra hộp thư của bạn.'
                );

                return;

            }


            /* =================================================
                LOGIN SUCCESS
                Backend đã set cookie.
                Không cần AuthContext nữa.
            ================================================= */

            const from =
                location.state?.from?.pathname || '/';


            navigate(
                from,
                {
                    replace: true
                }
            );


        }

        catch (err) {

            console.error(
                'Login Error:',
                err
            );


            const errorMessage =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Tài khoản hoặc mật khẩu không chính xác';


            /* =================================================
                FIELD ERROR
            ================================================= */

            if (
                err.response?.data?.field === 'email'
            ) {

                setErrors(prev => ({
                    ...prev,
                    email: errorMessage
                }));

            }

            else if (
                err.response?.data?.field === 'password'
            ) {

                setErrors(prev => ({
                    ...prev,
                    password: errorMessage
                }));

            }

            else {

                setServerError(
                    errorMessage
                );

            }

        }

        finally {

            setLoading(false);

        }

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


                {/* =================================================
                    SERVER ERROR
                ================================================= */}

                {serverError && (

                    <div className="error-message">

                        <AlertCircle size={18} />

                        <span>
                            {serverError}
                        </span>

                    </div>

                )}


                {/* =================================================
                    FORM
                ================================================= */}

                <form
                    onSubmit={handleLogin}
                    noValidate
                >

                    {/* =================================================
                        EMAIL
                    ================================================= */}

                    <div className="form-group">

                        <label>
                            Email address
                        </label>


                        <input
                            type="email"
                            name="email"
                            placeholder="example@gmail.com"
                            className={
                                `auth-input ${
                                    errors.email
                                        ? 'input-error'
                                        : ''
                                }`
                            }
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


                    {/* =================================================
                        PASSWORD
                    ================================================= */}

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
                                className={
                                    `auth-input ${
                                        errors.password
                                            ? 'input-error'
                                            : ''
                                    }`
                                }
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
                                        prev => !prev
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


                    {/* =================================================
                        OPTIONS
                    ================================================= */}

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


                    {/* =================================================
                        SUBMIT
                    ================================================= */}

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


                {/* =================================================
                    FOOTER
                ================================================= */}

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


            {/* =================================================
                FORGOT PASSWORD MODAL
            ================================================= */}

            {showForgotModal && (

                <ForgotPassword
                    onClose={() =>
                        setShowForgotModal(false)
                    }
                />

            )}

        </div>

    );

};


export default UserLogin;