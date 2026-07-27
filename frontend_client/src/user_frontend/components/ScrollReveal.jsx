import { motion, useInView } from "framer-motion";
import { useRef, useMemo, useState } from "react";

const ScrollReveal = ({
    children,
    direction = "up",
    delay = 0,
    duration = 1.0,
    blur = false,
    scale = false,
    className = "",
    amount = 0.15,
    once = true,

    // ---- HIỆU ỨNG RÈM BẠC ----
    curtain = false,
    curtainTexture = "silk",
    curtainSpeed = 0.9,
    curtainFolds = 5,
    ...rest
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once, amount, rootMargin: "0px 0px -30px 0px" });
    const [curtainOpened, setCurtainOpened] = useState(false);

    // ---- CHỈ CÓ MÀU BẠC/XÁM ----
    const colors = {
        light: "#E8E8E8",    // bạc sáng
        mid: "#D0D0D0",      // bạc trung bình
        dark: "#A0A0A0",     // bạc tối
        glow: "rgba(200,200,200,0.15)",
        shadow: "rgba(0,0,0,0.12)",
    };

    // ---- NẾP GẤP RÈM ----
    const foldGradients = useMemo(() => {
        const folds = [];
        for (let i = 0; i < curtainFolds; i++) {
            const pos = i / curtainFolds;
            const dark = `rgba(0,0,0,${0.04 + 0.02 * Math.sin(pos * Math.PI)})`;
            const light = `rgba(255,255,255,${0.02 + 0.02 * Math.cos(pos * Math.PI)})`;
            folds.push(`${dark} ${pos * 100 - 2}%, ${light} ${pos * 100}%, ${dark} ${pos * 100 + 2}%`);
        }
        return folds;
    }, [curtainFolds]);

    // ---- TEXTURE RÈM ----
    const textureGradient = useMemo(() => {
        if (curtainTexture === "velvet") {
            return `linear-gradient(180deg, rgba(0,0,0,0.03) 0%, rgba(255,255,255,0.04) 20%, rgba(0,0,0,0.03) 40%, rgba(255,255,255,0.03) 60%, rgba(0,0,0,0.04) 80%, rgba(255,255,255,0.02) 100%)`;
        }
        return `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.02) 25%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.02) 75%, rgba(255,255,255,0.04) 100%)`;
    }, [curtainTexture]);

    // ---- HIỆU ỨNG NỘI DUNG ----
    const getInitialPos = () => {
        switch (direction) {
            case "up": return { y: 30, x: 0 };
            case "down": return { y: -30, x: 0 };
            case "left": return { x: -30, y: 0 };
            case "right": return { x: 30, y: 0 };
            case "zoom": return { scale: 0.92, y: 0, x: 0 };
            case "fade": return { opacity: 0, y: 0, x: 0 };
            default: return { y: 30, x: 0 };
        }
    };

    const contentInitial = {
        opacity: 0,
        ...getInitialPos(),
        scale: scale ? 0.85 : (direction === "zoom" ? 0.92 : 1),
        filter: blur ? "blur(6px)" : "blur(0px)",
    };

    const contentAnimate = {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: "blur(0px)",
    };

    // ---- RÈM TRÁI ----
    const leftCurtain = (
        <motion.div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "50%",
                height: "100%",
                zIndex: 5,
                background: `
                    ${textureGradient},
                    linear-gradient(90deg, 
                        ${colors.light}DD 0%, 
                        ${colors.mid}99 20%, 
                        ${colors.light}BB 40%, 
                        ${colors.mid}88 60%, 
                        ${colors.dark}AA 80%, 
                        ${colors.mid}77 100%
                    )
                `,
                boxShadow: `6px 0 25px ${colors.shadow}, inset -8px 0 20px rgba(0,0,0,0.06)`,
                borderRadius: "0 20px 20px 0",
                transformOrigin: "left center",
                willChange: "transform",
                pointerEvents: "none",
            }}
            initial={{ x: 0 }}
            animate={{ x: isInView ? "-100%" : 0 }}
            transition={{
                duration: curtainSpeed,
                delay: delay,
                ease: [0.4, 0, 0.2, 1],
                onComplete: () => setCurtainOpened(true),
            }}
        >
            <div style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, ${foldGradients.join(', ')})`,
                opacity: 0.25,
                willChange: "opacity",
            }} />
            <div style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: "2px",
                background: `linear-gradient(180deg, ${colors.light}, ${colors.dark}, ${colors.light})`,
                boxShadow: `0 0 15px ${colors.glow}`,
                opacity: 0.3,
            }} />
        </motion.div>
    );

    // ---- RÈM PHẢI ----
    const rightCurtain = (
        <motion.div
            style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "50%",
                height: "100%",
                zIndex: 5,
                background: `
                    ${textureGradient},
                    linear-gradient(270deg, 
                        ${colors.light}DD 0%, 
                        ${colors.mid}99 20%, 
                        ${colors.light}BB 40%, 
                        ${colors.mid}88 60%, 
                        ${colors.dark}AA 80%, 
                        ${colors.mid}77 100%
                    )
                `,
                boxShadow: `-6px 0 25px ${colors.shadow}, inset 8px 0 20px rgba(0,0,0,0.06)`,
                borderRadius: "20px 0 0 20px",
                transformOrigin: "right center",
                willChange: "transform",
                pointerEvents: "none",
            }}
            initial={{ x: 0 }}
            animate={{ x: isInView ? "100%" : 0 }}
            transition={{
                duration: curtainSpeed,
                delay: delay,
                ease: [0.4, 0, 0.2, 1],
            }}
        >
            <div style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, ${foldGradients.slice().reverse().join(', ')})`,
                opacity: 0.25,
                willChange: "opacity",
            }} />
            <div style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "2px",
                background: `linear-gradient(180deg, ${colors.light}, ${colors.dark}, ${colors.light})`,
                boxShadow: `0 0 15px ${colors.glow}`,
                opacity: 0.3,
            }} />
        </motion.div>
    );

    // ---- THANH RÈM (TRANG TRÍ) ----
    const curtainRod = (
        <motion.div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "5px",
                zIndex: 6,
                background: `linear-gradient(180deg, ${colors.light}, ${colors.dark}, ${colors.light})`,
                boxShadow: `0 2px 12px ${colors.glow}`,
                opacity: 0.2,
                pointerEvents: "none",
                willChange: "opacity",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 0.2 : 0 }}
            transition={{ duration: 0.3 }}
        />
    );

    return (
        <div
            ref={ref}
            className={className}
            style={{
                position: "relative",
                overflow: "hidden",
                willChange: "transform, opacity",
            }}
            {...rest}
        >
            {curtain && (
                <>
                    {curtainRod}
                    {leftCurtain}
                    {rightCurtain}
                </>
            )}

            <motion.div
                initial={contentInitial}
                animate={isInView ? contentAnimate : contentInitial}
                transition={{
                    duration: duration,
                    delay: delay + (curtain ? 0.1 : 0),
                    ease: [0.4, 0, 0.2, 1],
                }}
                style={{ position: "relative", zIndex: 1 }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default ScrollReveal;