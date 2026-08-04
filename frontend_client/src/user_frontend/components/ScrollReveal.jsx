import { motion, useInView } from "framer-motion";
import { useRef, useMemo, useState, useEffect } from "react";

const ScrollReveal = ({
    children,
    direction = "up",
    delay = 0,
    duration = 0.8,
    blur = false,
    scale = false,
    className = "",
    amount = 0.15,
    once = true,
    curtain = false,
    curtainTexture = "silk",
    curtainSpeed = 0.7,
    curtainFolds = 3,
    ...rest
}) => {
    const ref = useRef(null);

    const isInView = useInView(ref, {
        once,
        amount,
        margin: "0px 0px -50px 0px"
    });

    const [curtainOpened, setCurtainOpened] = useState(false);

    useEffect(() => {
        if (isInView) {
            setCurtainOpened(true);
        }
    }, [isInView]);

    // ==========================================================
    // INITIAL POSITION
    // ==========================================================

    const getInitialPos = () => {
        switch (direction) {
            case "up":
                return { y: 30 };

            case "down":
                return { y: -30 };

            case "left":
                return { x: -30 };

            case "right":
                return { x: 30 };

            case "zoom":
                return { scale: 0.94 };

            case "fade":
                return { opacity: 0 };

            default:
                return { y: 30 };
        }
    };

    const contentInitial = {
        opacity: 0,
        ...getInitialPos(),

        ...(scale && direction !== "zoom"
            ? { scale: 0.96 }
            : {}),

        ...(blur
            ? { filter: "blur(6px)" }
            : {})
    };

    const contentAnimate = {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)"
    };

    // ==========================================================
    // CURTAIN
    // ==========================================================

    const colors = useMemo(
        () => ({
            light: "#E8E8E8",
            mid: "#D0D0D0",
            dark: "#A0A0A0"
        }),
        []
    );

    const foldGradients = useMemo(() => {
        const folds = [];

        for (let i = 0; i < curtainFolds; i++) {
            const pos = i / curtainFolds;

            folds.push(
                `rgba(0,0,0,0.05) ${pos * 100 - 2}%`,
                `rgba(255,255,255,0.05) ${pos * 100}%`,
                `rgba(0,0,0,0.05) ${pos * 100 + 2}%`
            );
        }

        return folds.join(", ");
    }, [curtainFolds]);

    const textureGradient = useMemo(() => {
        if (curtainTexture === "velvet") {
            return `
                linear-gradient(
                    180deg,
                    rgba(0,0,0,0.02) 0%,
                    rgba(255,255,255,0.03) 50%,
                    rgba(0,0,0,0.02) 100%
                )
            `;
        }

        return `
            linear-gradient(
                135deg,
                rgba(255,255,255,0.03) 0%,
                rgba(0,0,0,0.02) 50%,
                rgba(255,255,255,0.03) 100%
            )
        `;
    }, [curtainTexture]);

    const leftCurtainStyle = useMemo(
        () => ({
            position: "absolute",
            inset: "0 auto 0 0",
            width: "50%",
            zIndex: 20,

            background: `
                ${textureGradient},
                linear-gradient(
                    90deg,
                    ${colors.light}DD 0%,
                    ${colors.mid}99 30%,
                    ${colors.dark}AA 70%,
                    ${colors.mid}77 100%
                )
            `,

            boxShadow:
                "2px 0 10px rgba(0,0,0,0.05), inset -2px 0 6px rgba(0,0,0,0.02)",

            borderRadius: "0 8px 8px 0",

            transformOrigin: "left center",

            pointerEvents: "none",

            backfaceVisibility: "hidden"
        }),
        [textureGradient, colors]
    );

    const rightCurtainStyle = useMemo(
        () => ({
            position: "absolute",
            inset: "0 0 0 auto",
            width: "50%",
            zIndex: 20,

            background: `
                ${textureGradient},
                linear-gradient(
                    270deg,
                    ${colors.light}DD 0%,
                    ${colors.mid}99 30%,
                    ${colors.dark}AA 70%,
                    ${colors.mid}77 100%
                )
            `,

            boxShadow:
                "-2px 0 10px rgba(0,0,0,0.05), inset 2px 0 6px rgba(0,0,0,0.02)",

            borderRadius: "8px 0 0 8px",

            transformOrigin: "right center",

            pointerEvents: "none",

            backfaceVisibility: "hidden"
        }),
        [textureGradient, colors]
    );

    return (
        <div
            ref={ref}
            className={className}
            {...rest}
            style={{
                position: "relative"
            }}
        >
            {/* ==================================================
                CURTAIN
            ================================================== */}

            {curtain && (
                <>
                    <motion.div
                        style={leftCurtainStyle}
                        initial={{ x: 0 }}
                        animate={{
                            x: curtainOpened ? "-100%" : 0
                        }}
                        transition={{
                            duration: curtainSpeed,
                            ease: [0.4, 0, 0.2, 1]
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: `linear-gradient(
                                    90deg,
                                    ${foldGradients}
                                )`,
                                opacity: 0.15
                            }}
                        />
                    </motion.div>

                    <motion.div
                        style={rightCurtainStyle}
                        initial={{ x: 0 }}
                        animate={{
                            x: curtainOpened ? "100%" : 0
                        }}
                        transition={{
                            duration: curtainSpeed,
                            ease: [0.4, 0, 0.2, 1]
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: `linear-gradient(
                                    90deg,
                                    ${foldGradients}
                                )`,
                                opacity: 0.15
                            }}
                        />
                    </motion.div>
                </>
            )}

            {/* ==================================================
                CONTENT
            ================================================== */}

            <motion.div
                initial={contentInitial}
                animate={
                    isInView
                        ? contentAnimate
                        : contentInitial
                }
                transition={{
                    duration,
                    delay: delay + (curtain ? 0.05 : 0),
                    ease: [0.4, 0, 0.2, 1]
                }}
                style={{
                    position: "relative",
                    zIndex: 1
                }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default ScrollReveal;