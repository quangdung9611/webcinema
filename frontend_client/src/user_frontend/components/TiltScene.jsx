import React, { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * ============================================================
 * TiltScene
 * ============================================================
 * Bọc toàn bộ nội dung — cả scene nghiêng nhẹ theo chuột.
 *
 * - Dùng Framer Motion springs → mượt, không lag
 * - Tự tắt trên mobile (không có chuột)
 * - maxTilt khuyên 2-4 độ (nhiều hơn sẽ chóng mặt)
 * - Kết hợp được với TiltCard bên trong
 *
 * @param {ReactNode} children
 * @param {number} maxTilt - Độ nghiêng tối đa (độ). Default 3
 * @param {number} perspective - Perspective 3D. Default 2000
 * @param {object} springConfig - Config spring của Framer Motion
 * @param {boolean} disableOnMobile - Tắt trên mobile
 * @param {number} scaleOnHover - Zoom nhẹ khi rê chuột. Default 1.005
 * @param {string} className
 * ============================================================
 */
const TiltScene = ({
  children,
  maxTilt = 3,
  perspective = 2000,
  springConfig = { stiffness: 60, damping: 20, mass: 0.8 },
  disableOnMobile = true,
  scaleOnHover = 1.005,
  className = "",
}) => {
  const wrapperRef = useRef(null);

  // Motion values — tọa độ chuột normalize (-0.5 → 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring mượt
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Map tọa độ → góc nghiêng
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [maxTilt, -maxTilt]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-maxTilt, maxTilt]);

  useEffect(() => {
    // Tắt trên touch device
    if (disableOnMobile && window.matchMedia("(hover: none)").matches) {
      return;
    }

    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mouseX, mouseY, disableOnMobile]);

  return (
    <div
      ref={wrapperRef}
      className={`tilt-scene ${className}`}
      style={{
        perspective: `${perspective}px`,
        perspectiveOrigin: "center center",
        width: "100%",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <motion.div
        className="tilt-scene__inner"
        style={{
          rotateX,
          rotateY,
          scale: scaleOnHover,
          transformStyle: "preserve-3d",
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default TiltScene;