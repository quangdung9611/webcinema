import React, { useRef, useState, useCallback } from "react";
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";

import "../styles/TlitCard.css";

/**
 * ============================================================
 * TILT CARD — LITE EDITION (SMOOTH 60FPS)
 * ============================================================
 *
 * TỐI ƯU:
 * ✅ Bỏ filter blur → dùng box-shadow tĩnh
 * ✅ Bỏ mix-blend-mode → dùng opacity
 * ✅ Bỏ conic-gradient + mask → linear gradient
 * ✅ Chỉ 3 layer thay vì 6
 * ✅ Spring mềm hơn
 * ✅ Multi-layer tắt mặc định
 * ✅ Chỉ set will-change trên stage
 *
 * Props:
 * - maxTilt       : number
 * - scale         : number
 * - perspective   : number
 * - glare         : boolean
 * - shadow        : boolean
 * - edgeHighlight : boolean
 * - multiLayer    : boolean (mặc định false)
 * - depth         : number
 * - disabled      : boolean
 */

const DEFAULT_SPRING = {
    stiffness: 260,
    damping: 26,
    mass: 0.7,
};

const TiltCard = ({
    children,

    maxTilt = 8,
    scale = 1.02,
    perspective = 1000,

    glare = true,
    shadow = true,
    edgeHighlight = true,

    multiLayer = false,
    depth = 8,

    springConfig = DEFAULT_SPRING,

    className = "",
    style = {},

    disabled = false,
}) => {
    const containerRef = useRef(null);

    const [isHovered, setIsHovered] = useState(false);

    /* ============================================================
       MOTION VALUES
    ============================================================ */

    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);

    const smoothX = useSpring(pointerX, springConfig);
    const smoothY = useSpring(pointerY, springConfig);

    /* ============================================================
       3D ROTATION
    ============================================================ */

    const rotateX = useTransform(smoothY, [-0.5, 0.5], [maxTilt, -maxTilt]);
    const rotateY = useTransform(smoothX, [-0.5, 0.5], [-maxTilt, maxTilt]);

    /* ============================================================
       HOVER SCALE — spring mềm
    ============================================================ */

    const hoverScale = useSpring(isHovered && !disabled ? scale : 1, {
        stiffness: 220,
        damping: 22,
        mass: 0.8,
    });

    /* ============================================================
       GLARE POSITION
    ============================================================ */

    const glareX = useTransform(smoothX, [-0.5, 0.5], ["0%", "100%"]);
    const glareY = useTransform(smoothY, [-0.5, 0.5], ["0%", "100%"]);

    const glareOpacity = useMotionValue(0);
    const smoothGlareOpacity = useSpring(glareOpacity, {
        stiffness: 180,
        damping: 28,
        mass: 0.6,
    });

    /* ============================================================
       EDGE ANGLE (đơn giản hoá — không dùng conic nữa)
    ============================================================ */

    const edgeOpacity = useTransform(
        smoothGlareOpacity,
        [0, 1],
        [0, 0.85]
    );

    /* ============================================================
       DEPTH PARALLAX (chỉ khi multiLayer=true)
    ============================================================ */

    const depthX = useTransform(smoothX, [-0.5, 0.5], [-depth, depth]);
    const depthY = useTransform(smoothY, [-0.5, 0.5], [-depth, depth]);

    /* ============================================================
       CHECK TILT
    ============================================================ */

    const canUseTilt = useCallback(() => {
        if (disabled) return false;
        if (typeof window === "undefined") return false;

        return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    }, [disabled]);

    /* ============================================================
       HANDLERS
    ============================================================ */

    const handleMouseMove = useCallback(
        (event) => {
            if (!containerRef.current) return;
            if (!canUseTilt()) return;

            const rect = containerRef.current.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;

            pointerX.set(Math.max(-0.5, Math.min(0.5, x)));
            pointerY.set(Math.max(-0.5, Math.min(0.5, y)));
        },
        [canUseTilt, pointerX, pointerY]
    );

    const handleMouseEnter = useCallback(() => {
        if (!canUseTilt()) return;
        setIsHovered(true);
        if (glare) glareOpacity.set(1);
    }, [canUseTilt, glare, glareOpacity]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        pointerX.set(0);
        pointerY.set(0);
        glareOpacity.set(0);
    }, [pointerX, pointerY, glareOpacity]);

    /* ============================================================
       CLASS
    ============================================================ */

    const rootClassName = [
        "tilt-card-vip",
        isHovered ? "tilt-card-vip--hovered" : "",
        disabled ? "tilt-card-vip--disabled" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    /* ============================================================
       RENDER — chỉ 3 layer
    ============================================================ */

    return (
        <div
            ref={containerRef}
            className={rootClassName}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={style}
        >
            <motion.div
                className="tilt-card-vip__stage"
                style={{
                    perspective: `${perspective}px`,
                    rotateX,
                    rotateY,
                    scale: hoverScale,
                }}
            >
                {/* ========== CONTENT ========== */}
                <motion.div
                    className="tilt-card-vip__content"
                    style={{
                        x: multiLayer ? depthX : 0,
                        y: multiLayer ? depthY : 0,
                    }}
                >
                    {children}
                </motion.div>

                {/* ========== SHADOW (CSS thuần) ========== */}
                {shadow && (
                    <div
                        aria-hidden="true"
                        className="tilt-card-vip__shadow"
                        style={{ opacity: isHovered ? 1 : 0 }}
                    />
                )}

                {/* ========== GLARE (1 layer duy nhất) ========== */}
                {glare && (
                    <motion.div
                        aria-hidden="true"
                        className="tilt-card-vip__glare"
                        style={{
                            opacity: smoothGlareOpacity,
                            "--glare-x": glareX,
                            "--glare-y": glareY,
                        }}
                    />
                )}

                {/* ========== EDGE (linear gradient) ========== */}
                {edgeHighlight && (
                    <motion.div
                        aria-hidden="true"
                        className="tilt-card-vip__edge"
                        style={{
                            opacity: edgeOpacity,
                        }}
                    />
                )}
            </motion.div>
        </div>
    );
};

export default TiltCard;