// CountdownTimer.js
import React, { useState, useEffect, useRef } from 'react';
import { TimerReset } from 'lucide-react';
import '../styles/CountdownTimer.css';

const TOTAL_TTL_SECONDS = 10 * 60; // 10 phút

const CountdownTimer = ({ onExpire }) => {

    const calculateSecondsLeft = () => {
        const expiry = localStorage.getItem('holdExpiresAt');
        if (!expiry) return null;

        const expiryMs = Number(expiry);
        if (!Number.isFinite(expiryMs)) return null;

        const diff = Math.floor((expiryMs - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
    };

    const [seconds, setSeconds] = useState(calculateSecondsLeft());

    // ✅ Ref để tránh re-run interval khi onExpire đổi reference
    const onExpireRef = useRef(onExpire);
    const hasExpiredRef = useRef(false);

    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
        let mounted = true;

        const tick = () => {
            if (!mounted) return;

            const left = calculateSecondsLeft();

            if (left === null) {
                setSeconds(null);
                return;
            }

            setSeconds(left);

            if (left <= 0 && !hasExpiredRef.current) {
                hasExpiredRef.current = true;
                onExpireRef.current?.();
            }
        };

        tick();
        const timer = setInterval(tick, 1000);

        // ✅ Re-sync khi tab active lại (Chrome throttle khi tab ẩn)
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                tick();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            mounted = false;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    if (seconds === null) return null;

    // ✅ Format MM:SS, tự thêm HH nếu > 60 phút
    const formatTime = (total) => {
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;

        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // ✅ Xác định trạng thái màu sắc
    const state =
        seconds <= 30 ? 'critical' :
        seconds <= 60 ? 'warning' : 'normal';

    // ✅ % cho progress bar
    const progress = Math.max(0, Math.min(100, (seconds / TOTAL_TTL_SECONDS) * 100));

    return (
        <div className={`countdown-wrapper countdown-wrapper--${state}`}>
            <div className="countdown-icon">
                <TimerReset size={24} strokeWidth={2.4} aria-hidden="true" />
            </div>

            <div className="countdown-content">
                <span className="countdown-label">GIỮ GHẾ</span>
                <span className="countdown-time">{formatTime(seconds)}</span>
            </div>

            {/* ✅ Progress bar dưới đáy */}
            <div className="countdown-progress" aria-hidden="true">
                <div
                    className="countdown-progress__fill"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default CountdownTimer;