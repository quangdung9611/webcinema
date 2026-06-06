import React, { useState } from 'react';
import axios from 'axios';
import {
    useNavigate,
    Link,
    useLocation
} from 'react-router-dom';

import {
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import ForgotPassword
    from '../components/ForgotPassword';

import '../styles/UserAuth.css';

const UserLogin = () => {

    const [formData, setFormData] = useState({

        email: '',
        password: ''

    });

    const [errors, setErrors] = useState({});

    const [loading, setLoading] =
        useState(false);

    const [serverError, setServerError] =
        useState('');

    const [showPassword, setShowPassword] =
        useState(false);

    const [
        showForgotModal,
        setShowForgotModal
    ] = useState(false);

    const navigate = useNavigate();

    const location = useLocation();

    const { checkAuth } = useAuth();

    // ==========================================
    // VALIDATE
    // ==========================================

    const validate = () => {

        let tempErrors = {};

        if (!formData.email.trim()) {

            tempErrors.email =
                'Bạn vui lòng nhập email';

        }

        if (!formData.password.trim()) {

            tempErrors.password =
                'Bạn vui lòng nhập mật khẩu';

        }

        setErrors(tempErrors);

        return (
            Object.keys(tempErrors)
                .length === 0
        );

    };

    // ==========================================
    // HANDLE INPUT
    // ==========================================

    const handleChange = (e) => {

        setFormData({

            ...formData,

            [e.target.name]:
                e.target.value

        });

        if (errors[e.target.name]) {

            setErrors({

                ...errors,

                [e.target.name]: ''

            });

        }

        if (serverError) {

            setServerError('');

        }

    };

    // ==========================================
    // LOGIN
    // ==========================================

    const handleLogin = async (e) => {

        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        try {

            await axios.post(

                'https://api.quangdungcinema.id.vn/api/auth/login',

                {

                    ...formData,

                    role_input:
                        'customer'

                },

                {

                    withCredentials:
                        true

                }

            );

            await checkAuth();

            window.dispatchEvent(
                new Event('authChange')
            );

            const from =
                location.state?.from ||
                '/';

            navigate(

                from,

                {

                    replace: true

                }

            );

        } catch (err) {

            console.error(
                'Login Error:',
                err
            );

            setServerError(

                err.response?.data
                    ?.message ||

                'Tài khoản hoặc mật khẩu không chính xác'

            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="auth-container">

            <div className="auth-card">

                <h2>

                    ĐĂNG NHẬP

                </h2>

                <p className="auth-subtitle">

                    Chào mừng bạn quay trở lại Cinema Star

                </p>

                {serverError && (

                    <div className="error-message">

                        <AlertCircle
                            size={18}
                        />

                        <span>

                            {serverError}

                        </span>

                    </div>

                )}

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

                            type="email"

                            name="email"

                            placeholder="example@gmail.com"

                            className={`auth-input ${
                                errors.email
                                    ? 'input-error'
                                    : ''
                            }`}

                            value={
                                formData.email
                            }

                            onChange={
                                handleChange
                            }

                            autoComplete="email"

                        />

                        {errors.email && (

                            <span className="error-text">

                                {
                                    errors.email
                                }

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

                                value={
                                    formData.password
                                }

                                onChange={
                                    handleChange
                                }

                                autoComplete="current-password"

                            />

                            <button

                                type="button"

                                className="toggle-password"

                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }

                            >

                                {showPassword ? (

                                    <Eye
                                        size={18}
                                    />

                                ) : (

                                    <EyeOff
                                        size={18}
                                    />

                                )}

                            </button>

                        </div>

                        {errors.password && (

                            <span className="error-text">

                                {
                                    errors.password
                                }

                            </span>

                        )}

                    </div>

                    {/* OPTIONS */}

                    <div className="form-options">

                        <label className="remember-me">

                            <input
                                type="checkbox"
                            />

                            Remember me

                        </label>

                        <button

                            type="button"

                            className="forgot-link"

                            onClick={() =>
                                setShowForgotModal(
                                    true
                                )
                            }

                        >

                            Forgot password?

                        </button>

                    </div>

                    {/* SUBMIT */}

                    <button

                        type="submit"

                        className="btn-user"

                        disabled={loading}

                    >

                        {loading

                            ? 'ĐANG XỬ LÝ...'

                            : 'SIGN IN'

                        }

                    </button>

                </form>

                {/* FOOTER */}

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

            {/* FORGOT PASSWORD MODAL */}

            {

                showForgotModal && (

                    <ForgotPassword

                        onClose={() =>
                            setShowForgotModal(
                                false
                            )
                        }

                    />

                )

            }

        </div>

    );

};

export default UserLogin;