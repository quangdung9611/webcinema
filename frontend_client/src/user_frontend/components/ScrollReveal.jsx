import { motion } from "framer-motion";

const ScrollReveal = ({
    children,
    direction = "up",
    delay = 0,
    duration = 0.8   // 👈 giảm lại (2.8 quá nặng)
}) => {

    const variants = {
        up: { opacity: 0, y: 25 },
        left: { opacity: 0, x: -25 },
        right: { opacity: 0, x: 25 },
        zoom: { opacity: 0, scale: 0.98 },
        rotate: { opacity: 0, y: 20 }
    };

    return (
        <div style={{ overflow: "visible" }}>
            <motion.div
                initial={variants[direction] || variants.up}
                whileInView={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                    rotate: 0
                }}
                viewport={{
                    once: true,
                    amount: 0.2
                }}
                transition={{
                    duration,
                    delay,
                    ease: "easeOut"
                }}
                style={{
                    willChange: "opacity, transform"
                }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default ScrollReveal;