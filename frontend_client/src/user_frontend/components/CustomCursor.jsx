import React, { useEffect, useRef, useState } from "react";
import "../styles/CustomCursor.css";

/* ============================================================
   CUSTOM CURSOR — FULL REPLACEMENT EDITION
   ============================================================
   ✅ ẨN HOÀN TOÀN cursor trình duyệt (khi bật)
   ✅ Thay bằng cursor riêng (mũi tên cam + vòng tròn)
   ✅ Context-aware: hover button/card/text → đổi hình
   ✅ Chỉ desktop (hover: hover + pointer: fine)
   ✅ Toggle tắt/bật — lưu vào localStorage
   ✅ Reduced-motion → tự tắt
   ✅ Fallback: tắt custom → cursor mặc định hiện lại
============================================================ */

const STORAGE_KEY = "qd_cursor_enabled";

const CustomCursor = () => {
  const cursorRef = useRef(null);
  const ringRef = useRef(null);
  const dotRef = useRef(null);

  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const [isSupported, setIsSupported] = useState(false);
  const [cursorState, setCursorState] = useState("default");
  // default | hover-button | hover-card | hover-text | hover-link

  const mouseRef = useRef({ x: -100, y: -100 });
  const ringPosRef = useRef({ x: -100, y: -100 });
  const dotPosRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef(null);

  /* ========================================================
     DETECT SUPPORT — chỉ desktop có chuột thật
  ======================================================== */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setIsSupported(mqHover.matches && !mqMotion.matches);
    };

    update();
    mqHover.addEventListener?.("change", update);
    mqMotion.addEventListener?.("change", update);

    return () => {
      mqHover.removeEventListener?.("change", update);
      mqMotion.removeEventListener?.("change", update);
    };
  }, []);

  /* ========================================================
     TOGGLE LISTENER — nghe từ window
  ======================================================== */
  useEffect(() => {
    const handleToggle = (e) => {
      const value = e?.detail?.enabled ?? !enabled;
      setEnabled(value);
      try {
        localStorage.setItem(STORAGE_KEY, String(value));
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("qd:cursor-toggle", handleToggle);
    return () => {
      window.removeEventListener("qd:cursor-toggle", handleToggle);
    };
  }, [enabled]);

  /* ========================================================
     ✅ ẨN CURSOR TRÌNH DUYỆT — toggle class lên <html>
     ========================================================
     Khi cursor custom bật:
     → html.qd-cursor-active → CSS ẩn cursor mặc định
     Khi tắt:
     → remove class → cursor mặc định hiện lại
  ======================================================== */
  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;

    if (enabled && isSupported) {
      html.classList.add("qd-cursor-active");
    } else {
      html.classList.remove("qd-cursor-active");
    }

    return () => {
      html.classList.remove("qd-cursor-active");
    };
  }, [enabled, isSupported]);

  /* ========================================================
     MOUSE TRACKING + RAF
  ======================================================== */
  useEffect(() => {
    if (!enabled || !isSupported) return;

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;

      // Ưu tiên: input > link > button > card > default
      if (
        target.closest("input, textarea, select, [contenteditable]")
      ) {
        setCursorState("hover-text");
      } else if (
        target.closest("a, [role='link']")
      ) {
        setCursorState("hover-link");
      } else if (
        target.closest(
          "button, [role='button'], .btn-view-all, .btn-quick-booking, .btn-review-open, .btn-confirm-payment, .cursor-toggle-btn"
        )
      ) {
        setCursorState("hover-button");
      } else if (
        target.closest(
          ".movie-card, .cinema-card, .promotion-card, .news-card, .blog-card, .film-card, .tilt-card-vip, .feature-item, .testimonial-card"
        )
      ) {
        setCursorState("hover-card");
      } else {
        setCursorState("default");
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -100;
      mouseRef.current.y = -100;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    /* ---- RAF LOOP — smooth follow ---- */
    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      const { x: mx, y: my } = mouseRef.current;

      // Ring theo sau chậm
      ringPosRef.current.x = lerp(ringPosRef.current.x, mx, 0.16);
      ringPosRef.current.y = lerp(ringPosRef.current.y, my, 0.16);

      // Dot theo sau nhanh
      dotPosRef.current.x = lerp(dotPosRef.current.x, mx, 0.4);
      dotPosRef.current.y = lerp(dotPosRef.current.y, my, 0.4);

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPosRef.current.x}px, ${ringPosRef.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dotPosRef.current.x}px, ${dotPosRef.current.y}px, 0) translate(-30%, -20%)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, isSupported]);

  /* ========================================================
     KHÔNG RENDER
  ======================================================== */
  if (!enabled || !isSupported) return null;

  /* ========================================================
     RENDER
  ======================================================== */
  return (
    <div
      ref={cursorRef}
      className={`qd-cursor qd-cursor--${cursorState}`}
      aria-hidden="true"
    >
      <div ref={ringRef} className="qd-cursor__ring" />
      <div ref={dotRef} className="qd-cursor__dot" />
    </div>
  );
};

export default CustomCursor;