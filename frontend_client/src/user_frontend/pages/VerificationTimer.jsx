import React, {
    useState,
    useEffect
} from 'react';

import {
    ShieldCheck
} from 'lucide-react';

import '../styles/VerificationTimer.css';

const VerificationTimer = ({

    /* =========================================================
        TIMER
    ========================================================= */

    initialSeconds = 60,

    /* =========================================================
        CALLBACK
    ========================================================= */

    onExpire

}) => {

    /* =========================================================
        STATES
    ========================================================= */

    const [seconds, setSeconds] =
        useState(initialSeconds);

    /* =========================================================
        EFFECT
    ========================================================= */

    useEffect(() => {

        if (seconds <= 0) {

            if (onExpire) {
                onExpire();
            }

            return;
        }

        const timer = setInterval(() => {

            setSeconds((prev) => prev - 1);

        }, 1000);

        return () => clearInterval(timer);

    }, [seconds, onExpire]);

    /* =========================================================
        FORMAT TIME
    ========================================================= */

    const formatTime = (totalSeconds) => {

        const mins =
            Math.floor(totalSeconds / 60);

        const secs =
            totalSeconds % 60;

        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    };

    /* =========================================================
        EXPIRED
    ========================================================= */

    const isExpired =
        seconds <= 0;

    /* =========================================================
        RENDER
    ========================================================= */

    return (

        <div
            className={`
                verification-timer
                ${isExpired ? 'expired' : ''}
            `}
        >

            {/* =====================================================
                ICON
            ===================================================== */}

            <div className="verification-timer-icon">

                <ShieldCheck
                    size={22}
                    strokeWidth={2.4}
                />

            </div>

            {/* =====================================================
                CONTENT
            ===================================================== */}

            <div className="verification-timer-content">

                {

                    !isExpired ? (

                        <>

                            <p className="verification-timer-label">

                                Gửi lại mã sau

                            </p>

                            <span className="verification-timer-time">

                                {formatTime(seconds)}

                            </span>

                        </>

                    ) : (

                        <p className="verification-timer-expired">

                            Bạn có thể gửi lại mã OTP

                        </p>

                    )

                }

            </div>

        </div>

    );

};

export default VerificationTimer;