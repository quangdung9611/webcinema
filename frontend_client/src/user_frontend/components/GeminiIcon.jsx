import React from 'react';

/* ==========================================================
   GOOGLE GEMINI ICON — SVG chính thức
   Ngôi sao 4 cánh với gradient xanh-tím-đỏ-vàng
========================================================== */

const GeminiIcon = ({ size = 22, className = '' }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id="gemini-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                >
                    <stop offset="0%" stopColor="#4285F4" />
                    <stop offset="35%" stopColor="#9B72CB" />
                    <stop offset="70%" stopColor="#D96570" />
                    <stop offset="100%" stopColor="#F2A60C" />
                </linearGradient>
            </defs>

            {/* Ngôi sao 4 cánh — icon Gemini chính thức */}
            <path
                d="M12 2C12.5 7.5 16.5 11.5 22 12C16.5 12.5 12.5 16.5 12 22C11.5 16.5 7.5 12.5 2 12C7.5 11.5 11.5 7.5 12 2Z"
                fill="url(#gemini-gradient)"
            />
        </svg>
    );
};

export default GeminiIcon;