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
        // KIỂM TRA SITE KEY
        // ========================================================

        if (!siteKey) {
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
                recaptchaRef.current?.reset();
            },

            getValue: () => {
                return recaptchaRef.current?.getValue();
            },

            execute: () => {
                return recaptchaRef.current?.execute();
            },
        }));

        // ========================================================
        // HANDLE CHANGE
        // ========================================================

        const handleChange = (token) => {
            onChange?.(token || '');
        };

        // ========================================================
        // HANDLE EXPIRED
        // ========================================================

        const handleExpired = () => {
            onChange?.('');
            onExpired?.();
        };

        // ========================================================
        // HANDLE ERROR
        // ========================================================

        const handleErrored = (error) => {
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