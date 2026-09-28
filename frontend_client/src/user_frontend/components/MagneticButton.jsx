import React, { useRef, useState, useEffect } from "react";

/**
 * ============================================================
 * MagneticButton — Nút hút theo chuột
 * ============================================================
 * - Chuột tới gần → nút di chuyển nhẹ về phía chuột
 * - Tự tắt trên touch device & prefers-reduced-motion
 * - Có strength / radius để tune
 * ============================================================
 */
const MagneticButton = ({
  children,
  onClick,
  className = "",
  strength = 0.35,       // 0 = không hút, 0.5 = hút mạnh
  radius = 100,          // bán kính hút (px)
  disabled = false,
  type = "button",
  ...rest
}) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isNear, setIsNear] = useState(false);
  const [enabled, setEnabled] = useState(false);

  /* Chỉ bật trên desktop có hover + không reduced motion */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setEnabled(mqHover.matches && !mqMotion.matches);
    };

    update();
    mqHover.addEventListener?.("change", update);
    mqMotion.addEventListener?.("change", update);

    return () => {
      mqHover.removeEventListener?.("change", update);
      mqMotion.removeEventListener?.("change", update);
    };
  }, []);

  const handleMouseMove = (e) => {
    if (!enabled || disabled) return;

    const btn = ref.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    const dist = Math.hypot(distX, distY);

    if (dist < radius) {
      setIsNear(true);
      setPosition({
        x: distX * strength,
        y: distY * strength,
      });
    } else if (isNear) {
      setIsNear(false);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseLeave = () => {
    setIsNear(false);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={ref}
      type={type}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      className={`magnetic-button ${className} ${isNear ? "is-near" : ""}`}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: isNear
          ? "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "transform",
      }}
      {...rest}
    >
      {children}
    </button>
  );
};

export default MagneticButton;