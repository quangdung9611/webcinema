import { motion } from "framer-motion";

const ScrollReveal = ({
    children,
    direction = "up",
    delay = 0,
    duration = 2.8   // ⬅️ CHẬM HƠN
}) => {

    const variants = {
        up: {
            opacity: 0,
            y: 50,
            scale: 0.98,
            filter: "blur(6px)"
        },

        left: {
            opacity: 0,
            x: -50,
            scale: 0.98,
            filter: "blur(6px)"
        },

        right: {
            opacity: 0,
            x: 50,
            scale: 0.98,
            filter: "blur(6px)"
        },

        zoom: {
            opacity: 0,
            scale: 0.92,
            filter: "blur(8px)"
        },

        rotate: {
            opacity: 0,
            y: 30,
            scale: 0.97,
            rotate: -1,
            filter: "blur(6px)"
        }
    };

    return (
        <motion.div
            initial={variants[direction] || variants.up}
            whileInView={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                rotate: 0,
                filter: "blur(0px)"
            }}
            viewport={{
                once: true,
                amount: 0.25   // ⬅️ vào sâu hơn mới trigger
            }}
            transition={{
                duration,
                delay,
                ease: [0.25, 0.8, 0.25, 1] // ⬅️ mượt + “lụi”
            }}
            style={{
                willChange: "transform, opacity, filter"
            }}
        >
            {children}
        </motion.div>
    );
};

export default ScrollReveal;