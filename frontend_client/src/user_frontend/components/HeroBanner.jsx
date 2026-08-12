import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HeroBanner.css";

const HeroBanner = ({ videoSrc = "/vutru_video.mp4" }) => {
    const navigate = useNavigate();

    // ==========================================================
    // GLOBAL MOUSE POSITION
    // ==========================================================
    useEffect(() => {
        const handleGlobalMouseMove = (e) => {
            document.documentElement.style.setProperty(
                "--mouse-x",
                `${e.clientX}px`
            );

            document.documentElement.style.setProperty(
                "--mouse-y",
                `${e.clientY}px`
            );
        };

        window.addEventListener("mousemove", handleGlobalMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleGlobalMouseMove);
        };
    }, []);

    // ==========================================================
    // LOCAL MOUSE POSITION
    // ==========================================================
    const handleLocalMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();

        e.currentTarget.style.setProperty(
            "--mouse-x",
            `${e.clientX - rect.left}px`
        );

        e.currentTarget.style.setProperty(
            "--mouse-y",
            `${e.clientY - rect.top}px`
        );
    };

    return (
        <div className="nox-hero-wrapper">

            {/* ==================================================
                HERO
            ================================================== */}
            <section className="nox-hero">

                {/* ==================================================
                    VIDEO BACKGROUND
                ================================================== */}
                <div className="nox-hero-video">

                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                    >
                        <source
                            src={videoSrc}
                            type="video/mp4"
                        />
                    </video>

                    {/* Overlay toàn video - cực nhẹ */}
                    <div className="nox-video-overlay" />

                    {/* Gradient bên trái hỗ trợ chữ */}
                    <div className="nox-video-text-gradient" />

                    {/* Glow theo chuột */}
                    <div className="nox-video-glow" />

                </div>


                {/* ==================================================
                    FRAME
                ================================================== */}
                <div className="nox-hero-frame" />


                {/* ==================================================
                    HERO CONTENT
                ================================================== */}
                <div className="nox-hero-content">
                    {/* ==================================================
                        LABEL
                    ================================================== */}
                    <span className="nox-hero-label">
                        TRẢI NGHIỆM ĐIỆN ẢNH SỐNG ĐỘNG
                    </span>


                    {/* ==================================================
                        TITLE
                    ================================================== */}
                    <h1 className="nox-hero-title">
                        <span>Beyond</span>
                        <span>Screen</span>
                    </h1>


                    {/* ==================================================
                        DESCRIPTION
                    ================================================== */}
                    <p className="nox-hero-description">
                        Âm thanh sống động, hình ảnh tuyệt đẹp và những
                        câu chuyện đưa bạn bước vào một thế giới khác.
                        Nơi nghệ thuật điện ảnh được trải nghiệm theo
                        một cách hoàn toàn mới.
                    </p>


                    {/* ==================================================
                        BUTTONS
                    ================================================== */}
                    <div className="nox-hero-actions">

                        <button
                            className="
                                nox-liquid-btn
                                nox-primary-btn
                            "
                            onMouseMove={handleLocalMouseMove}
                            onClick={() => navigate("/booking")}
                        >
                            <span>Đặt vé ngay</span>
                        </button>


                        <button
                            className="
                                nox-liquid-btn
                                nox-secondary-btn
                            "
                            onMouseMove={handleLocalMouseMove}
                            onClick={() => navigate("/movies")}
                        >
                            <span>Khám phá phim</span>
                        </button>

                    </div>

                </div>


                {/* ==================================================
                    BOTTOM GLASS LINE
                ================================================== */}
                <div className="nox-hero-bottom-glass" />

            </section>

        </div>
    );
};

export default HeroBanner;