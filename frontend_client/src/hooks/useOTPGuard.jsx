// hooks/useOTPGuard.js
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const useOTPGuard = (email, purpose, options = {}) => {
    const navigate = useNavigate();
    const hasInvalidatedRef = useRef(false);
    const hasNavigatedRef = useRef(false);
    const isMountedRef = useRef(true);
    const { onInvalidate, redirectTo } = options;

    // ============================================================
    // HÀM INVALIDATE OTP
    // ============================================================
    const invalidateOTP = useCallback(async () => {
        if (hasInvalidatedRef.current) return;
        if (!email || !purpose) return;
        if (!isMountedRef.current) return;

        hasInvalidatedRef.current = true;

        try {
            await api.invalidateOTP(email, purpose);
            console.log(`🔴 [OTP GUARD] OTP invalidated for ${email}, purpose: ${purpose}`);
            if (onInvalidate) onInvalidate();
        } catch (error) {
            console.warn('⚠️ [OTP GUARD] Failed to invalidate OTP:', error);
        }
    }, [email, purpose, onInvalidate]);

    // ============================================================
    // SAFE NAVIGATE
    // ============================================================
    const safeNavigate = useCallback((path, state = {}) => {
        hasNavigatedRef.current = true;
        navigate(path, { state, replace: true });
    }, [navigate]);

    // ============================================================
    // SEND BEACON HOẶC FETCH VỚI KEEPALIVE
    // ============================================================
    const sendBeaconInvalidate = useCallback(() => {
        if (hasInvalidatedRef.current) return;
        if (!email || !purpose) return;

        hasInvalidatedRef.current = true;

        const payload = JSON.stringify({ email, purpose });

        // ✅ Cách 1: Dùng sendBeacon với Blob
        try {
            const blob = new Blob([payload], { type: 'application/json' });
            const sent = navigator.sendBeacon('/api/auth/invalidate-otp', blob);
            if (sent) {
                console.log(`🔴 [OTP GUARD] SendBeacon: invalidate OTP for ${email}`);
                return;
            }
        } catch (e) {
            console.warn('⚠️ [OTP GUARD] SendBeacon error:', e);
        }

        // ✅ Cách 2: Fallback dùng fetch với keepalive
        try {
            fetch('/api/auth/invalidate-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true,
                credentials: 'include'  // 👈 QUAN TRỌNG: gửi cookie
            }).catch(() => {});
            console.log(`🔴 [OTP GUARD] Fetch keepalive: invalidate OTP for ${email}`);
        } catch (e) {
            console.warn('⚠️ [OTP GUARD] Fetch fallback error:', e);
        }
    }, [email, purpose]);

    // ============================================================
    // EFFECT
    // ============================================================
    useEffect(() => {
        isMountedRef.current = true;

        if (!email || !purpose) {
            console.log('⏭️ [OTP GUARD] Skip: missing email or purpose');
            return;
        }

        // ========================================================
        // 1. KHI ĐÓNG TAB / RELOAD
        // ========================================================
        const handleBeforeUnload = () => {
            sendBeaconInvalidate();
        };

        // ========================================================
        // 2. KHI BẤM BACK / FORWARD
        // ========================================================
        const handlePopState = () => {
            if (hasInvalidatedRef.current) return;
            if (hasNavigatedRef.current) return;
            if (!email || !purpose) return;

            console.log('🔴 [OTP GUARD] PopState detected - invalidating OTP');
            invalidateOTP();
        };

        // ========================================================
        // 3. KHI CHUYỂN TAB
        // ========================================================
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log('👀 [OTP GUARD] Tab hidden');
            } else {
                console.log('👀 [OTP GUARD] Tab visible');
            }
        };

        // ========================================================
        // 4. KHI PAGEHIDE (IOS SAFARI)
        // ========================================================
        const handlePageHide = () => {
            sendBeaconInvalidate();
        };

        // ========================================================
        // ĐĂNG KÝ EVENT
        // ========================================================
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        // ========================================================
        // CLEANUP
        // ========================================================
        return () => {
            isMountedRef.current = false;
            
            if (!hasInvalidatedRef.current && !hasNavigatedRef.current) {
                invalidateOTP();
            }

            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [email, purpose, invalidateOTP, sendBeaconInvalidate]);

    // ============================================================
    // RESET
    // ============================================================
    const resetGuard = useCallback(() => {
        hasInvalidatedRef.current = false;
        hasNavigatedRef.current = false;
    }, []);

    return {
        safeNavigate,
        invalidateOTP,
        resetGuard,
        hasInvalidated: hasInvalidatedRef.current,
        hasNavigated: hasNavigatedRef.current,
    };
};

export default useOTPGuard;