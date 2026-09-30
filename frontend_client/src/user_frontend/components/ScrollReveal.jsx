import { useEffect, useRef, useState } from "react";

import "../styles/ScrollReveal.css";

/**
 * ============================================================
 * SCROLL REVEAL — QUANG DŨNG CINEMA
 * PREMIUM ZEPHYR STYLE
 * ============================================================
 *
 * Nguyên tắc:
 * - Chỉ opacity + translateY
 * - Không blur
 * - Không scale
 * - Không 3D
 * - Không perspective
 * - Không rotate
 * - Không will-change
 * - Sau reveal → transform: none
 *
 * Props:
 * - direction   : "up" | "down" | "fade"
 * - delay       : number (giây)
 * - duration    : number (giây)
 * - distance    : number (px)
 * - once        : boolean
 * - threshold   : number
 * - rootMargin  : string
 *
 * Các props cũ như:
 * blur, scale, rotate, perspective...
 * vẫn được nhận để giữ API cũ nhưng không sử dụng.
 */

const ScrollReveal = ({
  children,

  direction = "up",
  delay = 0,
  duration = 0.8,

  distance = 28,
  once = true,
  threshold = 0.08,
  rootMargin = "0px 0px -80px 0px",

  className = "",

  // Legacy props — giữ lại để không phá API cũ
  blur,
  blurAmount,
  scale,
  scaleAmount,
  rotate,
  rotate3D,
  depth,
  intensity,
  perspective,
  glow,
  releaseTransform,

  ...rest
}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);

          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [once, threshold, rootMargin]);

  /**
   * Chỉ cho phép 3 direction premium:
   * up / down / fade
   *
   * Nếu component cũ truyền left/right,
   * tự động fallback về up để giữ visual consistency.
   */
  const safeDirection =
    direction === "down" || direction === "fade"
      ? direction
      : "up";

  const revealClassName = [
    "scroll-reveal",
    `scroll-reveal--${safeDirection}`,
    isVisible ? "scroll-reveal--visible" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /**
   * CSS variables
   *
   * Distance mặc định:
   * Desktop: 28px
   * Mobile: CSS sẽ giảm nhẹ.
   */
  const wrapperStyle = {
    "--reveal-delay": `${delay}s`,
    "--reveal-duration": `${duration}s`,
    "--reveal-distance": `${distance}px`,
  };

  return (
    <div
      ref={ref}
      className={revealClassName}
      style={wrapperStyle}
      {...rest}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;