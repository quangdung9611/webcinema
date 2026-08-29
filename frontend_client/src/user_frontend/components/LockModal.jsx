import React, {
    useEffect,
    useState
} from 'react';

import {
    LockKeyhole,
    Clock,
    X,
    RefreshCw
} from 'lucide-react';

import '../styles/Modal.css';

const LockModal = ({
    show,
    onClose = () => {},
    onResend = () => {},
    message,
    email,
    lockedUntil
}) => {
    const [timeLeft, setTimeLeft] =
        useState(0);

    // ============================================================
    // FORMAT TIME
    // ============================================================

    const formatTime = (seconds) => {
        const safeSeconds = Math.max(
            0,
            Math.floor(
                Number(seconds) || 0
            )
        );

        const minutes = Math.floor(
            safeSeconds / 60
        );

        const secondsLeft =
            safeSeconds % 60;

        return `${minutes}:${secondsLeft
            .toString()
            .padStart(2, '0')}`;
    };

    // ============================================================
    // LOCK TIMER
    //
    // LUÔN tính:
    //
    // lockedUntil - Date.now()
    //
    // Không dùng:
    //
    // prev - 1
    //
    // ============================================================

    useEffect(() => {
        if (
            !show ||
            !lockedUntil
        ) {
            setTimeLeft(0);
            return;
        }

        const timestamp =
            Number(lockedUntil);

        if (
            !Number.isFinite(
                timestamp
            )
        ) {
            setTimeLeft(0);
            return;
        }

        const tick = () => {
            const left = Math.max(
                0,
                Math.ceil(
                    (timestamp -
                        Date.now()) /
                        1000
                )
            );

            setTimeLeft(left);
        };

        tick();

        const interval =
            setInterval(
                tick,
                250
            );

        return () => {
            clearInterval(
                interval
            );
        };
    }, [
        show,
        lockedUntil
    ]);

    // ============================================================
    // AUTO HIDE KHI HẾT LOCK
    //
    // Không gọi onResend tự động.
    // Chỉ báo cho parent biết modal có thể đóng.
    // ============================================================

    useEffect(() => {
        if (
            !show ||
            !lockedUntil
        ) {
            return;
        }

        const timestamp =
            Number(lockedUntil);

        const checkExpired =
            () => {
                if (
                    timestamp -
                        Date.now() <=
                    0
                ) {
                    setTimeLeft(0);
                }
            };

        checkExpired();

        const interval =
            setInterval(
                checkExpired,
                250
            );

        return () => {
            clearInterval(
                interval
            );
        };
    }, [
        show,
        lockedUntil
    ]);

    if (!show) {
        return null;
    }

    return (
        <div
            className="modal-overlay"
            onMouseDown={(e) => {
                if (
                    e.target ===
                    e.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <div
                className="modal-content"
                style={{
                    maxWidth:
                        '450px',
                    width:
                        'calc(100% - 32px)',
                    textAlign:
                        'center'
                }}
            >
                {/* CLOSE */}

                <button
                    type="button"
                    onClick={
                        onClose
                    }
                    style={{
                        position:
                            'absolute',
                        top:
                            '12px',
                        right:
                            '12px',
                        border:
                            'none',
                        background:
                            'transparent',
                        cursor:
                            'pointer',
                        color:
                            '#94a3b8',
                        padding:
                            '5px'
                    }}
                    aria-label="Đóng"
                >
                    <X size={20} />
                </button>

                {/* ICON */}

                <div
                    style={{
                        width:
                            '72px',
                        height:
                            '72px',
                        margin:
                            '0 auto 18px',
                        borderRadius:
                            '50%',
                        display:
                            'flex',
                        alignItems:
                            'center',
                        justifyContent:
                            'center',
                        background:
                            'rgba(255, 59, 92, 0.12)',
                        border:
                            '1px solid rgba(255, 59, 92, 0.3)'
                    }}
                >
                    <LockKeyhole
                        size={36}
                        color="#ff6b8a"
                    />
                </div>

                {/* TITLE */}

                <h3
                    style={{
                        marginBottom:
                            '12px'
                    }}
                >
                    OTP ĐÃ BỊ KHÓA
                </h3>

                {/* MESSAGE */}

                <p
                    style={{
                        color:
                            '#94a3b8',
                        lineHeight:
                            '1.6',
                        marginBottom:
                            '16px'
                    }}
                >
                    {message ||
                        'Bạn đã nhập sai OTP quá nhiều lần.'}
                </p>

                {/* EMAIL */}

                {email && (
                    <p
                        style={{
                            fontSize:
                                '14px',
                            color:
                                '#cbd5e1',
                            marginBottom:
                                '18px',
                            wordBreak:
                                'break-word'
                        }}
                    >
                        Email:{' '}
                        <strong>
                            {email}
                        </strong>
                    </p>
                )}

                {/* TIMER */}

                <div
                    style={{
                        display:
                            'flex',
                        alignItems:
                            'center',
                        justifyContent:
                            'center',
                        gap:
                            '10px',
                        padding:
                            '14px',
                        marginBottom:
                            '18px',
                        borderRadius:
                            '10px',
                        background:
                            'rgba(255, 59, 92, 0.1)',
                        border:
                            '1px solid rgba(255, 59, 92, 0.25)'
                    }}
                >
                    <Clock
                        size={20}
                        color="#ff6b8a"
                    />

                    <span
                        style={{
                            color:
                                '#ff6b8a'
                        }}
                    >
                        Còn lại:{' '}
                        <strong
                            style={{
                                fontSize:
                                    '22px',
                                marginLeft:
                                    '4px'
                            }}
                        >
                            {formatTime(
                                timeLeft
                            )}
                        </strong>
                    </span>
                </div>

                {/* INFO */}

                <p
                    style={{
                        fontSize:
                            '13px',
                        color:
                            '#64748b',
                        marginBottom:
                            '20px'
                    }}
                >
                    Sau khi hết thời gian
                    khóa, bạn có thể gửi
                    một mã OTP mới.
                </p>

                {/* BUTTONS */}

                <div
                    style={{
                        display:
                            'flex',
                        gap:
                            '10px',
                        justifyContent:
                            'center'
                    }}
                >
                    <button
                        type="button"
                        className="btn-user back-btn"
                        onClick={
                            onClose
                        }
                    >
                        <X size={16} />
                        Đóng
                    </button>

                    <button
                        type="button"
                        className="btn-user btn-outline-secondary"
                        onClick={
                            onResend
                        }
                        disabled={
                            timeLeft > 0
                        }
                    >
                        <RefreshCw
                            size={16}
                        />

                        {timeLeft >
                        0
                            ? `Chờ ${formatTime(
                                  timeLeft
                              )}`
                            : 'Gửi OTP mới'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LockModal;