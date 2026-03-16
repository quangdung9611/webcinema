import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ onExpire }) => {
    // 1. Hàm tính toán số giây còn lại thực tế
    const calculateSecondsLeft = () => {
        const expiry = sessionStorage.getItem('holdExpiresAt');
        // Trả về null nếu không tìm thấy để phân biệt với số 0
        if (!expiry) return null;

        const now = Date.now();
        const diff = Math.floor((parseInt(expiry) - now) / 1000);
        
        return diff > 0 ? diff : 0;
    };

    const [seconds, setSeconds] = useState(calculateSecondsLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            const timeLeft = calculateSecondsLeft();
            
            // QUAN TRỌNG: Nếu bỗng dưng không thấy session đâu (do vừa bị xóa)
            // thì dẹp luôn cái timer ngay lập tức
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

    // 2. Nếu session bị xóa (seconds === null) thì biến mất hoàn toàn khỏi giao diện
    if (seconds === null) {
        return null;
    }

    // 3. Hàm format mm:ss
    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="timer-container" style={{
            background: '#fff3cd',
            color: '#856404',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ffeeba',
            textAlign: 'center',
            marginBottom: '20px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            <p style={{ margin: 0, fontSize: '14px' }}>⏰ THỜI GIAN GIỮ GHẾ CÒN LẠI</p>
            <span style={{ fontSize: '24px', color: '#d9534f' }}>{formatTime(seconds)}</span>
        </div>
    );
};

export default CountdownTimer;