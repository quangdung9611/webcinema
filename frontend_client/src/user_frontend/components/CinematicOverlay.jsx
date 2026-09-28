import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCinematicTransition } from "../../context/CinematicTransitionContext";
import "../styles/CinematicOverlay.css";

/* ============================================================
   CINEMATIC OVERLAY
   ============================================================
   ✅ Overlay đen fade in khi chuyển cảnh
   ✅ Có thể thêm logo / text nhỏ giữa màn hình
   ✅ Fade out khi MovieDetail mount
============================================================ */

const CinematicOverlay = () => {
    const { isTransitioning } = useCinematicTransition();

    return (
        <AnimatePresence>
            {isTransitioning && (
                <motion.div
                    className="cinematic-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                        duration: 0.28,
                        ease: [0.16, 1, 0.3, 1],
                    }}
                >
                    {/* Ánh sáng mờ ở giữa — như projector */}
                    <div className="cinematic-overlay__glow" />

                    {/* Text nhỏ "ĐANG MỞ..." */}
                    <motion.div
                        className="cinematic-overlay__label"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.4,
                            delay: 0.1,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                    >
                        <span>ĐANG MỞ</span>
                        <span className="cinematic-overlay__dot" />
                        <span className="cinematic-overlay__dot" />
                        <span className="cinematic-overlay__dot" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CinematicOverlay;