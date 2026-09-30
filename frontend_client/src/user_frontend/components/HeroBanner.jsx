// src/user_frontend/components/HeroBanner.jsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import MagneticButton from "../components/MagneticButton";
import "../styles/HeroBanner.css";


/* ============================================================
   HERO BANNER — VIDEO LOCAL (FIXED)
   ============================================================
   ✅ Video LUÔN render — không có điều kiện skip
   ✅ Fade-in khi ready
   ✅ Pause khi out viewport / tab ẩn
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

    const rootRef = useRef(null);
    const videoRef = useRef(null);

    const [videoReady, setVideoReady] = useState(false);


    /* ========================================================
       VIDEO PLAYBACK CONTROL
    ======================================================== */

    useEffect(() => {
        const video = videoRef.current;
        const root = rootRef.current;
        if (!video || !root) return;

        let cancelled = false;

        const revealVideo = () => {
            if (cancelled) return;
            // 2× rAF để chắc chắn frame đầu đã paint
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!cancelled) setVideoReady(true);
                });
            });
        };

        const tryPlay = () => {
            const p = video.play();
            if (p && typeof p.then === "function") {
                p.then(revealVideo).catch(revealVideo);
            } else {
                revealVideo();
            }
        };

        // Nếu video đã load xong → play luôn
        if (video.readyState >= 2) {
            tryPlay();
        } else {
            video.addEventListener("canplay", tryPlay, { once: true });
        }

        // Fallback: nếu 1.5s sau vẫn chưa ready → force hiện
        const fallbackTimer = setTimeout(() => {
            if (video.readyState >= 2) tryPlay();
            else revealVideo();
        }, 1500);

        // Pause khi tab ẩn
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        // Pause khi hero out viewport
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            },
            { threshold: 0.05 }
        );
        observer.observe(root);

        return () => {
            cancelled = true;
            clearTimeout(fallbackTimer);
            video.removeEventListener("canplay", tryPlay);
            document.removeEventListener("visibilitychange", handleVisibility);
            observer.disconnect();
        };
    }, []);


    /* ========================================================
       HANDLERS
    ======================================================== */

    const goBooking = () => navigate("/booking");
    const goMovies = () => navigate("/movies");


    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <header
            ref={rootRef}
            className={`hero-banner ${videoReady ? "hero-banner--video-ready" : ""}`}
        >

            {/* ==============================================
                VIDEO BACKGROUND
            ============================================== */}

            <div className="hero-banner__bg">
                <div className="hero-banner__video-fallback" />

                {/* ✅ Video LUÔN render — không có điều kiện */}
                <video
                    ref={videoRef}
                    className="hero-banner__video"
                    src={videoSrc}
                    loop
                    muted
                    playsInline
                    autoPlay
                    preload="auto"
                    disablePictureInPicture
                    disableRemotePlayback
                    x-webkit-airplay="deny"
                    style={{
                        // ✅ Force hiện video — override CSS opacity: 0
                        opacity: videoReady ? 1 : 0.85,
                    }}
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
                            <SplitText text="CHẠM" baseDelay={0.3} charDelay={0.075} duration={0.9} />
                        </span>
                        <span className="hero-banner__title-outline">
                            <SplitText text="ẢNH" baseDelay={0.66} charDelay={0.075} duration={0.95} />
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