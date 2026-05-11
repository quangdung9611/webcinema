import React, { useState, useEffect } from 'react';
import { TimerReset } from 'lucide-react';

import '../styles/CountdownTimer.css';

const CountdownTimer = ({ onExpire }) => {

    // =========================
    // CALCULATE TIME LEFT
    // =========================

    const calculateSecondsLeft = () => {

        const expiry =
            sessionStorage.getItem('holdExpiresAt');

        if (!expiry) return null;

        const now = Date.now();

        const diff = Math.floor(
            (parseInt(expiry) - now) / 1000
        );

        return diff > 0 ? diff : 0;
    };

    const [seconds, setSeconds] =
        useState(calculateSecondsLeft());

    // =========================
    // EFFECT
    // =========================

    useEffect(() => {

        const timer = setInterval(() => {

            const timeLeft =
                calculateSecondsLeft();

            if (timeLeft === null) {
                clearInterval(timer);
                setSeconds(null);
                return;
            }

            setSeconds(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(timer);
                onExpire();
            }

        }, 1000);

        return () => clearInterval(timer);

    }, [onExpire]);

    // =========================
    // HIDE
    // =========================

    if (seconds === null) {
        return null;
    }

    // =========================
    // FORMAT
    // =========================

    const formatTime = (totalSeconds) => {

        const mins =
            Math.floor(totalSeconds / 60);

        const secs =
            totalSeconds % 60;

        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // =========================
    // RENDER
    // =========================

    return (
        <div className="countdown-wrapper">

            {/* ICON */}
            <div className="countdown-icon">
                <TimerReset
                    size={24}
                    strokeWidth={2.4}
                />
            </div>

            {/* CONTENT */}
            <div className="countdown-content">

                <p className="countdown-label">
                    THỜI GIAN GIỮ GHẾ
                </p>

                <span className="countdown-time">
                    {formatTime(seconds)}
                </span>

            </div>

        </div>
    );
};

export default CountdownTimer;