import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const ScrollReveal = ({
  children,
  direction = "up",
  delay = 0,
  duration = 1,
  blur = false,
  scale = false,
  className = "",
  threshold = 0.1,
  once = true,
  rootMargin = "0px 0px -50px 0px",
  releaseTransform = false,        // 👈 MỚI: nhả transform sau khi active
  ...rest
}) => {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [isDone, setIsDone] = useState(false);   // 👈 track animation xong

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
          setIsDone(false);
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

  const getInitialPos = () => {
    switch (direction) {
      case "up":    return { y: 30 };
      case "down":  return { y: -30 };
      case "left":  return { x: -30 };
      case "right": return { x: 30 };
      case "zoom":  return { scale: 0.94 };
      case "fade":  return {};
      default:      return { y: 30 };
    }
  };

  const initial = {
    opacity: 0,
    ...getInitialPos(),
    ...(scale && direction !== "zoom" ? { scale: 0.96 } : {}),
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
      ease: [0, 0, 0.58, 1],
    },
  };

  /* 👇 Nếu releaseTransform = true, sau khi animation xong thì
     để wrapper không còn transform nữa — con bên trong tự do */
  const wrapperStyle =
    releaseTransform && isDone
      ? { willChange: "auto" }           // ← bỏ transform
      : {
          willChange: "transform, opacity",
          transform: "translateZ(0)",
        };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={initial}
      animate={isInView ? animate : initial}
      onAnimationComplete={() => {
        if (releaseTransform) setIsDone(true);
      }}
      style={wrapperStyle}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;