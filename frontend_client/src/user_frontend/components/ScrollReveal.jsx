import { motion } from "framer-motion";

const ScrollReveal = ({
    children,
    direction = "up",
    delay = 0
}) => {

    const variants = {

        up: {
            opacity: 0,
            y: 35
        },

        left: {
            opacity: 0,
            x: -35
        },

        right: {
            opacity: 0,
            x: 35
        },

        zoom: {
            opacity: 0,
            scale: 0.98
        }
    };

    return (
        <motion.div
            initial={
                variants[direction]
            }
            whileInView={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1
            }}
            viewport={{
                once: true,
                amount: 0.2
            }}
            transition={{
                duration: 1,
                delay,
                ease: [0.25, 0.1, 0.25, 1]
            }}
        >
            {children}
        </motion.div>
    );
};

export default ScrollReveal;