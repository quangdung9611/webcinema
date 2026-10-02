// src/user_frontend/components/HeroBanner.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

import MagneticButton from "../components/MagneticButton";
import LazyBackgroundVideo from "../components/LazyBackgroundVideo";

import "../styles/HeroBanner.css";

/* ============================================================
   HERO BANNER — VIDEO BACKGROUND (LAZY LOAD)
============================================================ */

const VIDEO_SRC = "/video_xambac.mp4";

/* ============================================================
   SPLIT TEXT
============================================================ */

const SplitText = ({
    text,
    className = "",
    baseDelay = 0,
    charDelay = 0.055,
    duration = 0.85,
}) => {
    const chars = Array.from(text);

    return (
        <span className={`split-text ${className}`} aria-label={text}>
            {chars.map((char, index) => (
                <span
                    key={`${char}-${index}`}
                    className="split-text__char"
                    style={{
                        animationDelay: `${(baseDelay + index * charDelay).toFixed(3)}s`,
                        animationDuration: `${duration}s`,
                    }}
                >
                    {char === " " ? "\u00A0" : char}
                </span>
            ))}
        </span>
    );
};

/* ============================================================
   MAIN
============================================================ */

const HeroBanner = ({ videoSrc = VIDEO_SRC }) => {
    const navigate = useNavigate();
    const [videoReady, setVideoReady] = useState(false);

    const goBooking = () => navigate("/booking");
    const goMovies = () => navigate("/movies");

    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <header
            className={`hero-banner ${videoReady ? "hero-banner--video-ready" : ""}`}
        >
            {/* ==============================================
                VIDEO BACKGROUND — Dùng LazyBackgroundVideo
            ============================================== */}

            <div className="hero-banner__bg">
                <div className="hero-banner__video-fallback" />

                <LazyBackgroundVideo
                    src={videoSrc}
                    className="hero-banner__video"
                    onReady={() => setVideoReady(true)}
                />
            </div>

            {/* ==============================================
                CINEMATIC OVERLAY
            ============================================== */}

            <div className="hero-banner__overlay-layer">
                <div className="hero-banner__overlay-base" />
                <div className="hero-banner__overlay-side" />
                <div className="hero-banner__overlay-bottom" />
                <div className="hero-banner__vignette" />
            </div>

            {/* ==============================================
                DECORATIVE FRAME
            ============================================== */}

            <div className="hero-banner__frame" aria-hidden="true">
                <span className="hero-banner__frame-corner hero-banner__frame-corner--tl" />
                <span className="hero-banner__frame-corner hero-banner__frame-corner--tr" />
                <span className="hero-banner__frame-corner hero-banner__frame-corner--bl" />
                <span className="hero-banner__frame-corner hero-banner__frame-corner--br" />
            </div>

            {/* ==============================================
                MAIN CONTENT
            ============================================== */}

            <div className="hero-banner__content">
                <div className="hero-banner__left">
                    <div className="hero-banner__eyebrow hero-banner__enter hero-banner__enter--d1">
                        <span className="hero-banner__eyebrow-line" />
                        <span>TRẢI NGHIỆM ĐIỆN ẢNH ĐỈNH CAO</span>
                        <span className="hero-banner__eyebrow-dot" />
                    </div>

                    <h1 className="hero-banner__title">
                        <span className="hero-banner__title-solid">
                            <SplitText
                                text="CHẠM"
                                baseDelay={0.3}
                                charDelay={0.075}
                                duration={0.9}
                            />
                        </span>
                        <span className="hero-banner__title-outline">
                            <SplitText
                                text="ẢNH"
                                baseDelay={0.66}
                                charDelay={0.075}
                                duration={0.95}
                            />
                        </span>
                        <span className="hero-banner__title-accent" aria-hidden="true" />
                    </h1>

                    <div className="hero-banner__divider hero-banner__enter hero-banner__enter--grow hero-banner__enter--d2">
                        <span />
                    </div>

                    <p className="hero-banner__description hero-banner__enter hero-banner__enter--d3">
                        Âm thanh vòm sống động, hình ảnh 4K sắc nét và những câu chuyện lay
                        động lòng người. Mỗi suất chiếu tại Quang Dũng Cinema là một hành
                        trình điện ảnh đáng nhớ.
                    </p>

                    <div className="hero-banner__actions hero-banner__enter hero-banner__enter--d4">
                        <MagneticButton
                            className="hero-banner__btn hero-banner__btn--primary"
                            onClick={goBooking}
                            strength={0.25}
                            radius={100}
                            aria-label="Đặt vé ngay"
                        >
                            <span className="hero-banner__btn-shine" />
                            <span className="hero-banner__btn-content">
                                <span>Đặt vé ngay</span>
                                <ArrowRight size={17} strokeWidth={2} />
                            </span>
                        </MagneticButton>

                        <button
                            type="button"
                            className="hero-banner__btn hero-banner__btn--secondary"
                            onClick={goMovies}
                        >
                            <span className="hero-banner__play-icon">
                                <Play size={13} fill="currentColor" strokeWidth={0} />
                            </span>
                            <span>Khám phá phim</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default HeroBanner;