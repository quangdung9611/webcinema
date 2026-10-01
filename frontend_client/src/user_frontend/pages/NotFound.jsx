import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Home,
    Film,
    ArrowLeft,
    AlertTriangle,
} from "lucide-react";

import "../styles/NotFound.css";

/* ============================================================
   NOT FOUND — CINEMA SILVER PREMIUM
   ============================================================ */

const NotFound = () => {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(null);

    /* ==========================================================
       AUTO REDIRECT SAU 15S (có thể tắt)
    ========================================================== */

    // Bỏ comment nếu muốn auto redirect
    /*
    useEffect(() => {
        let timeLeft = 15;
        setCountdown(timeLeft);

        const timer = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(timer);
                navigate("/", { replace: true });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);
    */

    /* ==========================================================
       RENDER
    ========================================================== */

    return (
        <div className="notfound-page">

            {/* FILM STRIP TRÊN */}
            <div className="notfound-filmstrip notfound-filmstrip--top">
                <div className="notfound-filmstrip__track" />
            </div>

            {/* MAIN CONTENT */}
            <div className="notfound-content">

                {/* ICON */}
                <div className="notfound-icon">
                    <AlertTriangle size={40} />
                </div>

                {/* 404 */}
                <h1 className="notfound-code">
                    <span className="notfound-code__digit">4</span>
                    <span className="notfound-code__digit notfound-code__digit--middle">0</span>
                    <span className="notfound-code__digit">4</span>
                </h1>

                {/* SUBTITLE */}
                <h2 className="notfound-title">
                    Suất chiếu này không tồn tại
                </h2>

                {/* DESCRIPTION */}
                <p className="notfound-desc">
                    Có vẻ như bạn đã đi lạc vào một khung hình
                    không có trong kịch bản. Trang này có thể
                    đã bị xóa, đổi tên hoặc chưa từng tồn tại.
                </p>

                {/* COUNTDOWN */}
                {countdown !== null && (
                    <p className="notfound-countdown">
                        Tự động về trang chủ sau{" "}
                        <strong>{countdown}s</strong>
                    </p>
                )}

                {/* ACTION BUTTONS */}
                <div className="notfound-actions">

                    <Link
                        to="/"
                        className="notfound-btn notfound-btn--primary"
                    >
                        <Home size={18} />
                        <span>Về trang chủ</span>
                    </Link>

                    <Link
                        to="/movies/status/dang-chieu"
                        className="notfound-btn notfound-btn--secondary"
                    >
                        <Film size={18} />
                        <span>Phim đang chiếu</span>
                    </Link>

                    <button
                        type="button"
                        className="notfound-btn notfound-btn--ghost"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft size={18} />
                        <span>Quay lại</span>
                    </button>

                </div>

                {/* ERROR CODE */}
                <div className="notfound-errorcode">
                    <span>ERROR CODE:</span>
                    <strong>404_NOT_FOUND</strong>
                </div>

            </div>

            {/* FILM STRIP DƯỚI */}
            <div className="notfound-filmstrip notfound-filmstrip--bottom">
                <div className="notfound-filmstrip__track" />
            </div>

        </div>
    );
};

export default NotFound;