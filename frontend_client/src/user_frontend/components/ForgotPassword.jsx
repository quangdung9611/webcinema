import React, { useState } from 'react';
import axios from 'axios';
import Modal from './Modal';

import {
    Mail,
    ShieldCheck,
    LockKeyhole
} from 'lucide-react';

import '../styles/ForgotPassword.css';

const ForgotPassword = ({ onClose }) => {

    const [step, setStep] = useState(1);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState('');

    const [messageType, setMessageType] =
        useState('');

    const resetMessage = () => {

        setMessage('');
        setMessageType('');

    };

    /* =====================================
        SEND OTP
    ===================================== */

    const handleSendOTP = async () => {

        if (!email.trim()) {

            setMessage(
                'Vui lòng nhập email'
            );

            setMessageType('error');

            return;
        }

        try {

            setLoading(true);

            resetMessage();

            await axios.post(
                'https://api.quangdungcinema.id.vn/api/forgot-password/send-otp',
                { email }
            );

            setStep(2);

            setMessage(
                'OTP đã được gửi tới email của bạn'
            );

            setMessageType(
                'success'
            );

        } catch (err) {

            setMessage(
                err.response?.data?.message ||
                'Không gửi được OTP'
            );

            setMessageType(
                'error'
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

            setMessage(
                'Vui lòng nhập OTP'
            );

            setMessageType(
                'error'
            );

            return;
        }

        try {

            setLoading(true);

            resetMessage();

            await axios.post(
                'https://api.quangdungcinema.id.vn/api/forgot-password/verify-otp',
                {
                    email,
                    otp
                }
            );

            setStep(3);

            setMessage(
                'Xác thực OTP thành công'
            );

            setMessageType(
                'success'
            );

        } catch (err) {

            setMessage(
                err.response?.data?.message ||
                'OTP không hợp lệ'
            );

            setMessageType(
                'error'
            );

        } finally {

            setLoading(false);
        }
    };

    /* =====================================
        RESET PASSWORD
    ===================================== */

    const handleResetPassword =
        async () => {

            if (!password.trim()) {

                setMessage(
                    'Vui lòng nhập mật khẩu mới'
                );

                setMessageType(
                    'error'
                );

                return;
            }

            if (
                password.length < 8
            ) {

                setMessage(
                    'Mật khẩu phải có ít nhất 8 ký tự'
                );

                setMessageType(
                    'error'
                );

                return;
            }

            if (
                password !==
                confirmPassword
            ) {

                setMessage(
                    'Mật khẩu xác nhận không khớp'
                );

                setMessageType(
                    'error'
                );

                return;
            }

            try {

                setLoading(true);

                resetMessage();

                await axios.post(
                    'https://api.quangdungcinema.id.vn/api/forgot-password/reset-password',
                    {
                        email,
                        newPassword: password
                    }
                );

                setMessage(
                    'Đổi mật khẩu thành công!'
                );

                setMessageType(
                    'success'
                );

                setTimeout(() => {

                    onClose();

                }, 1200);

            } catch (err) {

                setMessage(
                    err.response?.data?.message ||
                    'Không thể đổi mật khẩu'
                );

                setMessageType(
                    'error'
                );

            } finally {

                setLoading(false);
            }
        };

    const renderStepIcon = () => {

        switch (step) {

            case 1:
                return <Mail size={42} />;

            case 2:
                return (
                    <ShieldCheck size={42} />
                );

            case 3:
                return (
                    <LockKeyhole size={42} />
                );

            default:
                return null;
        }
    };

    return (

        <Modal
            open={true}
            onClose={onClose}
            title="QUÊN MẬT KHẨU"
            size="md"
            type="default"
        >

            <div className="forgot-password">

                <div className="forgot-icon">
                    {renderStepIcon()}
                </div>

                <div className="forgot-steps">

                    <div
                        className={`step ${
                            step >= 1
                                ? 'active'
                                : ''
                        }`}
                    >
                        1
                    </div>

                    <div className="line" />

                    <div
                        className={`step ${
                            step >= 2
                                ? 'active'
                                : ''
                        }`}
                    >
                        2
                    </div>

                    <div className="line" />

                    <div
                        className={`step ${
                            step >= 3
                                ? 'active'
                                : ''
                        }`}
                    >
                        3
                    </div>

                </div>

                {message && (

                    <div
                        className={`forgot-message ${messageType}`}
                    >
                        {message}
                    </div>

                )}

                {step === 1 && (

                    <div className="forgot-form">

                        <label>
                            Email đăng ký
                        </label>

                        <input
                            type="email"
                            placeholder="Nhập email của bạn"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                        />

                        <button
                            className="forgot-btn"
                            onClick={
                                handleSendOTP
                            }
                            disabled={
                                loading
                            }
                        >

                            {loading
                                ? 'Đang gửi...'
                                : 'Gửi OTP'}

                        </button>

                    </div>

                )}

                {step === 2 && (

                    <div className="forgot-form">

                        <label>
                            Nhập mã OTP
                        </label>

                        <input
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={otp}
                            onChange={(e) =>
                                setOtp(
                                    e.target.value
                                )
                            }
                        />

                        <button
                            className="forgot-btn"
                            onClick={
                                handleVerifyOTP
                            }
                            disabled={
                                loading
                            }
                        >

                            {loading
                                ? 'Đang xác thực...'
                                : 'Xác nhận OTP'}

                        </button>

                    </div>

                )}

                {step === 3 && (

                    <div className="forgot-form">

                        <label>
                            Mật khẩu mới
                        </label>

                        <input
                            type="password"
                            placeholder="Nhập mật khẩu mới"
                            value={password}
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
                            }
                        />

                        <label>
                            Xác nhận mật khẩu
                        </label>

                        <input
                            type="password"
                            placeholder="Nhập lại mật khẩu"
                            value={
                                confirmPassword
                            }
                            onChange={(e) =>
                                setConfirmPassword(
                                    e.target.value
                                )
                            }
                        />

                        <button
                            className="forgot-btn"
                            onClick={
                                handleResetPassword
                            }
                            disabled={
                                loading
                            }
                        >

                            {loading
                                ? 'Đang xử lý...'
                                : 'Đổi mật khẩu'}

                        </button>

                    </div>

                )}

            </div>

        </Modal>
    );
};

export default ForgotPassword;