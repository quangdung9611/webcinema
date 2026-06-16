import { motion } from "framer-motion";

const ScrollReveal = ({
    children,
    direction = "up",
    delay = 0,
    duration = 1.5
}) => {

    const variants = {

        up: {
            opacity: 0,
            y: 120,
            scale: 0.92,
            filter: "blur(18px)"
        },

        left: {
            opacity: 0,
            x: -120,
            scale: 0.92,
            filter: "blur(18px)"
        },

        right: {
            opacity: 0,
            x: 120,
            scale: 0.92,
            filter: "blur(18px)"
        },

        zoom: {
            opacity: 0,
            scale: 0.82,
            filter: "blur(18px)"
        },

        bottom: {
            opacity: 0,
            y: 160,
            scale: 0.9,
            filter: "blur(18px)"
        },

        rotate: {
            opacity: 0,
            y: 80,
            scale: 0.9,
            rotate: -4,
            filter: "blur(18px)"
        }
    };

    return (
        <motion.div

            initial={
                variants[direction] || variants.up
            }

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
                amount: 0.15
            }}

            transition={{
                duration,
                delay,

                ease: [
                    0.22,
                    1,
                    0.36,
                    1
                ]
            }}

            style={{
                willChange:
                    "transform, opacity, filter"
            }}
        >
            {children}
        </motion.div>
    );
};

export default ScrollReveal;