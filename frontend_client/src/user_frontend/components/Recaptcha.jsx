// src/components/Recaptcha.jsx

import React, {
    useRef,
    useImperativeHandle,
    forwardRef,
} from 'react';

import ReCAPTCHA from 'react-google-recaptcha';

// ============================================================
// RECAPTCHA COMPONENT
// ============================================================

const Recaptcha = forwardRef(
    ({ onChange, onExpired, onErrored }, ref) => {
        const recaptchaRef = useRef(null);

        // ========================================================
        // RECAPTCHA SITE KEY
        // ========================================================

        const siteKey = import.meta.env.VITE_RECAPTCHA_ID;

        // ========================================================
        // DEBUG
        // ========================================================

        console.log(
            '🔑 [RECAPTCHA] Site Key đang dùng:',
            siteKey
        );

        console.log(
            '🔑 [RECAPTCHA] Độ dài key:',
            siteKey?.length
        );

        console.log(
            '🔑 [RECAPTCHA] Key bắt đầu bằng:',
            siteKey?.substring(0, 10)
        );

        console.log(
            '🔑 [RECAPTCHA] Domain hiện tại:',
            window.location.hostname
        );

        console.log(
            '🔑 [RECAPTCHA] Env mode:',
            import.meta.env.MODE
        );

        // ========================================================
        // KIỂM TRA SITE KEY
        // ========================================================

        if (!siteKey) {
            console.error(
                '❌ [RECAPTCHA] Thiếu VITE_RECAPTCHA_ID trong Environment Variables!'
            );

            return (
                <div className="recaptcha-wrapper recaptcha-error">
                    <span>
                        ⚠️ Chưa cấu hình CAPTCHA. Vui lòng liên hệ admin.
                    </span>
                </div>
            );
        }

        // ========================================================
        // EXPOSE METHODS RA COMPONENT CHA
        // ========================================================

        useImperativeHandle(ref, () => ({
            reset: () => {
                console.log('🔄 [RECAPTCHA] Reset CAPTCHA');

                recaptchaRef.current?.reset();
            },

            getValue: () => {
                const token = recaptchaRef.current?.getValue();

                console.log(
                    '🔎 [RECAPTCHA] getValue:',
                    token ? 'Có token' : 'Chưa có token'
                );

                return token;
            },

            execute: () => {
                console.log('▶️ [RECAPTCHA] Execute CAPTCHA');

                return recaptchaRef.current?.execute();
            },
        }));

        // ========================================================
        // HANDLE CHANGE
        // ========================================================

        const handleChange = (token) => {
            if (token) {
                console.log(
                    '✅ [RECAPTCHA] Token nhận được:',
                    `${token.substring(0, 30)}...`
                );
            } else {
                console.log(
                    '⚠️ [RECAPTCHA] Token đã bị xóa'
                );
            }

            onChange?.(token || '');
        };

        // ========================================================
        // HANDLE EXPIRED
        // ========================================================

        const handleExpired = () => {
            console.log(
                '⏰ [RECAPTCHA] Token đã hết hạn'
            );

            onChange?.('');
            onExpired?.();
        };

        // ========================================================
        // HANDLE ERROR
        // ========================================================

        const handleErrored = (error) => {
            console.error(
                '❌ [RECAPTCHA] CAPTCHA xảy ra lỗi:',
                error
            );

            onChange?.('');
            onErrored?.(error);
        };

        // ========================================================
        // RENDER
        // ========================================================

        return (
            <div className="recaptcha-wrapper">
                <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={siteKey}
                    onChange={handleChange}
                    onExpired={handleExpired}
                    onErrored={handleErrored}
                    theme="dark"
                />
            </div>
        );
    }
);

// ============================================================
// DISPLAY NAME
// ============================================================

Recaptcha.displayName = 'Recaptcha';

export default Recaptcha;