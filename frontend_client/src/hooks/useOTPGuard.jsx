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
    // SAFE NAVIGATE - ĐÁNH DẤU ĐÃ NAVIGATE ĐỂ KHÔNG INVALIDATE NỮA
    // ============================================================
    const safeNavigate = useCallback((path, state = {}) => {
        hasNavigatedRef.current = true;
        // Nếu đã navigate thì không cần invalidate nữa
        navigate(path, { state, replace: true });
    }, [navigate]);

    // ============================================================
    // EFFECT: LẮNG NGHE CÁC SỰ KIỆN RỜI TRANG
    // ============================================================
    useEffect(() => {
        isMountedRef.current = true;

        // Nếu không có email hoặc purpose thì không làm gì
        if (!email || !purpose) {
            console.log('⏭️ [OTP GUARD] Skip: missing email or purpose');
            return;
        }

        // ========================================================
        // 1. KHI NGƯỜI DÙNG ĐÓNG TAB / RELOAD TRANG
        // ========================================================
        const handleBeforeUnload = () => {
            if (hasInvalidatedRef.current) return;
            if (hasNavigatedRef.current) return;
            if (!email || !purpose) return;

            hasInvalidatedRef.current = true;
            
            // Dùng sendBeacon để gửi request khi rời trang (không block)
            const payload = JSON.stringify({ email, purpose });
            navigator.sendBeacon('/api/auth/invalidate-otp', payload);
            console.log(`🔴 [OTP GUARD] SendBeacon: invalidate OTP for ${email}`);
        };

        // ========================================================
        // 2. KHI NGƯỜI DÙNG BẤM BACK / FORWARD
        // ========================================================
        const handlePopState = () => {
            if (hasInvalidatedRef.current) return;
            if (hasNavigatedRef.current) return;
            if (!email || !purpose) return;

            console.log('🔴 [OTP GUARD] PopState detected - invalidating OTP');
            invalidateOTP();
        };

        // ========================================================
        // 3. KHI VISIBILITY CHANGE (USER CHUYỂN TAB)
        // ========================================================
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // User chuyển sang tab khác
                console.log('👀 [OTP GUARD] Tab hidden');
            } else {
                // User quay lại tab
                console.log('👀 [OTP GUARD] Tab visible');
                // Không làm gì khi quay lại
            }
        };

        // ========================================================
        // 4. KHI PAGEHIDE (IOS SAFARI)
        // ========================================================
        const handlePageHide = () => {
            if (hasInvalidatedRef.current) return;
            if (hasNavigatedRef.current) return;
            if (!email || !purpose) return;

            hasInvalidatedRef.current = true;
            const payload = JSON.stringify({ email, purpose });
            navigator.sendBeacon('/api/auth/invalidate-otp', payload);
            console.log(`🔴 [OTP GUARD] PageHide: invalidate OTP for ${email}`);
        };

        // ========================================================
        // ĐĂNG KÝ CÁC EVENT LISTENER
        // ========================================================
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        // ========================================================
        // CLEANUP: KHI COMPONENT UNMOUNT
        // ========================================================
        return () => {
            isMountedRef.current = false;
            
            // Gọi invalidate OTP khi component unmount
            if (!hasInvalidatedRef.current && !hasNavigatedRef.current) {
                invalidateOTP();
            }

            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [email, purpose, invalidateOTP]);

    // ============================================================
    // HÀM RESET TRẠNG THÁI (DÙNG KHI CẦN RESET)
    // ============================================================
    const resetGuard = useCallback(() => {
        hasInvalidatedRef.current = false;
        hasNavigatedRef.current = false;
    }, []);

    // ============================================================
    // TRẢ VỀ
    // ============================================================
    return {
        safeNavigate,
        invalidateOTP,
        resetGuard,
        hasInvalidated: hasInvalidatedRef.current,
        hasNavigated: hasNavigatedRef.current,
    };
};

export default useOTPGuard;