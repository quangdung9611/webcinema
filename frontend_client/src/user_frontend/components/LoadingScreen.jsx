import React, { useEffect, useRef, useState } from "react";
import "../styles/LoadingScreen.css";

/* ============================================================
   LOADING SCREEN — CINEMATIC PRELOADER
   ============================================================
   ✅ Logo SVG stroke animation
   ✅ Progress bar 0% → 100%
   ✅ Nút Skip (góc phải)
   ✅ Chỉ hiện 1 lần / session (sessionStorage)
   ✅ Tự gọi onDone() khi xong → parent ẩn LoadingSpinner
   ✅ Reduced-motion support
============================================================ */

const STORAGE_KEY = "qd_loading_shown";
const TOTAL_DURATION = 1800; // 1.8s
const SKIP_DURATION = 400;   // 0.4s để fade out khi skip

const LoadingScreen = ({ onDone }) => {
  /* ========================================================
     STATE
  ======================================================== */
  const [shouldRender, setShouldRender] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      return sessionStorage.getItem(STORAGE_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const exitTimeoutRef = useRef(null);
  const doneCalledRef = useRef(false);

  /* ========================================================
     GỌI onDone 1 LẦN DUY NHẤT
  ======================================================== */
  const callOnDone = () => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    if (typeof onDone === "function") {
      onDone();
    }
  };

  /* ========================================================
     DISMISS — fade out rồi unmount
  ======================================================== */
  const dismiss = (instant = false) => {
    if (isExiting) return;

    setIsExiting(true);

    const delay = instant ? 0 : SKIP_DURATION;

    exitTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);

      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        /* ignore */
      }

      callOnDone();
    }, delay);
  };

  /* ========================================================
     NẾU KHÔNG RENDER → GỌI onDone NGAY
     (để parent biết LoadingScreen không chạy nữa)
  ======================================================== */
  useEffect(() => {
    if (!shouldRender) {
      callOnDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender]);

  /* ========================================================
     PROGRESS ANIMATION
  ======================================================== */
  useEffect(() => {
    if (!shouldRender) return;

    // Reduced motion → hiện nhanh
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mqMotion.matches) {
      setProgress(100);
      const t = setTimeout(() => dismiss(true), 300);
      return () => clearTimeout(t);
    }

    startTimeRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startTimeRef.current;
      const p = Math.min(elapsed / TOTAL_DURATION, 1);

      // Easing — chạy nhanh đoạn đầu, chậm đoạn cuối
      const eased = 1 - Math.pow(1 - p, 2);
      setProgress(Math.round(eased * 100));

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => dismiss(), 200);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender]);

  /* ========================================================
     CLEANUP
  ======================================================== */
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  /* ========================================================
     KHÔNG RENDER
  ======================================================== */
  if (!shouldRender) return null;

  /* ========================================================
     RENDER
  ======================================================== */
  return (
    <div
      className={`qd-loading-screen ${isExiting ? "is-exiting" : ""}`}
      role="dialog"
      aria-label="Đang tải Quang Dũng Cinema"
      aria-live="polite"
    >
      {/* ---- Background layers ---- */}
      <div className="qd-loading-screen__bg" />
      <div className="qd-loading-screen__vignette" />

      {/* ---- Center content ---- */}
      <div className="qd-loading-screen__content">
        {/* Logo SVG — vẽ ra từng nét */}
        <div className="qd-loading-screen__logo">
          <svg
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Vòng tròn ngoài */}
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="qd-loading-screen__stroke qd-loading-screen__stroke--circle"
            />

            {/* Chữ Q — vẽ bằng path */}
            <path
              d="M 60 28
                 A 32 32 0 1 0 60 92
                 A 32 32 0 1 0 60 28
                 M 75 75 L 90 90"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="qd-loading-screen__stroke qd-loading-screen__stroke--q"
            />

            {/* Dấu chấm cinema */}
            <circle
              cx="60"
              cy="60"
              r="3"
              fill="currentColor"
              className="qd-loading-screen__dot"
            />
          </svg>
        </div>

        {/* Brand text */}
        <div className="qd-loading-screen__brand">
          <h1 className="qd-loading-screen__title">QUANG DŨNG</h1>
          <p className="qd-loading-screen__subtitle">CINEMA</p>
        </div>

        {/* Progress bar */}
        <div className="qd-loading-screen__progress-wrap">
          <div className="qd-loading-screen__progress-track">
            <div
              className="qd-loading-screen__progress-fill"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>

          <div className="qd-loading-screen__progress-info">
            <span className="qd-loading-screen__progress-label">
              ĐANG TẢI
            </span>
            <span className="qd-loading-screen__progress-value">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* ---- Skip button ---- */}
      <button
        type="button"
        className="qd-loading-screen__skip"
        onClick={() => dismiss()}
        aria-label="Bỏ qua màn hình tải"
      >
        <span>Bỏ qua</span>
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
};

export default LoadingScreen;