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

  // ===== Xác định vị trí ban đầu =====
  const getInitialPos = () => {
    switch (direction) {
      case "up":    return { y: 20 };
      case "down":  return { y: -20 };
      case "left":  return { x: -20 };
      case "right": return { x: 20 };
      case "zoom":  return { scale: 0.94 };
      case "fade":  return { opacity: 0 };
      default:      return { y: 20 };
    }
  };

  const initial = {
    opacity: 0,
    ...getInitialPos(),
    ...(scale && direction !== "zoom" ? { scale: 0.95 } : {}),
    ...(blur ? { filter: "blur(4px)" } : {}),
  };

  const animate = {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration,
      delay,
      ease: [0.25, 0.1, 0.25, 1], // mượt tự nhiên
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