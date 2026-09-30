import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

/**
 * ============================================================
 * useLenis — Smooth scroll hook (bản lenis mới)
 * ============================================================
 * Khởi động Lenis smooth scroll toàn cục.
 * - Tự động tắt khi user bật "prefers-reduced-motion".
 * - Tự động tắt khi truyền { enabled: false } (VD: admin domain).
 * - Gán instance vào window.__lenis để ScrollToTop & nơi khác dùng.
 *
 * @param {object} options
 * @param {boolean} [options.enabled=true] - Bật/tắt Lenis
 * @returns {React.MutableRefObject<Lenis|null>} lenisRef
 * ============================================================
 */
const useLenis = ({ enabled = true, ...options } = {}) => {
  const lenisRef = useRef(null);

  useEffect(() => {
    // ❌ Tắt nếu không enabled
    if (!enabled) return;

    // ❌ Tắt nếu user không thích animation
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    // ✅ Khởi tạo Lenis (bản lenis mới)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: false,        // Tương đương smoothTouch: false bản cũ
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
      ...options,
    });

    lenisRef.current = lenis;

    // ✅ Gán global để ScrollToTop và các nơi khác dùng được
    if (typeof window !== 'undefined') {
      window.__lenis = lenis;
    }

    // ✅ Animation loop
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // ✅ Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;

      if (typeof window !== 'undefined') {
        window.__lenis = null;
      }
    };
  }, [enabled]);

  return lenisRef;
};

export default useLenis;