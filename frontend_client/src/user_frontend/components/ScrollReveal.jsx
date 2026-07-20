import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ScrollReveal = ({
    children,
    direction = "up",
    delay = 0,
    duration = 1.0,               // chậm hơn, mượt hơn
    blur = false,
    scale = false,
    className = "",
    amount = 0.2,
    once = true,

    // ---- HIỆU ỨNG RÈM RẠP CHIẾU PHIM (BẠC) ----
    curtain = false,
    curtainColor = "#E8E8E8",      // bạc chính
    curtainTexture = "silk",       // chất liệu mềm mại
    curtainSpeed = 1.2,            // rèm kéo chậm, sang trọng
    curtainFolds = 5,
    ...rest
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once, amount });

    // Hiệu ứng nội dung chính
    const getInitialPos = () => {
        switch (direction) {
            case "up": return { y: 40, x: 0 };
            case "down": return { y: -40, x: 0 };
            case "left": return { x: -40, y: 0 };
            case "right": return { x: 40, y: 0 };
            case "zoom": return { scale: 0.9, y: 0, x: 0 };
            case "fade": return { opacity: 0, y: 0, x: 0 };
            default: return { y: 40, x: 0 };
        }
    };

    const initialPos = getInitialPos();

    const contentInitial = {
        opacity: 0,
        ...initialPos,
        scale: scale ? 0.85 : (direction === "zoom" ? 0.9 : 1),
        filter: blur ? "blur(6px)" : "blur(0px)",
    };

    const contentAnimate = {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: "blur(0px)",
    };

    // ---- RÈM BẠC ----
    let curtainElement = null;

    if (curtain) {
        // Nếp gấp cho rèm (tông bạc)
        const foldGradients = [];
        for (let i = 0; i < curtainFolds; i++) {
            const pos = i / curtainFolds;
            const dark = `rgba(0,0,0,${0.06 + 0.04 * Math.sin(pos * Math.PI)})`;
            const light = `rgba(255,255,255,${0.04 + 0.04 * Math.cos(pos * Math.PI)})`;
            foldGradients.push(
                `${dark} ${pos * 100 - 2}%, ${light} ${pos * 100}%, ${dark} ${pos * 100 + 2}%`
            );
        }

        // Gradient chất liệu (silk mềm mại)
        let textureGradient = "";
        if (curtainTexture === "velvet") {
            textureGradient = `
                linear-gradient(180deg, 
                    rgba(0,0,0,0.03) 0%, 
                    rgba(255,255,255,0.04) 20%, 
                    rgba(0,0,0,0.05) 40%, 
                    rgba(255,255,255,0.03) 60%, 
                    rgba(0,0,0,0.04) 80%, 
                    rgba(255,255,255,0.02) 100%
                )
            `;
        } else if (curtainTexture === "silk") {
            textureGradient = `
                linear-gradient(135deg, 
                    rgba(255,255,255,0.06) 0%, 
                    rgba(0,0,0,0.02) 25%, 
                    rgba(255,255,255,0.05) 50%, 
                    rgba(0,0,0,0.02) 75%, 
                    rgba(255,255,255,0.06) 100%
                )
            `;
        } else {
            // gold (vẫn giữ fallback nhưng không dùng)
            textureGradient = `
                linear-gradient(45deg, 
                    rgba(255,215,0,0.03) 0%, 
                    rgba(255,200,0,0.02) 30%, 
                    rgba(255,215,0,0.04) 60%, 
                    rgba(255,200,0,0.02) 100%
                )
            `;
        }

        // Màu bạc sáng, nhẹ nhàng
        const silverLight = "#F5F5F5";
        const silverMid = "#E8E8E8";
        const silverDark = "#D0D0D0";

        // Rèm trái
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
                            ${silverLight}DD 0%, 
                            ${silverMid}99 20%, 
                            ${silverLight}BB 40%, 
                            ${silverMid}88 60%, 
                            ${silverDark}AA 80%, 
                            ${silverMid}77 100%
                        )
                    `,
                    boxShadow: "6px 0 25px rgba(0,0,0,0.25), inset -8px 0 20px rgba(0,0,0,0.1)",
                    borderRadius: "0 20px 20px 0",
                    transformOrigin: "left center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    padding: "20px",
                    pointerEvents: "none",
                }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: isInView ? 0 : 1 }}
                transition={{ 
                    duration: curtainSpeed, 
                    delay, 
                    ease: [0.25, 0.1, 0.15, 1]   // mượt, chậm rãi
                }}
            >
                <div style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(90deg, ${foldGradients.join(', ')})`,
                    opacity: 0.4,
                }} />
                <div style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "3px",
                    background: "linear-gradient(180deg, #F5F5F5, #D0D0D0, #F5F5F5)",
                    boxShadow: "0 0 15px rgba(245,245,245,0.15)",
                    opacity: 0.5,
                }} />
            </motion.div>
        );

        // Rèm phải
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
                            ${silverLight}DD 0%, 
                            ${silverMid}99 20%, 
                            ${silverLight}BB 40%, 
                            ${silverMid}88 60%, 
                            ${silverDark}AA 80%, 
                            ${silverMid}77 100%
                        )
                    `,
                    boxShadow: "-6px 0 25px rgba(0,0,0,0.25), inset 8px 0 20px rgba(0,0,0,0.1)",
                    borderRadius: "20px 0 0 20px",
                    transformOrigin: "right center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    padding: "20px",
                    pointerEvents: "none",
                }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: isInView ? 0 : 1 }}
                transition={{ 
                    duration: curtainSpeed, 
                    delay, 
                    ease: [0.25, 0.1, 0.15, 1]
                }}
            >
                <div style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(90deg, ${foldGradients.reverse().join(', ')})`,
                    opacity: 0.4,
                }} />
                <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "3px",
                    background: "linear-gradient(180deg, #F5F5F5, #D0D0D0, #F5F5F5)",
                    boxShadow: "0 0 15px rgba(245,245,245,0.15)",
                    opacity: 0.5,
                }} />
            </motion.div>
        );

        // Thanh kéo rèm (bạc)
        const curtainRod = (
            <motion.div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "10px",
                    zIndex: 6,
                    background: `
                        linear-gradient(180deg, 
                            #F5F5F5 0%, 
                            #E0E0E0 30%, 
                            #D4D4D4 50%, 
                            #E0E0E0 70%, 
                            #F5F5F5 100%
                        )
                    `,
                    boxShadow: "0 3px 15px rgba(200,200,200,0.2), 0 2px 8px rgba(0,0,0,0.15)",
                    borderRadius: "0 0 4px 4px",
                    opacity: 0.6,
                    pointerEvents: "none",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isInView ? 0.6 : 0 }}
                transition={{ duration: 0.3 }}
            />
        );

        // Viền sáng bạc trên cùng
        const borderTop = (
            <motion.div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 0,
                    right: 0,
                    height: "1px",
                    background: "linear-gradient(90deg, transparent, #F5F5F5, #D0D0D0, #F5F5F5, transparent)",
                    zIndex: 4,
                    opacity: 0.3,
                    pointerEvents: "none",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isInView ? 0.3 : 0 }}
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
                    delay: delay + (curtain ? 0.15 : 0),
                    ease: [0.25, 0.1, 0.15, 1],   // easing mượt
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