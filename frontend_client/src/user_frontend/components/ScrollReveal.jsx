import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const ScrollReveal = ({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  blur = false,
  scale = false,
  className = "",
  threshold = 0.08,
  once = true,
  rootMargin = "0px 0px -50px 0px",
  ...rest
}) => {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  /* =========================================================
     INTERSECTION OBSERVER
  ========================================================= */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    const currentRef = ref.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [once, threshold, rootMargin]);

  /* =========================================================
     VỊ TRÍ BAN ĐẦU
  ========================================================= */
  const getInitialPos = () => {
    switch (direction) {
      case "up":    return { y: 24 };
      case "down":  return { y: -24 };
      case "left":  return { x: -24 };
      case "right": return { x: 24 };
      case "zoom":  return { scale: 0.94 };
      case "fade":  return {};
      default:      return { y: 24 };
    }
  };

  const initial = {
    opacity: 0,
    ...getInitialPos(),
    ...(scale && direction !== "zoom" ? { scale: 0.96 } : {}),
    ...(blur ? { filter: "blur(4px)" } : {}),
  };

  /* =========================================================
     TRẠNG THÁI ACTIVE — easing mượt kiểu cinematic
  ========================================================= */
  const animate = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1], // easeOutQuint — mượt & sang
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={isInView ? animate : initial}
      style={{
        willChange: "transform, opacity",
        transform: "translateZ(0)",
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;