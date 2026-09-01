// CountdownTimer.js
import React, { useState, useEffect } from 'react';
import { TimerReset } from 'lucide-react';
import '../styles/CountdownTimer.css';

const CountdownTimer = ({ onExpire }) => {

    const calculateSecondsLeft = () => {
        // Đọc từ localStorage (đã lưu ở Booking)
        const expiry = localStorage.getItem('holdExpiresAt');
        if (!expiry) return null;

        const now = Date.now();
        const diff = Math.floor((parseInt(expiry) - now) / 1000);
        return diff > 0 ? diff : 0;
    };

    const [seconds, setSeconds] = useState(calculateSecondsLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            const timeLeft = calculateSecondsLeft();

            if (timeLeft === null) {
                clearInterval(timer);
                setSeconds(null);
                return;
            }

            setSeconds(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(timer);
                if (onExpire) onExpire(); // Gọi callback khi hết giờ
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [onExpire]); // Chạy lại khi onExpire thay đổi

    if (seconds === null) return null;

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="countdown-wrapper">
            <div className="countdown-icon">
                <TimerReset size={24} strokeWidth={2.4} />
            </div>
            <div className="countdown-content">
                <p className="countdown-label">THỜI GIAN GIỮ GHẾ</p>
                <span className="countdown-time">{formatTime(seconds)}</span>
            </div>
        </div>
    );
};

export default CountdownTimer;