import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ScrollReveal = ({
    children,
    direction = "up",
    delay = 0,
    duration = 0.8,
    blur = false,
    scale = false,
    className = "",
    amount = 0.2,
    once = true,

    // ---- HIỆU ỨNG RÈM RẠP CHIẾU PHIM ----
    curtain = false,                // bật hiệu ứng rèm
    curtainColor = "#C9A84C",       // màu rèm (vàng)
    curtainTexture = "velvet",      // chất liệu rèm: "velvet", "silk", "gold"
    curtainSpeed = 0.8,             // tốc độ kéo rèm
    curtainFolds = 5,               // số nếp gấp
    ...rest
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once, amount });

    // Hiệu ứng cho nội dung chính
    const getInitialPos = () => {
        switch (direction) {
            case "up": return { y: 30, x: 0 };
            case "down": return { y: -30, x: 0 };
            case "left": return { x: -30, y: 0 };
            case "right": return { x: 30, y: 0 };
            case "zoom": return { scale: 0.85, y: 0, x: 0 };
            case "fade": return { opacity: 0, y: 0, x: 0 };
            default: return { y: 30, x: 0 };
        }
    };

    const initialPos = getInitialPos();

    const contentInitial = {
        opacity: 0,
        ...initialPos,
        scale: scale ? 0.85 : (direction === "zoom" ? 0.85 : 1),
        filter: blur ? "blur(8px)" : "blur(0px)",
    };

    const contentAnimate = {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: "blur(0px)",
    };

    // ---- RÈM RẠP CHIẾU PHIM ----
    let curtainElement = null;

    if (curtain) {
        // Tạo các nếp gấp cho rèm (để rèm trông có chiều sâu)
        const foldGradients = [];
        for (let i = 0; i < curtainFolds; i++) {
            const pos = i / curtainFolds;
            const dark = `rgba(0,0,0,${0.15 + 0.1 * Math.sin(pos * Math.PI)})`;
            const light = `rgba(255,255,255,${0.05 + 0.05 * Math.cos(pos * Math.PI)})`;
            foldGradients.push(
                `${dark} ${pos * 100 - 2}%, ${light} ${pos * 100}%, ${dark} ${pos * 100 + 2}%`
            );
        }

        // Gradient chất liệu
        let textureGradient = "";
        if (curtainTexture === "velvet") {
            textureGradient = `
                linear-gradient(180deg, 
                    rgba(0,0,0,0.05) 0%, 
                    rgba(255,255,255,0.03) 20%, 
                    rgba(0,0,0,0.08) 40%, 
                    rgba(255,255,255,0.02) 60%, 
                    rgba(0,0,0,0.06) 80%, 
                    rgba(255,255,255,0.03) 100%
                )
            `;
        } else if (curtainTexture === "silk") {
            textureGradient = `
                linear-gradient(135deg, 
                    rgba(255,255,255,0.08) 0%, 
                    rgba(0,0,0,0.04) 25%, 
                    rgba(255,255,255,0.06) 50%, 
                    rgba(0,0,0,0.03) 75%, 
                    rgba(255,255,255,0.07) 100%
                )
            `;
        } else {
            // gold
            textureGradient = `
                linear-gradient(45deg, 
                    rgba(255,215,0,0.1) 0%, 
                    rgba(255,200,0,0.05) 30%, 
                    rgba(255,215,0,0.08) 60%, 
                    rgba(255,200,0,0.04) 100%
                )
            `;
        }

        // Rèm bên trái và bên phải
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
                            ${curtainColor}DD 0%, 
                            ${curtainColor}99 20%, 
                            ${curtainColor}BB 40%, 
                            ${curtainColor}88 60%, 
                            ${curtainColor}AA 80%, 
                            ${curtainColor}77 100%
                        )
                    `,
                    boxShadow: "8px 0 30px rgba(0,0,0,0.5), inset -10px 0 30px rgba(0,0,0,0.2)",
                    borderRadius: "0 30px 30px 0",
                    transformOrigin: "left center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "20px",
                    pointerEvents: "none",
                }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: isInView ? 0 : 1 }}
                transition={{ duration: curtainSpeed, delay, ease: "easeInOut" }}
            >
                {/* Nếp gấp dọc cho rèm trái */}
                <div style={{
                    position: "absolute",
                    inset: 0,
                    background: `
                        linear-gradient(90deg, 
                            ${foldGradients.join(', ')}
                        )
                    `,
                    opacity: 0.6,
                }} />
                {/* Đường viền vàng sáng */}
                <div style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "4px",
                    background: "linear-gradient(180deg, #FFD700, #C9A84C, #FFD700)",
                    boxShadow: "0 0 20px rgba(255,215,0,0.3)",
                    opacity: 0.6,
                }} />
            </motion.div>
        );

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
                            ${curtainColor}DD 0%, 
                            ${curtainColor}99 20%, 
                            ${curtainColor}BB 40%, 
                            ${curtainColor}88 60%, 
                            ${curtainColor}AA 80%, 
                            ${curtainColor}77 100%
                        )
                    `,
                    boxShadow: "-8px 0 30px rgba(0,0,0,0.5), inset 10px 0 30px rgba(0,0,0,0.2)",
                    borderRadius: "30px 0 0 30px",
                    transformOrigin: "right center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    padding: "20px",
                    pointerEvents: "none",
                }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: isInView ? 0 : 1 }}
                transition={{ duration: curtainSpeed, delay, ease: "easeInOut" }}
            >
                {/* Nếp gấp dọc cho rèm phải */}
                <div style={{
                    position: "absolute",
                    inset: 0,
                    background: `
                        linear-gradient(90deg, 
                            ${foldGradients.reverse().join(', ')}
                        )
                    `,
                    opacity: 0.6,
                }} />
                {/* Đường viền vàng sáng */}
                <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "4px",
                    background: "linear-gradient(180deg, #FFD700, #C9A84C, #FFD700)",
                    boxShadow: "0 0 20px rgba(255,215,0,0.3)",
                    opacity: 0.6,
                }} />
            </motion.div>
        );

        // Thanh kéo rèm phía trên
        const curtainRod = (
            <motion.div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "12px",
                    zIndex: 6,
                    background: `
                        linear-gradient(180deg, 
                            #FFD700 0%, 
                            #D4AF37 30%, 
                            #C9A84C 50%, 
                            #D4AF37 70%, 
                            #FFD700 100%
                        )
                    `,
                    boxShadow: "0 4px 20px rgba(201,168,76,0.3), 0 2px 10px rgba(0,0,0,0.3)",
                    borderRadius: "0 0 6px 6px",
                    opacity: 0.8,
                    pointerEvents: "none",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isInView ? 0.8 : 0 }}
                transition={{ duration: 0.3 }}
            />
        );

        // Viền vàng phía trên và dưới
        const borderTop = (
            <motion.div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: "linear-gradient(90deg, transparent, #FFD700, #C9A84C, #FFD700, transparent)",
                    zIndex: 4,
                    opacity: 0.4,
                    pointerEvents: "none",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isInView ? 0.4 : 0 }}
                transition={{ duration: 0.3 }}
            />
        );

        curtainElement = (
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }}>
                {curtainRod}
                {borderTop}
                {leftCurtain}
                {rightCurtain}
            </div>
        );
    }

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
            {curtainElement}

            <motion.div
                initial={contentInitial}
                animate={isInView ? contentAnimate : contentInitial}
                transition={{
                    duration: duration,
                    delay: delay + (curtain ? 0.1 : 0),
                    ease: "easeOut",
                }}
                style={{
                    position: "relative",
                    zIndex: 1,
                }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default ScrollReveal;