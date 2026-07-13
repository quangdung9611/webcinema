// components/LoadingButton.jsx
import React from 'react';
import '../styles/LoadingButton.css';

const LoadingButton = ({
    type = 'button',
    loading = false,
    loadingText = 'Đang xử lý...',
    onClick,
    children,
    className = '',
    disabled = false,
    spinnerColor = '#ffffff',
    ...props
}) => {
    return (
        <button
            type={type}
            className={`loading-btn ${className} ${loading ? 'loading' : ''}`}
            onClick={onClick}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    {/* ✅ DOTS SPINNER - 8 chấm tròn xếp vòng tròn, quay đều */}
                    <div className="spinner-dots-container">
                        {[...Array(8)].map((_, i) => {
                            const angle = i * 45;
                            return (
                                <div
                                    key={i}
                                    className="spinner-dot"
                                    style={{
                                        backgroundColor: spinnerColor,
                                        transform: `rotate(${angle}deg) translateX(12px)`
                                    }}
                                ></div>
                            );
                        })}
                    </div>
                    <span className="loading-btn-text">{loadingText}</span>
                </>
            ) : (
                <span className="loading-btn-text">{children}</span>
            )}
        </button>
    );
};

export default LoadingButton;