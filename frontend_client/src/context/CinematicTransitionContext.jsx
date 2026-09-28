import React, { createContext, useContext, useState, useRef, useCallback } from "react";

/* ============================================================
   CINEMATIC TRANSITION CONTEXT
   ============================================================
   ✅ Quản lý state chuyển cảnh "cinematic"
   ✅ Lưu ảnh poster + vị trí khi click
   ✅ Trigger overlay đen + navigate
============================================================ */

const CinematicTransitionContext = createContext(null);

export const useCinematicTransition = () => {
    const context = useContext(CinematicTransitionContext);
    if (!context) {
        throw new Error("useCinematicTransition must be used within CinematicTransitionProvider");
    }
    return context;
};

export const CinematicTransitionProvider = ({ children }) => {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [posterUrl, setPosterUrl] = useState(null);
    const [targetRect, setTargetRect] = useState(null);
    const [sourceRect, setSourceRect] = useState(null);

    const timeoutRef = useRef(null);

    /* ========================================================
       TRIGGER TRANSITION
       ========================================================
       - Gọi khi user click "Xem chi tiết"
       - Capture vị trí ảnh poster
       - Bật overlay đen
       - Callback navigate sau ~250ms
    ======================================================== */
    const triggerTransition = useCallback(({ poster, sourceElement, onComplete }) => {
        if (!poster) {
            // Không có ảnh → navigate luôn
            if (onComplete) onComplete();
            return;
        }

        // Capture vị trí ảnh nguồn
        let rect = null;
        if (sourceElement) {
            const r = sourceElement.getBoundingClientRect();
            rect = {
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
            };
        }

        setPosterUrl(poster);
        setSourceRect(rect);
        setTargetRect(null);
        setIsTransitioning(true);

        // Clear timeout cũ
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Navigate sau khi overlay đã đen
        timeoutRef.current = setTimeout(() => {
            if (onComplete) onComplete();
        }, 280);
    }, []);

    /* ========================================================
       COMPLETE TRANSITION
       ========================================================
       - Gọi từ MovieDetail sau khi mount
       - Fade out overlay
    ======================================================== */
    const completeTransition = useCallback(() => {
        // Delay nhẹ để poster trong detail kịp render
        setTimeout(() => {
            setIsTransitioning(false);
            setPosterUrl(null);
            setSourceRect(null);
            setTargetRect(null);
        }, 200);
    }, []);

    /* ========================================================
       RESET
    ======================================================== */
    const resetTransition = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsTransitioning(false);
        setPosterUrl(null);
        setSourceRect(null);
        setTargetRect(null);
    }, []);

    const value = {
        isTransitioning,
        posterUrl,
        sourceRect,
        targetRect,
        triggerTransition,
        completeTransition,
        resetTransition,
    };

    return (
        <CinematicTransitionContext.Provider value={value}>
            {children}
        </CinematicTransitionContext.Provider>
    );
};

export default CinematicTransitionContext;