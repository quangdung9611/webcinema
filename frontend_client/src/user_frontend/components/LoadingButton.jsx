// components/LoadingButton.jsx
import React, { useEffect, useRef, useState } from "react";
import "../styles/LoadingButton.css";

/* ============================================================
   LOADING BUTTON — SILVER EDITION (UPGRADED)
   ============================================================
   ✅ 8 dots spinner — sóng nhấp nhô
   ✅ Shimmer sweep khi loading
   ✅ Text transition mượt (fade + slide)
   ✅ Success checkmark (✓ vẽ ra)
   ✅ Error state (✗ nhẹ)
   ✅ Đồng bộ 100% với index.css
   ✅ Responsive
============================================================ */

const LoadingButton = ({
    type = "button",
    loading = false,
    success = false,
    error = false,
    loadingText = "Đang xử lý...",
    successText = "Thành công",
    errorText = "Có lỗi xảy ra",
    onClick,
    children,
    className = "",
    disabled = false,
    spinnerColor = "var(--silver-light, #f5f5f6)",
    successDuration = 800, // ms — thời gian giữ success trước khi về idle
    ...props
}) => {
    /* ========================================================
       STATE — quản lý trạng thái hiển thị nội bộ
       Trạng thái thật (loading/success/error) do parent truyền.
       Nhưng nếu parent không quản lý success/error,
       component vẫn hiển thị đúng khi prop đổi.
    ======================================================== */
    const [showSuccess, setShowSuccess] = useState(false);
    const successTimeoutRef = useRef(null);

    useEffect(() => {
        if (success) {
            setShowSuccess(true);
            successTimeoutRef.current = setTimeout(() => {
                setShowSuccess(false);
            }, successDuration);
        } else {
            setShowSuccess(false);
        }

        return () => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
        };
    }, [success, successDuration]);

    /* ========================================================
       XÁC ĐỊNH TRẠNG THÁI HIỂN THỊ
    ======================================================== */
    const displayState = (() => {
        if (loading) return "loading";
        if (showSuccess) return "success";
        if (error) return "error";
        return "idle";
    })();

    const isDisabled = disabled || loading;

    /* ========================================================
       TEXT HIỂN THỊ THEO TRẠNG THÁI
    ======================================================== */
    const displayText = (() => {
        switch (displayState) {
            case "loading":
                return loadingText;
            case "success":
                return successText;
            case "error":
                return errorText;
            default:
                return children;
        }
    })();

    /* ========================================================
       RENDER SPINNER — 8 dots sóng
    ======================================================== */
    const renderSpinner = () => (
        <div className="spinner-dots-container" aria-hidden="true">
            {[...Array(8)].map((_, i) => {
                const angle = i * 45;
                return (
                    <div
                        key={i}
                        className="spinner-dot"
                        style={{
                            "--dot-angle": `${angle}deg`,
                            backgroundColor: spinnerColor,
                            animationDelay: `${i * 0.1}s`,
                        }}
                    />
                );
            })}
        </div>
    );

    /* ========================================================
       RENDER SUCCESS CHECKMARK
    ======================================================== */
    const renderSuccess = () => (
        <svg
            className="loading-btn-check"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M5 12.5 L10 17.5 L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );

    /* ========================================================
       RENDER ERROR CROSS
    ======================================================== */
    const renderError = () => (
        <svg
            className="loading-btn-cross"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M7 7 L17 17 M17 7 L7 17"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );

    /* ========================================================
       RENDER
    ======================================================== */
    return (
        <button
            type={type}
            className={[
                "loading-btn",
                className,
                displayState === "loading" ? "loading" : "",
                displayState === "success" ? "success" : "",
                displayState === "error" ? "error" : "",
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={onClick}
            disabled={isDisabled}
            aria-busy={loading}
            aria-live="polite"
            {...props}
        >
            {/* Shimmer overlay — chỉ chạy khi loading */}
            {displayState === "loading" && (
                <span className="loading-btn-shimmer" aria-hidden="true" />
            )}

            {/* Content — đổi theo trạng thái, có transition */}
            <span
                key={displayState}
                className="loading-btn-content"
            >
                {displayState === "loading" && renderSpinner()}
                {displayState === "success" && renderSuccess()}
                {displayState === "error" && renderError()}

                <span className="loading-btn-text">{displayText}</span>
            </span>
        </button>
    );
};

export default LoadingButton;