import React, { useState } from 'react';
import axios from 'axios';
import Modal from './Modal';

import '../styles/ForgotPassword.css';

const ForgotPassword = ({ onClose }) => {

    const [step, setStep] = useState(1);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);

    const [message, setMessage] = useState('');

    /* =====================================
        SEND OTP
    ===================================== */

    const handleSendOTP = async () => {

        if (!email.trim()) {

            return setMessage(
                'Vui lòng nhập email'
            );

        }

        try {

            setLoading(true);
            setMessage('');

            await axios.post(
                'https://api.quangdungcinema.id.vn/api/users/send-reset-otp',
                { email }
            );

            setStep(2);

            setMessage(
                'OTP đã được gửi tới email của bạn'
            );

        } catch (err) {

            setMessage(
                err.response?.data?.message ||
                'Không gửi được OTP'
            );

        } finally {

            setLoading(false);

        }

    };

    /* =====================================
        VERIFY OTP
    ===================================== */

    const handleVerifyOTP = async () => {

        if (!otp.trim()) {

            return setMessage(
                'Vui lòng nhập OTP'
            );

        }

        try {

            setLoading(true);
            setMessage('');

            await axios.post(
                'https://api.quangdungcinema.id.vn/api/users/verify-reset-otp',
                {
                    email,
                    otp
                }
            );

            setStep(3);

            setMessage(
                'Xác thực OTP thành công'
            );

        } catch (err) {

            setMessage(
                err.response?.data?.message ||
                'OTP không hợp lệ'
            );

        } finally {

            setLoading(false);

        }

    };

    /* =====================================
        RESET PASSWORD
    ===================================== */

    const handleResetPassword = async () => {

        if (!password.trim()) {

            return setMessage(
                'Vui lòng nhập mật khẩu mới'
            );

        }

        if (password.length < 8) {

            return setMessage(
                'Mật khẩu phải có ít nhất 8 ký tự'
            );

        }

        if (password !== confirmPassword) {

            return setMessage(
                'Mật khẩu xác nhận không khớp'
            );

        }

        try {

            setLoading(true);
            setMessage('');

            await axios.post(
                'https://api.quangdungcinema.id.vn/api/users/reset-password',
                {
                    email,
                    otp,
                    password
                }
            );

            alert(
                'Đổi mật khẩu thành công!'
            );

            onClose();

        } catch (err) {

            setMessage(
                err.response?.data?.message ||
                'Không thể đổi mật khẩu'
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <Modal
            open={true}
            onClose={onClose}
            title="QUÊN MẬT KHẨU"
            size="md"
            type="info"
        >

            <div className="forgot-password">

                {/* STEP INDICATOR */}

                <div className="forgot-steps">

                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        1
                    </div>

                    <div className="line" />

                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        2
                    </div>

                    <div className="line" />

                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                        3
                    </div>

                </div>

                {message && (

                    <div className="forgot-message">

                        {message}

                    </div>

                )}

                {/* STEP 1 */}

                {step === 1 && (

                    <div className="forgot-form">

                        <label>Email đăng ký</label>

                        <input
                            type="email"
                            placeholder="Nhập email của bạn"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                        />

                        <button
                            className="forgot-btn"
                            onClick={handleSendOTP}
                            disabled={loading}
                        >
                            {
                                loading
                                    ? 'Đang gửi...'
                                    : 'Gửi OTP'
                            }
                        </button>

                    </div>

                )}

                {/* STEP 2 */}

                {step === 2 && (

                    <div className="forgot-form">

                        <label>Mã OTP</label>

                        <input
                            type="text"
                            maxLength="6"
                            placeholder="Nhập mã OTP"
                            value={otp}
                            onChange={(e) =>
                                setOtp(e.target.value)
                            }
                        />

                        <button
                            className="forgot-btn"
                            onClick={handleVerifyOTP}
                            disabled={loading}
                        >
                            {
                                loading
                                    ? 'Đang xác thực...'
                                    : 'Xác nhận OTP'
                            }
                        </button>

                    </div>

                )}

                {/* STEP 3 */}

                {step === 3 && (

                    <div className="forgot-form">

                        <label>Mật khẩu mới</label>

                        <input
                            type="password"
                            placeholder="Nhập mật khẩu mới"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                        />

                        <label>Xác nhận mật khẩu</label>

                        <input
                            type="password"
                            placeholder="Nhập lại mật khẩu"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(
                                    e.target.value
                                )
                            }
                        />

                        <button
                            className="forgot-btn"
                            onClick={handleResetPassword}
                            disabled={loading}
                        >
                            {
                                loading
                                    ? 'Đang xử lý...'
                                    : 'Đổi mật khẩu'
                            }
                        </button>

                    </div>

                )}

            </div>

        </Modal>

    );

};

export default ForgotPassword;