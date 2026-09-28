import { useEffect, useRef } from 'react';
import Lenis from '@studio-freight/lenis';

/**
 * ============================================================
 * useLenis — Smooth scroll hook
 * ============================================================
 * Khởi động Lenis smooth scroll toàn cục.
 * Tự động tắt trên mobile để tránh lag.
 * Trả về instance Lenis để có thể dùng scrollTo().
 *
 * @param {object} options - Config cho Lenis
 * @returns {React.MutableRefObject} lenisRef
 * ============================================================
 */
const useLenis = (options = {}) => {
  const lenisRef = useRef(null);

  useEffect(() => {
    // ✅ Kiểm tra reduced-motion — nếu user không thích animation thì tắt
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // ✅ Cấu hình Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      smoothTouch: false,     // Tắt trên mobile để tránh lag
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
      ...options,
    });

    lenisRef.current = lenis;

    // ✅ Animation loop
    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // ✅ Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return lenisRef;
};

export default useLenis;