import React, { useRef, useState, useEffect } from 'react';
import '../styles/LazyVideo.css';

const LazyVideo = ({
    src,
    poster,
    autoPlay = false,
    muted = true,
    loop = false,
    controls = true,
    playsInline = true,
    className = '',
    style = {},
    aspectRatio = '16 / 9',
    showPlayButton = true,
    rootMargin = '300px',
    onPlay,
    onPause,
    onEnded,
    ...props
}) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    const [isInView, setIsInView] = useState(autoPlay);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (autoPlay) return;
        const el = containerRef.current;
        if (!el) return;

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
    }, [autoPlay, rootMargin]);

    useEffect(() => {
        if (!isPlaying) return;
        const el = containerRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const video = videoRef.current;
                if (video && !entry.isIntersecting) {
                    video.pause();
                }
            },
            { threshold: 0.3 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [isPlaying]);

    const handlePlayClick = (e) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (video) {
            video.play().catch((err) => console.warn('[Video]', err));
        }
    };

    return (
        <div
            ref={containerRef}
            className={`lazy-video ${className}`}
            style={{ aspectRatio, ...style }}
            data-lenis-prevent
        >
            {isInView ? (
                <video
                    ref={videoRef}
                    className="lazy-video__player"
                    src={src}
                    poster={poster}
                    autoPlay={autoPlay}
                    muted={muted}
                    loop={loop}
                    controls={controls}
                    playsInline={playsInline}
                    preload="metadata"
                    onPlay={(e) => {
                        setIsPlaying(true);
                        onPlay?.(e);
                    }}
                    onPause={(e) => {
                        setIsPlaying(false);
                        onPause?.(e);
                    }}
                    onEnded={onEnded}
                    {...props}
                />
            ) : (
                <>
                    {poster && (
                        <img
                            src={poster}
                            alt="Video poster"
                            className="lazy-video__poster"
                            loading="lazy"
                            decoding="async"
                        />
                    )}
                    {showPlayButton && (
                        <button
                            type="button"
                            className="lazy-video__play-btn"
                            onClick={handlePlayClick}
                            aria-label="Phát video"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default LazyVideo;