import React, {
    useEffect,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";

import {
    ArrowDown,
    ArrowRight,
    Play,
    Sparkles,
} from "lucide-react";

import MagneticButton from "../components/MagneticButton";

import "../styles/HeroBanner.css";


/* ============================================================
   HERO BANNER
   QUANG DŨNG CINEMA — CINEMATIC PLATINUM EDITION

   LAYERS:

   01. Video
   02. Cinematic overlays
   03. Light beam
   04. Grain
   05. Content
   06. Cinema metadata
   07. Scroll progress
   08. Frame decoration

   Không dùng TiltCard trong Hero.
   ============================================================ */


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
        <span
            className={`split-text ${className}`}
            aria-label={text}
        >
            {chars.map((char, index) => (
                <motion.span
                    key={`${char}-${index}`}
                    className="split-text__char"
                    initial={{
                        opacity: 0,
                        y: 70,
                        rotateX: -78,
                        filter: "blur(8px)",
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        rotateX: 0,
                        filter: "blur(0px)",
                    }}
                    transition={{
                        duration,
                        delay:
                            baseDelay +
                            index * charDelay,
                        ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                        display: "inline-block",
                        transformOrigin:
                            "50% 100%",
                    }}
                >
                    {char === " "
                        ? "\u00A0"
                        : char}
                </motion.span>
            ))}
        </span>
    );
};


/* ============================================================
   HERO METADATA
   ============================================================ */

const CinemaMeta = () => {
    return (
        <motion.div
            className="hero-banner__meta"
            initial={{
                opacity: 0,
                x: 45,
                filter: "blur(10px)",
            }}
            animate={{
                opacity: 1,
                x: 0,
                filter: "blur(0px)",
            }}
            transition={{
                duration: 1.1,
                delay: 1.25,
                ease: [0.16, 1, 0.3, 1],
            }}
        >
            <div className="hero-banner__meta-line" />

            <span className="hero-banner__meta-label">
                QUANG DŨNG CINEMA
            </span>

            <div className="hero-banner__meta-items">
                <span>4K</span>
                <i />
                <span>DOLBY ATMOS</span>
                <i />
                <span>VIP</span>
            </div>

            <div className="hero-banner__meta-caption">
                MỖI KHUNG HÌNH
                <br />
                MỘT CẢM XÚC
            </div>

            <motion.div
                className="hero-banner__meta-orbit"
                animate={{
                    rotate: 360,
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "linear",
                }}
            >
                <span />
            </motion.div>
        </motion.div>
    );
};


/* ============================================================
   MAIN
   ============================================================ */

