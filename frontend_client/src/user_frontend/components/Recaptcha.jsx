// components/Recaptcha.jsx
import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const Recaptcha = forwardRef(({ onChange, onExpired }, ref) => {
    const recaptchaRef = useRef(null);

    useImperativeHandle(ref, () => ({
        reset: () => recaptchaRef.current?.reset(),
        getValue: () => recaptchaRef.current?.getValue(),
        execute: () => recaptchaRef.current?.execute(),
    }));

    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
        console.error('❌ [RECAPTCHA] Thiếu VITE_RECAPTCHA_SITE_KEY trong .env');
        return (
            <div className="recaptcha-wrapper recaptcha-error">
                <span>⚠️ Chưa cấu hình CAPTCHA. Vui lòng liên hệ admin.</span>
            </div>
        );
    }

    return (
        <div className="recaptcha-wrapper">
            <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={siteKey}
                onChange={onChange}
                onExpired={onExpired}
                theme="dark"
            />
        </div>
    );
});

Recaptcha.displayName = 'Recaptcha';

export default Recaptcha;