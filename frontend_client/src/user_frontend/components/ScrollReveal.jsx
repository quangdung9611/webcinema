import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import "../styles/ScrollReveal.css";

/**
 * ============================================================
 * SCROLL REVEAL — CINEMATIC 3D v5 (SMOOTH OPTIMIZED)
 * ============================================================
 *
 * TỐI ƯU HÓA:
 * - Bỏ filter: brightness (tốn GPU)
 * - Blur chỉ chạy opacity, không animate blur value
 * - Tắt drop-shadow filter (dùng box-shadow CSS tĩnh)
 * - perspective cố định, không đổi theo direction
 * - will-change chỉ set khi cần, remove sau khi xong
 * - Reduce motion cho user prefer-reduced-motion
 * - Chỉ dùng transform + opacity (2 thuộc tính GPU-friendly nhất)
 *
 * Props:
 * - direction   : "up" | "down" | "left" | "right" | "zoom" | "flip" | "fade"
 * - delay       : number (giây)
 * - duration    : number (giây)
 * - distance    : number (px)
 * - blur        : boolean — dùng blur overlay thay vì filter
 * - blurAmount  : number (px)
 * - scale       : boolean
 * - scaleAmount : number (0-1)
 * - rotate      : number (độ) — rotate 2D
 * - rotate3D    : boolean
 * - depth       : number (px)
 * - intensity   : "soft" | "medium" | "strong"
 * - perspective : boolean
 * - glow        : boolean
 * - threshold   : number
 * - once        : boolean
 * - rootMargin  : string
 * - releaseTransform : boolean
 */

const ScrollReveal = ({
  children,

  direction = "up",
  delay = 0,
  duration = 1.2,

  blur = true,
  scale = true,

  distance = 50,
  blurAmount = 6,
  scaleAmount = 0.94,
  rotate = 0,
  rotate3D = true,
  depth = 80,

  intensity = "medium",
  perspective = true,
  glow = true,

  className = "",
  threshold = 0.08,
  once = true,
  rootMargin = "0px 0px -60px 0px",

  releaseTransform = true,

  ...rest
}) => {
  const ref = useRef(null);

  const [isInView, setIsInView] = useState(false);
  const [isDone, setIsDone] = useState(false);

  /* ==========================================================
     INTERSECTION OBSERVER
  ========================================================== */

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

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

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, threshold, rootMargin]);

  /* ==========================================================
     INITIAL POSITION
  ========================================================== */

  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { x: 0, y: distance, rotateX: rotate3D ? 12 : 0, rotateY: 0 };
      case "down":
        return { x: 0, y: -distance, rotateX: rotate3D ? -12 : 0, rotateY: 0 };
      case "left":
        return { x: -distance, y: 0, rotateX: 0, rotateY: rotate3D ? -14 : 0 };
      case "right":
        return { x: distance, y: 0, rotateX: 0, rotateY: rotate3D ? 14 : 0 };
      case "zoom":
        return { x: 0, y: 0, rotateX: 0, rotateY: 0 };
      case "flip":
        return { x: 0, y: distance * 0.3, rotateX: rotate3D ? 30 : 0, rotateY: 0 };
      case "fade":
        return { x: 0, y: 0, rotateX: 0, rotateY: 0 };
      default:
        return { x: 0, y: distance, rotateX: 0, rotateY: 0 };
    }
  };

  const initialPosition = getInitialPosition();

  /* ==========================================================
     INITIAL STATE
     ⚠️ KHÔNG dùng filter — chỉ dùng transform + opacity
  ========================================================== */

  const initial = {
    opacity: 0,

    ...initialPosition,

    /* Scale bổ sung */
    ...(scale && direction !== "zoom" ? { scale: scaleAmount } : {}),
    ...(direction === "zoom" ? { scale: scaleAmount * 0.88 } : {}),
    ...(direction === "flip" ? { scale: 0.92 } : {}),

    /* Rotate 2D */
    ...(rotate ? { rotate } : {}),

    /* 3D depth */
    ...(perspective ? { z: -depth } : {}),
  };

  /* ==========================================================
     ANIMATE STATE
  ========================================================== */

  const animate = {
    opacity: 1,
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,

    transition: {
      duration,
      delay,
      /* Easing mượt — smooth-out */
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  };

  /* ==========================================================
     STYLE — chỉ set transform-origin, KHÔNG set perspective ở đây
  ========================================================== */

  const getTransformOrigin = () => {
    switch (direction) {
      case "up":
        return "center bottom";
      case "down":
        return "center top";
      case "left":
        return "right center";
      case "right":
        return "left center";
      default:
        return "center center";
    }
  };

  const wrapperStyle = {
    transformOrigin: getTransformOrigin(),
    /* Chỉ set will-change khi chưa xong → sau đó remove để giải phóng GPU */
    ...(releaseTransform && isDone
      ? { willChange: "auto" }
      : { willChange: "transform, opacity" }),
  };

  /* ==========================================================
     CLASS
  ========================================================== */

  const revealClassName = [
    "scroll-reveal",
    `scroll-reveal--${direction}`,
    `scroll-reveal--${intensity}`,

    perspective ? "scroll-reveal--perspective" : "scroll-reveal--flat",
    glow ? "scroll-reveal--glow" : "",
    rotate3D ? "scroll-reveal--3d" : "scroll-reveal--2d",
    blur ? "scroll-reveal--blur" : "",

    isInView ? "scroll-reveal--visible" : "scroll-reveal--hidden",
    isDone ? "scroll-reveal--done" : "",

    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <motion.div
      ref={ref}
      className={revealClassName}
      initial={initial}
      animate={isInView ? animate : initial}
      onAnimationComplete={() => {
        if (releaseTransform) setIsDone(true);
      }}
      style={wrapperStyle}
      {...rest}
    >
      {/* Blur overlay — thay cho filter: blur() để tối ưu GPU */}
      {blur && (
        <span
          className="scroll-reveal__blur"
          style={{ "--blur-amount": `${blurAmount}px` }}
          aria-hidden="true"
        />
      )}

      <span className="scroll-reveal__edge" aria-hidden="true" />

      <div className="scroll-reveal__content">{children}</div>
    </motion.div>
  );
};

export default ScrollReveal;