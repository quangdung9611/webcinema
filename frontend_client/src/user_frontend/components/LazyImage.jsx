import React, { useState, useEffect, useRef } from 'react';
import '../styles/LazyImage.css';

const LazyImage = ({
    src,
    alt = '',
    className = '',
    style = {},
    placeholderColor = 'transparent',
    priority = false,
    rootMargin = '200px',
    fallback = '/placeholder.jpg',
    fill = false,              // ✅ Prop mới — dùng cho Swiper slide
    onLoad,
    onError,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const [hasError, setHasError] = useState(false);

    const imgRef = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (priority || isInView) return;

        const el = wrapperRef.current;
        if (!el || !('IntersectionObserver' in window)) {
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
    }, [priority, isInView, rootMargin]);

    useEffect(() => {
        if (!isInView || !imgRef.current) return;
        const img = imgRef.current;
        if (img.complete && img.naturalHeight > 0) {
            setIsLoaded(true);
        }
    }, [isInView]);

    const handleLoad = (e) => {
        setIsLoaded(true);
        onLoad?.(e);
    };

    const handleError = (e) => {
        setHasError(true);
        setIsLoaded(true);
        onError?.(e);
    };

    return (
        <div
            ref={wrapperRef}
            className={`lazy-image-wrapper ${fill ? 'is-fill' : ''}`}
            style={{ backgroundColor: placeholderColor }}
        >
            {isInView && (
                <img
                    ref={imgRef}
                    src={hasError ? fallback : src}
                    alt={alt}
                    className={`lazy-image ${isLoaded ? 'is-loaded' : 'is-loading'} ${className}`}
                    style={style}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding={priority ? 'sync' : 'async'}
                    fetchPriority={priority ? 'high' : 'auto'}
                    onLoad={handleLoad}
                    onError={handleError}
                    {...props}
                />
            )}
        </div>
    );
};

export default LazyImage;