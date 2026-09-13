// components/StackScroll.jsx
// ============================================================
// STACK SCROLL - Sticky Stacking Sections
// Mỗi section khi cuộn tới sẽ trượt vào từ phải và đè lên section trước
// Sử dụng Framer Motion useScroll + useTransform
// ============================================================

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/* ==========================================================
   STACK SECTION - 1 section đơn lẻ
   ========================================================== */
const StackSection = ({
  children,
  index = 0,
  total = 3,
  className = "",
  stickyTop = "0px",
  direction = "right",
  distance = 100,
  scaleDown = true,
}) => {
  const sectionRef = useRef(null);

  // Theo dõi scroll của section này
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });

  // ===== Tính các giá trị transform =====

  // 1. Trượt ngang: từ distance → 0 khi vào viewport
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    direction === "left" ? [`-${distance}%`, "0%"] : [`${distance}%`, "0%"]
  );

  // 2. Opacity: mờ dần hiện ra
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.85, 1]);

  // 3. Scale: section cũ thu nhỏ (nếu bật)
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    scaleDown && index < total - 1 ? [1, 0.94 - (total - 1 - index) * 0.02] : [1, 1]
  );

  // 4. Bo góc khi reveal
  const borderRadius = useTransform(scrollYProgress, [0, 1], ["28px", "0px"]);

  return (
    <motion.div
      ref={sectionRef}
      className={`stack-section ${className}`}
      style={{
        position: "sticky",
        top: stickyTop,
        x,
        opacity,
        scale,
        borderRadius,
        zIndex: index + 1,
        willChange: "transform, opacity",
      }}
    >
      <div className="stack-section-inner">{children}</div>
    </motion.div>
  );
};

/* ==========================================================
   STACK SCROLL - Wrapper chứa nhiều section
   ========================================================== */
const StackScroll = ({
  children,
  className = "",
  stickyTop = "0px",
  direction = "right",
  distance = 100,
  scaleDown = true,
}) => {
  const childArray = Array.isArray(children) ? children.filter(Boolean) : [children];
  const total = childArray.length;

  if (total === 0) return null;

  return (
    <div className={`stack-scroll-wrapper ${className}`}>
      {childArray.map((child, index) => (
        <StackSection
          key={index}
          index={index}
          total={total}
          stickyTop={stickyTop}
          direction={direction}
          distance={distance}
          scaleDown={scaleDown}
        >
          {child}
        </StackSection>
      ))}
    </div>
  );
};

export default StackScroll;
export { StackSection };