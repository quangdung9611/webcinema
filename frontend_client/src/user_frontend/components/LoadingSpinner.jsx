import React from "react";
import "../styles/LoadingSpinner.css";

const LoadingSpinner = ({ 
    size = 64,          // ✅ To hơn mặc định
    color = "#dc2626",
    message = "",
    overlay = true,
    blur = true,
    zIndex = 9999,
}) => {

    return (
        <div 
            className={`loading-overlay ${blur ? "loading-overlay-blur" : ""}`}
            style={{ zIndex }}
        >
            <div className="loading-overlay-content">
                {/* Spinner nét đứt (dash) */}
                <svg 
                    className="spinner-dash" 
                    width={size} 
                    height={size} 
                    viewBox="0 0 50 50"
                >
                    <circle
                        className="spinner-dash-circle"
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="80 100"
                    />
                </svg>
                {message && <p className="loading-message">{message}</p>}
            </div>
        </div>
    );
};

export default LoadingSpinner;