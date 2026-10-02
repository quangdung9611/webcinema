import React, { useRef, useState, useEffect } from 'react';
import '../styles/LazyBackgroundVideo.css';

/* ==========================================================
   LAZY BACKGROUND VIDEO — Cho hero banner / background
   ----------------------------------------------------------
   ✅ Không có poster + play button
   ✅ Chỉ load khi gần vào viewport
   ✅ Pause khi ra khỏi viewport / tab ẩn
   ✅ Fade in mượt khi ready
   ========================================================== */

const LazyBackgroundVideo = ({
    src,
    poster,
    className = '',
    style = {},
    rootMargin = '100px',
    onReady,
}) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    const [isInView, setIsInView] = useState(false);
    const [isReady, setIsReady] = useState(false);

    /* ======================================================
       LOAD KHI GẦN VÀO VIEWPORT
    ====================================================== */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        if (!('IntersectionObserver' in window)) {
            setIsInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [rootMargin]);

    /* ======================================================
       PAUSE KHI TAB ẨN / HIỆN
    ====================================================== */
    useEffect(() => {
        if (!isInView) return;

        const video = videoRef.current;
        if (!video) return;

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () =>
            document.removeEventListener('visibilitychange', handleVisibility);
    }, [isInView]);

    /* ======================================================
       PAUSE KHI RA KHỎI VIEWPORT
    ====================================================== */
    useEffect(() => {
        if (!isInView) return;

        const el = containerRef.current;
        const video = videoRef.current;
        if (!el || !video) return;

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

        observer.observe(el);
        return () => observer.disconnect();
    }, [isInView]);

    /* ======================================================
       KHI VIDEO CAN PLAY
    ====================================================== */
    const handleCanPlay = () => {
        const video = videoRef.current;
        if (!video) return;

        const reveal = () => {
            setIsReady(true);
            onReady?.();
        };

        video
            .play()
            .then(reveal)
            .catch(reveal); // Nếu autoplay bị chặn, vẫn hiện video
    };

    /* ======================================================
       RENDER
    ====================================================== */
    return (
        <div
            ref={containerRef}
            className={`lazy-bg-video ${isReady ? 'is-ready' : ''} ${className}`}
            style={style}
        >
            {isInView && (
                <video
                    ref={videoRef}
                    className="lazy-bg-video__el"
                    src={src}
                    poster={poster}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    disablePictureInPicture
                    disableRemotePlayback
                    x-webkit-airplay="deny"
                    onCanPlay={handleCanPlay}
                />
            )}
        </div>
    );
};

export default LazyBackgroundVideo;