const HeroBanner = ({
    videoSrc =
        "https://res.cloudinary.com/mlznpd9x/video/upload/v1790042515/movietheater_video_dyynv5.mp4",
}) => {
    const navigate = useNavigate();

    const videoRef = useRef(null);
    const overlayRef = useRef(null);
    const contentRef = useRef(null);

    const [videoLoaded, setVideoLoaded] =
        useState(false);

    const [scrollProgress, setScrollProgress] =
        useState(0);

    /* ========================================================
       MOUSE PARALLAX

       Chỉ dùng cho background / decoration.
       Không đụng transform của MagneticButton.
    ======================================================== */

    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);

    const smoothPointerX = useSpring(
        pointerX,
        {
            stiffness: 80,
            damping: 22,
            mass: 0.8,
        }
    );

    const smoothPointerY = useSpring(
        pointerY,
        {
            stiffness: 80,
            damping: 22,
            mass: 0.8,
        }
    );

    const ambientX = useTransform(
        smoothPointerX,
        [-0.5, 0.5],
        [-12, 12]
    );

    const ambientY = useTransform(
        smoothPointerY,
        [-0.5, 0.5],
        [-8, 8]
    );

    const beamX = useTransform(
        smoothPointerX,
        [-0.5, 0.5],
        [-35, 35]
    );

    /* ========================================================
       MOUSE MOVE
    ======================================================== */

    useEffect(() => {
        const mediaQuery = window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        );

        if (!mediaQuery.matches) return;

        let raf = null;

        const handlePointerMove = (event) => {
            if (raf) return;

            raf = requestAnimationFrame(() => {
                const x =
                    event.clientX /
                        window.innerWidth -
                    0.5;

                const y =
                    event.clientY /
                        window.innerHeight -
                    0.5;

                pointerX.set(
                    Math.max(
                        -0.5,
                        Math.min(0.5, x)
                    )
                );

                pointerY.set(
                    Math.max(
                        -0.5,
                        Math.min(0.5, y)
                    )
                );

                raf = null;
            });
        };

        window.addEventListener(
            "pointermove",
            handlePointerMove,
            { passive: true }
        );

        return () => {
            window.removeEventListener(
                "pointermove",
                handlePointerMove
            );

            if (raf) {
                cancelAnimationFrame(raf);
            }
        };
    }, [pointerX, pointerY]);


    /* ========================================================
       SCROLL PARALLAX
    ======================================================== */

    useEffect(() => {
        const mediaQuery =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            );

        if (mediaQuery.matches) return;

        let rafId = null;
        let ticking = false;

        const update = () => {
            const scrollY =
                window.scrollY || 0;

            const viewportHeight =
                window.innerHeight || 1;

            const progress = Math.min(
                Math.max(
                    scrollY / viewportHeight,
                    0
                ),
                1
            );

            setScrollProgress(progress);

            /* ----------------------------------------------
               VIDEO
            ---------------------------------------------- */

            if (videoRef.current) {
                const scale =
                    1.045 +
                    progress * 0.11;

                const y =
                    progress * 34;

                videoRef.current.style.transform =
                    `scale(${scale}) translate3d(0, ${y}px, 0)`;

                videoRef.current.style.filter =
                    `brightness(${1 -
                        progress * 0.08
                    }) saturate(${1 -
                        progress * 0.06
                    })`;
            }


            /* ----------------------------------------------
               OVERLAY
            ---------------------------------------------- */

            if (overlayRef.current) {
                const y =
                    progress * 45;

                const opacity =
                    0.1 +
                    progress * 0.28;

                overlayRef.current.style.transform =
                    `translate3d(0, ${y}px, 0)`;

                overlayRef.current.style.opacity =
                    opacity;
            }


            /* ----------------------------------------------
               CONTENT
            ---------------------------------------------- */

            if (contentRef.current) {
                const y =
                    progress * 90;

                const scale =
                    1 -
                    progress * 0.045;

                const opacity =
                    1 -
                    progress * 0.72;

                const blur =
                    progress * 3;

                contentRef.current.style.transform =
                    `translate3d(0, ${y}px, 0) scale(${scale})`;

                contentRef.current.style.opacity =
                    opacity;

                contentRef.current.style.filter =
                    `blur(${blur}px)`;
            }

            ticking = false;
        };

        const requestUpdate = () => {
            if (ticking) return;

            ticking = true;

            rafId =
                requestAnimationFrame(update);
        };

        update();

        window.addEventListener(
            "scroll",
            requestUpdate,
            { passive: true }
        );

        window.addEventListener(
            "resize",
            requestUpdate,
            { passive: true }
        );

        return () => {
            if (rafId !== null) {
                cancelAnimationFrame(
                    rafId
                );
            }

            window.removeEventListener(
                "scroll",
                requestUpdate
            );

            window.removeEventListener(
                "resize",
                requestUpdate
            );
        };
    }, []);


    /* ========================================================
       VIDEO PLAYBACK
    ======================================================== */

    useEffect(() => {
        const video =
            videoRef.current;

        if (!video) return;

        const attemptPlay = () => {
            video
                .play()
                .catch(() => {
                    /* Browser có thể chặn autoplay.
                       Video muted nên đa số browser vẫn cho phép. */
                });
        };

        attemptPlay();

        const handleVisibility = () => {
            if (
                document.visibilityState ===
                "visible"
            ) {
                attemptPlay();
            }
        };

        document.addEventListener(
            "visibilitychange",
            handleVisibility
        );

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibility
            );
        };
    }, []);


    /* ========================================================
       ANIMATION VARIANTS
    ======================================================== */

    const containerVariants = {
        hidden: {
            opacity: 0,
        },

        visible: {
            opacity: 1,

            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.15,
            },
        },
    };


    const itemVariants = {
        hidden: {
            opacity: 0,
            y: 28,
            filter: "blur(7px)",
        },

        visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",

            transition: {
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1],
            },
        },
    };


    /* ========================================================
       BUTTON HANDLERS
    ======================================================== */

    const goBooking = () => {
        navigate("/booking");
    };

    const goMovies = () => {
        navigate("/movies");
    };


    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <header
            className={`hero-banner ${
                videoLoaded
                    ? "hero-banner--loaded"
                    : ""
            }`}
        >

            {/* ==================================================
                VIDEO BACKGROUND
            ================================================== */}

            <div className="hero-banner__bg">
                <video
                    ref={videoRef}
                    className="hero-banner__video"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    onLoadedData={() =>
                        setVideoLoaded(true)
                    }
                >
                    <source
                        src={videoSrc}
                        type="video/mp4"
                    />
                </video>

                <div className="hero-banner__video-fallback" />
            </div>


            {/* ==================================================
                CINEMATIC OVERLAY
            ================================================== */}

            <div
                ref={overlayRef}
                className="hero-banner__overlay-layer"
            >
                <div className="hero-banner__overlay-base" />

                <div className="hero-banner__overlay-side" />

                <div className="hero-banner__overlay-bottom" />

                <div className="hero-banner__vignette" />

                <motion.div
                    className="hero-banner__beam"
                    style={{
                        x: beamX,
                    }}
                />

                <div className="hero-banner__grain" />

                <div className="hero-banner__scanlines" />
            </div>


            {/* ==================================================
                DECORATIVE FRAME
            ================================================== */}

            <div
                className="hero-banner__frame"
                aria-hidden="true"
            >
                <span className="hero-banner__frame-corner hero-banner__frame-corner--tl" />
                <span className="hero-banner__frame-corner hero-banner__frame-corner--tr" />
                <span className="hero-banner__frame-corner hero-banner__frame-corner--bl" />
                <span className="hero-banner__frame-corner hero-banner__frame-corner--br" />
            </div>


            {/* ==================================================
                TOP BRAND LINE
            ================================================== */}

            <motion.div
                className="hero-banner__brandline"
                initial={{
                    opacity: 0,
                    y: -15,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.8,
                    delay: 0.3,
                }}
            >
                <span>
                    QUANG DŨNG CINEMA
                </span>

                <i />

                <span>
                    EST. 2026
                </span>
            </motion.div>


            {/* ==================================================
                MAIN CONTENT
            ================================================== */}

            <motion.div
                ref={contentRef}
                className="hero-banner__content"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >

                {/* ----------------------------------------------
                   LEFT
                ---------------------------------------------- */}

                <div
                    className="hero-banner__left"
                >

                    {/* EYEBROW */}

                    <motion.div
                        className="hero-banner__eyebrow"
                        variants={itemVariants}
                    >
                        <span className="hero-banner__eyebrow-line" />

                        <span>
                            TRẢI NGHIỆM ĐIỆN ẢNH
                            ĐỈNH CAO
                        </span>

                        <span className="hero-banner__eyebrow-dot" />
                    </motion.div>


                    {/* TITLE */}

                    <h1
                        className="hero-banner__title"
                    >
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

                        <motion.span
                            className="hero-banner__title-accent"
                            initial={{
                                scaleX: 0,
                                opacity: 0,
                            }}
                            animate={{
                                scaleX: 1,
                                opacity: 1,
                            }}
                            transition={{
                                duration: 1.2,
                                delay: 1.25,
                                ease: [
                                    0.16,
                                    1,
                                    0.3,
                                    1,
                                ],
                            }}
                        />
                    </h1>


                    {/* SUBTITLE */}

                    <motion.div
                        className="hero-banner__subtitle"
                        variants={itemVariants}
                    >
                        <span>
                            NƠI CÂU CHUYỆN
                        </span>

                        <span className="hero-banner__subtitle-line" />

                        <span>
                            TRỞ NÊN SỐNG ĐỘNG
                        </span>
                    </motion.div>


                    {/* DIVIDER */}

                    <motion.div
                        className="hero-banner__divider"
                        initial={{
                            scaleX: 0,
                            opacity: 0,
                        }}
                        animate={{
                            scaleX: 1,
                            opacity: 1,
                        }}
                        transition={{
                            duration: 1.2,
                            delay: 1.18,
                            ease: [
                                0.16,
                                1,
                                0.3,
                                1,
                            ],
                        }}
                        style={{
                            transformOrigin:
                                "left center",
                        }}
                    >
                        <span />
                    </motion.div>


                    {/* DESCRIPTION */}

                    <motion.p
                        className="hero-banner__description"
                        variants={itemVariants}
                    >
                        Âm thanh vòm sống động,
                        hình ảnh 4K sắc nét và
                        những câu chuyện lay động
                        lòng người. Mỗi suất chiếu
                        tại Quang Dũng Cinema là
                        một hành trình điện ảnh
                        đáng nhớ.
                    </motion.p>


                    {/* ACTIONS */}

                    <motion.div
                        className="hero-banner__actions"
                        variants={itemVariants}
                    >

                        <MagneticButton
                            className="hero-banner__btn hero-banner__btn--primary"
                            onClick={goBooking}
                            strength={0.38}
                            radius={130}
                            aria-label="Đặt vé ngay"
                        >
                            <span className="hero-banner__btn-shine" />

                            <span className="hero-banner__btn-content">
                                <span>
                                    Đặt vé ngay
                                </span>

                                <ArrowRight
                                    size={17}
                                    strokeWidth={2}
                                />
                            </span>
                        </MagneticButton>


                        <motion.button
                            type="button"
                            className="hero-banner__btn hero-banner__btn--secondary"
                            onClick={goMovies}
                            whileHover={{
                                y: -3,
                            }}
                            whileTap={{
                                scale: 0.97,
                            }}
                        >
                            <span className="hero-banner__play-icon">
                                <Play
                                    size={13}
                                    fill="currentColor"
                                    strokeWidth={0}
                                />
                            </span>

                            <span>
                                Khám phá phim
                            </span>
                        </motion.button>

                    </motion.div>


                    {/* TRUST LINE */}

                    <motion.div
                        className="hero-banner__trust"
                        initial={{
                            opacity: 0,
                            y: 15,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        transition={{
                            duration: 0.8,
                            delay: 1.8,
                        }}
                    >
                        <Sparkles size={13} />

                        <span>
                            TRẢI NGHIỆM ĐIỆN ẢNH
                            THEO CÁCH CỦA BẠN
                        </span>
                    </motion.div>

                </div>


                {/* ----------------------------------------------
                   RIGHT CINEMA META
                ---------------------------------------------- */}

                <motion.div
                    className="hero-banner__right"
                    style={{
                        x: ambientX,
                        y: ambientY,
                    }}
                >
                    <CinemaMeta />
                </motion.div>

            </motion.div>


            {/* ==================================================
                SCROLL INDICATOR
            ================================================== */}

            <motion.div
                className="hero-banner__scroll-indicator"
                initial={{
                    opacity: 0,
                    y: -10,
                }}
                animate={{
                    opacity:
                        scrollProgress > 0.12
                            ? 0
                            : 1,
                    y: 0,
                }}
                transition={{
                    delay: 2,
                    duration: 0.7,
                }}
            >
                <span>
                    CUỘN XUỐNG
                </span>

                <motion.div
                    className="hero-banner__scroll-line"
                    animate={{
                        y: [0, 9, 0],
                        opacity: [
                            0.35,
                            1,
                            0.35,
                        ],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <ArrowDown
                        size={12}
                        strokeWidth={1.5}
                    />
                </motion.div>
            </motion.div>


            {/* ==================================================
                RIGHT SCROLL PROGRESS
            ================================================== */}

            <div
                className="hero-banner__progress"
                aria-hidden="true"
            >
                <span className="hero-banner__progress-label">
                    01
                </span>

                <div className="hero-banner__progress-track">
                    <motion.span
                        className="hero-banner__progress-fill"
                        style={{
                            scaleY: scrollProgress,
                            transformOrigin:
                                "top center",
                        }}
                    />
                </div>

                <span className="hero-banner__progress-label">
                    04
                </span>
            </div>

        </header>
    );
};

export default HeroBanner;